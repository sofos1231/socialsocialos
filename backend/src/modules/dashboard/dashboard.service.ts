// backend/src/modules/dashboard/dashboard.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string) {
    const [sessionsCount, aggregate] = await Promise.all([
      this.prisma.practiceSession.count({
        where: { userId },
      }),
      this.prisma.practiceSession.aggregate({
        where: { userId },
        _avg: { score: true },
      }),
    ]);

    const averageScore = aggregate._avg.score ?? 0;

    return {
      sessionsCount,
      averageScore: Math.round(averageScore),
    };
  }
}
