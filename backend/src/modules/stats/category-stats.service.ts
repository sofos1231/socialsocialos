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

    // Calculate new average score
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
        avgScore: score > 0 ? score : null,
      },
      update: {
        sessionsCount: { increment: 1 },
        successCount: isSuccess ? { increment: 1 } : undefined,
        failCount: isSuccess ? undefined : { increment: 1 },
        avgScore: newAvgScore,
      },
    });
  }
}

