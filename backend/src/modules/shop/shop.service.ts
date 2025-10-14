import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Time } from '../../common/time/time';
import { seedCatalog } from './catalog.seed';

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  private catalogCache: { items: any[]; deal: any | null; ts: number } | null = null;

  async getCatalog() {
    const now = Date.now();
    if (this.catalogCache && now - this.catalogCache.ts < 60_000) {
      return { items: this.catalogCache.items, deal: this.catalogCache.deal };
    }
    await seedCatalog(this.prisma);
    const items = await this.prisma.shopCatalog.findMany({ where: { active: true } });
    const deal = await this.getActiveDeal();
    this.catalogCache = { items, deal, ts: now };
    return { items, deal };
  }

  private async getActiveDeal() {
    const now = Time.nowJeru();
    const active = await this.prisma.limitedDeal.findFirst({ where: { key: 'double_diamond_bonus', active: true, startsAt: { lte: now }, endsAt: { gt: now } } });
    if (!active) return null;
    const rules: any = active.rules || {};
    return { key: 'double_diamond_bonus', endsAt: Time.toJeruISO(active.endsAt), multiplier: rules.multiplier || 2 };
  }

  private async ensureWallet(userId: string) {
    return this.prisma.economyWallet.upsert({
      where: { userId },
      update: {},
      create: { userId, coins: 0, diamonds: 0, tickets: 0 },
    });
  }

  async buyPowerup(token: string, body: { key: string; qty: number }) {
    const payload = this.jwt.decode(token) as any;
    const userId = payload?.sub as string;
    if (!userId) throw new BadRequestException({ code: 'AUTH_INVALID', message: 'Invalid token' });
    const qty = Math.max(1, Number(body.qty || 1));
    const item = await this.prisma.shopCatalog.findUnique({ where: { key: body.key } });
    if (!item || !item.active) {
      throw new BadRequestException({ code: 'CATALOG_INACTIVE', message: 'Catalog item not active' });
    }
    const pricing: any = item.pricing;
    const costCoins = Math.floor((pricing?.coins || 0) * qty);
    const costDiamonds = Math.floor((pricing?.diamonds || 0) * qty);

    return await this.prisma.$transaction(async (tx) => {
      const w = await tx.economyWallet.upsert({
        where: { userId },
        update: {},
        create: { userId, coins: 0, diamonds: 0, tickets: 0 },
      });
      if (w.coins < costCoins || w.diamonds < costDiamonds) {
        throw new BadRequestException({ code: 'ECON_INSUFFICIENT_FUNDS', message: 'Insufficient funds' });
      }
      await tx.economyWallet.update({
        where: { userId },
        data: { coins: { decrement: costCoins }, diamonds: { decrement: costDiamonds } },
      });
      // Credit powerup inventory or entitlement
      if (item.type === 'powerup') {
        await tx.powerupInventory.upsert({
          where: { id: `${userId}:${item.key}` },
          update: { charges: { increment: qty } },
          create: { id: `${userId}:${item.key}`, userId, type: item.key, charges: qty },
        });
      } else if (item.type === 'feature') {
        await tx.entitlement.upsert({
          where: { id: `${userId}:${item.key}` },
          update: { active: true },
          create: { id: `${userId}:${item.key}`, userId, key: item.key, active: true, startsAt: Time.nowJeru(), source: 'shop' },
        });
      }
      return { ok: true };
    });
  }
}
