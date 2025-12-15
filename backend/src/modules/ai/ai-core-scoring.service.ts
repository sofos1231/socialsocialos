// backend/src/modules/ai/ai-core-scoring.service.ts

import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import {
  AiSessionResult,
  CoreMetrics,
  MessageEvaluation,
  TranscriptMessage,
  CharismaTraitKey,
} from './ai-scoring.types';
import { EngineConfigService } from '../engine-config/engine-config.service';

@Injectable()
export class AiCoreScoringService {
  private readonly logger = new Logger(AiCoreScoringService.name);
  private traitWeights: {
    confidence: number;
    clarity: number;
    humor: number;
    tensionControl: number;
    emotionalWarmth: number;
    dominance: number;
  } | null = null;

  constructor(
    @Optional()
    @Inject(forwardRef(() => EngineConfigService))
    private readonly engineConfigService?: EngineConfigService,
  ) {
    // Load trait weights on startup
    this.loadTraitWeights();
  }

  /**
   * Load trait weights from EngineConfig
   */
  private async loadTraitWeights() {
    try {
      if (this.engineConfigService) {
        const profile = await this.engineConfigService.getScoringProfile();
        if (profile?.traitWeights) {
          this.traitWeights = profile.traitWeights;
        }
      }
    } catch (e) {
      // Fallback to defaults (will use hard-coded values)
      this.traitWeights = null;
    }
  }

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
    const messagesEval: MessageEvaluation[] = await Promise.all(
      transcript.map((msg) => this.evaluateMessage(msg)),
    );

    // 2) Aggregate into CoreMetrics
    const metrics = await this.computeCoreMetrics(messagesEval);

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

  private async evaluateMessage(msg: TranscriptMessage): Promise<MessageEvaluation> {
    const text = (msg.text ?? '').trim();
    const baseScore = this.computeBaseScore(text);
    const traits = await this.distributeScoreIntoTraits(baseScore, text);

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

  private async distributeScoreIntoTraits(
    baseScore: number,
    text: string,
  ): Promise<Record<CharismaTraitKey, number>> {
    const lower = text.toLowerCase();

    // Get base trait values and adjustments from config
    let traitBaseValues = {
      humor: 40,
      tensionControl: 50,
      emotionalWarmth: 50,
      dominance: 50,
    };
    let traitAdjustments: Array<{
      pattern: string;
      trait: string;
      value: number;
    }> = [];

    try {
      if (this.engineConfigService) {
        const profile = await this.engineConfigService.getScoringProfile();
        if (profile?.traitBaseValues) {
          traitBaseValues = profile.traitBaseValues;
        }
        if (profile?.traitAdjustments && profile.traitAdjustments.length > 0) {
          traitAdjustments = profile.traitAdjustments;
        }
      }
    } catch (e) {
      // Use defaults if config unavailable
    }

    let confidence = baseScore;
    let clarity = baseScore;
    let humor = traitBaseValues.humor;
    let tensionControl = traitBaseValues.tensionControl;
    let emotionalWarmth = traitBaseValues.emotionalWarmth;
    let dominance = traitBaseValues.dominance;

    // Apply pattern-based adjustments from config
    // Pattern detection logic is intentionally hard-coded (regex/string matching)
    // but adjustment amounts come from config
    for (const adjustment of traitAdjustments) {
      let matches = false;

      // Pattern matching logic (intentionally hard-coded - this is the detection algorithm)
      switch (adjustment.pattern) {
        case 'questionMark':
          matches = /\?/.test(text);
          break;
        case 'emoji':
          matches = /haha|lol|😂|😅/.test(lower);
          break;
        case 'softLanguage':
          matches = lower.includes('maybe') || lower.includes('i guess');
          break;
        case 'leadingLanguage':
          matches = lower.includes("let's") || lower.includes('lets ');
          break;
        case 'warmWords':
          matches =
            lower.includes('nice') ||
            lower.includes('glad') ||
            lower.includes('love');
          break;
        default:
          // Unknown pattern - skip
          continue;
      }

      if (matches) {
        // Apply adjustment to the specified trait
        const traitKey = adjustment.trait as CharismaTraitKey;
        if (traitKey === 'confidence') confidence += adjustment.value;
        else if (traitKey === 'clarity') clarity += adjustment.value;
        else if (traitKey === 'humor') humor += adjustment.value;
        else if (traitKey === 'tensionControl')
          tensionControl += adjustment.value;
        else if (traitKey === 'emotionalWarmth')
          emotionalWarmth += adjustment.value;
        else if (traitKey === 'dominance') dominance += adjustment.value;
      }
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

  private async computeCoreMetrics(messages: MessageEvaluation[]): Promise<CoreMetrics> {
    const userMessages = messages.filter((m) => m.sentBy === 'user');

    const totalMessages = userMessages.length;
    const totalWords = userMessages
      .map((m) => (m.text ? m.text.trim().split(/\s+/).length : 0))
      .reduce((a, b) => a + b, 0);

    // Get filler words from config if available
    let fillerList: string[] = ['like', 'um', 'uh', 'you know', 'kinda', 'sort of'];
    try {
      if (this.engineConfigService) {
        const profile = await this.engineConfigService.getScoringProfile();
        if (profile?.fillerWords && profile.fillerWords.length > 0) {
          fillerList = profile.fillerWords;
        }
      }
    } catch (e) {
      // Use default filler words
    }

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

    // Use trait weights from config if available, otherwise fall back to hard-coded defaults
    const weights = this.traitWeights || {
      confidence: 0.3,
      clarity: 0.25,
      humor: 0.15,
      tensionControl: 0.1,
      emotionalWarmth: 0.2,
      dominance: 0.0,
    };

    const charismaIndex = Math.round(
      weights.confidence * confidence +
        weights.clarity * clarity +
        weights.emotionalWarmth * emotionalWarmth +
        weights.humor * humor +
        weights.tensionControl * tensionControl,
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
