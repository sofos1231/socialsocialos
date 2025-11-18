// src/modules/sessions/sessions.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { StatsService } from '../stats/stats.service';

const MOCK_SESSION_SCORE = 80;
const MOCK_MESSAGE_SCORE = 80;
const MOCK_IS_SUCCESS = true;

// כמה נותנים לסשן אחד בשלב הזה (עד שנכניס את רמת ה־rarity האמיתית)
const MOCK_XP_GAIN = 60;
const MOCK_COINS_GAIN = 20;
const MOCK_GEMS_GAIN = 0;

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statsService: StatsService,
  ) {}

  /**
   * Safety net: make sure wallet + stats exist for the user.
   * (בשביל יוזרים ישנים או אם משהו השתבש פעם אחת)
   */
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
   * Phase 2.3: mock practice session pipeline.
   * - מעדכן UserStats
   * - מעדכן UserWallet
   * - מחזיר גם rewards וגם dashboard snapshot
   */
  async createMockSession(userId: string) {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }

    // לוודא שיש wallet/stats
    await this.ensureUserProfilePrimitives(userId);

    const now = new Date();

    // נריץ את הכול בטרנזקציה אחת כדי לא לשבור עקביות
    await this.prisma.$transaction(async (tx) => {
      // 1) נקרא את הסטטיסטיקות הנוכחיות
      const stats = await tx.userStats.findUnique({
        where: { userId },
      });

      const wallet = await tx.userWallet.findUnique({
        where: { userId },
      });

      if (!stats || !wallet) {
        throw new Error('UserStats or UserWallet missing after ensureUserProfilePrimitives');
      }

      // 2) נחשב סטטיסטיקות חדשות
      const newSessionsCount = stats.sessionsCount + 1;
      const newSuccessCount = stats.successCount + (MOCK_IS_SUCCESS ? 1 : 0);
      const newFailCount = stats.failCount + (MOCK_IS_SUCCESS ? 0 : 1);

      const newAverageScore =
        newSessionsCount === 0
          ? MOCK_SESSION_SCORE
          : (stats.averageScore * stats.sessionsCount + MOCK_SESSION_SCORE) /
            newSessionsCount;

      const newAverageMessageScore =
        newSessionsCount === 0
          ? MOCK_MESSAGE_SCORE
          : (stats.averageMessageScore * stats.sessionsCount + MOCK_MESSAGE_SCORE) /
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

      // 3) נעדכן Wallet עם ה-XP והמטבעות
      await tx.userWallet.update({
        where: { userId },
        data: {
          xp: wallet.xp + MOCK_XP_GAIN,
          lifetimeXp: wallet.lifetimeXp + MOCK_XP_GAIN,
          coins: wallet.coins + MOCK_COINS_GAIN,
          gems: wallet.gems + MOCK_GEMS_GAIN,
        },
      });

      // בשלב הזה עוד לא שומרים PracticeSession אמיתי – זה יגיע בפאזה 3
    });

    // 4) נחזיר snapshot של הדאשבורד אחרי הסשן + rewards של הסשן
    const dashboard = await this.statsService.getDashboardForUser(userId);

    return {
      ok: true,
      rewards: {
        score: MOCK_SESSION_SCORE,
        messageScore: MOCK_MESSAGE_SCORE,
        isSuccess: MOCK_IS_SUCCESS,
        xpGained: MOCK_XP_GAIN,
        coinsGained: MOCK_COINS_GAIN,
        gemsGained: MOCK_GEMS_GAIN,
      },
      dashboard,
    };
  }

  /**
   * Alias: אם מישהו יקרא עדיין /v1/sessions/dashboard/summary – פשוט נשתמש באותו dashboard
   */
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
