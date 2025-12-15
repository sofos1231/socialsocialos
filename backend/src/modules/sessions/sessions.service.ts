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
// Step 5.14: Import category stats service
import { CategoryStatsService } from '../stats/category-stats.service';
import {
  computeSessionRewards,
  MessageEvaluationInput,
  SessionRewardsSummary,
  MessageRarity,
  scoreToTier,
  MessageChecklistFlag,
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
// Step 5.13: Import SessionEndReadModel builder
import { SessionEndReadModelBuilder } from './session-end-read-model.builder';
import { SessionEndReadModel } from '../shared/types/session-end-read-model.types';
// Step 8: Import queue for priority deep analysis jobs
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DeepAnalysisJobPayload } from '../queue/jobs/deep-analysis.job';

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
    // Step 5.14: Inject category stats service
    private readonly categoryStatsService: CategoryStatsService,
    // Step 8: Inject queue for priority deep analysis jobs
    @InjectQueue('deep-analysis') private readonly deepAnalysisQueue?: Queue,
  ) {
    // Step 5.13: Initialize builder (inject Prisma)
    this.sessionEndReadModelBuilder = new SessionEndReadModelBuilder(this.prisma);
  }

  // Step 5.13: SessionEndReadModel builder instance
  private readonly sessionEndReadModelBuilder: SessionEndReadModelBuilder;

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

    // Phase 1-4: Free-play success is now purely checklist-driven via missionStatus
    // (removed numeric threshold finalScore >= 60 - missionStatus already evaluates checklist aggregates)
    const isSuccess: boolean | null = shouldFinalize
      ? missionStatus === 'SUCCESS'
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

      // Phase 4: Extract final checklist aggregates for PracticeSession.checklistAggregates
      let sessionChecklistAggregates: {
        positiveHookCount: number;
        objectiveProgressCount: number;
        boundarySafeStreak: number;
        momentumStreak: number;
        totalMessages: number;
      } | null = null;

      try {
        // Prefer endReasonMeta.checklist (final mission aggregates) if available
        if (endReasonMeta && typeof endReasonMeta === 'object' && (endReasonMeta as any).checklist) {
          const checklist = (endReasonMeta as any).checklist;
          sessionChecklistAggregates = {
            positiveHookCount: typeof checklist.positiveHookCount === 'number' ? checklist.positiveHookCount : 0,
            objectiveProgressCount: typeof checklist.objectiveProgressCount === 'number' ? checklist.objectiveProgressCount : 0,
            boundarySafeStreak: typeof checklist.boundarySafeStreak === 'number' ? checklist.boundarySafeStreak : 0,
            momentumStreak: typeof checklist.momentumStreak === 'number' ? checklist.momentumStreak : 0,
            totalMessages: messageScores.length,
          };
        } else {
          // Fallback to fastPathScoreSnapshot from extraPayload
          const fastPathSnapshot = extraPayload && typeof extraPayload === 'object' ? (extraPayload as any).fastPathScoreSnapshot : null;
          if (fastPathSnapshot && typeof fastPathSnapshot === 'object') {
            sessionChecklistAggregates = {
              positiveHookCount: typeof fastPathSnapshot.positiveHookCount === 'number' ? fastPathSnapshot.positiveHookCount : 0,
              objectiveProgressCount: typeof fastPathSnapshot.objectiveProgressCount === 'number' ? fastPathSnapshot.objectiveProgressCount : 0,
              boundarySafeStreak: typeof fastPathSnapshot.boundarySafeStreak === 'number' ? fastPathSnapshot.boundarySafeStreak : 0,
              momentumStreak: typeof fastPathSnapshot.momentumStreak === 'number' ? fastPathSnapshot.momentumStreak : 0,
              totalMessages: typeof fastPathSnapshot.messageCount === 'number' ? fastPathSnapshot.messageCount : messageScores.length,
            };
          }
        }
      } catch (err) {
        // If extraction fails, leave as null (backward compatible)
        console.warn(`[SessionsService] Failed to extract checklist aggregates for PracticeSession:`, err);
      }

      // Phase 1: Extract runtime profile keys from extraPayload or use defaults
      let engineVersionId: string | null = null;
      let chatRuntimeProfileKey: string | null = null;
      let scoringRuntimeProfileKey: string | null = null;
      let insightsRuntimeProfileKey: string | null = null;
      let currentMoodState: string | null = null;

      if (extraPayload && typeof extraPayload === 'object') {
        const payload = extraPayload as any;
        // Extract from normalizedMissionConfigV1 if available
        const normalizedConfig = payload.normalizedMissionConfigV1;
        if (normalizedConfig && typeof normalizedConfig === 'object') {
          engineVersionId = normalizedConfig.version ? `v${normalizedConfig.version}` : 'v1';
          chatRuntimeProfileKey = normalizedConfig.aiRuntimeProfile?.model 
            ? `chat_${normalizedConfig.aiRuntimeProfile.model}` 
            : 'chat_fast';
          scoringRuntimeProfileKey = normalizedConfig.scoringProfileCode || 'scoring_default';
          insightsRuntimeProfileKey = normalizedConfig.insightsProfileCode || 'insights_default';
        }
      }

      // Phase 1: Defaults if not found
      if (!engineVersionId) engineVersionId = 'v1';
      if (!chatRuntimeProfileKey) chatRuntimeProfileKey = 'chat_fast';
      if (!scoringRuntimeProfileKey) scoringRuntimeProfileKey = 'scoring_default';
      if (!insightsRuntimeProfileKey) insightsRuntimeProfileKey = 'insights_default';
      if (!currentMoodState) currentMoodState = 'NEUTRAL';

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
        // Phase 4: Final session-level checklist aggregates
        checklistAggregates: sessionChecklistAggregates,
        // Phase 1: Two-lane AI engine fields
        engineVersionId,
        chatRuntimeProfileKey,
        scoringRuntimeProfileKey,
        insightsRuntimeProfileKey,
        currentMoodState,
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

          // Phase 4: Extract tier and checklistFlags for ChatMessage storage
          // Tier: derive from score if available, otherwise null
          let tier: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | null = null;
          if (typeof score === 'number') {
            tier = scoreToTier(score);
          }
          
          // Checklist flags: extract from traitData.flags (Phase 2 stores them there)
          // Filter to only valid MessageChecklistFlag values
          let checklistFlags: string[] | null = null;
          if (Array.isArray(flags) && flags.length > 0) {
            checklistFlags = flags.filter((f: any) => 
              Object.values(MessageChecklistFlag).includes(f as any)
            ) as string[];
            // If no valid flags found, set to null
            if (checklistFlags.length === 0) {
              checklistFlags = null;
            }
          }

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
            // Phase 4: Store tier and checklistFlags directly
            tier: tier ?? null,
            checklistFlags: checklistFlags ?? null,

            meta: {
              index: i,
              userIndex: userIdx,
              score,
              rarity,
            } as any,
          });

          userIdx += 1;
        } else if (roleEnum === MessageRole.AI) {
          // Phase 1: Extract latencyMs from extraPayload for the last AI message
          let latencyMs: number | null = null;
          if (extraPayload && typeof extraPayload === 'object') {
            const payload = extraPayload as any;
            // Only set latency for the last AI message (the one we just generated)
            if (i === transcript.length - 1 && typeof payload.latencyMs === 'number') {
              latencyMs = payload.latencyMs;
            }
          }

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
            // Phase 1: Store latency for AI messages
            latencyMs: latencyMs,

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

          // Phase 3: Legacy numeric scores (kept for backward compatibility)
          const prevAvgScore = stats.averageScore ?? 0;
          const newAverageScore =
            (prevAvgScore * stats.sessionsCount + finalScore) / newSessionsCount;

          const prevAvgMessageScore = stats.averageMessageScore ?? 0;
          const newAverageMessageScore =
            (prevAvgMessageScore * stats.sessionsCount + sessionMessageAvg) /
            newSessionsCount;

          // Phase 3: Extract checklist aggregates from session payload
          let sessionChecklistAggregates: {
            totalPositiveHooks: number;
            totalObjectiveProgress: number;
            boundarySafeCount: number;
            momentumMaintainedCount: number;
            totalMessages: number;
          } | null = null;

          try {
            const sessionPayload = basePayload as any;
            const fastPathSnapshot = sessionPayload?.fastPathScoreSnapshot;
            if (fastPathSnapshot && typeof fastPathSnapshot === 'object') {
              sessionChecklistAggregates = {
                totalPositiveHooks: typeof fastPathSnapshot.positiveHookCount === 'number' ? fastPathSnapshot.positiveHookCount : 0,
                totalObjectiveProgress: typeof fastPathSnapshot.objectiveProgressCount === 'number' ? fastPathSnapshot.objectiveProgressCount : 0,
                boundarySafeCount: typeof fastPathSnapshot.boundarySafeStreak === 'number' ? fastPathSnapshot.boundarySafeStreak : 0,
                momentumMaintainedCount: typeof fastPathSnapshot.momentumStreak === 'number' ? fastPathSnapshot.momentumStreak : 0,
                totalMessages: typeof fastPathSnapshot.messageCount === 'number' ? fastPathSnapshot.messageCount : messageScores.length,
              };
            }
          } catch (err) {
            // If extraction fails, use safe defaults
            console.warn(`[SessionsService] Failed to extract checklist aggregates from session payload:`, err);
          }

          // Phase 4: Accumulate checklist aggregates in UserStats (typed)
          type UserStatsChecklistAggregates = {
            totalPositiveHooks: number;
            totalObjectiveProgress: number;
            boundarySafeCount: number;
            momentumMaintainedCount: number;
            totalMessages: number;
          };
          
          const existingChecklistAggregates: UserStatsChecklistAggregates = 
            stats.checklistAggregates && typeof stats.checklistAggregates === 'object'
              ? (stats.checklistAggregates as unknown as UserStatsChecklistAggregates)
              : {
                  totalPositiveHooks: 0,
                  totalObjectiveProgress: 0,
                  boundarySafeCount: 0,
                  momentumMaintainedCount: 0,
                  totalMessages: 0,
                };

          const updatedChecklistAggregates: UserStatsChecklistAggregates = sessionChecklistAggregates
            ? {
                totalPositiveHooks: existingChecklistAggregates.totalPositiveHooks + sessionChecklistAggregates.totalPositiveHooks,
                totalObjectiveProgress: existingChecklistAggregates.totalObjectiveProgress + sessionChecklistAggregates.totalObjectiveProgress,
                boundarySafeCount: existingChecklistAggregates.boundarySafeCount + sessionChecklistAggregates.boundarySafeCount,
                momentumMaintainedCount: existingChecklistAggregates.momentumMaintainedCount + sessionChecklistAggregates.momentumMaintainedCount,
                totalMessages: existingChecklistAggregates.totalMessages + sessionChecklistAggregates.totalMessages,
              }
            : existingChecklistAggregates;

          await tx.userStats.update({
            where: { userId },
            data: {
              sessionsCount: newSessionsCount,
              successCount: newSuccessCount,
              failCount: newFailCount,
              averageScore: newAverageScore, // @deprecated - legacy compatibility only
              averageMessageScore: newAverageMessageScore, // @deprecated - legacy compatibility only
              lastSessionAt: now,
              lastUpdatedAt: now,
              // Phase 4: Store checklist aggregates in typed JSON field
              checklistAggregates: updatedChecklistAggregates,
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

    // Step 8: REMOVED heavy analytics from hot path
    // These analytics are now processed asynchronously by DeepAnalysisWorker
    // The following services were removed from this synchronous path:
    // - moodService.buildAndPersistForSession (removed - now in worker)
    // - traitsService.persistTraitHistoryAndUpdateScores (removed - now in worker)
    // - gatesService.evaluateAndPersist (removed - now in worker)
    // - promptsService.matchAndTriggerHooksForSession (removed - now in worker)
    // - insightsService.buildAndPersistForSession (removed - now in worker)
    // - synergyService.computeAndPersistSynergy (removed - now in worker)
    //
    // Step 8: Instead, a DEEP_ANALYSIS job is enqueued from PracticeService.runPracticeSession
    // The job will be processed by DeepAnalysisWorker which calls all the above services
    // This ensures Steps 5-7 analytics remain functionally correct, just async now
    // Dashboards and analytics endpoints will read from the same tables, just with eventual consistency
    if (didFinalize) {
      // Step 8: Heavy analytics removed - job enqueued from FastPath instead
      // Note: The DEEP_ANALYSIS job is enqueued in PracticeService.runPracticeSession
      // after the FastPath response is built, ensuring non-blocking behavior

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

      // Step 5.14: Category Stats update (after rotation, before Hall of Fame)
      try {
        await this.categoryStatsService.updateForSession(usedSessionId, userId);
      } catch (err: any) {
        console.error(`[SessionsService] Category stats update failed for ${usedSessionId}:`, err);
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
    // Phase 3: Import checklist criteria
    const statsConfig = await import('../stats/config/stats.config');
    const HOF_CRITERIA = statsConfig.HOF_CRITERIA;
    const { scoreToTier } = await import('../sessions/scoring');
    const { MessageChecklistFlag } = await import('../sessions/scoring');
    
    // Get all USER messages from session with scores
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

    // Phase 3: Extract checklist flags and tier for each message
    const messagesWithChecklist = sessionMessages.map((msg) => {
      const score = typeof msg.score === 'number' ? msg.score : 0;
      const tier = scoreToTier(score);
      
      // Extract checklist flags from traitData
      let checklistFlags: string[] = [];
      try {
        const traitData = typeof msg.traitData === 'object' && msg.traitData !== null ? (msg.traitData as any) : {};
        // Check if flags are stored in traitData (Phase 2 stores them there)
        if (Array.isArray(traitData.flags)) {
          checklistFlags = traitData.flags.filter((f: any) => 
            Object.values(MessageChecklistFlag).includes(f as MessageChecklistFlag)
          ) as string[];
        }
      } catch (err) {
        // If extraction fails, use empty array
      }

      return {
        ...msg,
        tier,
        checklistFlags,
      };
    });

    // Phase 3: Filter by checklist criteria (tier >= S+ AND has required flags)
    const tierOrder: Record<string, number> = { 'S+': 5, 'S': 4, 'A': 3, 'B': 2, 'C': 1, 'D': 0 };
    const eligibleMessages = messagesWithChecklist.filter((msg) => {
      const tierValue = tierOrder[msg.tier] ?? 0;
      const minTierValue = tierOrder[HOF_CRITERIA.minTier] ?? 0;
      
      if (tierValue < minTierValue) return false;
      
      // Check if message has all required flags
      const hasAllRequired = HOF_CRITERIA.requiredFlags.every((flag) =>
        msg.checklistFlags.includes(flag)
      );
      
      return hasAllRequired;
    });

    // Sort eligible messages: primary by tier (desc), secondary by score (desc), tertiary by flag count
    eligibleMessages.sort((a, b) => {
      const tierDiff = (tierOrder[b.tier] ?? 0) - (tierOrder[a.tier] ?? 0);
      if (tierDiff !== 0) return tierDiff;
      
      const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      
      return b.checklistFlags.length - a.checklistFlags.length;
    });

    // Get top 3 positive (checklist-qualified) and top 3 negative (lowest scores, regardless of checklist)
    const topPositive = eligibleMessages.slice(0, 3);
    const sortedAsc = [...sessionMessages].sort((a, b) => {
      const scoreA = typeof a.score === 'number' ? a.score : 100;
      const scoreB = typeof b.score === 'number' ? b.score : 100;
      return scoreA - scoreB;
    });
    const topNegative = sortedAsc.slice(0, 3).map((msg) => {
      const score = typeof msg.score === 'number' ? msg.score : 0;
      const tier = scoreToTier(score);
      let checklistFlags: string[] = [];
      try {
        const traitData = typeof msg.traitData === 'object' && msg.traitData !== null ? (msg.traitData as any) : {};
        if (Array.isArray(traitData.flags)) {
          checklistFlags = traitData.flags.filter((f: any) => 
            Object.values(MessageChecklistFlag).includes(f as MessageChecklistFlag)
          ) as string[];
        }
      } catch (err) {
        // If extraction fails, use empty array
      }
      return { ...msg, tier, checklistFlags };
    });
    
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

        // Phase 4: Store tier and checklist flags in meta JSON field (typed)
        // Prefer reading from ChatMessage if available, otherwise use derived values
        const chatMessage = await this.prisma.chatMessage.findUnique({
          where: { id: msg.id },
          select: { tier: true, checklistFlags: true },
        });
        
        const tier = chatMessage?.tier ?? msg.tier;
        const checklistFlags = chatMessage?.checklistFlags && Array.isArray(chatMessage.checklistFlags)
          ? (chatMessage.checklistFlags as unknown as string[])
          : (Array.isArray(msg.checklistFlags) ? msg.checklistFlags : []);
        
        const meta = {
          tier: tier ?? null,
          checklistFlags: checklistFlags.length > 0 ? checklistFlags : [],
        };

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
            meta: meta, // Phase 4: Typed JSON field
          },
          update: {
            score: msg.score,
            turnIndex: typeof msg.turnIndex === 'number' ? msg.turnIndex : 0,
            categoryKey,
            savedAt: new Date(),
            meta: meta, // Phase 4: Typed JSON field
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
  /**
   * Step 5.13: Get unified session end read model
   * Returns complete, normalized session-end summary for finalized sessions
   * Step 8: Mission End Finalizer - ensures analytics are usually ready without blocking too long
   * 
   * @param userId - User ID (for ownership validation)
   * @param sessionId - Session ID
   * @returns SessionEndReadModel with all fields populated
   */
  async getSessionEndReadModel(userId: string, sessionId: string): Promise<SessionEndReadModel> {
    // Step 8: Load session to check analytics completeness
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        userId: true,
        messageCount: true,
        payload: true,
      },
    });

    if (!session) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found',
      });
    }

    if (session.userId !== userId) {
      throw new NotFoundException({
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found',
      });
    }

    // Step 8: Check if analytics are complete
    const lastMessageIndex = (session.messageCount ?? 0) - 1;
    const payload = session.payload as any;
    const deepAnalysisMetadata = payload?.deepAnalysisMetadata ?? {};
    const lastAnalyzedMessageIndex = deepAnalysisMetadata.lastAnalyzedMessageIndex ?? -1;

    // Step 8: If analytics not complete, enqueue priority job and wait (bounded)
    if (lastAnalyzedMessageIndex < lastMessageIndex && this.deepAnalysisQueue) {
      try {
        // Enqueue priority job with deterministic jobId for deduplication
        const jobPayload: DeepAnalysisJobPayload = {
          traceId: `priority-${sessionId}-${lastMessageIndex}`,
          missionId: null, // Will be loaded by worker
          sessionId,
          userId,
          lastMessageIndex,
          fastTags: {
            localScoreTier: 'C', // Placeholder, worker will recompute
            moodDelta: 'stable',
            tensionDelta: 'stable',
            comfortDelta: 'stable',
            boundaryRisk: 'low',
            microFlags: [],
          },
          timestamp: new Date().toISOString(),
        };

        await this.deepAnalysisQueue.add('deep-analysis', jobPayload, {
          jobId: `priority:${sessionId}:${lastMessageIndex}`, // Deduplication
          priority: 10, // Higher priority than regular jobs
        });

        // Step 8: Poll for up to 1000ms (100ms intervals)
        const maxWaitMs = 1000;
        const pollIntervalMs = 100;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitMs) {
          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

          // Reload session to check updated lastAnalyzedMessageIndex
          const updatedSession = await this.prisma.practiceSession.findUnique({
            where: { id: sessionId },
            select: { payload: true },
          });

          if (updatedSession) {
            const updatedPayload = updatedSession.payload as any;
            const updatedMetadata = updatedPayload?.deepAnalysisMetadata ?? {};
            const updatedAnalyzedIndex = updatedMetadata.lastAnalyzedMessageIndex ?? -1;

            if (updatedAnalyzedIndex >= lastMessageIndex) {
              // Analytics complete, break early
              break;
            }
          }
        }
      } catch (err: any) {
        // TODO: record queue_processing_errors_total
        console.error(`[SessionsService] Error enqueueing priority deep analysis job:`, err);
        // Continue - return model even if analytics not ready (eventually consistent)
      }
    }

    // Step 8: Build and return SessionEndReadModel (analytics may or may not be fully ready)
    // The builder will use whatever analytics data is available, with safe defaults
    return this.sessionEndReadModelBuilder.buildForSession(sessionId, userId);
  }

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
