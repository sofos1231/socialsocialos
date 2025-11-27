// FILE: backend/src/modules/practice/practice.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { AiScoringService } from '../ai/ai-scoring.service';
import { AiCoreScoringService } from '../ai/ai-core-scoring.service';
import { AiChatService } from '../ai/providers/ai-chat.service';
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
    private readonly aiChat: AiChatService,
    private readonly sessions: SessionsService,
  ) {}

  /**
   * Main practice session entry point (text chat).
   * Now returns aiReply every time, and persists real messages.
   */
  async runPracticeSession(userId: string, dto: CreatePracticeSessionDto) {
    if (!userId) throw new BadRequestException('Missing userId.');
    if (!dto?.messages || dto.messages.length === 0) {
      throw new BadRequestException('No messages provided.');
    }

    // If templateId is present, validate it exists and pull contract (for FE debug + prompt wiring).
    const missionContract = dto.templateId
      ? await this.loadMissionContract(dto.templateId)
      : null;

    // Option A scoring should be based on USER messages only.
    const userOnly = dto.messages.filter((m) => m.role === 'USER');
    if (userOnly.length === 0) {
      throw new BadRequestException('No USER messages provided.');
    }

    const normalizedUser: AiPracticeMessageInput[] = userOnly.map((m, idx) => ({
      index: idx,
      role: 'user',
      content: m.content,
    }));

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

    // Option B scoring uses transcript. (We score from the current transcript BEFORE generating new assistant reply.)
    const transcriptForCore: TranscriptMessage[] = dto.messages.map((m) => ({
      text: m.content,
      sentBy: m.role === 'USER' ? 'user' : 'ai',
    }));

    const aiCoreResult = await this.aiCore.scoreSession(transcriptForCore);

    // NEW: generate assistant reply using mission contract + persona + conversation
    const { aiReply, aiDebug } = await this.aiChat.generateReply({
      userId,
      topic: dto.topic,
      messages: dto.messages,
      templateId: dto.templateId ?? null,
      personaId: dto.personaId ?? null,
    });

    // Persist session with REAL transcript (including the new assistant reply)
    const transcriptToPersist = [
      ...dto.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'AI' as const, content: aiReply },
    ];

    const saved = await this.sessions.createScoredSessionFromScores({
      userId,
      topic: dto.topic,
      messageScores,
      aiCoreResult,
      templateId: dto.templateId ?? null,
      personaId: dto.personaId ?? null,
      transcript: transcriptToPersist,
      assistantReply: aiReply,
    });

    return {
      ...saved,
      aiReply,
      aiDebug: process.env.NODE_ENV !== 'production' ? aiDebug : undefined,
      mission: dto.templateId
        ? { templateId: dto.templateId, aiContract: missionContract }
        : null,
    };
  }

  private async loadMissionContract(templateId: string) {
    const template = await this.prisma.practiceMissionTemplate.findUnique({
      where: { id: templateId },
      select: { aiContract: true },
    });

    if (!template) throw new NotFoundException('Mission template not found.');
    return template.aiContract ?? null;
  }
}
