// FILE: backend/src/modules/practice/practice.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { AiScoringService } from '../ai/ai-scoring.service';
import { AiCoreScoringService } from '../ai/ai-core-scoring.service';
import { SessionsService } from '../sessions/sessions.service';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';

import type { PracticeMessageInput as AiPracticeMessageInput } from '../ai/ai.types';
import type { TranscriptMessage } from '../ai/ai-scoring.types';

@Injectable()
export class PracticeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiScoring: AiScoringService,
    private readonly aiCore: AiCoreScoringService,
    private readonly sessions: SessionsService,
  ) {}

  /**
   * Main practice session entry point (text chat).
   * Option A: rarity/xp-based rewards (AiScoringService + SessionsService rewards)
   * Option B: core traits (AiCoreScoringService) persisted via SessionsService.createScoredSessionFromScores
   */
  async runPracticeSession(userId: string, dto: CreatePracticeSessionDto) {
    if (!userId) {
      throw new BadRequestException('Missing userId.');
    }

    if (!dto?.messages || dto.messages.length === 0) {
      throw new BadRequestException('No messages provided.');
    }

    // If templateId is present, validate it exists and pull contract (currently not used by AiScoringService).
    const missionContract = dto.templateId
      ? await this.loadMissionContract(dto.templateId)
      : null;

    // Option A scoring should be based on USER messages (not the AI messages).
    const userOnly = dto.messages.filter((m) => m.role === 'USER');
    if (userOnly.length === 0) {
      throw new BadRequestException('No USER messages provided.');
    }

    // Normalize USER messages for Option A scorer: role must be 'user'|'assistant' (ai.types)
    const normalizedUser: AiPracticeMessageInput[] = userOnly.map((m, idx) => ({
      index: idx,
      role: 'user',
      content: m.content,
    }));

    // Option A: per-message scores + rarity (AiScoringService has scoreConversation)
    const aiResult = await this.aiScoring.scoreConversation({
      userId,
      personaId: dto.personaId ?? null,
      templateId: dto.templateId ?? null,
      messages: normalizedUser,
    });

    const messageScores = (aiResult?.perMessage ?? []).map((m) => m.score);
    if (messageScores.length === 0) {
      throw new BadRequestException('AI scoring produced no message scores.');
    }

    const transcript: TranscriptMessage[] = dto.messages.map((m) => ({
      text: m.content,
      sentBy: m.role === 'USER' ? 'user' : 'ai',
    }));
    

    const aiCoreResult = await this.aiCore.scoreSession(transcript);

    // Persist session via the real SessionsService API that exists in your repo
    const saved = await this.sessions.createScoredSessionFromScores({
      userId,
      topic: dto.topic,
      messageScores,
      aiCoreResult,
    });

    // It's safe to return extra context; frontend can ignore it.
    return {
      ...saved,
      mission: dto.templateId
        ? { templateId: dto.templateId, aiContract: missionContract }
        : null,
    };
  }

  /**
   * Loads mission template contract JSON from Prisma.
   * Prisma schema field is: PracticeMissionTemplate.aiContract (Json?)
   */
  private async loadMissionContract(templateId: string) {
    const template = await this.prisma.practiceMissionTemplate.findUnique({
      where: { id: templateId },
      select: {
        aiContract: true,
      },
    });

    if (!template) {
      throw new NotFoundException('Mission template not found.');
    }

    return template.aiContract ?? null;
  }
}
