// src/modules/stats/stats.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
// Step 5.4: Import badge registry
import { badgeRegistry } from '../badges/badge-registry';
import { BadgeProgressDTO } from '../badges/badges.types';
import { CategoryKey } from '../analytics/category-taxonomy';
// Step 5.5: Trait stats imports
import {
  TraitsSummaryResponse,
  TraitSummary,
  TraitHistoryResponse,
  TraitHistoryPoint,
  StatsSummaryResponse,
  TraitKey,
  AdvancedMetricsResponse,
  MessageEvolutionPoint,
  Radar360Traits,
  PersonaSensitivityRow,
  TrendingTraitsHeatmap,
  BehavioralBiasTrackerItem,
  SignatureStyleCard,
  HallOfFameMessageItem,
  MessageBreakdownDTO,
  WeekRangeDTO,
  TraitSynergyResponse,
  TraitSynergyNode,
  TraitSynergyEdge,
  MoodTimelineResponse,
} from './stats.types';
import { MoodTimelinePayload, MoodState } from '../mood/mood.types';
import { getCurrentWeekRange, getPreviousWeekRange, getWeekRangeForDate, getLastNWeeks } from './time-windows';
import { getAllImprovements } from './trait-improvement';
import { normalizeTraitData } from '../shared/normalizers/chat-message.normalizer';
import { MessageRole, AccountTier } from '@prisma/client';
import { getBiasExplanation } from './templates/bias.explanations';
import { getSignatureStyleDescription } from './templates/signatureStyle.descriptions';
import { generateWhyItWorked, generateWhatToImprove } from './templates/messageBreakdown.templates';
import { getCategoryForPattern } from '../analytics/category-taxonomy';
import { extractBiasKeysFromTraitData } from './bias/bias.config';
import { HALL_OF_FAME_SCORE_THRESHOLD, MESSAGE_EVOLUTION_MAX_SESSIONS, TRENDING_TRAITS_WEEKS } from './config/stats.config';

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
        // ✅ Step 6: Only include finalized sessions (endedAt IS NOT NULL) to prevent
        // unfinished sessions from polluting "latest completed" metrics.
        this.prisma.practiceSession.findFirst({
          where: {
            userId,
            endedAt: { not: null }, // Only finalized sessions
          },
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

  /**
   * Step 5.5: Get traits summary for a user
   * Returns current trait scores, weekly deltas, and improvement suggestions
   */
  async getTraitsSummaryForUser(userId: string): Promise<TraitsSummaryResponse> {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id in request',
      });
    }

    // Load current trait scores (fallback to zeros if missing)
    const traitScoresRow = await this.prisma.userTraitScores.findUnique({
      where: { userId },
    });

    const TRAIT_KEYS: TraitKey[] = [
      'confidence',
      'clarity',
      'humor',
      'tensionControl',
      'emotionalWarmth',
      'dominance',
    ];

    const currentScores: Record<TraitKey, number> = traitScoresRow?.traitsJson
      ? (traitScoresRow.traitsJson as any as Record<TraitKey, number>)
      : {
          confidence: 0,
          clarity: 0,
          humor: 0,
          tensionControl: 0,
          emotionalWarmth: 0,
          dominance: 0,
        };

    // Get week ranges
    const currentWeek = getCurrentWeekRange();
    const previousWeek = getPreviousWeekRange();

    // Query trait history for current week
    const currentWeekHistory = await this.prisma.userTraitHistory.findMany({
      where: {
        userId,
        recordedAt: {
          gte: currentWeek.start,
          lte: currentWeek.end,
        },
      },
      select: {
        traitsJson: true,
      },
    });

    // Query trait history for previous week
    const previousWeekHistory = await this.prisma.userTraitHistory.findMany({
      where: {
        userId,
        recordedAt: {
          gte: previousWeek.start,
          lte: previousWeek.end,
        },
      },
      select: {
        traitsJson: true,
      },
    });

    // Compute averages per trait for current week
    const currentWeekAverages: Record<TraitKey, number | null> = {
      confidence: null,
      clarity: null,
      humor: null,
      tensionControl: null,
      emotionalWarmth: null,
      dominance: null,
    };

    if (currentWeekHistory.length > 0) {
      for (const key of TRAIT_KEYS) {
        const values: number[] = [];
        for (const row of currentWeekHistory) {
          const traits = row.traitsJson as any as Record<TraitKey, number>;
          if (typeof traits[key] === 'number') {
            values.push(traits[key]);
          }
        }
        if (values.length > 0) {
          currentWeekAverages[key] = values.reduce((sum, v) => sum + v, 0) / values.length;
        }
      }
    }

    // Compute averages per trait for previous week
    const previousWeekAverages: Record<TraitKey, number | null> = {
      confidence: null,
      clarity: null,
      humor: null,
      tensionControl: null,
      emotionalWarmth: null,
      dominance: null,
    };

    if (previousWeekHistory.length > 0) {
      for (const key of TRAIT_KEYS) {
        const values: number[] = [];
        for (const row of previousWeekHistory) {
          const traits = row.traitsJson as any as Record<TraitKey, number>;
          if (typeof traits[key] === 'number') {
            values.push(traits[key]);
          }
        }
        if (values.length > 0) {
          previousWeekAverages[key] = values.reduce((sum, v) => sum + v, 0) / values.length;
        }
      }
    }

    // Compute weekly deltas
    const traits: TraitSummary[] = TRAIT_KEYS.map((key) => {
      const current = currentScores[key] ?? 0;
      const currentAvg = currentWeekAverages[key];
      const previousAvg = previousWeekAverages[key];
      
      const weeklyDelta =
        currentAvg !== null && previousAvg !== null ? currentAvg - previousAvg : null;

      return {
        traitKey: key,
        current,
        weeklyDelta,
        weekRange: currentWeek,
      };
    });

    // Compute sessionsThisWeek and avgScoreThisWeek
    const sessionsThisWeek = await this.prisma.practiceSession.count({
      where: {
        userId,
        createdAt: {
          gte: currentWeek.start,
          lte: currentWeek.end,
        },
        endedAt: { not: null }, // Only finalized sessions
      },
    });

    const sessionsThisWeekWithScores = await this.prisma.practiceSession.findMany({
      where: {
        userId,
        createdAt: {
          gte: currentWeek.start,
          lte: currentWeek.end,
        },
        endedAt: { not: null },
        score: { not: null },
      },
      select: {
        score: true,
      },
    });

    const avgScoreThisWeek =
      sessionsThisWeekWithScores.length > 0
        ? sessionsThisWeekWithScores.reduce((sum, s) => sum + (s.score ?? 0), 0) /
          sessionsThisWeekWithScores.length
        : undefined;

    // Load improvements
    const improvements = getAllImprovements();

    return {
      traits,
      sessionsThisWeek,
      avgScoreThisWeek,
      improvements,
    };
  }

  /**
   * Step 5.5: Get trait history for a user
   * Returns time-series points from UserTraitHistory (server-authoritative)
   */
  async getTraitHistoryForUser(userId: string, limit: number = 20): Promise<TraitHistoryResponse> {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id in request',
      });
    }

    const history = await this.prisma.userTraitHistory.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
      select: {
        sessionId: true,
        recordedAt: true,
        traitsJson: true,
      },
    });

    const points: TraitHistoryPoint[] = history.map((row) => ({
      sessionId: row.sessionId,
      recordedAtISO: row.recordedAt.toISOString(),
      traits: row.traitsJson as any as Record<TraitKey, number>,
    }));

    return { points };
  }

  /**
   * Step 5.5→5.6 glue: Get minimal stats summary including premium status
   */
  async getStatsSummaryForUser(userId: string): Promise<StatsSummaryResponse> {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id in request',
      });
    }

    // Get user tier for premium status
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    const isPremium = user?.tier === 'PREMIUM';

    // Get sessionsTotal from UserStats
    const stats = await this.prisma.userStats.findUnique({
      where: { userId },
      select: { sessionsCount: true },
    });

    const sessionsTotal = stats?.sessionsCount ?? 0;

    // Get sessionsThisWeek
    const currentWeek = getCurrentWeekRange();
    const sessionsThisWeek = await this.prisma.practiceSession.count({
      where: {
        userId,
        createdAt: {
          gte: currentWeek.start,
          lte: currentWeek.end,
        },
        endedAt: { not: null },
      },
    });

    // Get avgScoreThisWeek
    const sessionsThisWeekWithScores = await this.prisma.practiceSession.findMany({
      where: {
        userId,
        createdAt: {
          gte: currentWeek.start,
          lte: currentWeek.end,
        },
        endedAt: { not: null },
        score: { not: null },
      },
      select: {
        score: true,
      },
    });

    const avgScoreThisWeek =
      sessionsThisWeekWithScores.length > 0
        ? sessionsThisWeekWithScores.reduce((sum, s) => sum + (s.score ?? 0), 0) /
          sessionsThisWeekWithScores.length
        : undefined;

    // Get lastSessionId
    const lastSession = await this.prisma.practiceSession.findFirst({
      where: {
        userId,
        endedAt: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    return {
      sessionsTotal,
      sessionsThisWeek,
      avgScoreThisWeek,
      lastSessionId: lastSession?.id,
      isPremium,
    };
  }

  /**
   * Step 5.4: Get badges for a user
   * Returns all badge definitions with current progress/tier/thresholds
   */
  async getBadgesForUser(userId: string): Promise<{
    badges: BadgeProgressDTO[];
    recentEvents: Array<{
      badgeKey: string;
      fromTier: number;
      toTier: number;
      createdAt: string;
    }>;
  }> {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id in request',
      });
    }

    // Load all badge progress for user
    const progressRows = await this.prisma.userBadgeProgress.findMany({
      where: { userId },
    });

    // Load recent badge events (last 5)
    const recentEvents = await this.prisma.userBadgeEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        badgeKey: true,
        fromTier: true,
        toTier: true,
        createdAt: true,
      },
    });

    // Build badge DTOs (include badges not yet in DB as tier=0)
    const allBadges = badgeRegistry.getAll();
    const progressMap = new Map(progressRows.map((p) => [p.badgeKey, p]));

    const badges: BadgeProgressDTO[] = allBadges.map((badge) => {
      const progress = progressMap.get(badge.badgeKey);
      const tier = (progress?.tier ?? 0) as 0 | 1 | 2 | 3 | 4;
      const points = progress?.points ?? 0;

      // Compute next threshold
      const nextTier = (Math.min(tier + 1, 4) as 0 | 1 | 2 | 3 | 4);
      const nextThreshold = tier >= 4 ? badge.tierThresholds[4] : badge.tierThresholds[nextTier];

      // Current tier rewards
      const rewards = badge.rewardsByTier[tier];

      // Next tier rewards (if not maxed)
      const nextTierRewards = tier < 4 ? badge.rewardsByTier[nextTier] : undefined;

      return {
        badgeKey: badge.badgeKey,
        name: badge.name,
        categoryKey: badge.categoryKey,
        description: badge.description,
        tier,
        points,
        nextThreshold,
        rewards,
        nextTierRewards,
      };
    });

    return {
      badges,
      recentEvents: recentEvents.map((e) => ({
        badgeKey: e.badgeKey,
        fromTier: e.fromTier,
        toTier: e.toTier,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Step 5.6: Build message breakdown DTO from ChatMessage (minimal allowlisted DTO)
   */
  // Step 5.8: Made public for use by InsightsService
  buildMessageBreakdown(message: any): MessageBreakdownDTO {
    const traitData = normalizeTraitData(message.traitData);
    const traits = traitData.traits || {};
    const hooks = Array.isArray(traitData.hooks) ? traitData.hooks : [];
    const patterns = Array.isArray(traitData.patterns) ? traitData.patterns : [];
    const score = typeof message.score === 'number' ? message.score : 0;
    
    // Normalize traits to ensure all TraitKey fields exist (0-100 scale)
    const normalizedTraits: Record<TraitKey, number> = {
      confidence: typeof traits.confidence === 'number' ? Math.round(traits.confidence) : 0,
      clarity: typeof traits.clarity === 'number' ? Math.round(traits.clarity) : 0,
      humor: typeof traits.humor === 'number' ? Math.round(traits.humor) : 0,
      tensionControl: typeof traits.tensionControl === 'number' ? Math.round(traits.tensionControl) : 0,
      emotionalWarmth: typeof traits.emotionalWarmth === 'number' ? Math.round(traits.emotionalWarmth) : 0,
      dominance: typeof traits.dominance === 'number' ? Math.round(traits.dominance) : 0,
    };
    
    return {
      score,
      traits: normalizedTraits,
      hooks,
      patterns,
      whyItWorked: generateWhyItWorked(score, normalizedTraits, hooks),
      whatToImprove: generateWhatToImprove(score, normalizedTraits, patterns),
    };
  }

  /**
   * Step 5.6: Get advanced metrics for a user (Premium feature)
   * Returns all 7 systems: message evolution, radar360, persona sensitivity, etc.
   */
  async getAdvancedMetricsForUser(userId: string): Promise<AdvancedMetricsResponse> {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id in request',
      });
    }

    // Get user tier for premium status
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });
    const isPremium = user?.tier === AccountTier.PREMIUM;

    // Get burned message IDs (exclude from all queries)
    const burnedMessages = await this.prisma.burnedMessage.findMany({
      where: { userId },
      select: { messageId: true },
    });
    const burnedMessageIds = new Set(burnedMessages.map(b => b.messageId));

    // Load all user messages (USER role only, with scores)
    const allMessages = await this.prisma.chatMessage.findMany({
      where: {
        userId,
        role: MessageRole.USER,
        score: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        sessionId: true,
        content: true,
        score: true,
        createdAt: true,
        turnIndex: true,
        traitData: true,
      },
    });

    // Filter out burned messages
    const messages = allMessages.filter(m => !burnedMessageIds.has(m.id));

    // 1. Message Evolution (per-session avgMessageScore)
    // Use UserTraitHistory if available; else compute avg of user-role messages per session
    // Limit to last N sessions (e.g., 20) - not unbounded
    const traitHistorySessions = await this.prisma.userTraitHistory.findMany({
      where: { userId },
      select: {
        sessionId: true,
        avgMessageScore: true,
        recordedAt: true,
      },
      orderBy: { recordedAt: 'desc' }, // Get most recent first
      take: MESSAGE_EVOLUTION_MAX_SESSIONS,
    });
    
    // Reverse to get chronological order (oldest first)
    traitHistorySessions.reverse();

    const messageEvolution: MessageEvolutionPoint[] = [];
    
    // If UserTraitHistory has avgMessageScore, use it
    if (traitHistorySessions.length > 0) {
      for (const history of traitHistorySessions) {
        if (typeof history.avgMessageScore === 'number') {
          messageEvolution.push({
            sessionId: history.sessionId,
            recordedAtISO: history.recordedAt.toISOString(),
            avgMessageScore: Math.round(history.avgMessageScore),
          });
        }
      }
    } else {
      // Fallback: compute avgMessageScore per session from messages
      const sessionMessageMap = new Map<string, { scores: number[]; createdAt: Date }>();
      
      for (const msg of messages) {
        if (typeof msg.score === 'number') {
          if (!sessionMessageMap.has(msg.sessionId)) {
            sessionMessageMap.set(msg.sessionId, { scores: [], createdAt: msg.createdAt });
          }
          const entry = sessionMessageMap.get(msg.sessionId)!;
          entry.scores.push(msg.score);
          // Use earliest message time as session time
          if (msg.createdAt < entry.createdAt) {
            entry.createdAt = msg.createdAt;
          }
        }
      }
      
      for (const [sessionId, data] of sessionMessageMap.entries()) {
        if (data.scores.length > 0) {
          const avg = data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length;
          messageEvolution.push({
            sessionId,
            recordedAtISO: data.createdAt.toISOString(),
            avgMessageScore: Math.round(avg),
          });
        }
      }
      
      // Sort by recordedAtISO ascending
      messageEvolution.sort((a, b) => a.recordedAtISO.localeCompare(b.recordedAtISO));
    }

    // 2. Radar 360
    const currentTraitScores = await this.prisma.userTraitScores.findUnique({
      where: { userId },
      select: { traitsJson: true },
    });
    
    const currentTraits: Record<TraitKey, number> = currentTraitScores?.traitsJson
      ? (currentTraitScores.traitsJson as any)
      : {
          confidence: 0,
          clarity: 0,
          humor: 0,
          tensionControl: 0,
          emotionalWarmth: 0,
          dominance: 0,
        };

    // Get last 3 sessions' trait history
    const last3Sessions = await this.prisma.userTraitHistory.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      take: 3,
      select: { traitsJson: true },
    });

    let deltasVsLast3: Partial<Record<TraitKey, number>> = {};
    const microInsights: Array<{ traitKey: TraitKey; title: string; body: string }> = [];
    
    if (last3Sessions.length >= 3) {
      const traitKeys: TraitKey[] = ['confidence', 'clarity', 'humor', 'tensionControl', 'emotionalWarmth', 'dominance'];
      const last3Averages: Partial<Record<TraitKey, number>> = {};
      
      // Compute averages across last 3 sessions
      for (const key of traitKeys) {
        let sum = 0;
        let count = 0;
        for (const session of last3Sessions) {
          const traits = session.traitsJson as any;
          if (typeof traits[key] === 'number') {
            sum += traits[key];
            count++;
          }
        }
        if (count > 0) {
          last3Averages[key] = sum / count;
        }
      }
      
      // Compute deltas and generate microInsights
      for (const key of traitKeys) {
        const current = currentTraits[key] ?? 0;
        const avg = last3Averages[key];
        if (avg !== undefined) {
          const delta = current - avg;
          deltasVsLast3[key] = Math.round(delta * 10) / 10;
          
          if (Math.abs(delta) > 2) {
            const direction = delta > 0 ? 'improving' : 'declining';
            const traitLabels: Record<TraitKey, string> = {
              confidence: 'Confidence',
              clarity: 'Clarity',
              humor: 'Humor',
              tensionControl: 'Tension Control',
              emotionalWarmth: 'Emotional Warmth',
              dominance: 'Dominance',
            };
            const traitLabel = traitLabels[key];
            
            microInsights.push({
              traitKey: key,
              title: `${traitLabel} is ${direction}`,
              body: `Your ${traitLabel.toLowerCase()} has ${direction === 'improving' ? 'increased' : 'decreased'} by ${Math.abs(Math.round(delta))} points compared to your last 3 sessions.`,
            });
          }
        }
      }
    }

    const radar360: Radar360Traits = {
      current: currentTraits,
      deltasVsLast3,
      microInsights: microInsights.slice(0, 3),
    };

    // 3. Persona Sensitivity
    const personaSessions = await this.prisma.practiceSession.findMany({
      where: {
        userId,
        personaId: { not: null },
        endedAt: { not: null },
      },
      include: {
        persona: {
          select: { code: true },
        },
        traitHistory: {
          select: { traitsJson: true },
        },
      },
    });

    const personaMap = new Map<string, { sessions: typeof personaSessions; code?: string }>();
    for (const session of personaSessions) {
      if (session.personaId) {
        if (!personaMap.has(session.personaId)) {
          personaMap.set(session.personaId, { sessions: [], code: session.persona?.code || undefined });
        }
        personaMap.get(session.personaId)!.sessions.push(session);
      }
    }

    const personaSensitivity: PersonaSensitivityRow[] = [];
    const traitKeys: TraitKey[] = ['confidence', 'clarity', 'humor', 'tensionControl', 'emotionalWarmth', 'dominance'];
    
    for (const [personaId, data] of personaMap.entries()) {
      const sessionsWithTraits = data.sessions.filter(s => s.traitHistory);
      if (sessionsWithTraits.length === 0) continue;
      
      let scoreSum = 0;
      let scoreCount = 0;
      const traitSums: Partial<Record<TraitKey, number>> = {};
      const traitCounts: Partial<Record<TraitKey, number>> = {};
      
      for (const session of sessionsWithTraits) {
        if (typeof session.score === 'number') {
          scoreSum += session.score;
          scoreCount++;
        }
        if (session.traitHistory) {
          const traits = session.traitHistory.traitsJson as any;
          for (const key of traitKeys) {
            if (typeof traits[key] === 'number') {
              traitSums[key] = (traitSums[key] || 0) + traits[key];
              traitCounts[key] = (traitCounts[key] || 0) + 1;
            }
          }
        }
      }
      
      const avgScore = scoreCount > 0 ? scoreSum / scoreCount : 0;
      const traitProfile: Record<TraitKey, number> = {} as Record<TraitKey, number>;
      for (const key of traitKeys) {
        traitProfile[key] = traitCounts[key] && traitCounts[key]! > 0
          ? Math.round(traitSums[key]! / traitCounts[key]!)
          : 0;
      }
      
      // Compute deltaPct (vs overall average if available)
      const allSessionsAvg = await this.prisma.practiceSession.aggregate({
        where: {
          userId,
          endedAt: { not: null },
          score: { not: null },
        },
        _avg: { score: true },
      });
      const overallAvg = allSessionsAvg._avg.score || 0;
      const deltaPct = overallAvg > 0 ? ((avgScore - overallAvg) / overallAvg) * 100 : undefined;

      // Generate deterministic explanation
      const explanation = data.code
        ? `You perform ${deltaPct && deltaPct > 0 ? 'better' : deltaPct && deltaPct < 0 ? 'worse' : 'similarly'} with ${data.code} persona (${sessionsWithTraits.length} session${sessionsWithTraits.length !== 1 ? 's' : ''})`
        : `Performance with persona ${personaId} (${sessionsWithTraits.length} session${sessionsWithTraits.length !== 1 ? 's' : ''})`;

      personaSensitivity.push({
        personaKey: data.code || personaId, // Use code as personaKey
        sessions: sessionsWithTraits.length,
        avgScore: Math.round(avgScore),
        deltaPct: deltaPct !== undefined ? Math.round(deltaPct * 10) / 10 : undefined,
        explanation,
      });
    }

    // 4. Trending Traits Heatmap (last N weeks)
    const lastNWeeks = getLastNWeeks(TRENDING_TRAITS_WEEKS);
    const weeklyTraits = await Promise.all(
      lastNWeeks.map(async (weekRange) => {
        const weekHistory = await this.prisma.userTraitHistory.findMany({
          where: {
            userId,
            recordedAt: {
              gte: weekRange.start,
              lte: weekRange.end,
            },
          },
          select: { traitsJson: true },
        });
        
        if (weekHistory.length === 0) {
          return {
            weekRange: {
              startISO: weekRange.startISO,
              endISO: weekRange.endISO,
              tz: weekRange.tz,
            },
            traits: {
              confidence: 0,
              clarity: 0,
              humor: 0,
              tensionControl: 0,
              emotionalWarmth: 0,
              dominance: 0,
            } as Record<TraitKey, number>,
          };
        }
        
        const traitSums: Partial<Record<TraitKey, number>> = {};
        const traitCounts: Partial<Record<TraitKey, number>> = {};
        
        for (const session of weekHistory) {
          const traits = session.traitsJson as any;
          for (const key of traitKeys) {
            if (typeof traits[key] === 'number') {
              traitSums[key] = (traitSums[key] || 0) + traits[key];
              traitCounts[key] = (traitCounts[key] || 0) + 1;
            }
          }
        }
        
        const weeklyTraits: Record<TraitKey, number> = {} as Record<TraitKey, number>;
        for (const key of traitKeys) {
          weeklyTraits[key] = traitCounts[key] && traitCounts[key]! > 0
            ? Math.round(traitSums[key]! / traitCounts[key]!)
            : 0;
        }
        
        return {
          weekRange: {
            startISO: weekRange.startISO,
            endISO: weekRange.endISO,
            tz: weekRange.tz,
          },
          traits: weeklyTraits, // Will be mapped to 'values' in response
        };
      }),
    );

    // Map to contract format: weekStartISO + values
    const trendingTraitsHeatmap: TrendingTraitsHeatmap = {
      weeks: weeklyTraits.map((week) => ({
        weekStartISO: week.weekRange.startISO,
        values: week.traits,
      })),
    };

    // 5. Behavioral Bias Tracker
    // Use bias.config.ts to map patterns/hooks/flags to biasKey
    const currentWeek = getCurrentWeekRange();
    const lastWeekStart = new Date(currentWeek.start.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = new Date(currentWeek.start.getTime() - 1); // End of last week

    // Get sessions from current week and last week
    const currentWeekSessions = await this.prisma.practiceSession.findMany({
      where: {
        userId,
        endedAt: { not: null },
        createdAt: {
          gte: currentWeek.start,
          lte: currentWeek.end,
        },
      },
      include: {
        messages: {
          where: {
            role: MessageRole.USER,
          },
          select: { traitData: true },
        },
      },
    });

    const lastWeekSessions = await this.prisma.practiceSession.findMany({
      where: {
        userId,
        endedAt: { not: null },
        createdAt: {
          gte: lastWeekStart,
          lte: lastWeekEnd,
        },
      },
      include: {
        messages: {
          where: {
            role: MessageRole.USER,
          },
          select: { traitData: true },
        },
      },
    });

    // Count bias keys in current week (using bias.config mapping)
    const currentWeekBiasCounts = new Map<string, number>();
    for (const session of currentWeekSessions) {
      for (const msg of session.messages) {
        const traitData = normalizeTraitData(msg.traitData);
        const biasKeys = extractBiasKeysFromTraitData(traitData);
        for (const biasKey of biasKeys) {
          currentWeekBiasCounts.set(biasKey, (currentWeekBiasCounts.get(biasKey) || 0) + 1);
        }
      }
    }

    // Count bias keys in last week
    const lastWeekBiasCounts = new Map<string, number>();
    for (const session of lastWeekSessions) {
      for (const msg of session.messages) {
        const traitData = normalizeTraitData(msg.traitData);
        const biasKeys = extractBiasKeysFromTraitData(traitData);
        for (const biasKey of biasKeys) {
          lastWeekBiasCounts.set(biasKey, (lastWeekBiasCounts.get(biasKey) || 0) + 1);
        }
      }
    }

    // Build items
    const behavioralBiasItems: BehavioralBiasTrackerItem[] = [];
    const allBiasKeys = new Set([...currentWeekBiasCounts.keys(), ...lastWeekBiasCounts.keys()]);
    
    for (const biasKey of allBiasKeys) {
      const countThisWeek = currentWeekBiasCounts.get(biasKey) || 0;
      const countLastWeek = lastWeekBiasCounts.get(biasKey) || 0;
      const deltaVsLastWeek = countLastWeek > 0 ? countThisWeek - countLastWeek : null;
      
      behavioralBiasItems.push({
        biasKey,
        countThisWeek,
        deltaVsLastWeek,
        explanation: getBiasExplanation(biasKey, countThisWeek, deltaVsLastWeek),
      });
    }
    
    // Sort by countThisWeek descending
    behavioralBiasItems.sort((a, b) => b.countThisWeek - a.countThisWeek);

    // 6. Signature Style Card
    const allLabels = new Map<string, number>();
    const allHooks = new Map<string, number>();
    const allPatterns = new Map<string, number>();
    
    for (const msg of messages) {
      const traitData = normalizeTraitData(msg.traitData);
      if (traitData.label) {
        allLabels.set(traitData.label, (allLabels.get(traitData.label) || 0) + 1);
      }
      if (Array.isArray(traitData.hooks)) {
        for (const hook of traitData.hooks) {
          allHooks.set(hook, (allHooks.get(hook) || 0) + 1);
        }
      }
      if (Array.isArray(traitData.patterns)) {
        for (const pattern of traitData.patterns) {
          allPatterns.set(pattern, (allPatterns.get(pattern) || 0) + 1);
        }
      }
    }
    
    const mostCommonLabels = Array.from(allLabels.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => key);
    
    const mostCommonHooks = Array.from(allHooks.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => key);
    
    const mostCommonPatterns = Array.from(allPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => key);
    
    // Find dominant trait (highest average)
    let maxAvg = 0;
    let dominantTrait: TraitKey = 'confidence';
    for (const [key, value] of Object.entries(currentTraits)) {
      if (value > maxAvg) {
        maxAvg = value;
        dominantTrait = key as TraitKey;
      }
    }
    
    // Generate signature style card with archetype classification
    const traitLabels: Record<TraitKey, string> = {
      confidence: 'Confidence',
      clarity: 'Clarity',
      humor: 'Humor',
      tensionControl: 'Tension Control',
      emotionalWarmth: 'Emotional Warmth',
      dominance: 'Dominance',
    };
    
    const archetypeKey = `ARCHETYPE_${dominantTrait.toUpperCase()}`;
    const title = `${traitLabels[dominantTrait]} Leader`;
    const description = getSignatureStyleDescription(dominantTrait, mostCommonLabels, mostCommonHooks);
    const supportingSignals = [...mostCommonHooks, ...mostCommonLabels].slice(0, 5);
    
    const signatureStyleCard: SignatureStyleCard = {
      archetypeKey,
      title,
      description,
      supportingSignals,
    };

    // 7. Hall of Fame (read from HallOfFameMessage table, exclude burned)
    const hallOfFameMessages = await this.prisma.hallOfFameMessage.findMany({
      where: {
        userId,
        messageId: { notIn: Array.from(burnedMessageIds) }, // Exclude burned
      },
      orderBy: [
        { score: 'desc' },
        { createdAt: 'desc' }, // Deterministic tie-breaker
      ],
      take: 10,
      include: {
        message: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            traitData: true,
          },
        },
      },
    });

    const hallOfFame: HallOfFameMessageItem[] = [];
    for (const hofEntry of hallOfFameMessages) {
      const msg = hofEntry.message;
      const content = typeof msg.content === 'string' ? msg.content : '';
      const contentSnippet = content.length > 100 ? content.substring(0, 100) + '...' : content;

      hallOfFame.push({
        messageId: hofEntry.messageId,
        sessionId: hofEntry.sessionId,
        recordedAtISO: msg.createdAt.toISOString(),
        turnIndex: hofEntry.turnIndex,
        contentSnippet,
        score: hofEntry.score,
        breakdown: this.buildMessageBreakdown(msg), // 5.7 glue: minimal allowlisted DTO
      });
    }

    return {
      isPremium,
      messageEvolution: { points: messageEvolution },
      radar360,
      personaSensitivity: { rows: personaSensitivity },
      trendingTraitsHeatmap,
      behavioralBiasTracker: {
        items: behavioralBiasItems.slice(0, 10), // Top 10 patterns
      },
      signatureStyleCard,
      hallOfFame: { messages: hallOfFame },
    };
  }

  /**
   * Step 5.7 Glue: Get top N positive messages (for Message Analyzer)
   * Reads from HallOfFameMessage, excludes burned messages
   */
  async getTopPositiveMessages(userId: string, limit: number = 10): Promise<HallOfFameMessageItem[]> {
    const burnedMessages = await this.prisma.burnedMessage.findMany({
      where: { userId },
      select: { messageId: true },
    });
    const burnedMessageIds = new Set(burnedMessages.map(b => b.messageId));

    const hallOfFameMessages = await this.prisma.hallOfFameMessage.findMany({
      where: {
        userId,
        messageId: { notIn: Array.from(burnedMessageIds) },
        score: { gte: HALL_OF_FAME_SCORE_THRESHOLD },
      },
      orderBy: [
        { score: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      include: {
        message: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            traitData: true,
          },
        },
      },
    });

    return hallOfFameMessages.map((hofEntry) => {
      const msg = hofEntry.message;
      const content = typeof msg.content === 'string' ? msg.content : '';
      const contentSnippet = content.length > 100 ? content.substring(0, 100) + '...' : content;

      return {
        messageId: hofEntry.messageId,
        sessionId: hofEntry.sessionId,
        recordedAtISO: msg.createdAt.toISOString(),
        turnIndex: hofEntry.turnIndex,
        contentSnippet,
        score: hofEntry.score,
        breakdown: this.buildMessageBreakdown(msg),
      };
    });
  }

  /**
   * Step 5.7 Glue: Get top N negative messages (for Message Analyzer)
   * Reads from ChatMessage, excludes burned messages
   */
  async getTopNegativeMessages(userId: string, limit: number = 10): Promise<HallOfFameMessageItem[]> {
    const burnedMessages = await this.prisma.burnedMessage.findMany({
      where: { userId },
      select: { messageId: true },
    });
    const burnedMessageIds = new Set(burnedMessages.map(b => b.messageId));

    const lowScoringMessages = await this.prisma.chatMessage.findMany({
      where: {
        userId,
        role: MessageRole.USER,
        score: { not: null },
        id: { notIn: Array.from(burnedMessageIds) },
      },
      orderBy: [
        { score: 'asc' },
        { createdAt: 'asc' },
      ],
      take: limit,
      select: {
        id: true,
        sessionId: true,
        content: true,
        createdAt: true,
        turnIndex: true,
        score: true,
        traitData: true,
      },
    });

    return lowScoringMessages.map((msg) => {
      const content = typeof msg.content === 'string' ? msg.content : '';
      const contentSnippet = content.length > 100 ? content.substring(0, 100) + '...' : content;

      return {
        messageId: msg.id,
        sessionId: msg.sessionId,
        recordedAtISO: msg.createdAt.toISOString(),
        turnIndex: typeof msg.turnIndex === 'number' ? msg.turnIndex : 0,
        contentSnippet,
        score: typeof msg.score === 'number' ? msg.score : 0,
        breakdown: this.buildMessageBreakdown(msg),
      };
    });
  }

  /**
   * Step 5.9: Get trait synergy map for a user
   * Returns the latest session's synergy data, or safe defaults if none exists
   */
  async getSynergyForUser(userId: string): Promise<TraitSynergyResponse> {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id in request',
      });
    }

    // 1) Find latest completed PracticeSession for this user
    const latestSession = await this.prisma.practiceSession.findFirst({
      where: {
        userId,
        status: {
          in: ['SUCCESS', 'FAIL', 'ABORTED'], // Only finalized sessions
        },
      },
      orderBy: {
        endedAt: 'desc', // Most recently ended first
      },
      select: {
        id: true,
      },
    });

    // 2) Load SessionTraitSynergy for that sessionId (or return safe defaults)
    if (!latestSession) {
      // No sessions yet - return empty structure
      return {
        nodes: [],
        edges: [],
        correlationMatrix: {},
      };
    }

    const synergy = await this.prisma.sessionTraitSynergy.findUnique({
      where: { sessionId: latestSession.id },
      select: {
        synergyJson: true,
      },
    });

    if (!synergy) {
      // Synergy not computed yet - return empty structure
      return {
        nodes: [],
        edges: [],
        correlationMatrix: {},
      };
    }

    // 3) Map stored synergyJson → TraitSynergyResponse
    const json = synergy.synergyJson as any;

    // Validate version
    if (json?.version !== 'v1') {
      // Unknown version - return safe defaults
      return {
        nodes: [],
        edges: [],
        correlationMatrix: {},
      };
    }

    // Extract graph data
    const graphData = json?.graphData;
    const nodes: TraitSynergyNode[] = Array.isArray(graphData?.nodes)
      ? graphData.nodes.map((n: any) => ({
          id: String(n.id || ''),
          label: String(n.label || ''),
          x: typeof n.x === 'number' ? n.x : 0,
          y: typeof n.y === 'number' ? n.y : 0,
        }))
      : [];

    const edges: TraitSynergyEdge[] = Array.isArray(graphData?.edges)
      ? graphData.edges.map((e: any) => ({
          source: String(e.source || ''),
          target: String(e.target || ''),
          weight: typeof e.weight === 'number' ? e.weight : 0,
        }))
      : [];

    // Extract correlation matrix
    const correlationMatrix: Record<string, Record<string, number>> =
      json?.correlationMatrix && typeof json.correlationMatrix === 'object'
        ? json.correlationMatrix
        : {};

    return {
      nodes,
      edges,
      correlationMatrix,
    };
  }

  /**
   * Step 5.10: Get mood timeline for a session
   */
  async getMoodTimelineForSession(
    userId: string,
    sessionId: string,
  ): Promise<MoodTimelineResponse> {
    // Validate ownership
    const timeline = await this.prisma.missionMoodTimeline.findUnique({
      where: { sessionId },
      include: {
        session: {
          select: { userId: true },
        },
      },
    });

    if (!timeline) {
      throw new Error(`Mood timeline not found for session ${sessionId}`);
    }

    if (timeline.session.userId !== userId) {
      throw new Error(`Session ${sessionId} does not belong to user ${userId}`);
    }

    // Extract payload from timelineJson
    const payload = timeline.timelineJson as any;

    // Extract insights if available
    const insights = payload?.moodInsights?.insights || [];

    return {
      sessionId,
      payload: payload as MoodTimelinePayload,
      current: {
        moodState: timeline.currentMoodState as MoodState,
        moodPercent: timeline.currentMoodPercent,
      },
      insights,
    };
  }
}
