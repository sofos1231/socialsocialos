import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class PowerupsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableForUser(userId: string) {
    // Phase 2 refinement later: inventory + catalog
    const types = await this.prisma.powerUpType.findMany({
      where: { active: true },
    });

    const usages = await this.prisma.powerUpUsage.findMany({
      where: { userId },
    });

    return { types, usages };
  }
}
