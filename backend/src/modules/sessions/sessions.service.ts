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

/**
 * ✅ Step 5.1 Migration B: Safe traitData helper
 * Returns a valid JsonObject for traitData, never null/undefined.
 * Uses empty object when aiCoreMsg is missing or invalid.
 */
function safeTraitData(aiCoreMsg: MessageEvaluation | undefined | null): Prisma.JsonObject {
  if (!aiCoreMsg || typeof aiCoreMsg !== 'object') {
    return { traits: {}, flags: [], label: null };
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

  return { traits, flags, label };
}

/**
 * ✅ Step 5.2: Normalize traitData from DB (defensive normalization)
 * Handles null, undefined, malformed objects, and ensures consistent shape.
 */
function normalizeTraitData(v: any): { traits: Record<string, any>; flags: string[]; label: string | null } {
  const okObj = v && typeof v === 'object' && !Array.isArray(v);
  const traits = okObj && typeof v.traits === 'object' && v.traits ? v.traits : {};
  const flags = okObj && Array.isArray(v.flags) ? v.flags : [];
  const label = okObj && typeof v.label === 'string' ? v.label : null;
  return { traits, flags, label };
}

function normalizeRole(role: any): MessageRole {
  if (role === 'USER' || role === MessageRole.USER) return MessageRole.USER;
  if (role === 'AI' || role === MessageRole.AI) return MessageRole.AI;
  if (role === 'SYSTEM' || role === MessageRole.SYSTEM) return MessageRole.SYSTEM;
  // default: treat unknown as SYSTEM (safer than AI)
  return MessageRole.SYSTEM;
}

/**
 * ✅ Step 5.4: Normalize ChatMessage fields on READ (defensive normalization)
 * Ensures turnIndex and score are properly normalized before returning to FE.
 * @param m Raw message object from DB (may have undefined/null/invalid values)
 * @param fallbackIndex Required fallback if m.turnIndex is missing/invalid
 * @returns Normalized message matching ApiChatMessage contract
 */
export function normalizeChatMessageRead(
  m: any,
  fallbackIndex: number,
): {
  turnIndex: number;
  role: MessageRole;
  content: string;
  score: number | null;
  traitData: { traits: Record<string, any>; flags: string[]; label: string | null };
} {
  // Normalize turnIndex: if m.turnIndex is a finite number >= 0 → Math.trunc(m.turnIndex)
  // else → Math.trunc(fallbackIndex) (always provided)
  let normalizedTurnIndex: number;
  if (
    typeof m.turnIndex === 'number' &&
    Number.isFinite(m.turnIndex) &&
    m.turnIndex >= 0
  ) {
    normalizedTurnIndex = Math.trunc(m.turnIndex);
  } else {
    normalizedTurnIndex = Math.trunc(fallbackIndex);
  }

  // Normalize score: if m.score is a finite number AND 0 <= score <= 100 → Math.trunc(m.score)
  // else → null (No clamping. Invalid/out-of-range becomes null.)
  let normalizedScore: number | null = null;
  if (
    typeof m.score === 'number' &&
    Number.isFinite(m.score) &&
    m.score >= 0 &&
    m.score <= 100
  ) {
    normalizedScore = Math.trunc(m.score);
  }

  // Normalize role
  const normalizedRole = normalizeRole(m.role);

  // Normalize content: ensure it's a string (fallback '' if somehow nullish)
  const normalizedContent = typeof m.content === 'string' ? m.content : '';

  // Normalize traitData: must use existing normalizeTraitData
  const normalizedTraitData = normalizeTraitData(m.traitData);

  return {
    turnIndex: normalizedTurnIndex,
    role: normalizedRole,
    content: normalizedContent,
    score: normalizedScore,
    traitData: normalizedTraitData,
  };
}

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statsService: StatsService,
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
            traitData: safeTraitData(aiCoreMsg),

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

    const { summary, finalScore, sessionId: usedSessionId, isSuccess, messages } =
      await this.saveOrUpdateScoredSession({
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

  async createMockSession(userId: string) {
    return this.createScoredSessionFromScores({
      userId,
      topic: 'Mock practice session',
      messageScores: MOCK_MESSAGE_SCORES,
      transcript: MOCK_MESSAGE_SCORES.map((_, i) => ({
        role: 'USER',
        content: `Mock message #${i + 1}`,
      })),
      missionStatus: 'SUCCESS',
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
