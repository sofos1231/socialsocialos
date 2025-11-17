import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException } from '@nestjs/common';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  private async getUserIdFromToken(token: string): Promise<string> {
    const payload = await this.jwt.decode(token) as any;
    return payload?.sub;
  }

  async getMe(token: string) {
    const userId = await this.getUserIdFromToken(token);
    const [user, wallet, entitlements] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, streakCurrent: true, streakLastActiveAt: true } }),
      this.prisma.economyWallet.findUnique({ where: { userId } }),
      this.prisma.entitlement.findMany({ where: { userId, active: true }, select: { key: true, endsAt: true } }),
    ]);
    const premium = entitlements.find((e) => e.key === 'premium_scenarios' || e.key === 'ai_coach_boost_7d');
    const plan = { tier: premium ? 'premium' : 'free', until: premium?.endsAt || null } as const;
    return {
      profile: { username: user?.email?.split('@')[0] || 'user', email: user?.email || '', avatarUrl: '', level: 0, title: '' },
      wallet: wallet || { coins: 0, diamonds: 0, tickets: 0 },
      plan,
      entitlements: entitlements.map((e) => ({ key: e.key, active: true, endsAt: e.endsAt || null })),
      streak: { current: user?.streakCurrent || 0, lastActiveDate: user?.streakLastActiveAt || null },
      badges: [],
    };
  }

  async getWallet(token: string) {
    const userId = await this.getUserIdFromToken(token);
    const w = await this.prisma.economyWallet.upsert({
      where: { userId },
      update: {},
      create: { userId, coins: 0, diamonds: 0, tickets: 0 },
    });
    // Prefer User.xp if present on schema; else aggregate MetricsWeekly.xp
    let xpAgg = 0;
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { xp: true } as any });
      const maybeXp = (user as any)?.xp;
      if (typeof maybeXp === 'number') {
        xpAgg = Math.max(0, Math.floor(maybeXp));
      } else {
        const agg = await this.prisma.metricsWeekly.aggregate({ where: { userId }, _sum: { xp: true } as any });
        xpAgg = Math.max(0, (agg as any)?._sum?.xp || 0);
      }
    } catch {
      // If schema lacks xp or MetricsWeekly, default to 0
      xpAgg = 0;
    }
    return { coins: w.coins, gems: w.diamonds, xp: xpAgg };
  }

  async adjustWallet(token: string, body: { idempotencyKey: string; delta: { coins?: number; gems?: number; xp?: number } }) {
    const userId = await this.getUserIdFromToken(token);
    if (!body?.idempotencyKey) throw new BadRequestException({ code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'idempotencyKey is required' });
    const route = '/v1/wallet/adjust';
    const key = body.idempotencyKey;

    const res = await this.prisma.$transaction(async (tx) => {
      const existingKey = await tx.idempotencyKey.findFirst({ where: { key, userId, route } });
      if (existingKey) {
        throw new ConflictException({ code: 'IDEMPOTENT_REPLAY', message: 'Duplicate request' });
      }
      await tx.idempotencyKey.create({ data: { key, userId, route, bodyHash: '', status: 0, responseJson: '', createdAt: new Date(), expiresAt: new Date(Date.now() + 24*60*60*1000) } });

      const deltaCoins = Math.round(body.delta?.coins || 0);
      const deltaGems = Math.round(body.delta?.gems || 0);
      const deltaXp = Math.round(body.delta?.xp || 0);

      const w = await tx.economyWallet.upsert({ where: { userId }, update: {}, create: { userId, coins: 0, diamonds: 0, tickets: 0 } });
      const newCoins = Math.max(0, w.coins + deltaCoins);
      const newDiamonds = Math.max(0, w.diamonds + deltaGems);
      await tx.economyWallet.update({ where: { userId }, data: { coins: newCoins, diamonds: newDiamonds } });

      const response = { coins: newCoins, gems: newDiamonds, xp: Math.max(0, deltaXp) };
      await tx.idempotencyKey.updateMany({ where: { key, userId, route }, data: { status: 1, responseJson: JSON.stringify(response) } });
      return response;
    });

    return res;
  }
}


