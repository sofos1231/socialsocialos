/**
 * IMPORTANT – OPTION A / PREMIUM EFFECTS ONLY
 *
 * This service is used for:
 * - Per-message scoring (score 0–100, rarity S+/S/A/B/C)
 * - Micro feedback per message
 * - XP/coins multipliers
 * - Premium deep analysis (emotion profile, strengths/weaknesses, advice)
 *
 * It is NOT the Option B core metrics engine.
 * It must NOT:
 * - Define DB schema for PracticeSession stats
 * - Drive the main /stats or /dashboard summary responses
 * - Be treated as the single source of truth for Charisma Index / traits
 *
 * Option B core lives in AiCoreScoringService, which returns
 * AiSessionResult { metrics + messages + version }.
 */

// backend/src/modules/ai/ai-scoring.service.ts

import { Injectable } from '@nestjs/common';
import { AccountTier } from '@prisma/client';
import {
  AiMode,
  AiScoringResult,
  AiMessageScoreBase,
  AiMessageDeepInsight,
  AiSessionAnalysisPremium,
  EmotionProfile,
  MessageRarity,
  PracticeMessageInput,
} from './ai.types';
import { MissionConfigV1Difficulty } from '../missions-admin/mission-config-v1.schema';

/**
 * AiScoringService
 *
 * Mock / deterministic AI scoring engine.
 * No external calls, no randomness – only pure logic based on the messages.
 *
 * Later, you can replace the internals with real LLM calls while keeping:
 *   - the public `scoreSession` API
 *   - the AiScoringResult / Ai* types
 */
@Injectable()
export class AiScoringService {
  /**
   * Main entry point for the rest of the backend.
   *
   * - Picks mode (FREE / PREMIUM) based on user tier.
   * - Produces per-message scores.
   * - If PREMIUM → also produces a deep session analysis.
   * - Step 6.2: Accepts optional difficulty configuration for dynamic grading.
   */
  async scoreSession(
    userTier: AccountTier,
    messages: PracticeMessageInput[],
    difficultyConfig?: MissionConfigV1Difficulty | null,
    previousScoreSeed?: number | null, // Step 6.1 Fix: Seed for first message (for continuation)
  ): Promise<AiScoringResult> {
    const mode: AiMode =
      userTier === AccountTier.PREMIUM ? 'PREMIUM' : 'FREE';

    // Step 6.1 Fix: Pass previous score for recovery difficulty calculation
    // For continuation, seed the first message with the last known score
    const perMessage: AiMessageScoreBase[] = [];
    for (let index = 0; index < messages.length; index++) {
      const msg = messages[index];
      const previousScore = index > 0 
        ? perMessage[index - 1]?.score 
        : (index === 0 && previousScoreSeed !== null && previousScoreSeed !== undefined ? previousScoreSeed : null);
      perMessage.push(this.buildBaseScore(msg, index, difficultyConfig, previousScore));
    }

    let premiumSessionAnalysis: AiSessionAnalysisPremium | undefined;

    if (mode === 'PREMIUM') {
      premiumSessionAnalysis = this.buildPremiumAnalysis(messages, perMessage);
    }

    return {
      mode,
      perMessage,
      premiumSessionAnalysis,
    };
  }

  /**
   * Temporary wrapper to match the shape used in PracticeService.runRealSession.
   * For now we treat everyone as FREE; later we can fetch true tier from DB.
   * Step 6.2: Accepts optional difficulty configuration.
   */
  async scoreConversation(args: {
    userId: string;
    personaId: string | null;
    templateId: string | null;
    messages: PracticeMessageInput[];
    difficultyConfig?: MissionConfigV1Difficulty | null;
    previousScoreSeed?: number | null; // Step 6.1 Fix: Seed for first message in batch (for continuation)
  }): Promise<AiScoringResult> {
    // TODO: use real user tier based on userId
    return this.scoreSession(AccountTier.FREE, args.messages, args.difficultyConfig, args.previousScoreSeed);
  }

  /**
   * Build base score + rarity + micro feedback for a single message.
   * This function is fully deterministic and cheap.
   * Step 6.2: Accepts difficulty configuration for dynamic grading.
   * Step 6.1 Fix: Now accepts previousScore for recovery difficulty calculation.
   */
  private buildBaseScore(
    msg: PracticeMessageInput,
    index: number,
    difficultyConfig?: MissionConfigV1Difficulty | null,
    previousScore?: number | null, // For recovery difficulty
  ): AiMessageScoreBase {
    const normalizedText = msg.content.trim();
    const lengthScore = this.computeLengthScore(normalizedText);
    const punctuationScore = this.computePunctuationScore(normalizedText);
    const positionBonus = this.computePositionBonus(index);

    let score = lengthScore + punctuationScore + positionBonus;

    // Step 6.2: Apply difficulty adjustments
    score = this.applyDifficultyAdjustments(score, normalizedText, difficultyConfig);

    // Clamp to 0–100
    score = Math.max(0, Math.min(100, score));

    const rarity = this.mapScoreToRarity(score);
    const microFeedback = this.buildMicroFeedback(score, normalizedText);
    const tags = this.buildTags(score, normalizedText);
    const xpMultiplier = this.computeXpMultiplier(rarity);
    const coinsMultiplier = this.computeCoinsMultiplier(rarity);
    const safetyFlag = this.detectSafety(normalizedText);

    return {
      index: msg.index,
      score,
      rarity,
      microFeedback,
      tags,
      xpMultiplier,
      coinsMultiplier,
      safetyFlag,
    };
  }

  /**
   * Score based mainly on message length:
   * - very short messages are weak
   * - mid-length messages are best
   * - overly long messages get a small penalty
   */
  private computeLengthScore(text: string): number {
    const len = text.length;

    if (len === 0) return 10;
    if (len < 5) return 35;
    if (len < 15) return 55;
    if (len < 40) return 75;
    if (len < 80) return 82;

    return 70; // too long → slightly penalized
  }

  /**
   * Bonus based on punctuation:
   * - question marks encourage curiosity
   * - exclamation marks encourage energy
   */
  private computePunctuationScore(text: string): number {
    const qCount = (text.match(/\?/g) || []).length;
    const exCount = (text.match(/!/g) || []).length;

    const questionBonus = Math.min(2 * qCount, 10);
    const exclamationBonus = Math.min(3 * exCount, 12);

    return questionBonus + exclamationBonus;
  }

  /**
   * Slight bonus for later messages to avoid all early messages dominating.
   */
  private computePositionBonus(index: number): number {
    if (index === 0) return 0;
    if (index === 1) return 2;
    if (index === 2) return 4;
    return 5;
  }

  private mapScoreToRarity(score: number): MessageRarity {
    if (score >= 92) return 'S+';
    if (score >= 84) return 'S';
    if (score >= 72) return 'A';
    if (score >= 58) return 'B';
    return 'C';
  }

  private buildMicroFeedback(score: number, text: string): string {
    const trimmed = text.toLowerCase();

    if (score >= 92) {
      return 'Brilliant tension and clarity here. This is the kind of line that can shift the whole vibe.';
    }
    if (score >= 84) {
      return 'Strong message with attractive energy. A tiny bit more specificity could make it killer.';
    }
    if (score >= 72) {
      return 'Good message. You’re on the right track – a bit more playfulness or detail would level this up.';
    }
    if (score >= 58) {
      return 'Decent but safe. You can afford to be slightly bolder or more personal here.';
    }

    if (trimmed.length < 5) {
      return 'Feels too short and low-effort. Give the other side a bit more to work with.';
    }

    return 'This message is okay, but lacks a clear hook. Try adding a small tease or detail that invites a reply.';
  }

  private buildTags(score: number, text: string): string[] {
    const tags: string[] = [];
    const lower = text.toLowerCase();

    if (/\?/.test(text)) tags.push('curious');
    if (/haha|lol|😂|😅/.test(lower)) tags.push('playful');
    if (/[!]{2,}/.test(text)) tags.push('high-energy');
    if (lower.includes('maybe') || lower.includes('i think')) {
      tags.push('soft');
    }
    if (lower.includes("let's") || lower.includes('lets ')) {
      tags.push('leading');
    }

    if (score >= 84) tags.push('confident');
    else if (score < 58) tags.push('low-impact');

    if (tags.length === 0) tags.push('neutral');

    return tags;
  }

  private computeXpMultiplier(rarity: MessageRarity): number {
    switch (rarity) {
      case 'S+':
        return 1.8;
      case 'S':
        return 1.5;
      case 'A':
        return 1.25;
      case 'B':
        return 1.0;
      case 'C':
      default:
        return 0.8;
    }
  }

  private computeCoinsMultiplier(rarity: MessageRarity): number {
    switch (rarity) {
      case 'S+':
        return 1.7;
      case 'S':
        return 1.4;
      case 'A':
        return 1.2;
      case 'B':
        return 1.0;
      case 'C':
      default:
        return 0.7;
    }
  }

  /**
   * Very lightweight safety detector. This is intentionally simple and
   * deterministic – real moderation can replace this later.
   */
  private detectSafety(text: string): 'OK' | 'RISKY' | 'BLOCK' {
    const lower = text.toLowerCase();

    const riskyPatterns = ['kill', 'suicide', 'self-harm', 'die myself'];
    const blockPatterns = ['nazi', 'rape', 'kill you'];

    if (blockPatterns.some((p) => lower.includes(p))) {
      return 'BLOCK';
    }
    if (riskyPatterns.some((p) => lower.includes(p))) {
      return 'RISKY';
    }
    return 'OK';
  }

  /**
   * Step 6.2: Apply difficulty-based adjustments to score
   * Step 6.1 Fix: Now includes failThreshold and recoveryDifficulty
   */
  private applyDifficultyAdjustments(
    baseScore: number,
    text: string,
    difficultyConfig?: MissionConfigV1Difficulty | null,
    previousScore?: number | null, // For recovery difficulty calculation
  ): number {
    if (!difficultyConfig) return baseScore;

    let adjustedScore = baseScore;
    const lower = text.toLowerCase();

    // Strictness: Higher strictness = more critical grading (harsher = lower scores)
    // Step 6.1 Fix: Invert multiplier so strictness=0 => lenient (multiplier=1.0), strictness=100 => strict (multiplier=0.5)
    const strictness = difficultyConfig.strictness ?? 50;
    const strictnessMultiplier = 1.0 - (strictness / 100) * 0.5; // 1.0 (lenient) to 0.5 (strict)
    adjustedScore = adjustedScore * strictnessMultiplier;

    // Ambiguity Tolerance: Lower tolerance = penalize ambiguous messages
    const ambiguityTolerance = difficultyConfig.ambiguityTolerance ?? 50;
    const ambiguousPatterns = [
      /\b(maybe|perhaps|i guess|i think|kind of|sort of)\b/i,
      /\?{2,}/, // Multiple question marks
    ];
    const isAmbiguous = ambiguousPatterns.some((pattern) => pattern.test(text));
    if (isAmbiguous && ambiguityTolerance < 50) {
      const penalty = (50 - ambiguityTolerance) * 0.3; // Up to 15 point penalty
      adjustedScore -= penalty;
    }

    // Emotional Penalty: Penalize emotional missteps
    const emotionalPenalty = difficultyConfig.emotionalPenalty ?? 30;
    const negativeEmotionalPatterns = [
      /\b(desperate|needy|clingy|obsessed)\b/i,
      /\b(please|beg|plead)\b/i,
    ];
    const hasEmotionalMisstep = negativeEmotionalPatterns.some((pattern) =>
      pattern.test(lower),
    );
    if (hasEmotionalMisstep && emotionalPenalty > 0) {
      const penalty = (emotionalPenalty / 100) * 20; // Up to 20 point penalty
      adjustedScore -= penalty;
    }

    // Bonus for Cleverness: Reward witty/clever responses
    const bonusForCleverness = difficultyConfig.bonusForCleverness ?? 40;
    const cleverPatterns = [
      /\b(witty|clever|smart|brilliant)\b/i,
      /!{1,2}$/, // Exclamation marks (enthusiasm)
      /\b(haha|lol|😂|😅)\b/i, // Humor indicators
    ];
    const isClever = cleverPatterns.some((pattern) => pattern.test(text));
    if (isClever && bonusForCleverness > 0) {
      const bonus = (bonusForCleverness / 100) * 10; // Up to 10 point bonus
      adjustedScore += bonus;
    }

    // Step 6.1 Fix: Recovery Difficulty - affects how hard it is to recover from low scores
    // If previous score was low and current score is better, recovery difficulty affects the improvement
    const recoveryDifficulty = difficultyConfig.recoveryDifficulty ?? 50;
    if (previousScore !== null && previousScore !== undefined && previousScore < adjustedScore) {
      // User is recovering from a low score
      const improvement = adjustedScore - previousScore;
      const recoveryFactor = recoveryDifficulty / 100; // 0 to 1, higher = harder recovery
      // Higher recovery difficulty = less effective recovery (reduces improvement)
      const recoveryPenalty = improvement * recoveryFactor * 0.3; // Up to 30% reduction
      adjustedScore -= recoveryPenalty;
    }

    // Step 6.1 Fix: Fail Threshold - scores below this are considered "failing"
    // This doesn't change the score itself, but we track it for later use
    // The actual fail threshold check happens in mission state computation
    // We just ensure the score reflects the threshold context here
    const failThreshold = difficultyConfig.failThreshold ?? null;
    if (failThreshold !== null && adjustedScore < failThreshold) {
      // Score is below fail threshold - apply additional penalty based on how far below
      const distanceBelow = failThreshold - adjustedScore;
      const thresholdPenalty = Math.min(distanceBelow * 0.1, 10); // Up to 10 point additional penalty
      adjustedScore -= thresholdPenalty;
    }

    return adjustedScore;
  }

  /**
   * Build PREMIUM deep session analysis from the full conversation.
   * Still deterministic & cheap – no external AI.
   */
  private buildPremiumAnalysis(
    messages: PracticeMessageInput[],
    perMessage: AiMessageScoreBase[],
  ): AiSessionAnalysisPremium {
    const scores = perMessage.map((m) => m.score);
    const conversationScore =
      scores.length === 0
        ? 0
        : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    const emotionProfile = this.buildEmotionProfile(messages, perMessage);
    const topMessages = this.pickTopMessages(messages, perMessage, 3);
    const bottomMessages = this.pickBottomMessages(messages, perMessage, 3);
    const overallStrengths = this.deriveOverallStrengths(
      conversationScore,
      topMessages,
    );
    const overallWeaknesses = this.deriveOverallWeaknesses(
      conversationScore,
      bottomMessages,
    );
    const overallAdvice = this.deriveOverallAdvice(
      conversationScore,
      overallStrengths,
      overallWeaknesses,
    );

    const conversationStyle = this.buildConversationStyleLabel(
      conversationScore,
      emotionProfile,
    );

    return {
      conversationScore,
      conversationStyle,
      emotionProfile,
      topMessages,
      bottomMessages,
      overallStrengths,
      overallWeaknesses,
      overallAdvice,
    };
  }

  private buildEmotionProfile(
    messages: PracticeMessageInput[],
    perMessage: AiMessageScoreBase[],
  ): EmotionProfile {
    if (messages.length === 0) {
      return {
        tension: 40,
        warmth: 40,
        dominance: 40,
        flirtEnergy: 40,
      };
    }

    const allText = messages
      .map((m) => m.content.toLowerCase())
      .join(' ');

    const questionRatio =
      messages.length === 0
        ? 0
        : messages.filter((m) => m.content.includes('?')).length /
          messages.length;

    const exclamationRatio =
      messages.length === 0
        ? 0
        : messages.filter((m) => m.content.includes('!')).length /
          messages.length;

    const avgScore =
      perMessage.length === 0
        ? 0
        : perMessage.reduce((acc, m) => acc + m.score, 0) /
          perMessage.length;

    const flirtWords = ['date', 'drink', 'cute', 'hot', 'kiss', 'vibe'];
    const dominanceWords = ["let's", "here's the plan", "we'll"];
    const warmWords = ['love', 'nice', 'appreciate', 'glad'];

    const flirtHits = flirtWords.filter((w) => allText.includes(w)).length;
    const dominanceHits = dominanceWords.filter((w) =>
      allText.includes(w),
    ).length;
    const warmHits = warmWords.filter((w) => allText.includes(w)).length;

    const flirtEnergy = this.clamp(
      30 + flirtHits * 10 + exclamationRatio * 30,
      0,
      100,
    );
    const dominance = this.clamp(35 + dominanceHits * 12, 0, 100);
    const warmth = this.clamp(35 + warmHits * 10 + avgScore * 0.2, 0, 100);
    const tension = this.clamp(
      40 + questionRatio * 30 + flirtHits * 6,
      0,
      100,
    );

    return {
      tension,
      warmth,
      dominance,
      flirtEnergy,
    };
  }

  private pickTopMessages(
    messages: PracticeMessageInput[],
    perMessage: AiMessageScoreBase[],
    limit: number,
  ): AiMessageDeepInsight[] {
    const sorted = [...perMessage].sort((a, b) => b.score - a.score);
    const top = sorted.slice(0, limit);

    return top.map((entry) => {
      const original = messages.find((m) => m.index === entry.index);
      return {
        index: entry.index,
        userText: original?.content ?? '',
        score: entry.score,
        rarity: entry.rarity,
        strengths: this.deriveMessageStrengths(entry),
        weaknesses: [],
        advice:
          'Keep using this kind of structure – it carries clear intent and attractive energy. Next step is to mirror their vibe a bit more.',
      };
    });
  }

  private pickBottomMessages(
    messages: PracticeMessageInput[],
    perMessage: AiMessageScoreBase[],
    limit: number,
  ): AiMessageDeepInsight[] {
    const sorted = [...perMessage].sort((a, b) => a.score - b.score);
    const bottom = sorted.slice(0, limit);

    return bottom.map((entry) => {
      const original = messages.find((m) => m.index === entry.index);
      return {
        index: entry.index,
        userText: original?.content ?? '',
        score: entry.score,
        rarity: entry.rarity,
        strengths: [],
        weaknesses: this.deriveMessageWeaknesses(entry),
        advice:
          'Trim the filler and add one clear, interesting detail or question. You want to make it easy and fun to respond.',
      };
    });
  }

  private deriveMessageStrengths(entry: AiMessageScoreBase): string[] {
    const strengths: string[] = [];

    if (entry.score >= 90) {
      strengths.push('Very strong, high-impact message.');
    } else if (entry.score >= 80) {
      strengths.push('Clearly above-average impact.');
    }

    if (entry.tags.includes('playful')) {
      strengths.push('Playful tone that keeps the vibe light.');
    }
    if (entry.tags.includes('confident')) {
      strengths.push('Confident delivery without over-explaining.');
    }
    if (entry.tags.includes('leading')) {
      strengths.push('You lead the interaction instead of waiting passively.');
    }

    if (strengths.length === 0) {
      strengths.push('Solid, clear message that moves the chat forward.');
    }

    return strengths;
  }

  private deriveMessageWeaknesses(entry: AiMessageScoreBase): string[] {
    const weaknesses: string[] = [];

    if (entry.score < 50) {
      weaknesses.push('Low perceived effort compared to your better messages.');
    }

    if (entry.tags.includes('low-impact')) {
      weaknesses.push('Does not create enough curiosity or emotional hook.');
    }

    if (!/[!?]|\?/.test(entry.microFeedback)) {
      weaknesses.push(
        'Could benefit from a clearer question or playful twist.',
      );
    }

    if (weaknesses.length === 0) {
      weaknesses.push(
        'Decent but forgettable – aim for a more vivid image or tease.',
      );
    }

    return weaknesses;
  }

  private deriveOverallStrengths(
    conversationScore: number,
    topMessages: AiMessageDeepInsight[],
  ): string[] {
    const strengths: string[] = [];

    if (conversationScore >= 80) {
      strengths.push('Overall strong conversation flow with attractive energy.');
    } else if (conversationScore >= 65) {
      strengths.push('Solid baseline – your chats are generally engaging.');
    }

    if (topMessages.length > 0) {
      strengths.push(
        'You already have a few messages that are genuinely high-level. Re-using their structure will compound your results.',
      );
    }

    if (strengths.length === 0) {
      strengths.push(
        'You have a workable foundation – nothing is broken, it just needs sharpening.',
      );
    }

    return strengths;
  }

  private deriveOverallWeaknesses(
    conversationScore: number,
    bottomMessages: AiMessageDeepInsight[],
  ): string[] {
    const weaknesses: string[] = [];

    if (conversationScore < 60) {
      weaknesses.push(
        'Your average message quality is holding you back – too many neutral or low-impact lines.',
      );
    }

    if (bottomMessages.length > 0) {
      weaknesses.push(
        'A few specific messages significantly drop the vibe; trimming or rewriting them would lift the whole session.',
      );
    }

    if (weaknesses.length === 0) {
      weaknesses.push(
        'Main opportunity is optimisation – turning “good” into “very good”.',
      );
    }

    return weaknesses;
  }

  private deriveOverallAdvice(
    conversationScore: number,
    strengths: string[],
    weaknesses: string[],
  ): string[] {
    const advice: string[] = [];

    if (conversationScore < 60) {
      advice.push(
        'Start by upgrading your weakest 2–3 messages per chat. Replace them with something a bit more specific, bold, or playful.',
      );
    } else if (conversationScore < 80) {
      advice.push(
        'You’re close to a very strong baseline. Focus on adding one memorable line per conversation – a tease, a frame, or a vivid image.',
      );
    } else {
      advice.push(
        'You’re already playing at a high level. Now the game is consistency: repeat your best patterns on purpose.',
      );
    }

    advice.push(
      'Pick one of your top messages from this session and reuse its structure in your next chats – you will feel how much easier it gets.',
    );

    if (weaknesses.length > 0) {
      advice.push(
        'Take one weakness from the list and turn it into a micro-challenge for the next week (e.g. “no more one-word replies”).',
      );
    }

    return advice;
  }

  private buildConversationStyleLabel(
    conversationScore: number,
    emotion: EmotionProfile,
  ): string {
    if (conversationScore >= 85 && emotion.flirtEnergy >= 70) {
      return 'Playful, confident and high-energy flirt.';
    }
    if (conversationScore >= 75 && emotion.warmth >= 70) {
      return 'Warm, engaging and emotionally safe vibe.';
    }
    if (emotion.dominance >= 70 && emotion.tension >= 60) {
      return 'Direct, leading style with solid tension.';
    }
    if (conversationScore < 60 && emotion.tension < 50) {
      return 'Too safe and low-tension – hard to feel a spark.';
    }
    return 'Balanced but a bit restrained – good base with room to turn the dial up.';
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
}
