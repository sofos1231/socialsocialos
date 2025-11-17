// backend/src/modules/practice/practice.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class PracticeService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: string, score: number) {
    if (score === undefined || score === null) {
      throw new BadRequestException('score is required');
    }

    const numericScore = Number(score);

    if (Number.isNaN(numericScore)) {
      throw new BadRequestException('score must be a number');
    }

    if (numericScore < 0 || numericScore > 100) {
      throw new BadRequestException('score must be between 0 and 100');
    }

    // ⚠️ חובה לספק topic / xpGained / durationSec כי הם required ב-Prisma
    return this.prisma.practiceSession.create({
      data: {
        score: numericScore,
        topic: 'mock-session',   // תחליף לערך אמיתי אם תרצה
        xpGained: 0,             // כרגע 0 – אפשר לעדכן בהמשך
        durationSec: 0,          // גם כאן – כרגע placeholder
        user: {
          connect: { id: userId },
        },
      },
    });
  }
}
