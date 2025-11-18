import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardForUser(userId: string) {
    // Phase 2 later: real aggregated query
    const [stats, wallet] = await Promise.all([
      this.prisma.userStats.findUnique({ where: { userId } }),
      this.prisma.userWallet.findUnique({ where: { userId } }),
    ]);

    return { stats, wallet };
  }
}
