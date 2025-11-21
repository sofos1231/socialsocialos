// backend/src/modules/ai/ai-core-scoring.service.ts

import { Injectable, Logger } from '@nestjs/common';
import {
  AiSessionResult,
  CoreMetrics,
  MessageEvaluation,
  TranscriptMessage,
  CharismaTraitKey,
} from './ai-scoring.types';

@Injectable()
export class AiCoreScoringService {
  private readonly logger = new Logger(AiCoreScoringService.name);

  /**
   * Core Option B engine.
   *
   * For 6A this is fully deterministic (no external AI calls).
   * Later, 6B+ can swap the internals to use a real LLM and keep
   * the same public API + types.
   */
  async scoreSession(transcript: TranscriptMessage[]): Promise<AiSessionResult> {
    if (!transcript || transcript.length === 0) {
      const empty: AiSessionResult = {
        metrics: {
          charismaIndex: 0,
          overallScore: 0,
          confidence: 0,
          clarity: 0,
          humor: 0,
          tensionControl: 0,
          emotionalWarmth: 0,
          dominance: 0,
          fillerWordsCount: 0,
          totalMessages: 0,
          totalWords: 0,
        },
        messages: [],
        version: 'v1',
      };
      this.logger.log('scoreSession called with empty transcript');
      return empty;
    }

    // 1) Evaluate each message into traits + label + flags
    const messagesEval: MessageEvaluation[] = transcript.map((msg) =>
      this.evaluateMessage(msg),
    );

    // 2) Aggregate into CoreMetrics
    const metrics = this.computeCoreMetrics(messagesEval);

    const result: AiSessionResult = {
      metrics,
      messages: messagesEval,
      version: 'v1',
    };

    this.logger.log(
      `AiCore v1 result — charismaIndex=${metrics.charismaIndex}, overallScore=${metrics.overallScore}`,
    );

    return result;
  }

  private evaluateMessage(msg: TranscriptMessage): MessageEvaluation {
    const text = (msg.text ?? '').trim();
    const baseScore = this.computeBaseScore(text);
    const traits = this.distributeScoreIntoTraits(baseScore, text);

    const avgTrait =
      Object.values(traits).reduce((a, b) => a + b, 0) /
      Object.values(traits).length;

    const label: MessageEvaluation['label'] =
      avgTrait >= 85
        ? 'great'
        : avgTrait >= 70
        ? 'good'
        : avgTrait >= 50
        ? 'neutral'
        : avgTrait >= 30
        ? 'weak'
        : 'cringe';

    const flags: string[] = [];
    const lower = text.toLowerCase();

    if (lower.includes('maybe') || lower.includes('i guess')) {
      flags.push('uncertainty');
    }
    if (text.length > 180) {
      flags.push('overexplaining');
    }
    if (text.length < 5) {
      flags.push('low-effort');
    }

    return {
      text,
      sentBy: msg.sentBy,
      traits,
      label,
      flags,
    };
  }

  private computeBaseScore(text: string): number {
    const len = text.length;

    if (len === 0) return 10;
    if (len < 5) return 35;
    if (len < 15) return 55;
    if (len < 40) return 75;
    if (len < 80) return 82;
    return 70; // slightly penalize over-long walls
  }

  private distributeScoreIntoTraits(
    baseScore: number,
    text: string,
  ): Record<CharismaTraitKey, number> {
    const lower = text.toLowerCase();

    let confidence = baseScore;
    let clarity = baseScore;
    let humor = 40;
    let tensionControl = 50;
    let emotionalWarmth = 50;
    let dominance = 50;

    // Questions → tension & engagement
    if (/\?/.test(text)) {
      tensionControl += 10;
    }

    // Emojis / laughter → humor
    if (/haha|lol|😂|😅/.test(lower)) {
      humor += 20;
    }

    // Softening language → less confidence/dominance
    if (lower.includes('maybe') || lower.includes('i guess')) {
      confidence -= 15;
      dominance -= 10;
    }

    // Leading language → more dominance
    if (lower.includes("let's") || lower.includes('lets ')) {
      dominance += 15;
    }

    // Warm words → emotionalWarmth
    if (
      lower.includes('nice') ||
      lower.includes('glad') ||
      lower.includes('love')
    ) {
      emotionalWarmth += 15;
    }

    const clamp = (v: number) => Math.max(0, Math.min(100, v));

    return {
      confidence: clamp(confidence),
      clarity: clamp(clarity),
      humor: clamp(humor),
      tensionControl: clamp(tensionControl),
      emotionalWarmth: clamp(emotionalWarmth),
      dominance: clamp(dominance),
    };
  }

  private computeCoreMetrics(messages: MessageEvaluation[]): CoreMetrics {
    const userMessages = messages.filter((m) => m.sentBy === 'user');

    const totalMessages = userMessages.length;
    const totalWords = userMessages
      .map((m) => (m.text ? m.text.trim().split(/\s+/).length : 0))
      .reduce((a, b) => a + b, 0);

    const fillerList = ['like', 'um', 'uh', 'you know', 'kinda', 'sort of'];
    const fillerWordsCount = userMessages
      .map((m) => m.text.toLowerCase())
      .reduce((acc, text) => {
        let count = 0;
        for (const word of fillerList) {
          const regex = new RegExp(`\\b${word}\\b`, 'g');
          count += (text.match(regex) || []).length;
        }
        return acc + count;
      }, 0);

    const avgTrait = (key: CharismaTraitKey) => {
      if (userMessages.length === 0) return 0;
      const sum = userMessages
        .map((m) => m.traits[key])
        .reduce((a, b) => a + b, 0);
      return Math.round(sum / userMessages.length);
    };

    const confidence = avgTrait('confidence');
    const clarity = avgTrait('clarity');
    const humor = avgTrait('humor');
    const tensionControl = avgTrait('tensionControl');
    const emotionalWarmth = avgTrait('emotionalWarmth');
    const dominance = avgTrait('dominance');

    const charismaIndex = Math.round(
      0.3 * confidence +
        0.25 * clarity +
        0.2 * emotionalWarmth +
        0.15 * humor +
        0.1 * tensionControl,
    );

    const overallScore = charismaIndex;

    return {
      charismaIndex,
      overallScore,
      confidence,
      clarity,
      humor,
      tensionControl,
      emotionalWarmth,
      dominance,
      fillerWordsCount,
      totalMessages,
      totalWords,
    };
  }
}
