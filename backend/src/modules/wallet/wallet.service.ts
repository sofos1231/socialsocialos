import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { JwtService } from '@nestjs/jwt';

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
    return { coins: w.coins, diamonds: w.diamonds, tickets: w.tickets };
  }
}


