// backend/src/modules/ai/ai-scoring.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import {
  computeSessionRewards,
  MessageEvaluationInput,
  MessageRarity,
} from '../sessions/scoring';

/**
 * Canonical AI scoring input shape.
 * This is what the practice domain sends to "the AI".
 */
export interface AiScoringInput {
  userId: string;
  personaId?: string | null;
  templateId?: string | null;
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }[];
}

/**
 * Per-message score returned from the AI layer.
 */
export interface AiMessageScore {
  index: number;
  score: number;          // 0–100
  rarity: MessageRarity;  // 'C' | 'B' | 'A' | 'S' | 'S+'
}

/**
 * Overall scoring result for a conversation.
 */
export interface AiScoringResult {
  overallScore: number;         // 0–100 (rounded)
  messageScores: AiMessageScore[];
  notes?: string | null;        // optional AI comments / insight
}

/**
 * Phase 5.2.1–5.2.3 — AI scoring skeleton.
 *
 * Right now this service does NOT call any external LLM.
 * It just uses a deterministic score pattern + the existing
 * computeSessionRewards() logic to produce a realistic shape.
 *
 * Later (Phase 5.3) we'll swap the implementation so that
 * it actually calls a real AI provider, without changing
 * the public method signatures.
 */
@Injectable()
export class AiScoringService {
  // Temporary deterministic pattern (same spirit as Phase 3 mock)
  private static readonly SCORE_PATTERN: number[] = [62, 74, 88, 96];

  async scoreConversation(input: AiScoringInput): Promise<AiScoringResult> {
    const { userId, messages, personaId, templateId } = input;

    if (!userId) {
      throw new BadRequestException({
        code: 'AI_SCORING_MISSING_USER',
        message: 'AiScoringService.scoreConversation: userId is required',
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new BadRequestException({
        code: 'AI_SCORING_EMPTY_MESSAGES',
        message: 'AiScoringService.scoreConversation: messages must contain at least one item',
      });
    }

    // Phase 5.2.x: deterministic mock scoring.
    // We completely ignore message content for now and just
    // apply the SCORE_PATTERN repeatedly over the conversation length.
    const rawScores: number[] = messages.map((_m, index) => {
      const pattern = AiScoringService.SCORE_PATTERN;
      return pattern[index % pattern.length];
    });

    const inputs: MessageEvaluationInput[] = rawScores.map((score) => ({ score }));
    const summary = computeSessionRewards(inputs);

    const overallScore = Math.round(summary.finalScore);

    const messageScores: AiMessageScore[] = summary.messages.map((m, index) => ({
      index,
      score: m.score,
      rarity: m.rarity as MessageRarity,
    }));

    // Simple mock insight — later real LLM will generate this.
    const notes = [
      'Mock AI (Phase 5.2): deterministic scoring used for this session.',
      personaId ? `Persona attached: ${personaId}` : null,
      templateId ? `Template attached: ${templateId}` : null,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      overallScore,
      messageScores,
      notes: notes || null,
    };
  }
}
