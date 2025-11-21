// NOTE: This file currently uses Option A (rarity/xp-based) scoring/rewards
// as the primary reward engine, and additionally persists Option B AiCore
// metrics + insights into PracticeSession when provided.

// backend/src/modules/sessions/sessions.service.ts

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

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statsService: StatsService,
  ) {}

  /**
   * Safety net: make sure wallet + stats exist for the user.
   */
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
   * General scored-session engine – heart of the loop.
   * Does NOT return dashboard; only summary + sessionId.
   */
  private async runScoredSession(params: {
    userId: string;
    topic: string;
    messageScores: number[];
  }): Promise<{
    summary: SessionRewardsSummary;
    finalScore: number;
    isSuccess: boolean;
    sessionId: string;
  }> {
    const { userId, topic, messageScores } = params;

    if (
      !messageScores ||
      !Array.isArray(messageScores) ||
      messageScores.length === 0
    ) {
      throw new BadRequestException({
        code: 'SESSION_EMPTY',
        message: 'messageScores must contain at least one score',
      });
    }

    const now = new Date();

    // 1) Compute rewards from message scores
    const inputs: MessageEvaluationInput[] = messageScores.map((score) => ({
      score,
    }));

    const summary: SessionRewardsSummary = computeSessionRewards(inputs);
    const finalScore = Math.round(summary.finalScore);
    const isSuccess = finalScore >= 60;

    // Average per-message score for this session
    const perMessageScores = summary.messages.map((m) => m.score);
    const sessionMessageAvg =
      perMessageScores.length > 0
        ? perMessageScores.reduce((sum, s) => sum + s, 0) /
          perMessageScores.length
        : 0;

    // 2) Transaction: PracticeSession + ChatMessages + stats + wallet
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
          payload: { messageScores },
          durationSec: 60,

          status: isSuccess ? 'SUCCESS' : 'FAIL',
          templateId: null,
          personaId: null,
          overallScore: finalScore,
          endedAt: now,
          isSuccess,
        },
      });

      // 2.2) Create ChatMessage rows (currently mock content)
      const messagesData = summary.messages.map((m, index) => ({
        sessionId: session.id,
        userId,
        role: MessageRole.USER,
        content: `Mock message #${index + 1}`, // later: real text from conversation
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
   * General API used by:
   * - /v1/sessions/mock
   * - /v1/practice/session
   *
   * Option A: still responsible for rewards (xp/coins/gems + rarity/messages).
   * Option B: if aiCoreResult exists, we also update AiCore fields on PracticeSession
   *           and aiSummary with insights.
   */
  async createScoredSessionFromScores(params: {
    userId: string;
    topic: string;
    messageScores: number[];
    aiCoreResult?: AiSessionResult;
  }) {
    const { userId, topic, messageScores, aiCoreResult } = params;

    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }

    await this.ensureUserProfilePrimitives(userId);

    const { summary, finalScore, isSuccess, sessionId } =
      await this.runScoredSession({ userId, topic, messageScores });

    // Option B: if we got AiCoreResult, persist metrics + insights to PracticeSession
    if (aiCoreResult?.metrics) {
      const m = aiCoreResult.metrics;
      const aiSummary = buildAiInsightSummary(aiCoreResult);

      await this.prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          // Core scores
          charismaIndex: m.charismaIndex ?? null,
          confidenceScore: m.confidence ?? null,
          clarityScore: m.clarity ?? null,
          humorScore: m.humor ?? null,
          tensionScore: m.tensionControl ?? null,
          emotionalWarmth: m.emotionalWarmth ?? null,
          dominanceScore: m.dominance ?? null,

          // Counters
          fillerWordsCount: m.fillerWordsCount ?? null,
          totalMessages: m.totalMessages ?? null,
          totalWords: m.totalWords ?? null,

          // Versioning + raw payload
          aiCoreVersion: aiCoreResult.version ?? null,
          aiCorePayload: aiCoreResult as any,

          // Single-session insight summary
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

  /**
   * Mock endpoint – uses createScoredSessionFromScores with static scores.
   */
  async createMockSession(userId: string) {
    return this.createScoredSessionFromScores({
      userId,
      topic: 'Mock practice session',
      messageScores: MOCK_MESSAGE_SCORES,
      // No AiCore mock for now
    });
  }

  /**
   * Alias: if someone still hits /v1/sessions/dashboard/summary.
   */
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
