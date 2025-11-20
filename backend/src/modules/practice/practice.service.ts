// backend/src/modules/practice/practice.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { SessionsService } from '../sessions/sessions.service';
import { AiScoringService } from '../ai/ai-scoring.service';

@Injectable()
export class PracticeService {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly aiScoring: AiScoringService,
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

    // 1) 👉 Call our AI scoring skeleton
    const aiResult = await this.aiScoring.scoreConversation({
      userId,
      personaId: dto.personaId ?? null,
      templateId: dto.templateId ?? null,
      messages,
    });

    // 2) Convert AI result → SessionsService scoring format
    const messageScores = aiResult.messageScores.map((m) => m.score);

    // 3) Let SessionsService handle DB writes + stats + wallet
    const sessionResult = await this.sessionsService.createScoredSessionFromScores({
      userId,
      topic,
      messageScores,
    });

    // 4) 🔥 Attach AI metadata (non-breaking, additive field)
    return {
      ...sessionResult,
      ai: {
        overallScore: aiResult.overallScore,
        notes: aiResult.notes,
      },
    };
  }
}
