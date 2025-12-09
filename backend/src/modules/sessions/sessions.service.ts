import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { StatsService } from '../stats/stats.service';
import { InsightsService } from '../insights/insights.service';
// Step 5.1: Import analytics services
import { MoodService } from '../mood/mood.service';
import { TraitsService } from '../traits/traits.service';
import { GatesService } from '../gates/gates.service';
import { PromptsService } from '../prompts/prompts.service';
// Step 5.4: Import badges service
import { BadgesService } from '../badges/badges.service';
// Step 5.9: Import synergy service
import { SynergyService } from '../synergy/synergy.service';
// Step 5.11: Import rotation service
import { RotationService } from '../rotation/rotation.service';
import {
  computeSessionRewards,
  MessageEvaluationInput,
  SessionRewardsSummary,
  MessageRarity,
} from './scoring';
import {
  MessageGrade,
  MessageRole,
  MissionProgressStatus,
  MissionStatus,
  RewardLedgerKind,
} from '@prisma/client';
import { AiSessionResult, MessageEvaluation } from '../ai/ai-scoring.types';
import { buildAiInsightSummary } from '../ai/ai-insights';
import { Prisma } from '@prisma/client';
// ✅ Step 5.5: Import normalizers from shared module (no service-to-service dependencies)
import { normalizeChatMessageRead } from '../shared/normalizers/chat-message.normalizer';
// Step 5.1: Import hook derivation functions
import { deriveHooks, derivePatterns } from '../analytics/hook-taxonomy';
// ✅ Step 5.6: Import allowlist serializer
import { toSessionsMockResponsePublic, toPracticeSessionResponsePublic } from '../shared/serializers/api-serializers';
// ✅ Step 5.7: Import shared normalizeEndReason
import { normalizeEndReason } from '../shared/normalizers/end-reason.normalizer';

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

// NOTE: keep role as string for flexibility; we still *expect* "USER"/"AI".
type TranscriptMsg = { role: string; content: string };

function safeTrim(s: any): string {
  return typeof s === 'string' ? s.trim() : '';
}

// Local helper for normalizing role from transcript (different from message normalization)
function normalizeRole(role: any): MessageRole {
  if (role === 'USER' || role === MessageRole.USER) return MessageRole.USER;
  if (role === 'AI' || role === MessageRole.AI) return MessageRole.AI;
  if (role === 'SYSTEM' || role === MessageRole.SYSTEM) return MessageRole.SYSTEM;
  // default: treat unknown as SYSTEM (safer than AI)
  return MessageRole.SYSTEM;
}

/**
 * ✅ Step 5.1 Migration B: Safe traitData helper
 * Returns a valid JsonObject for traitData, never null/undefined.
 * Uses empty object when aiCoreMsg is missing or invalid.
 * Step 5.1 Broad: Extended to include hooks[] and patterns[] arrays.
 */
function safeTraitData(aiCoreMsg: MessageEvaluation | undefined | null): Prisma.JsonObject {
  if (!aiCoreMsg || typeof aiCoreMsg !== 'object') {
    return { traits: {}, flags: [], label: null, hooks: [], patterns: [] };
  }

  const traits = aiCoreMsg.traits && typeof aiCoreMsg.traits === 'object'
    ? aiCoreMsg.traits
    : {};

  const flags = Array.isArray(aiCoreMsg.flags)
    ? aiCoreMsg.flags
    : [];

  const label = typeof aiCoreMsg.label === 'string'
    ? aiCoreMsg.label
    : null;

  // Step 5.1: hooks and patterns are derived later during message creation
  // For now, include empty arrays as defaults
  return { traits, flags, label, hooks: [], patterns: [] };
}

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statsService: StatsService,
    private readonly insightsService: InsightsService,
    // Step 5.1: Inject new analytics services
    private readonly moodService: MoodService,
    private readonly traitsService: TraitsService,
    private readonly gatesService: GatesService,
    private readonly promptsService: PromptsService,
    // Step 5.4: Inject badges service
    private readonly badgesService: BadgesService,
    // Step 5.9: Inject synergy service
    private readonly synergyService: SynergyService,
    // Step 5.11: Inject rotation service
    private readonly rotationService: RotationService,
  ) {}

  /**
   * ✅ STEP 4.4: Validate mission status transitions
   * Legal transitions:
   * - IN_PROGRESS -> IN_PROGRESS (idempotent)
   * - IN_PROGRESS -> SUCCESS
   * - IN_PROGRESS -> FAIL
   * - IN_PROGRESS -> ABORTED
   *
   * Forbidden:
   * - Any transition FROM SUCCESS/FAIL/ABORTED to another status
   */
  private validateMissionStatusTransition(
    current: MissionStatus,
    next: MissionStatus,
  ): void {
    if (current === next) return;

    if (current === MissionStatus.IN_PROGRESS) {
      if (
        next === MissionStatus.SUCCESS ||
        next === MissionStatus.FAIL ||
        next === MissionStatus.ABORTED
      ) {
        return;
      }
    }

    throw new BadRequestException({
      code: 'ILLEGAL_STATUS_TRANSITION',
      message: `Cannot transition from ${current} to ${next}. Legal transitions: IN_PROGRESS -> SUCCESS/FAIL/ABORTED, or same status (idempotent).`,
    });
  }

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

  private async saveOrUpdateScoredSession(params: {
    userId: string;
    sessionId?: string | null;
    topic: string;
    messageScores: number[];
    templateId?: string | null;
    personaId?: string | null;
    transcript: TranscriptMsg[];
    missionStatus?: 'IN_PROGRESS' | 'SUCCESS' | 'FAIL';

    aiMode?: string | null;
    extraPayload?: Record<string, any> | null;

    endReasonCode?: string | null;
    endReasonMeta?: Record<string, any> | null;

    aiCoreResult?: AiSessionResult | null;
  }): Promise<{
    summary: SessionRewardsSummary;
    finalScore: number;
    sessionId: string;
    didFinalize: boolean;
    didGrant: boolean;
    isSuccess: boolean | null;
    messages: Array<{
      turnIndex: number;
      role: MessageRole;
      content: string;
      score: number | null;
      traitData: any;
    }>;
  }> {
    const {
      userId,
      sessionId: explicitSessionId,
      topic,
      messageScores,
      templateId,
      personaId,
      transcript,
      missionStatus,
      aiMode,
      extraPayload,
      endReasonCode,
      endReasonMeta,
      aiCoreResult,
    } = params;

    if (!messageScores || !Array.isArray(messageScores) || messageScores.length === 0) {
      throw new BadRequestException({
        code: 'SESSION_EMPTY',
        message: 'messageScores must contain at least one score',
      });
    }
    if (!transcript || transcript.length === 0) {
      throw new BadRequestException({
        code: 'TRANSCRIPT_EMPTY',
        message: 'transcript must contain at least one message',
      });
    }

    const now = new Date();

    const inputs: MessageEvaluationInput[] = messageScores.map((score) => ({ score }));
    const summary: SessionRewardsSummary = computeSessionRewards(inputs);
    const finalScore = Math.round(summary.finalScore);

    const perMessageScores = summary.messages.map((m) => m.score);
    const sessionMessageAvg =
      perMessageScores.length > 0
        ? perMessageScores.reduce((sum, s) => sum + s, 0) / perMessageScores.length
        : 0;

    const isFinalStatus =
      missionStatus === 'SUCCESS' ||
      missionStatus === 'FAIL' ||
      (missionStatus as any) === 'ABORTED';

    const shouldFinalize = isFinalStatus;

    const isSuccess: boolean | null = shouldFinalize
      ? templateId
        ? missionStatus === 'SUCCESS'
        : missionStatus === 'SUCCESS' && finalScore >= 60
      : null;

    const targetStatus: MissionStatus = shouldFinalize
      ? missionStatus === 'SUCCESS'
        ? MissionStatus.SUCCESS
        : missionStatus === 'FAIL'
          ? MissionStatus.FAIL
          : (missionStatus as any) === 'ABORTED'
            ? MissionStatus.ABORTED
            : MissionStatus.FAIL
      : MissionStatus.IN_PROGRESS;

    const result = await this.prisma.$transaction(async (tx) => {
      // ✅ Step 5.2: Defensive empty array for early returns (though transaction throws on errors)
      const empty: any[] = [];

      const [stats, wallet] = await Promise.all([
        tx.userStats.findUnique({ where: { userId } }),
        tx.userWallet.findUnique({ where: { userId } }),
      ]);

      if (!stats || !wallet) {
        throw new Error(
          'UserStats or UserWallet missing after ensureUserProfilePrimitives',
        );
      }

      let sessionIdToUse: string | null = null;
      let currentStatus: MissionStatus | null = null;

      if (explicitSessionId) {
        const existingById = await tx.practiceSession.findUnique({
          where: { id: explicitSessionId },
          select: { id: true, userId: true, status: true, endedAt: true },
        });

        if (!existingById) {
          throw new BadRequestException({
            code: 'SESSION_NOT_FOUND',
            message: 'sessionId not found',
          });
        }
        if (existingById.userId !== userId) {
          throw new UnauthorizedException({
            code: 'SESSION_FORBIDDEN',
            message: 'session does not belong to user',
          });
        }
        if (existingById.status !== MissionStatus.IN_PROGRESS || existingById.endedAt) {
          throw new BadRequestException({
            code: 'SESSION_NOT_IN_PROGRESS',
            message: 'session is not IN_PROGRESS',
          });
        }

        sessionIdToUse = existingById.id;
      }

      if (!sessionIdToUse && templateId) {
        const existing = await tx.practiceSession.findFirst({
          where: {
            userId,
            templateId,
            status: MissionStatus.IN_PROGRESS,
            endedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, status: true },
        });
        if (existing?.id) {
          sessionIdToUse = existing.id;
          currentStatus = existing.status;
        }
      }

      if (currentStatus !== null) {
        this.validateMissionStatusTransition(currentStatus, targetStatus);
      }

      const basePayload: Record<string, any> = {
        ...(extraPayload && typeof extraPayload === 'object' ? extraPayload : {}),
        messageScores,
        transcript,
        endReasonCode: endReasonCode ?? null,
        endReasonMeta: endReasonMeta ?? null,
      };

      const finalEndedAt = shouldFinalize ? now : null;

      const baseSessionData = {
        userId,
        topic,
        score: finalScore,
        xpGained: summary.totalXp,
        coinsGained: summary.totalCoins,
        gemsGained: summary.totalGems,

        messageCount: messageScores.length,
        rarityCounts: summary.rarityCounts as any,
        payload: basePayload as any,

        durationSec: 60,
        templateId: templateId ?? null,
        personaId: personaId ?? null,

        overallScore: finalScore,

        status: targetStatus,
        endedAt: finalEndedAt,
        isSuccess: shouldFinalize ? isSuccess : null,

        aiMode: aiMode ?? (templateId ? 'MISSION' : null),

        endReasonCode: endReasonCode ?? null,
        endReasonMeta: endReasonMeta ?? null,
      };

      const session = sessionIdToUse
        ? await tx.practiceSession.update({
            where: { id: sessionIdToUse },
            data: baseSessionData as any,
          })
        : await tx.practiceSession.create({
            data: baseSessionData as any,
          });

      await tx.chatMessage.deleteMany({ where: { sessionId: session.id } });

      // Map aiCoreResult.messages[] to transcript indices
      const aiCoreMessagesByIndex = new Map<number, any>();
      if (aiCoreResult?.messages && Array.isArray(aiCoreResult.messages)) {
        aiCoreResult.messages.forEach((msg, idx) => {
          aiCoreMessagesByIndex.set(idx, msg);
        });
      }

      const userRewards = summary.messages;
      let userIdx = 0;

      const rows: any[] = [];

      // IMPORTANT: preserve original transcript indices as turnIndex/meta.index
      for (let i = 0; i < transcript.length; i++) {
        const m = transcript[i];
        const content = safeTrim(m?.content);
        if (!content) continue;

        const roleEnum = normalizeRole(m?.role);
        const aiCoreMsg = aiCoreMessagesByIndex.get(i);

        if (roleEnum === MessageRole.USER) {
          const r = userRewards[userIdx];
          const score = r?.score ?? null;
          const rarity = r?.rarity ?? null;

          // Step 5.1: Derive hooks and patterns for USER messages
          const baseTraitData = safeTraitData(aiCoreMsg);
          const traits = (baseTraitData.traits as Record<string, number>) || {};
          const flags = (baseTraitData.flags as string[]) || [];
          const label = (baseTraitData.label as string | null) || null;

          const hooks = deriveHooks({ traits, label, score });
          const patterns = derivePatterns(flags);

          const enrichedTraitData = {
            ...baseTraitData,
            hooks,
            patterns,
          };

          rows.push({
            sessionId: session.id,
            userId,
            role: MessageRole.USER,
            content,
            grade: rarity ? RARITY_TO_GRADE[rarity] : null,
            xpDelta: r?.xp ?? 0,
            coinsDelta: r?.coins ?? 0,
            gemsDelta: r?.gems ?? 0,
            isBrilliant: rarity === 'S+',
            isLifesaver: false,

            turnIndex: i,
            score: score ?? null,
            traitData: enrichedTraitData,

            meta: {
              index: i,
              userIndex: userIdx,
              score,
              rarity,
            } as any,
          });

          userIdx += 1;
        } else if (roleEnum === MessageRole.AI) {
          rows.push({
            sessionId: session.id,
            userId,
            role: MessageRole.AI,
            content,
            grade: null,
            xpDelta: 0,
            coinsDelta: 0,
            gemsDelta: 0,
            isBrilliant: false,
            isLifesaver: false,

            turnIndex: i,
            score: null,
            traitData: safeTraitData(aiCoreMsg),

            meta: { index: i, generated: true } as any,
          });
        } else {
          // SYSTEM
          rows.push({
            sessionId: session.id,
            userId,
            role: MessageRole.SYSTEM,
            content,
            grade: null,
            xpDelta: 0,
            coinsDelta: 0,
            gemsDelta: 0,
            isBrilliant: false,
            isLifesaver: false,

            turnIndex: i,
            score: null,
            traitData: safeTraitData(aiCoreMsg),

            meta: { index: i, system: true } as any,
          });
        }
      }

      if (rows.length > 0) {
        await tx.chatMessage.createMany({ data: rows as any });
      }

      let didGrant = false;

      if (shouldFinalize) {
        const existingGrant = await tx.rewardLedgerEntry.findUnique({
          where: {
            sessionId_kind: {
              sessionId: session.id,
              kind: RewardLedgerKind.SESSION_REWARD,
            },
          },
        });

        if (!existingGrant) {
          await tx.rewardLedgerEntry.create({
            data: {
              userId,
              sessionId: session.id,
              templateId: templateId ?? null,
              kind: RewardLedgerKind.SESSION_REWARD,
              xpDelta: summary.totalXp,
              coinsDelta: summary.totalCoins,
              gemsDelta: summary.totalGems,
              score: finalScore,
              isSuccess: isSuccess ?? null,
              meta: {
                rarityCounts: summary.rarityCounts,
                messageCount: messageScores.length,
              } as any,
            },
          });

          didGrant = true;

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

          await tx.userWallet.update({
            where: { userId },
            data: {
              xp: wallet.xp + summary.totalXp,
              lifetimeXp: wallet.lifetimeXp + summary.totalXp,
              coins: wallet.coins + summary.totalCoins,
              gems: wallet.gems + summary.totalGems,
            },
          });

          if (templateId) {
            const existing = await tx.missionProgress.findUnique({
              where: {
                userId_templateId: { userId, templateId },
              },
            });

            if (!existing) {
              await tx.missionProgress.create({
                data: {
                  userId,
                  templateId,
                  status: isSuccess
                    ? MissionProgressStatus.COMPLETED
                    : MissionProgressStatus.UNLOCKED,
                  bestScore: finalScore,
                },
              });
            } else {
              const newBest =
                typeof existing.bestScore === 'number'
                  ? Math.max(existing.bestScore, finalScore)
                  : finalScore;

              const nextStatus = isSuccess
                ? MissionProgressStatus.COMPLETED
                : existing.status === MissionProgressStatus.COMPLETED
                  ? MissionProgressStatus.COMPLETED
                  : MissionProgressStatus.UNLOCKED;

              await tx.missionProgress.update({
                where: { id: existing.id },
                data: {
                  status: nextStatus,
                  bestScore: newBest,
                },
              });
            }
          }
        }
      }

      // ✅ Step 5.2: Fetch normalized messages using tx (same transaction)
      const messages = await tx.chatMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { turnIndex: 'asc' },
        select: {
          turnIndex: true,
          role: true,
          content: true,
          score: true,
          traitData: true,
        },
      });

      return {
        sessionId: session.id,
        didFinalize: shouldFinalize,
        didGrant,
        messages: messages ?? empty, // Defensive: ensure array even if findMany returns null/undefined
      };
    });

    return {
      summary,
      finalScore,
      sessionId: result.sessionId,
      didFinalize: result.didFinalize,
      didGrant: result.didGrant,
      isSuccess,
      messages: result.messages,
    };
  }

  async createScoredSessionFromScores(params: {
    userId: string;
    sessionId?: string | null;
    topic: string;
    messageScores: number[];
    aiCoreResult?: AiSessionResult;

    templateId?: string | null;
    personaId?: string | null;
    transcript: TranscriptMsg[];
    assistantReply?: string;

    missionStatus?: 'IN_PROGRESS' | 'SUCCESS' | 'FAIL';

    aiMode?: string | null;
    extraPayload?: Record<string, any> | null;

    endReasonCode?: string | null;
    endReasonMeta?: Record<string, any> | null;
  }) {
    const {
      userId,
      sessionId,
      topic,
      messageScores,
      aiCoreResult,
      templateId,
      personaId,
      transcript,
      missionStatus,
      aiMode,
      extraPayload,
      endReasonCode,
      endReasonMeta,
    } = params;

    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }

    await this.ensureUserProfilePrimitives(userId);

    const {
      summary,
      finalScore,
      sessionId: usedSessionId,
      isSuccess,
      messages,
      didFinalize,
    } = await this.saveOrUpdateScoredSession({
      userId,
      sessionId: sessionId ?? null,
      topic,
      messageScores,
      templateId: templateId ?? null,
      personaId: personaId ?? null,
      transcript,
      missionStatus,
      aiMode: aiMode ?? null,
      extraPayload: extraPayload ?? null,
      endReasonCode: endReasonCode ?? null,
      endReasonMeta: endReasonMeta ?? null,
      aiCoreResult: aiCoreResult ?? null,
    });

    // ✅ FIX: Persist aiCorePayload/version ALWAYS when aiCoreResult exists (metrics optional)
    if (aiCoreResult) {
      const aiSummary = buildAiInsightSummary(aiCoreResult);
      const m: any = (aiCoreResult as any).metrics ?? null;

      await this.prisma.practiceSession.update({
        where: { id: usedSessionId },
        data: {
          aiCoreVersion: (aiCoreResult as any).version ?? null,
          aiCorePayload: aiCoreResult as any,
          aiSummary: aiSummary ? (aiSummary as any) : null,

          ...(m
            ? {
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
              }
            : {}),
        },
      });
    }

    // Step 5.1 + 5.2: Analytics pipeline for finalized sessions
    // Step 5.2: Reordered so Insights runs AFTER Gates/Prompts (v2 needs their data)
    // Order: mood → traits → gates → prompts → insights (v1 + v2)
    // All wrapped in try/catch so mission completion never breaks
    //
    // TODO Step 5.13: Backfill historical sessions
    // - Compute hooks/patterns for old messages (missing hooks[]/patterns[])
    // - Build mood timelines for old sessions (missing MissionMoodTimeline)
    // - Compute gate outcomes for old sessions (missing GateOutcome rows)
    // - Compute trait histories/scores for old sessions (missing UserTraitHistory/UserTraitScores)
    // - Generate prompt triggers for old sessions (missing PromptHookTrigger)
    // This ensures the entire stats ecosystem works for existing data.
    if (didFinalize) {
      // 1. Mood Timeline (can run first - only needs messages)
      try {
        await this.moodService.buildAndPersistForSession(userId, usedSessionId);
      } catch (err: any) {
        console.error(`[SessionsService] Mood Timeline failed for ${usedSessionId}:`, err);
      }

      // 2. Trait History + Long-term Scores (needs messages)
      try {
        await this.traitsService.persistTraitHistoryAndUpdateScores(userId, usedSessionId);
      } catch (err: any) {
        console.error(`[SessionsService] Trait History failed for ${usedSessionId}:`, err);
      }

      // 3. Gate Outcomes (needs messages + session status)
      try {
        await this.gatesService.evaluateAndPersist(usedSessionId);
      } catch (err: any) {
        console.error(`[SessionsService] Gate Outcomes failed for ${usedSessionId}:`, err);
      }

      // 4. Prompt Hook Triggers (needs messages + mood timeline)
      try {
        await this.promptsService.matchAndTriggerHooksForSession(usedSessionId);
      } catch (err: any) {
        console.error(`[SessionsService] Prompt Hooks failed for ${usedSessionId}:`, err);
      }

      // 5. Deep Insights v1 + v2 (needs ALL signals: gates, hooks, traits)
      // Step 5.2: v2 now extracts signals from GateOutcome and PromptHookTrigger
      try {
        await this.insightsService.buildAndPersistForSession(usedSessionId);
      } catch (err: any) {
        console.error(`[SessionsService] Deep Insights failed for ${usedSessionId}:`, err);
      }

      // Step 5.9: Trait Synergy Map computation (after insights, before Hall of Fame)
      try {
        await this.synergyService.computeAndPersistSynergy(userId, usedSessionId);
      } catch (err: any) {
        console.error(`[SessionsService] Trait synergy computation failed for ${usedSessionId}:`, err);
      }

      // Step 5.10: Mood Timeline + Insights (after synergy, before Hall of Fame)
      try {
        await this.moodService.buildAndPersistForSession(userId, usedSessionId);
      } catch (err: any) {
        console.error(`[SessionsService] Mood timeline failed for ${usedSessionId}:`, err);
      }

      // Step 5.11: Rotation Engine (after mood, before Hall of Fame)
      try {
        await this.rotationService.buildAndPersistRotationPack(
          userId,
          usedSessionId,
          'MISSION_END',
        );
      } catch (err: any) {
        console.error(`[SessionsService] Rotation engine failed for ${usedSessionId}:`, err);
      }

      // 5.7: Hall of Fame persistence (after insights, before badges)
      try {
        await this.upsertHallOfFameMessages(userId, usedSessionId);
      } catch (err: any) {
        console.error(`[SessionsService] Hall of Fame upsert failed for ${usedSessionId}:`, err);
      }

      // 6. Badge Progress Updates (Step 5.4: after insights persist)
      try {
        await this.badgesService.updateBadgesForSession(usedSessionId);
      } catch (err: any) {
        console.error(`[SessionsService] Badge Updates failed for ${usedSessionId}:`, err);
      }
    }

    const dashboard = await this.statsService.getDashboardForUser(userId);

    // ✅ Step 5.4: Normalize messages with defensive handling and deterministic ordering
    const normalizedMessages = (messages ?? [])
      .map((m, idx) => ({
        ...normalizeChatMessageRead(m, idx),
        _originalIndex: idx, // Preserve for stable sorting
      }))
      .sort((a, b) => {
        // Sort by turnIndex asc, tie-breaker by original index (stable)
        if (a.turnIndex !== b.turnIndex) {
          return a.turnIndex - b.turnIndex;
        }
        // Stable sort: preserve original order for same turnIndex (shouldn't happen after Migration B)
        return a._originalIndex - b._originalIndex;
      })
      .map(({ _originalIndex, ...msg }) => msg); // Remove temporary _originalIndex field

    return {
      ok: true,
      rewards: {
        score: finalScore,
        messageScore: finalScore,
        isSuccess: isSuccess ?? false,
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
      sessionId: usedSessionId,
      messages: normalizedMessages,
    };
  }

  /**
   * Step 5.7: Upsert Hall of Fame messages (top scoring messages)
   * Called during session finalize pipeline
   */
  private async upsertHallOfFameMessages(userId: string, sessionId: string): Promise<void> {
    // Import threshold from config
    const statsConfig = await import('../stats/config/stats.config');
    const HALL_OF_FAME_SCORE_THRESHOLD = statsConfig.HALL_OF_FAME_SCORE_THRESHOLD;
    
    // Get top 3 positive and top 3 negative messages from session
    const sessionMessages = await this.prisma.chatMessage.findMany({
      where: {
        sessionId,
        userId,
        role: MessageRole.USER,
        score: { not: null },
      },
      orderBy: [
        { score: 'desc' },
        { turnIndex: 'asc' }, // Deterministic tie-breaker
      ],
      select: {
        id: true,
        score: true,
        turnIndex: true,
        traitData: true,
      },
    });

    // Get top 3 positive (high scores >= threshold) and top 3 negative (low scores)
    const topPositive = sessionMessages.slice(0, 3).filter(m => typeof m.score === 'number' && m.score >= HALL_OF_FAME_SCORE_THRESHOLD);
    const sortedAsc = [...sessionMessages].sort((a, b) => {
      const scoreA = typeof a.score === 'number' ? a.score : 100;
      const scoreB = typeof b.score === 'number' ? b.score : 100;
      return scoreA - scoreB;
    });
    const topNegative = sortedAsc.slice(0, 3);
    const messagesToSave = [...topPositive, ...topNegative];

    // Import getCategoryForPattern for categoryKey derivation
    const { getCategoryForPattern } = await import('../analytics/category-taxonomy');
    const { normalizeTraitData } = await import('../shared/normalizers/chat-message.normalizer');
    
    // Upsert idempotently (unique constraint: userId + messageId)
    for (const msg of messagesToSave) {
      if (typeof msg.score === 'number') {
        // Derive categoryKey from patterns (deterministic)
        const traitData = normalizeTraitData(msg.traitData);
        const patterns = Array.isArray(traitData.patterns) ? traitData.patterns : [];
        let categoryKey: string | null = null;
        if (patterns.length > 0) {
          const category = getCategoryForPattern(patterns[0]);
          categoryKey = category || null;
        }

        await this.prisma.hallOfFameMessage.upsert({
          where: {
            userId_messageId: {
              userId,
              messageId: msg.id,
            },
          },
          create: {
            userId,
            messageId: msg.id,
            sessionId,
            turnIndex: typeof msg.turnIndex === 'number' ? msg.turnIndex : 0,
            categoryKey,
            score: msg.score,
          },
          update: {
            score: msg.score,
            turnIndex: typeof msg.turnIndex === 'number' ? msg.turnIndex : 0,
            categoryKey,
            savedAt: new Date(),
          },
        });
      }
    }
  }

  async createMockSession(userId: string) {
    const result = await this.createScoredSessionFromScores({
      userId,
      topic: 'Mock practice session',
      messageScores: MOCK_MESSAGE_SCORES,
      transcript: MOCK_MESSAGE_SCORES.map((_, i) => ({
        role: 'USER',
        content: `Mock message #${i + 1}`,
      })),
      missionStatus: 'SUCCESS',
    });
    // ✅ Step 5.6: Apply allowlist-only serializer (no spreading raw objects)
    return toSessionsMockResponsePublic(result);
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

  /**
   * ✅ Step 5.7: Get session by ID (read endpoint)
   * Returns the same public payload shape as POST /v1/practice/session
   */
  async getSessionByIdPublic(userId: string, sessionId: string) {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }

    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        topic: true,
        status: true,
        endedAt: true,
        createdAt: true,
        score: true,
        xpGained: true,
        coinsGained: true,
        gemsGained: true,
        isSuccess: true,
        messageCount: true,
        payload: true,
        rarityCounts: true,
        endReasonCode: true,
        endReasonMeta: true,
        templateId: true,
        personaId: true,
        aiMode: true,
      },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found',
      });
    }

    // Avoid leaking existence: return NotFound if userId mismatches
    if (session.userId !== userId) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found',
      });
    }

    return this.buildSessionResponsePublic(userId, session);
  }

  /**
   * ✅ Step 5.7: Get last session (read endpoint)
   * Returns most recent FINALIZED session only (endedAt IS NOT NULL)
   */
  async getLastSessionPublic(userId: string) {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }

    const session = await this.prisma.practiceSession.findFirst({
      where: {
        userId,
        endedAt: { not: null }, // Only finalized sessions
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        topic: true,
        status: true,
        endedAt: true,
        createdAt: true,
        score: true,
        xpGained: true,
        coinsGained: true,
        gemsGained: true,
        isSuccess: true,
        messageCount: true,
        payload: true,
        rarityCounts: true,
        endReasonCode: true,
        endReasonMeta: true,
        templateId: true,
        personaId: true,
        aiMode: true,
      },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'No sessions found',
      });
    }

    return this.buildSessionResponsePublic(userId, session);
  }

  /**
   * ✅ Step 5.7: Build public session response (shared logic for read endpoints)
   * Reconstructs POST-like response shape from stored session data
   */
  private async buildSessionResponsePublic(
    userId: string,
    session: {
      id: string;
      userId: string;
      topic: string;
      status: MissionStatus;
      endedAt: Date | null;
      createdAt: Date;
      score: number;
      xpGained: number;
      coinsGained: number;
      gemsGained: number;
      isSuccess: boolean | null;
      messageCount: number;
      payload: Prisma.JsonValue | null;
      rarityCounts: Prisma.JsonValue | null;
      endReasonCode: string | null;
      endReasonMeta: Prisma.JsonValue | null;
      templateId: string | null;
      personaId: string | null;
      aiMode: string | null;
    },
  ) {
    // 3A) Fetch ChatMessage rows (ordered by turnIndex)
    const chatMessages = await this.prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { turnIndex: 'asc' },
      select: {
        turnIndex: true,
        role: true,
        content: true,
        score: true,
        traitData: true,
        xpDelta: true,
        coinsDelta: true,
        gemsDelta: true,
        meta: true,
      },
    });

    // 3B) Build messages[] public
    let messages: any[] = [];
    if (chatMessages.length > 0) {
      // Preferred: use ChatMessage rows
      messages = chatMessages.map((m, idx) =>
        normalizeChatMessageRead(m, idx),
      );
    } else {
      // Fallback: reconstruct from payload.transcript[]
      const payload = session.payload && typeof session.payload === 'object' ? (session.payload as any) : null;
      const transcript = Array.isArray(payload?.transcript) ? payload.transcript : [];
      const messageScores = Array.isArray(payload?.messageScores)
        ? payload.messageScores.filter((n: any) => typeof n === 'number' && Number.isFinite(n))
        : [];

      let userScoreIdx = 0;
      messages = transcript
        .filter((m: any) => m && typeof m.content === 'string')
        .map((m: any, idx: number) => {
          const role = normalizeRole(m.role);
          const isUser = role === MessageRole.USER;
          const score = isUser && userScoreIdx < messageScores.length
            ? messageScores[userScoreIdx++]
            : null;

          return {
            turnIndex: idx,
            role,
            content: safeTrim(m.content),
            score,
            traitData: { traits: {}, flags: [], label: null },
          };
        });
    }

    // 3C) Build messageScores[] (for rewards)
    let messageScores: number[] = [];
    const payload = session.payload && typeof session.payload === 'object' ? (session.payload as any) : null;
    if (Array.isArray(payload?.messageScores)) {
      messageScores = payload.messageScores.filter((n: any) => typeof n === 'number' && Number.isFinite(n));
    } else if (chatMessages.length > 0) {
      // Fallback: extract from ChatMessage USER scores
      messageScores = chatMessages
        .filter((m) => m.role === MessageRole.USER && typeof m.score === 'number')
        .map((m) => m.score as number);
    }

    // Compute rewards using existing computeSessionRewards
    const inputs: MessageEvaluationInput[] = messageScores.map((score) => ({ score }));
    const summary: SessionRewardsSummary = computeSessionRewards(inputs);
    const finalScore = Math.round(summary.finalScore);

    // Use stored aggregates (prefer stored over computed for consistency)
    const rewards = {
      score: session.score ?? finalScore,
      messageScore: session.score ?? finalScore,
      isSuccess: session.isSuccess ?? false,
      xpGained: session.xpGained,
      coinsGained: session.coinsGained,
      gemsGained: session.gemsGained,
      rarityCounts:
        session.rarityCounts && typeof session.rarityCounts === 'object'
          ? (session.rarityCounts as Record<string, number>)
          : summary.rarityCounts,
      messages: summary.messages.map((m, index) => ({
        index,
        score: m.score,
        rarity: m.rarity,
        xp: m.xp,
        coins: m.coins,
        gems: m.gems,
      })),
    };

    // 3D) aiReply (always string)
    let aiReply = '';
    // Scan reverse for last AI message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === MessageRole.AI) {
        aiReply = typeof messages[i].content === 'string' ? messages[i].content : '';
        break;
      }
    }

    // 3E) mission + aiStructured
    const mission = null; // Keep null for now (allowed by serializer + FE doesn't require it for reads)
    const aiStructured = null; // null (safe + FE ignores it)

    // 3F) missionState (minimal but correct for FE)
    // Map status: treat DISQUALIFIED/ABORTED as 'FAIL'
    let status: 'IN_PROGRESS' | 'SUCCESS' | 'FAIL' = 'IN_PROGRESS';
    if (session.status === MissionStatus.SUCCESS) {
      status = 'SUCCESS';
    } else if (session.status === MissionStatus.FAIL || session.status === MissionStatus.ABORTED) {
      status = 'FAIL';
    }

    // Resolve maxMessages: template?.maxMessages ?? payload?.normalizedMissionConfigV1?.statePolicy?.maxMessages ?? 5
    let maxMessages = 5; // Default fallback
    
    if (session.templateId) {
      // Fetch template for maxMessages
      const template = await this.prisma.practiceMissionTemplate.findUnique({
        where: { id: session.templateId },
        select: { maxMessages: true },
      });
      if (template?.maxMessages && typeof template.maxMessages === 'number' && template.maxMessages > 0) {
        maxMessages = template.maxMessages;
      }
    }
    
    // Fallback to payload normalizedMissionConfigV1 (support multiple shapes)
    if (maxMessages === 5 && payload?.normalizedMissionConfigV1) {
      const config = payload.normalizedMissionConfigV1;
      // Try: policy.maxMessages OR statePolicy.maxMessages OR maxMessages (direct)
      const payloadMax =
        (config.policy?.maxMessages && typeof config.policy.maxMessages === 'number' && config.policy.maxMessages > 0)
          ? config.policy.maxMessages
          : (config.statePolicy?.maxMessages && typeof config.statePolicy.maxMessages === 'number' && config.statePolicy.maxMessages > 0)
            ? config.statePolicy.maxMessages
            : (config.maxMessages && typeof config.maxMessages === 'number' && config.maxMessages > 0)
              ? config.maxMessages
              : null;
      
      if (payloadMax !== null) {
        maxMessages = payloadMax;
      }
    }

    // Compute progressPct = endedAt ? 100 : clamp01(totalMessages / maxMessages) * 100
    const totalMessages = messageScores.length;
    const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
    const progressPct = session.endedAt
      ? 100
      : totalMessages > 0
        ? Math.round(clamp01(totalMessages / Math.max(1, maxMessages)) * 100)
        : 0;

    // endReasonCode/meta fallback: session.endReasonCode ?? payload?.endReasonCode
    const codeIn = session.endReasonCode ?? payload?.endReasonCode ?? null;
    const metaIn = session.endReasonMeta ?? payload?.endReasonMeta ?? null;
    const normalizedEndReason = normalizeEndReason(codeIn, metaIn);

    const missionState = {
      status,
      progressPct,
      averageScore: session.score ?? 0,
      totalMessages,
      endReasonCode: normalizedEndReason.endReasonCode,
      endReasonMeta: normalizedEndReason.endReasonMeta,
    };

    // 3G) dashboard
    const dashboard = await this.statsService.getDashboardForUser(userId);

    // 3H) Build response object matching POST shape
    const resp = {
      ok: true,
      rewards,
      dashboard,
      sessionId: session.id, // Map PracticeSession.id to "sessionId"
      messages,
      aiReply,
      aiStructured,
      mission,
      missionState,
      // Explicitly do NOT include aiDebug (GET responses never include it)
    };

    // Return via allowlist serializer only
    return toPracticeSessionResponsePublic(resp);
  }
}
