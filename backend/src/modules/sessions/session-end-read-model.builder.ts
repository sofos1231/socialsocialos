// backend/src/modules/sessions/session-end-read-model.builder.ts
// Step 5.13: Builder for SessionEndReadModel

import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import {
  SessionEndReadModel,
  TraitSnapshot,
  MissionOutcome,
} from '../shared/types/session-end-read-model.types';
import { normalizeEndReason } from '../shared/normalizers/end-reason.normalizer';
import {
  normalizeTraitSnapshot,
  normalizeMoodSummary,
  normalizeGateResults,
  buildKeyMessages,
} from './session-end-read-model.normalizer';
import { MissionStatus, MessageRole } from '@prisma/client';

@Injectable()
export class SessionEndReadModelBuilder {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Step 5.13: Build SessionEndReadModel for a finalized session
   * Aggregates data from all analytics tables with safe defaults
   * 
   * @param sessionId - Session ID
   * @param userId - User ID (for ownership validation)
   * @returns SessionEndReadModel with all fields populated
   * @throws NotFoundException if session not found
   * @throws UnauthorizedException if session does not belong to user
   */
  async buildForSession(sessionId: string, userId: string): Promise<SessionEndReadModel> {
    // 1. Load PracticeSession with all related data
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { turnIndex: 'asc' },
        },
        deepInsights: true,
        moodTimeline: true,
        traitHistory: true,
        gateOutcomes: {
          orderBy: { evaluatedAt: 'asc' },
        },
        template: {
          select: {
            difficulty: true,
            goalType: true,
            categoryId: true,
            category: {
              select: {
                id: true,
                code: true,
                label: true,
              },
            },
            aiContract: true, // needed for missionMetadata extraction
          },
        },
        persona: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // 2. Ownership check
    if (session.userId !== userId) {
      throw new UnauthorizedException(`Session ${sessionId} does not belong to user ${userId}`);
    }

    // 3. Validate session is finalized
    const isFinalized =
      session.status === MissionStatus.SUCCESS ||
      session.status === MissionStatus.FAIL ||
      session.status === MissionStatus.ABORTED;

    if (!isFinalized) {
      throw new NotFoundException(
        `Session ${sessionId} is not finalized (status: ${session.status}). Only finalized sessions can have a summary.`,
      );
    }

    // 4. Load UserTraitScores (long-term scores)
    const traitScores = await this.prisma.userTraitScores.findUnique({
      where: { userId },
    });

    // Step 5.14: Load PersonaMemory, CategoryStats, UserCategoryProgress
    const personaMemories = session.personaId
      ? await this.prisma.personaMemory.findMany({
          where: {
            userId,
            personaId: session.personaId,
          },
        })
      : [];

    const categoryStats = session.template?.categoryId
      ? await this.prisma.categoryStats.findUnique({
          where: {
            userId_categoryId: {
              userId,
              categoryId: session.template.categoryId,
            },
          },
        })
      : null;

    const categoryProgress = session.template?.categoryId
      ? await this.prisma.userCategoryProgress.findUnique({
          where: {
            userId_categoryId: {
              userId,
              categoryId: session.template.categoryId,
            },
          },
        })
      : null;

    // 5. Check if rotation pack exists (check insightsJson for rotationPacks)
    let rotationPackAvailable = false;
    if (session.deepInsights) {
      try {
        const insightsJson = session.deepInsights.insightsJson as any;
        if (
          insightsJson &&
          typeof insightsJson === 'object' &&
          insightsJson.rotationPacks &&
          typeof insightsJson.rotationPacks === 'object'
        ) {
          // Check if any surface has a pack
          const packs = insightsJson.rotationPacks;
          rotationPackAvailable = Object.keys(packs).length > 0;
        }
      } catch (err) {
        // Ignore parsing errors, rotationPackAvailable stays false
      }
    }

    // 6. Extract policy thresholds from payload if available
    let successThreshold: number | null = null;
    let failThreshold: number | null = null;
    if (session.payload && typeof session.payload === 'object') {
      const payload = session.payload as any;
      if (payload.policy) {
        successThreshold = typeof payload.policy.successScore === 'number' ? payload.policy.successScore : null;
        failThreshold = typeof payload.policy.failScore === 'number' ? payload.policy.failScore : null;
      }
    }

    // 7. Compute average message score from USER messages
    const userMessages = session.messages.filter((m) => m.role === MessageRole.USER);
    const messageScores = userMessages
      .map((m) => m.score)
      .filter((s): s is number => typeof s === 'number' && Number.isFinite(s));
    const averageMessageScore =
      messageScores.length > 0
        ? Math.round(messageScores.reduce((sum, s) => sum + s, 0) / messageScores.length)
        : 0;

    // 8. Normalize end reason
    const normalizedEndReason = normalizeEndReason(session.endReasonCode, session.endReasonMeta);
    const endReasonMeta = normalizedEndReason.endReasonMeta || {};

    // 9. Build mission outcome
    const outcome: MissionOutcome = {
      status: session.status as 'SUCCESS' | 'FAIL' | 'ABORTED',
      isSuccess: session.isSuccess ?? false,
      endReasonCode: normalizedEndReason.endReasonCode,
      endReasonMeta,
      successThreshold,
      failThreshold,
    };

    // 10. Normalize trait summary
    const traitSnapshot = normalizeTraitSnapshot(
      session.traitHistory?.traitsJson || null,
    );
    const traitDeltas = normalizeTraitSnapshot(
      session.traitHistory?.deltasJson || null,
    );
    const longTermScores = normalizeTraitSnapshot(traitScores?.traitsJson || null);

    // 11. Normalize mood summary
    const moodSummary = normalizeMoodSummary(session.moodTimeline);

    // 12. Normalize gate results
    const gateResults = normalizeGateResults(session.gateOutcomes || []);

    // 13. Build key messages
    const keyMessages = buildKeyMessages(session.messages, session.payload);

    // 14. Parse rarity counts
    let rarityCounts: Record<string, number> = {};
    try {
      if (session.rarityCounts && typeof session.rarityCounts === 'object') {
        rarityCounts = session.rarityCounts as Record<string, number>;
      }
    } catch (err) {
      // Ignore parsing errors, use empty object
    }

    // 15. Extract completion percentage from payload or compute
    let completionPercentage = 100; // Default to 100 for finalized sessions
    if (session.payload && typeof session.payload === 'object') {
      const payload = session.payload as any;
      if (typeof payload.progressPct === 'number') {
        completionPercentage = Math.max(0, Math.min(100, Math.round(payload.progressPct)));
      }
    }

    // Step 5.14: Build categorySummary
    const categorySummary = session.template?.category
      ? {
          categoryKey: session.template.category.code,
          categoryName: session.template.category.label,
          isCompleted: categoryProgress?.status === 'COMPLETED' || false,
          totalSessions: categoryStats?.sessionsCount ?? 0,
          averageScore: categoryStats?.avgScore ?? null,
          discoveredTraits: [], // placeholder for now
        }
      : {
          categoryKey: null,
          categoryName: null,
          isCompleted: false,
          totalSessions: 0,
          averageScore: null,
          discoveredTraits: [],
        };

    // Step 5.14: Build personaMemory snapshot
    const memorySnapshot: Record<string, any> = {};
    for (const mem of personaMemories) {
      memorySnapshot[mem.memoryKey] = mem.memoryValue;
    }
    const personaMemory = {
      memorySnapshot: Object.keys(memorySnapshot).length > 0 ? memorySnapshot : null,
      memoryWritesDuringSession: [], // placeholder, to be filled in Step 6
    };

    // Step 5.14: Extract missionMetadata from aiContract
    let missionStyle: string | null = null;
    let objectiveKey: string | null = null;
    let objectiveType: string | null = null;
    let dynamicType: string | null = null;
    let locationTag: string | null = null;

    if (session.template?.aiContract && typeof session.template.aiContract === 'object') {
      const aiContract: any = session.template.aiContract;
      const config = aiContract.missionConfigV1;

      if (config) {
        missionStyle = config.style?.aiStyleKey ?? null;
        objectiveKey = config.objective?.kind ?? null;
        objectiveType = config.objective?.userTitle ?? null;
        dynamicType = config.dynamics?.mode ?? null;
        locationTag = config.dynamics?.locationTag ?? null;
      }
    }

    const missionMetadata = {
      style: missionStyle,
      objectiveKey,
      objectiveType,
      dynamicType,
      locationTag,
    };

    // 16. Build final model
    const model: SessionEndReadModel = {
      // Core identifiers
      sessionId: session.id,
      userId: session.userId,

      // Timestamps
      createdAt: session.createdAt.toISOString(),
      endedAt: session.endedAt?.toISOString() || new Date().toISOString(), // Should never be null for finalized, but safe default

      // Mission context
      templateId: session.templateId,
      personaId: session.personaId,
      personaKey: session.persona?.code ?? null,
      missionDifficulty: session.template?.difficulty || null,
      missionCategory: session.template?.goalType || null,
      categoryKey: session.template?.category?.code ?? null,
      aiMode: (session.aiMode as 'MISSION' | 'FREEPLAY') || 'FREEPLAY',

      // Step 5.14: Category summary
      categorySummary,

      // Step 5.14: Persona memory
      personaMemory,

      // Step 5.14: Mission metadata
      missionMetadata,

      // Final scores
      finalScore: session.score || 0,
      averageMessageScore,
      messageCount: session.messageCount || 0,

      // Score breakdown
      scoreBreakdown: {
        charismaIndex: session.charismaIndex,
        confidenceScore: session.confidenceScore,
        clarityScore: session.clarityScore,
        humorScore: session.humorScore,
        tensionScore: session.tensionScore,
        emotionalWarmth: session.emotionalWarmth,
        dominanceScore: session.dominanceScore,
        fillerWordsCount: session.fillerWordsCount,
        totalWords: session.totalWords,
      },

      // Rewards
      rewards: {
        xpGained: session.xpGained || 0,
        coinsGained: session.coinsGained || 0,
        gemsGained: session.gemsGained || 0,
        rarityCounts,
      },

      // Mission outcome
      outcome,

      // Gate results
      gateResults,

      // Trait summary
      traitSummary: {
        snapshot: traitSnapshot,
        deltas: traitDeltas,
        longTermScores,
      },

      // Mood summary
      moodSummary,

      // Key messages
      keyMessages,

      // Insights pointers
      insights: {
        deepInsightsId: session.deepInsights?.id || null,
        moodTimelineId: session.moodTimeline?.id || null,
        rotationPackAvailable,
        traitHistoryId: session.traitHistory?.id || null,
      },

      // Completion metadata
      completionPercentage,
      durationSeconds: session.durationSec || 0,
    };

    return model;
  }
}

