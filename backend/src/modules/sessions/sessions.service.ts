// FILE: backend/src/modules/sessions/sessions.service.ts

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { StatsService } from '../stats/stats.service';
import {
  computeSessionRewards,
  MessageEvaluationInput,
  SessionRewardsSummary,
  MessageRarity,
} from './scoring';
import { MessageGrade, MessageRole } from '@prisma/client';
import { AiSessionResult } from '../ai/ai-scoring.types';
import { buildAiInsightSummary } from '../ai/ai-insights';

// Temporary: mock scores for the /sessions/mock endpoint
const MOCK_MESSAGE_SCORES: number[] = [62, 74, 88, 96];

// Mapping rarity → dashboard grade
const RARITY_TO_GRADE: Record<MessageRarity, MessageGrade> = {
  C: MessageGrade.BAD,
  B: MessageGrade.WEAK,
  A: MessageGrade.NEUTRAL,
  S: MessageGrade.GOOD,
  'S+': MessageGrade.BRILLIANT,
};

type TranscriptMsg = { role: 'USER' | 'AI'; content: string };

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statsService: StatsService,
  ) {}

  private async ensureUserProfilePrimitives(userId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.userWallet.upsert({
        where: { userId },
        create: {
          userId,
          xp: 0,
          level: 1,
          coins: 0,
          gems: 0,
          lifetimeXp: 0,
        },
        update: {},
      });

      await tx.userStats.upsert({
        where: { userId },
        create: {
          userId,
          sessionsCount: 0,
          successCount: 0,
          failCount: 0,
          averageScore: 0,
          averageMessageScore: 0,
          lastSessionAt: null,
        },
        update: {},
      });
    });
  }

  /**
   * Core transaction: creates PracticeSession + ChatMessages + stats + wallet.
   * If transcript is provided: persist REAL messages (USER + AI).
   * If transcript is missing: keep legacy behavior (mock messages) for mock endpoints.
   */
  private async runScoredSession(params: {
    userId: string;
    topic: string;
    messageScores: number[];
    templateId?: string | null;
    personaId?: string | null;
    transcript?: TranscriptMsg[];
  }): Promise<{
    summary: SessionRewardsSummary;
    finalScore: number;
    isSuccess: boolean;
    sessionId: string;
  }> {
    const { userId, topic, messageScores, templateId, personaId, transcript } =
      params;

    if (!messageScores || !Array.isArray(messageScores) || messageScores.length === 0) {
      throw new BadRequestException({
        code: 'SESSION_EMPTY',
        message: 'messageScores must contain at least one score',
      });
    }

    const now = new Date();

    // 1) Compute rewards from message scores (USER messages only)
    const inputs: MessageEvaluationInput[] = messageScores.map((score) => ({ score }));
    const summary: SessionRewardsSummary = computeSessionRewards(inputs);
    const finalScore = Math.round(summary.finalScore);
    const isSuccess = finalScore >= 60;

    const perMessageScores = summary.messages.map((m) => m.score);
    const sessionMessageAvg =
      perMessageScores.length > 0
        ? perMessageScores.reduce((sum, s) => sum + s, 0) / perMessageScores.length
        : 0;

    // 2) Transaction
    const createdSession = await this.prisma.$transaction(async (tx) => {
      const stats = await tx.userStats.findUnique({ where: { userId } });
      const wallet = await tx.userWallet.findUnique({ where: { userId } });

      if (!stats || !wallet) {
        throw new Error(
          'UserStats or UserWallet missing after ensureUserProfilePrimitives',
        );
      }

      // 2.1) Create PracticeSession
      const session = await tx.practiceSession.create({
        data: {
          userId,
          topic,
          score: finalScore,

          xpGained: summary.totalXp,
          coinsGained: summary.totalCoins,
          gemsGained: summary.totalGems,

          messageCount: messageScores.length,
          rarityCounts: summary.rarityCounts as any,
          payload: {
            messageScores,
            transcript: transcript ?? null,
          } as any,
          durationSec: 60,

          status: isSuccess ? 'SUCCESS' : 'FAIL',
          templateId: templateId ?? null,
          personaId: personaId ?? null,

          overallScore: finalScore,
          endedAt: now,
          isSuccess,
        },
      });

      // 2.2) Create ChatMessage rows
      if (transcript && transcript.length > 0) {
        // Map reward deltas onto USER messages in order
        const userRewards = summary.messages; // aligns with messageScores (USER-only)
        let userIdx = 0;

        const rows = transcript
          .filter((m) => typeof m?.content === 'string' && m.content.trim().length > 0)
          .map((m, i) => {
            if (m.role === 'USER') {
              const r = userRewards[userIdx];
              const score = r?.score ?? null;
              const rarity = r?.rarity ?? null;

              const row = {
                sessionId: session.id,
                userId,
                role: MessageRole.USER,
                content: m.content.trim(),
                grade: rarity ? RARITY_TO_GRADE[rarity] : null,
                xpDelta: r?.xp ?? 0,
                coinsDelta: r?.coins ?? 0,
                gemsDelta: r?.gems ?? 0,
                isBrilliant: rarity === 'S+',
                isLifesaver: false,
                meta: {
                  index: i,
                  userIndex: userIdx,
                  score,
                  rarity,
                } as any,
              };
              userIdx += 1;
              return row;
            }

            // AI/assistant rows: no deltas
            return {
              sessionId: session.id,
              userId,
              role: MessageRole.AI,
              content: m.content.trim(),
              grade: null,
              xpDelta: 0,
              coinsDelta: 0,
              gemsDelta: 0,
              isBrilliant: false,
              isLifesaver: false,
              meta: {
                index: i,
                generated: true,
              } as any,
            };
          });

        if (rows.length > 0) {
          await tx.chatMessage.createMany({ data: rows as any });
        }
      } else {
        // Legacy behavior for mock endpoints
        const messagesData = summary.messages.map((m, index) => ({
          sessionId: session.id,
          userId,
          role: MessageRole.USER,
          content: `Mock message #${index + 1}`,
          grade: RARITY_TO_GRADE[m.rarity],
          xpDelta: m.xp,
          coinsDelta: m.coins,
          gemsDelta: m.gems,
          isBrilliant: m.rarity === 'S+',
          isLifesaver: false,
          meta: {
            index,
            score: m.score,
            rarity: m.rarity,
          } as any,
        }));

        if (messagesData.length > 0) {
          await tx.chatMessage.createMany({ data: messagesData });
        }
      }

      // 2.3) Update UserStats
      const newSessionsCount = stats.sessionsCount + 1;
      const newSuccessCount = stats.successCount + (isSuccess ? 1 : 0);
      const newFailCount = stats.failCount + (isSuccess ? 0 : 1);

      const prevAvgScore = stats.averageScore ?? 0;
      const newAverageScore =
        (prevAvgScore * stats.sessionsCount + finalScore) / newSessionsCount;

      const prevAvgMessageScore = stats.averageMessageScore ?? 0;
      const newAverageMessageScore =
        (prevAvgMessageScore * stats.sessionsCount + sessionMessageAvg) /
        newSessionsCount;

      await tx.userStats.update({
        where: { userId },
        data: {
          sessionsCount: newSessionsCount,
          successCount: newSuccessCount,
          failCount: newFailCount,
          averageScore: newAverageScore,
          averageMessageScore: newAverageMessageScore,
          lastSessionAt: now,
          lastUpdatedAt: now,
        },
      });

      // 2.4) Update wallet
      await tx.userWallet.update({
        where: { userId },
        data: {
          xp: wallet.xp + summary.totalXp,
          lifetimeXp: wallet.lifetimeXp + summary.totalXp,
          coins: wallet.coins + summary.totalCoins,
          gems: wallet.gems + summary.totalGems,
        },
      });

      return session;
    });

    return {
      summary,
      finalScore,
      isSuccess,
      sessionId: createdSession.id,
    };
  }

  /**
   * Used by:
   * - /v1/sessions/mock
   * - /v1/practice/session
   */
  async createScoredSessionFromScores(params: {
    userId: string;
    topic: string;
    messageScores: number[];
    aiCoreResult?: AiSessionResult;

    // NEW (optional):
    templateId?: string | null;
    personaId?: string | null;
    transcript?: TranscriptMsg[];
    assistantReply?: string; // currently stored via transcript; kept for future
  }) {
    const {
      userId,
      topic,
      messageScores,
      aiCoreResult,
      templateId,
      personaId,
      transcript,
    } = params;

    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }

    await this.ensureUserProfilePrimitives(userId);

    const { summary, finalScore, isSuccess, sessionId } =
      await this.runScoredSession({
        userId,
        topic,
        messageScores,
        templateId: templateId ?? null,
        personaId: personaId ?? null,
        transcript,
      });

    // Option B: persist metrics + insights
    if (aiCoreResult?.metrics) {
      const m = aiCoreResult.metrics;
      const aiSummary = buildAiInsightSummary(aiCoreResult);

      await this.prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          charismaIndex: m.charismaIndex ?? null,
          confidenceScore: m.confidence ?? null,
          clarityScore: m.clarity ?? null,
          humorScore: m.humor ?? null,
          tensionScore: m.tensionControl ?? null,
          emotionalWarmth: m.emotionalWarmth ?? null,
          dominanceScore: m.dominance ?? null,

          fillerWordsCount: m.fillerWordsCount ?? null,
          totalMessages: m.totalMessages ?? null,
          totalWords: m.totalWords ?? null,

          aiCoreVersion: aiCoreResult.version ?? null,
          aiCorePayload: aiCoreResult as any,

          aiSummary: aiSummary ? (aiSummary as any) : null,
        },
      });
    }

    const dashboard = await this.statsService.getDashboardForUser(userId);

    return {
      ok: true,
      rewards: {
        score: finalScore,
        messageScore: finalScore,
        isSuccess,
        xpGained: summary.totalXp,
        coinsGained: summary.totalCoins,
        gemsGained: summary.totalGems,
        rarityCounts: summary.rarityCounts,
        messages: summary.messages.map((m, index) => ({
          index,
          score: m.score,
          rarity: m.rarity,
          xp: m.xp,
          coins: m.coins,
          gems: m.gems,
        })),
      },
      dashboard,
      sessionId,
    };
  }

  async createMockSession(userId: string) {
    return this.createScoredSessionFromScores({
      userId,
      topic: 'Mock practice session',
      messageScores: MOCK_MESSAGE_SCORES,
    });
  }

  async getDashboardSnapshot(userId: string) {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }
    return this.statsService.getDashboardForUser(userId);
  }
}
