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

// NOTE: keep role as string for flexibility; we still *expect* "USER"/"AI".
type TranscriptMsg = { role: string; content: string };

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
   * ✅ Core: save/update ONE in-progress mission session per (userId, templateId),
   * persist ChatMessages, and FINALIZE + GRANT rewards only once with ledger.
   *
   * Step 8 addition:
   * - If sessionId is provided: update THAT exact session (validate ownership + IN_PROGRESS)
   *
   * Step 3 addition:
   * - aiMode + extraPayload (e.g. freeplay.aiStyleKey) are stored on PracticeSession.
   */
  private async saveOrUpdateScoredSession(params: {
    userId: string;
    sessionId?: string | null; // ✅ Step 8
    topic: string;
    messageScores: number[];
    templateId?: string | null;
    personaId?: string | null;
    transcript: TranscriptMsg[];
    // Mission status coming from missionState engine (PracticeService)
    missionStatus?: 'IN_PROGRESS' | 'SUCCESS' | 'FAIL';

    // NEW – FreePlay / mode metadata
    aiMode?: string | null;
    extraPayload?: Record<string, any> | null;
  }): Promise<{
    summary: SessionRewardsSummary;
    finalScore: number;
    sessionId: string;
    didFinalize: boolean;
    didGrant: boolean;
    isSuccess: boolean | null;
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

    // 1) Compute rewards from message scores (USER messages only)
    const inputs: MessageEvaluationInput[] = messageScores.map((score) => ({ score }));
    const summary: SessionRewardsSummary = computeSessionRewards(inputs);
    const finalScore = Math.round(summary.finalScore);

    const perMessageScores = summary.messages.map((m) => m.score);
    const sessionMessageAvg =
      perMessageScores.length > 0
        ? perMessageScores.reduce((sum, s) => sum + s, 0) / perMessageScores.length
        : 0;

    // 2) Determine "should finalize" and success flag
    const shouldFinalize =
      missionStatus === 'SUCCESS' || missionStatus === 'FAIL' || !templateId;

    const isSuccess: boolean | null = shouldFinalize
      ? templateId
        ? missionStatus === 'SUCCESS'
        : finalScore >= 60
      : null;

    const targetStatus: MissionStatus = shouldFinalize
      ? isSuccess
        ? MissionStatus.SUCCESS
        : MissionStatus.FAIL
      : MissionStatus.IN_PROGRESS;

    // 3) Transaction: upsert session, replace messages, maybe finalize+grant once
    const result = await this.prisma.$transaction(async (tx) => {
      const [stats, wallet] = await Promise.all([
        tx.userStats.findUnique({ where: { userId } }),
        tx.userWallet.findUnique({ where: { userId } }),
      ]);

      if (!stats || !wallet) {
        throw new Error(
          'UserStats or UserWallet missing after ensureUserProfilePrimitives',
        );
      }

      // 3.1) Determine session id to use
      let sessionIdToUse: string | null = null;

      // ✅ Step 8: explicit sessionId wins
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

      // Existing behavior: by (userId, templateId, IN_PROGRESS)
      if (!sessionIdToUse && templateId) {
        const existing = await tx.practiceSession.findFirst({
          where: {
            userId,
            templateId,
            status: MissionStatus.IN_PROGRESS,
            endedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (existing?.id) sessionIdToUse = existing.id;
      }

      const basePayload: Record<string, any> = {
        ...(extraPayload && typeof extraPayload === 'object' ? extraPayload : {}),
        messageScores,
        transcript,
      };

      const baseSessionData = {
        userId,
        topic,
        score: finalScore,

        // store computed totals on the session (wallet grant is ledger-controlled)
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
        endedAt: shouldFinalize ? now : null,
        isSuccess: shouldFinalize ? isSuccess : null,

        // ✅ NEW – store logical mode on the session ("MISSION" / "FREEPLAY")
        aiMode: aiMode ?? (templateId ? 'MISSION' : null),
      };

      const session = sessionIdToUse
        ? await tx.practiceSession.update({
            where: { id: sessionIdToUse },
            data: baseSessionData as any,
          })
        : await tx.practiceSession.create({
            data: baseSessionData as any,
          });

      // 3.2) Replace ChatMessage rows (MVP safe approach)
      await tx.chatMessage.deleteMany({ where: { sessionId: session.id } });

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

      // 3.3) Finalize + grant rewards ONCE (ledger)
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
          // Create ledger entry first (this is the "once" guard)
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

          // Update UserStats
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

          // Update wallet
          await tx.userWallet.update({
            where: { userId },
            data: {
              xp: wallet.xp + summary.totalXp,
              lifetimeXp: wallet.lifetimeXp + summary.totalXp,
              coins: wallet.coins + summary.totalCoins,
              gems: wallet.gems + summary.totalGems,
            },
          });

          // Mission progress update
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

      return {
        sessionId: session.id,
        didFinalize: shouldFinalize,
        didGrant,
      };
    });

    return {
      summary,
      finalScore,
      sessionId: result.sessionId,
      didFinalize: result.didFinalize,
      didGrant: result.didGrant,
      isSuccess,
    };
  }

  /**
   * Used by:
   * - /v1/sessions/mock
   * - /v1/practice/session
   */
  async createScoredSessionFromScores(params: {
    userId: string;
    sessionId?: string | null; // ✅ Step 8
    topic: string;
    messageScores: number[];
    aiCoreResult?: AiSessionResult;

    templateId?: string | null;
    personaId?: string | null;
    transcript: TranscriptMsg[];
    assistantReply?: string;

    // ✅ Step 6: mission end state (from PracticeService.missionState.status)
    missionStatus?: 'IN_PROGRESS' | 'SUCCESS' | 'FAIL';

    // ✅ Step 3: FreePlay / mode metadata
    aiMode?: string | null;
    extraPayload?: Record<string, any> | null;
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
    } = params;

    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }

    await this.ensureUserProfilePrimitives(userId);

    const { summary, finalScore, sessionId: usedSessionId, isSuccess } =
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
      });

    // Option B: persist metrics + insights (update the SAME session we used)
    if (aiCoreResult?.metrics) {
      const m = aiCoreResult.metrics;
      const aiSummary = buildAiInsightSummary(aiCoreResult);

      await this.prisma.practiceSession.update({
        where: { id: usedSessionId },
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
                                        