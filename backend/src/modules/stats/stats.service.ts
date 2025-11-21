// src/modules/stats/stats.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Safety net for legacy users:
   * Ensures every user has UserWallet + UserStats rows.
   */
  private async ensureUserProfilePrimitives(userId: string) {
    const [wallet, stats] = await Promise.all([
      this.prisma.userWallet.findUnique({ where: { userId } }),
      this.prisma.userStats.findUnique({ where: { userId } }),
    ]);

    if (wallet && stats) return;

    await this.prisma.$transaction(async (tx) => {
      if (!wallet) {
        await tx.userWallet.create({
          data: {
            userId,
            xp: 0,
            level: 1,
            coins: 0,
            gems: 0,
            lifetimeXp: 0,
          },
        });
      }

      if (!stats) {
        await tx.userStats.create({
          data: {
            userId,
            sessionsCount: 0,
            successCount: 0,
            failCount: 0,
            averageScore: 0,
            averageMessageScore: 0,
            lastSessionAt: null,
          },
        });
      }
    });
  }

  /**
   * Main unified dashboard response builder.
   * Combines:
   * - User
   * - UserWallet
   * - UserStats
   * - Latest Option-B metrics
   * - Aggregated Option-B metrics
   * - Insights (latest + performance trends)
   */
  async getDashboardForUser(userId: string) {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id in request',
      });
    }

    await this.ensureUserProfilePrimitives(userId);

    const [user, wallet, stats, latestSession, aggregated, lastSessions] =
      await Promise.all([
        // Basic user row
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            createdAt: true,
            streakCurrent: true,
          },
        }),

        this.prisma.userWallet.findUnique({ where: { userId } }),
        this.prisma.userStats.findUnique({ where: { userId } }),

        // Most recent session with Option-B data (fallback to score)
        this.prisma.practiceSession.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            score: true,
            createdAt: true,
            charismaIndex: true,
            confidenceScore: true,
            clarityScore: true,
            humorScore: true,
            tensionScore: true,
            emotionalWarmth: true,
            dominanceScore: true,
            fillerWordsCount: true,
            totalMessages: true,
            totalWords: true,
            aiCoreVersion: true,
            aiSummary: true,
          },
        }),

        // Average Option-B metrics
        this.prisma.practiceSession.aggregate({
          where: {
            userId,
            charismaIndex: { not: null },
          },
          _avg: {
            charismaIndex: true,
            confidenceScore: true,
            clarityScore: true,
            humorScore: true,
            tensionScore: true,
            emotionalWarmth: true,
            dominanceScore: true,
            fillerWordsCount: true,
            totalMessages: true,
            totalWords: true,
          },
        }),

        // Last 3 sessions with Option-B metrics
        this.prisma.practiceSession.findMany({
          where: {
            userId,
            charismaIndex: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            charismaIndex: true,
            confidenceScore: true,
            clarityScore: true,
            humorScore: true,
            tensionScore: true,
            emotionalWarmth: true,
            dominanceScore: true,
          },
        }),
      ]);

    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Safe defaults
    const safeWallet = wallet ?? {
      xp: 0,
      level: 1,
      coins: 0,
      gems: 0,
      lifetimeXp: 0,
      updatedAt: null,
      userId,
    };

    const safeStats = stats ?? {
      sessionsCount: 0,
      successCount: 0,
      failCount: 0,
      averageScore: 0,
      averageMessageScore: 0,
      lastSessionAt: null,
      lastUpdatedAt: null,
      userId,
    };

    // ======================================================
    // ⭐ B5 — Latest Option-B Metrics
    // ======================================================

    // Fallback: if charismaIndex is null, fallback to score
    const latestCharismaIndex =
      latestSession?.charismaIndex ??
      (typeof latestSession?.score === 'number'
        ? latestSession.score
        : null);

    const latest = {
      charismaIndex: latestCharismaIndex,
      confidenceScore: latestSession?.confidenceScore ?? null,
      clarityScore: latestSession?.clarityScore ?? null,
      humorScore: latestSession?.humorScore ?? null,
      tensionScore: latestSession?.tensionScore ?? null,
      emotionalWarmth: latestSession?.emotionalWarmth ?? null,
      dominanceScore: latestSession?.dominanceScore ?? null,
      fillerWordsCount: latestSession?.fillerWordsCount ?? null,
      totalMessages: latestSession?.totalMessages ?? null,
      totalWords: latestSession?.totalWords ?? null,
      aiCoreVersion: latestSession?.aiCoreVersion ?? null,
    };

    // ======================================================
    // ⭐ B5 — Averages across all sessions
    // ======================================================

    const averages = {
      avgCharismaIndex: aggregated._avg.charismaIndex ?? null,
      avgConfidence: aggregated._avg.confidenceScore ?? null,
      avgClarity: aggregated._avg.clarityScore ?? null,
      avgHumor: aggregated._avg.humorScore ?? null,
      avgTension: aggregated._avg.tensionScore ?? null,
      avgWarmth: aggregated._avg.emotionalWarmth ?? null,
      avgDominance: aggregated._avg.dominanceScore ?? null,
      avgFillerWords: aggregated._avg.fillerWordsCount ?? null,
      avgTotalWords: aggregated._avg.totalWords ?? null,
      avgTotalMessages: aggregated._avg.totalMessages ?? null,
    };

    // ======================================================
    // ⭐ B6 — Insights (latest + trait trends)
    // ======================================================

    const latestInsight = latestSession?.aiSummary ?? null;

    const improvingTraits: string[] = [];
    const decliningTraits: string[] = [];

    if (lastSessions.length >= 2) {
      const newest = lastSessions[0];
      const oldest =
        lastSessions[lastSessions.length - 1];

      const traitMap = [
        { key: 'charismaIndex', label: 'charisma' },
        { key: 'confidenceScore', label: 'confidence' },
        { key: 'clarityScore', label: 'clarity' },
        { key: 'humorScore', label: 'humor' },
        { key: 'tensionScore', label: 'tension control' },
        { key: 'emotionalWarmth', label: 'emotional warmth' },
        { key: 'dominanceScore', label: 'dominance' },
      ];

      const IMPROVE_THRESHOLD = 10;
      const DECLINE_THRESHOLD = -10;

      for (const trait of traitMap) {
        const newestVal = newest[trait.key];
        const oldestVal = oldest[trait.key];

        if (newestVal == null || oldestVal == null) continue;

        const delta = newestVal - oldestVal;

        if (delta >= IMPROVE_THRESHOLD) improvingTraits.push(trait.label);
        else if (delta <= DECLINE_THRESHOLD) decliningTraits.push(trait.label);
      }
    }

    const insights = {
      latest: latestInsight,
      trends: {
        improvingTraits,
        decliningTraits,
      },
    };

    // ======================================================
    // Final return
    // ======================================================

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      streak: {
        current: user.streakCurrent ?? 0,
      },
      wallet: {
        xp: safeWallet.xp,
        level: safeWallet.level,
        coins: safeWallet.coins,
        gems: safeWallet.gems,
        lifetimeXp: safeWallet.lifetimeXp,
      },
      stats: {
        sessionsCount: safeStats.sessionsCount,
        successCount: safeStats.successCount,
        failCount: safeStats.failCount,
        averageScore: safeStats.averageScore,
        averageMessageScore: safeStats.averageMessageScore,
        lastSessionAt: safeStats.lastSessionAt,

        latest,
        averages,
        insights,
      },
    };
  }
}
