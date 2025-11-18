// src/modules/stats/stats.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Safety net for legacy users:
   * Makes sure every user has UserWallet + UserStats rows.
   */
  private async ensureUserProfilePrimitives(userId: string) {
    const [wallet, stats] = await Promise.all([
      this.prisma.userWallet.findUnique({ where: { userId } }),
      this.prisma.userStats.findUnique({ where: { userId } }),
    ]);

    if (wallet && stats) return;

    await this.prisma.$transaction(async (tx) => {
      if (!wallet) {
        await tx.userWallet.create({
          data: {
            userId,
            xp: 0,
            level: 1,
            coins: 0,
            gems: 0,
            lifetimeXp: 0,
          },
        });
      }

      if (!stats) {
        await tx.userStats.create({
          data: {
            userId,
            sessionsCount: 0,
            successCount: 0,
            failCount: 0,
            averageScore: 0,
            averageMessageScore: 0,
            lastSessionAt: null,
          },
        });
      }
    });
  }

  /**
   * Main dashboard summary for a user.
   * Reads User + UserWallet + UserStats and returns a unified object.
   */
  async getDashboardForUser(userId: string) {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id in request',
      });
    }

    // Make sure wallet + stats exist (for old users)
    await this.ensureUserProfilePrimitives(userId);

    const [user, wallet, stats] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          createdAt: true,
          streakCurrent: true,
        },
      }),
      this.prisma.userWallet.findUnique({
        where: { userId },
      }),
      this.prisma.userStats.findUnique({
        where: { userId },
      }),
    ]);

    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Defensive defaults – should normally be non-null
    const safeWallet = wallet ?? {
      xp: 0,
      level: 1,
      coins: 0,
      gems: 0,
      lifetimeXp: 0,
      updatedAt: null,
      userId,
    };

    const safeStats = stats ?? {
      sessionsCount: 0,
      successCount: 0,
      failCount: 0,
      averageScore: 0,
      averageMessageScore: 0,
      lastSessionAt: null,
      lastUpdatedAt: null,
      userId,
    };

    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      streak: {
        current: user.streakCurrent ?? 0, // לוגיקת streak מלאה תבוא בפאזה מאוחרת יותר
      },
      wallet: {
        xp: safeWallet.xp,
        level: safeWallet.level,
        coins: safeWallet.coins,
        gems: safeWallet.gems,
        lifetimeXp: safeWallet.lifetimeXp,
      },
      stats: {
        sessionsCount: safeStats.sessionsCount,
        successCount: safeStats.successCount,
        failCount: safeStats.failCount,
        averageScore: safeStats.averageScore,
        averageMessageScore: safeStats.averageMessageScore,
        lastSessionAt: safeStats.lastSessionAt,
      },
    };
  }
}
