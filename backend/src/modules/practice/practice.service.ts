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

type MissionStateStatus = 'IN_PROGRESS' | 'SUCCESS' | 'FAIL';

export interface MissionStatePayload {
  status: MissionStateStatus;
  /**
   * 0–100 – how far the user is into the mission according to simple heuristics.
   */
  progressPct: number;
  /**
   * Average score (0–100) over this session’s USER messages.
   */
  averageScore: number;
  /**
   * Number of USER messages in this session.
   */
  totalMessages: number;
}

/**
 * Simple, deterministic mission state calculator.
 * This is *frontend-facing* state only — DB persistence stays inside SessionsService.
 */
function computeMissionState(
  messageScores: number[],
  totalUserMessages: number,
): MissionStatePayload {
  if (!messageScores.length || totalUserMessages === 0) {
    return {
      status: 'IN_PROGRESS',
      progressPct: 0,
      averageScore: 0,
      totalMessages: 0,
    };
  }

  const sum = messageScores.reduce((acc, v) => acc + v, 0);
  const averageScore = sum / messageScores.length;

  // Heuristic progress: נניח שמיסיה טיפוסית היא 5 הודעות יוזר.
  const ESTIMATED_MESSAGES_FOR_MISSION = 5;
  const rawProgress = (totalUserMessages / ESTIMATED_MESSAGES_FOR_MISSION) * 100;
  const progressPct = Math.max(5, Math.min(100, Math.round(rawProgress)));

  // Heuristic status rules:
  // - SUCCESS: ממוצע >= 90 ויש לפחות 3 הודעות
  // - FAIL: ממוצע < 60 ויש לפחות 3 הודעות
  // - אחרת: IN_PROGRESS
  let status: MissionStateStatus = 'IN_PROGRESS';
  if (totalUserMessages >= 3) {
    if (averageScore >= 90) {
      status = 'SUCCESS';
    } else if (averageScore < 60) {
      status = 'FAIL';
    }
  }

  return {
    status,
    progressPct,
    averageScore: Math.round(averageScore),
    totalMessages: totalUserMessages,
  };
}

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
   * Now returns aiReply every time, persists real messages,
   * AND exposes missionState for real-time mission feedback in the app.
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

    // Generate assistant reply using mission contract + persona + conversation
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

    // 🔥 NEW: missionState for real-time mission mood + progress UI
    const missionState = computeMissionState(messageScores, userOnly.length);

    return {
      ...saved,
      aiReply,
      aiDebug: process.env.NODE_ENV !== 'production' ? aiDebug : undefined,
      mission: dto.templateId
        ? { templateId: dto.templateId, aiContract: missionContract }
        : null,
      missionState,
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
