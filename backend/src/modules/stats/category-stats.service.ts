// backend/src/modules/stats/category-stats.service.ts
// Step 5.14: Category Statistics Service

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class CategoryStatsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Update per-user, per-category stats when a session is finalized.
   * This is a lightweight approximation: running averages and counts.
   */
  async updateForSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        template: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!session || !session.template?.category) {
      return;
    }

    const categoryId = session.template.category.id;
    const categoryKey = session.template.category.code;
    const score = session.score ?? 0;
    const isSuccess = !!session.isSuccess;

    // Get current stats for running average calculation
    const existingStats = await this.prisma.categoryStats.findUnique({
      where: {
        userId_categoryId: {
          userId,
          categoryId,
        },
      },
    });

    // Phase 3: Legacy numeric average (kept for backward compatibility)
    let newAvgScore: number | null = null;
    if (existingStats) {
      const currentCount = existingStats.sessionsCount;
      const currentAvg = existingStats.avgScore ?? 0;
      // Running average: (oldAvg * n + newScore) / (n + 1)
      newAvgScore = (currentAvg * currentCount + score) / (currentCount + 1);
    } else {
      // First session for this category
      newAvgScore = score > 0 ? score : null;
    }

    // Phase 4: Extract checklist aggregates (prefer checklistAggregates, fallback to payload)
    type PracticeSessionChecklistAggregates = {
      positiveHookCount: number;
      objectiveProgressCount: number;
      boundarySafeStreak: number;
      momentumStreak: number;
      totalMessages: number;
    };
    
    let sessionChecklistAggregates: {
      totalPositiveHooks: number;
      totalObjectiveProgress: number;
      boundaryViolations: number;
      momentumBreaks: number;
      totalMessages: number;
    } | null = null;

    try {
      // Phase 4: Prefer checklistAggregates (primary), fallback to payload.fastPathScoreSnapshot (backward compat)
      if (session.checklistAggregates && typeof session.checklistAggregates === 'object') {
        const agg = session.checklistAggregates as unknown as PracticeSessionChecklistAggregates;
        const totalMessages = typeof agg.totalMessages === 'number' ? agg.totalMessages : 0;
        const boundarySafeCount = typeof agg.boundarySafeStreak === 'number' ? agg.boundarySafeStreak : 0;
        const momentumMaintainedCount = typeof agg.momentumStreak === 'number' ? agg.momentumStreak : 0;
        
        sessionChecklistAggregates = {
          totalPositiveHooks: typeof agg.positiveHookCount === 'number' ? agg.positiveHookCount : 0,
          totalObjectiveProgress: typeof agg.objectiveProgressCount === 'number' ? agg.objectiveProgressCount : 0,
          boundaryViolations: totalMessages - boundarySafeCount, // Messages without NO_BOUNDARY_ISSUES
          momentumBreaks: totalMessages - momentumMaintainedCount, // Messages without MOMENTUM_MAINTAINED
          totalMessages: totalMessages,
        };
      } else {
        // Fallback: extract from payload.fastPathScoreSnapshot (old sessions)
        const sessionPayload = session.payload && typeof session.payload === 'object' ? (session.payload as any) : null;
        const fastPathSnapshot = sessionPayload?.fastPathScoreSnapshot;
        if (fastPathSnapshot && typeof fastPathSnapshot === 'object') {
          const totalMessages = typeof fastPathSnapshot.messageCount === 'number' ? fastPathSnapshot.messageCount : 0;
          const boundarySafeCount = typeof fastPathSnapshot.boundarySafeStreak === 'number' ? fastPathSnapshot.boundarySafeStreak : 0;
          const momentumMaintainedCount = typeof fastPathSnapshot.momentumStreak === 'number' ? fastPathSnapshot.momentumStreak : 0;
          
          sessionChecklistAggregates = {
            totalPositiveHooks: typeof fastPathSnapshot.positiveHookCount === 'number' ? fastPathSnapshot.positiveHookCount : 0,
            totalObjectiveProgress: typeof fastPathSnapshot.objectiveProgressCount === 'number' ? fastPathSnapshot.objectiveProgressCount : 0,
            boundaryViolations: totalMessages - boundarySafeCount, // Messages without NO_BOUNDARY_ISSUES
            momentumBreaks: totalMessages - momentumMaintainedCount, // Messages without MOMENTUM_MAINTAINED
            totalMessages: totalMessages,
          };
        }
      }
    } catch (err) {
      console.warn(`[CategoryStatsService] Failed to extract checklist aggregates:`, err);
    }

    // Phase 4: Accumulate checklist aggregates (typed)
    type CategoryChecklistAggregates = {
      totalPositiveHooks: number;
      totalObjectiveProgress: number;
      boundaryViolations: number;
      momentumBreaks: number;
      totalMessages: number;
    };
    
    const existingChecklistAggregates: CategoryChecklistAggregates = 
      existingStats && existingStats.checklistAggregates && typeof existingStats.checklistAggregates === 'object'
        ? (existingStats.checklistAggregates as unknown as CategoryChecklistAggregates)
        : {
            totalPositiveHooks: 0,
            totalObjectiveProgress: 0,
            boundaryViolations: 0,
            momentumBreaks: 0,
            totalMessages: 0,
          };

    const updatedChecklistAggregates: CategoryChecklistAggregates = sessionChecklistAggregates
      ? {
          totalPositiveHooks: existingChecklistAggregates.totalPositiveHooks + sessionChecklistAggregates.totalPositiveHooks,
          totalObjectiveProgress: existingChecklistAggregates.totalObjectiveProgress + sessionChecklistAggregates.totalObjectiveProgress,
          boundaryViolations: existingChecklistAggregates.boundaryViolations + sessionChecklistAggregates.boundaryViolations,
          momentumBreaks: existingChecklistAggregates.momentumBreaks + sessionChecklistAggregates.momentumBreaks,
          totalMessages: existingChecklistAggregates.totalMessages + sessionChecklistAggregates.totalMessages,
        }
      : existingChecklistAggregates;

    await this.prisma.categoryStats.upsert({
      where: {
        userId_categoryId: {
          userId,
          categoryId,
        },
      },
      create: {
        userId,
        categoryId,
        categoryKey,
        sessionsCount: 1,
        successCount: isSuccess ? 1 : 0,
        failCount: isSuccess ? 0 : 1,
        avgScore: score > 0 ? score : null, // @deprecated - legacy compatibility only
        checklistAggregates: updatedChecklistAggregates, // Phase 4: Typed JSON field
      },
      update: {
        sessionsCount: { increment: 1 },
        successCount: isSuccess ? { increment: 1 } : undefined,
        failCount: isSuccess ? undefined : { increment: 1 },
        avgScore: newAvgScore, // @deprecated - legacy compatibility only
        checklistAggregates: updatedChecklistAggregates, // Phase 4: Typed JSON field
      },
    });
  }
}

