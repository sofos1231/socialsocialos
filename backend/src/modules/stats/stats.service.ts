// src/modules/stats/stats.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Safety net for legacy users:
   * Makes sure every user has UserWallet + UserStats rows.
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
   * B8.1 – Compute a single Social Score from latest/average charisma index.
   * Prefer latest charismaIndex, fallback to averages, otherwise null.
   */
  private computeSocialScore(
    latestCharismaIndex: number | null,
    avgCharismaIndex: number | null,
  ): number | null {
    if (typeof latestCharismaIndex === 'number') {
      return Math.round(latestCharismaIndex);
    }
    if (typeof avgCharismaIndex === 'number') {
      return Math.round(avgCharismaIndex);
    }
    return null;
  }

  /**
   * B8.1 – Map Social Score to a tier label.
   *
   * < 40      → Beginner
   * 40–54     → Improving
   * 55–69     → Competent
   * 70–79     → Skilled
   * 80–89     → Strong
   * 90–96     → Elite
   * ≥ 97      → Apex
   */
  private mapSocialTier(score: number | null): string | null {
    if (score == null) return null;
    if (score < 40) return 'Beginner';
    if (score < 55) return 'Improving';
    if (score < 70) return 'Competent';
    if (score < 80) return 'Skilled';
    if (score < 90) return 'Strong';
    if (score < 97) return 'Elite';
    return 'Apex';
  }

  /**
   * Main dashboard summary for a user.
   * Reads User + UserWallet + UserStats + latest/average PracticeSession metrics
   * and returns a unified object.
   *
   * Top-level shape stays the same:
   * { ok, user, streak, wallet, stats }
   *
   * Inside `stats` we now also expose:
   * - stats.latest        → latest Option-B metrics (per-session)
   * - stats.averages      → average Option-B metrics across all sessions
   * - stats.insights      → latest aiSummary + improving/declining traits
   * - stats.socialScore   → main Social Score number (B8.1)
   * - stats.socialTier    → corresponding tier label (B8.1)
   * - stats.recentSessions→ last 5 session scores for trend visualization (B8.2)
   */
  async getDashboardForUser(userId: string) {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id in request',
      });
    }

    // Make sure wallet + stats exist (for old users)
    await this.ensureUserProfilePrimitives(userId);

    const [user, wallet, stats, latestSession, aggregated, lastSessions] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            createdAt: true,
            streakCurrent: true,
          },
        }),
        this.prisma.userWallet.findUnique({
          where: { userId },
        }),
        this.prisma.userStats.findUnique({
          where: { userId },
        }),

        // Latest session for Option-B metrics (and fallback score)
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

        // Aggregated Option-B metrics over all sessions that have them
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

        // B6 + B8.2: last up to 5 sessions with Option-B metrics
        this.prisma.practiceSession.findMany({
          where: {
            userId,
            charismaIndex: { not: null },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            createdAt: true,
            score: true,
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

    // Defensive defaults – should normally be non-null
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

    // ---------- B5: Latest Option-B metrics ----------

    // Fallback logic: if charismaIndex is null (old session), fall back to score.
    const latestCharismaIndex =
      latestSession?.charismaIndex ??
      (typeof latestSession?.score === 'number' ? latestSession.score : null);

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

    // ---------- B5: Average Option-B metrics ----------

    const avg = aggregated._avg;

    const averages = {
      avgCharismaIndex: avg.charismaIndex ?? null,
      avgConfidence: avg.confidenceScore ?? null,
      avgClarity: avg.clarityScore ?? null,
      avgHumor: avg.humorScore ?? null,
      avgTension: avg.tensionScore ?? null,
      avgWarmth: avg.emotionalWarmth ?? null,
      avgDominance: avg.dominanceScore ?? null,
      avgFillerWords: avg.fillerWordsCount ?? null,
      avgTotalWords: avg.totalWords ?? null,
      avgTotalMessages: avg.totalMessages ?? null,
    };

    // ---------- B6: Insights (latest + trends) ----------

    // Latest single-session insight (from aiSummary on the latest session)
    const latestInsight = latestSession?.aiSummary ?? null;

    // Trends: compare newest vs oldest of the lastSessions array
    const improvingTraits: string[] = [];
    const decliningTraits: string[] = [];

    if (lastSessions.length >= 2) {
      const newest = lastSessions[0];
      const oldest = lastSessions[lastSessions.length - 1];

      const traitDefs: { key: keyof typeof newest; label: string }[] = [
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

      for (const t of traitDefs) {
        const newestVal = newest[t.key];
        const oldestVal = oldest[t.key];

        if (newestVal == null || oldestVal == null) continue;

        const delta = (newestVal as number) - (oldestVal as number);

        if (delta >= IMPROVE_THRESHOLD) {
          improvingTraits.push(t.label);
        } else if (delta <= DECLINE_THRESHOLD) {
          decliningTraits.push(t.label);
        }
      }
    }

    const insights = {
      latest: latestInsight,
      trends: {
        improvingTraits,
        decliningTraits,
      },
    };

    // ---------- B8.1: Social Score + Tier ----------

    const socialScore = this.computeSocialScore(
      latest.charismaIndex,
      averages.avgCharismaIndex,
    );

    const socialTier = this.mapSocialTier(socialScore);

    // ---------- B8.2: Recent sessions bundle (last 5) ----------

    const recentSessions = lastSessions.map((session) => {
      const charismaVal =
        typeof session.charismaIndex === 'number'
          ? session.charismaIndex
          : null;

      const scoreVal =
        charismaVal ??
        (typeof session.score === 'number' ? session.score : null);

      return {
        createdAt: session.createdAt.toISOString(),
        charismaIndex: charismaVal,
        score: scoreVal,
      };
    });

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      streak: {
        current: user.streakCurrent ?? 0, // לוגיקת streak מלאה תבוא בפאזה מאוחרת יותר
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
 
 
        // B5 metrics:
        latest,
        averages,

        // B6 insights:
        insights,

        // B8.1 Social Score system:
        socialScore,
        socialTier,

        // B8.2 recent sessions history:
        recentSessions,
      },
    };
  }
}
