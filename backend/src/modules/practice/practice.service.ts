// NOTE: This file currently uses Option A (rarity/xp-based) scoring/rewards,
// plus Option B AiCore metrics (charismaIndex + traits) for every real session.

// backend/src/modules/practice/practice.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { SessionsService } from '../sessions/sessions.service';
import { AiScoringService } from '../ai/ai-scoring.service';
import { PracticeMessageInput } from '../ai/ai.types';
import { AiCoreScoringService } from '../ai/ai-core-scoring.service';
import { TranscriptMessage } from '../ai/ai-scoring.types';

@Injectable()
export class PracticeService {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly aiScoring: AiScoringService,
    private readonly aiCore: AiCoreScoringService,
  ) {}

  async runRealSession(userId: string, dto: any) {
    const { messages } = dto;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new BadRequestException({
        code: 'PRACTICE_EMPTY',
        message: 'messages must contain at least one item',
      });
    }

    // Clean topic
    const topic = dto.topic?.trim() || 'Practice session';

    // Normalize incoming messages to PracticeMessageInput[]
    const normalizedMessages: PracticeMessageInput[] = messages.map(
      (m: any, index: number) => ({
        index,
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content ?? ''),
      }),
    );

    // Build transcript for Option B AiCore
    const transcript: TranscriptMessage[] = normalizedMessages.map((m) => ({
      sentBy: m.role === 'assistant' ? 'ai' : 'user',
      text: m.content,
    }));

    const aiCoreResult = await this.aiCore.scoreSession(transcript);

    // Useful logging while wiring the loop
    console.log('[AiCore v1]', {
      userId,
      topic,
      charismaIndex: aiCoreResult.metrics.charismaIndex,
      overallScore: aiCoreResult.metrics.overallScore,
      totalMessages: aiCoreResult.metrics.totalMessages,
    });

    // Option A AI scoring skeleton (rarity/xp engine)
    const aiResult = await this.aiScoring.scoreConversation({
      userId,
      personaId: dto.personaId ?? null,
      templateId: dto.templateId ?? null,
      messages: normalizedMessages,
    });

    // Convert AI result → SessionsService scoring format
    const messageScores = aiResult.perMessage.map((m) => m.score);

    // Let SessionsService handle DB writes + stats + wallet + AiCore persistence
    const sessionResult =
      await this.sessionsService.createScoredSessionFromScores({
        userId,
        topic,
        messageScores,
        aiCoreResult,
      });

    // Attach AI metadata to response
    return {
      ...sessionResult,
      ai: aiResult,
      aiCore: aiCoreResult,
    };
  }
}
