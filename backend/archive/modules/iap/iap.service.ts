import { BadRequestException, Injectable } from '@nestjs/common';
import { Time } from '../../common/time/time';
import { PrismaService } from '../../db/prisma.service';

@Injectable()
export class IapService {
  constructor(private readonly prisma: PrismaService) {}

  async verify(platform: 'apple' | 'google', body: any) {
    const storeTxId = body.transactionJWS || body.purchaseToken;
    const sku: string | undefined = body.sku;
    if (!storeTxId || !sku) throw new BadRequestException({ code: 'IAP_INVALID', message: 'Missing transaction id or sku' });

    const existing = await this.prisma.purchase.findUnique({ where: { storeTxId } });
    if (existing) {
      const delta = (existing.meta as any)?.walletDelta || { coins: 0, diamonds: 0 };
      return { ok: true, purchase: { id: existing.id, platform: existing.platform, sku: existing.sku, storeTxId: existing.storeTxId, status: existing.status }, walletDelta: delta, entitlementsDelta: [] };
    }

    const walletDelta = await this.mapSkuToDelta(sku);
    const now = Time.nowJeru();

    const purchase = await this.prisma.$transaction(async (tx) => {
      let diamondsDelta = walletDelta.diamonds || 0;
      if (diamondsDelta > 0) {
        const deal = await tx.limitedDeal.findFirst({ where: { key: 'double_diamond_bonus', active: true, startsAt: { lte: now }, endsAt: { gt: now } } });
        const multiplier = (deal?.rules as any)?.multiplier || 2;
        if (deal) diamondsDelta = diamondsDelta * multiplier;
      }

      const p = await tx.purchase.create({
        data: {
          userId: 'unknown',
          platform,
          sku,
          qty: 1,
          price: (body.price as number) || null,
          currency: (body.currency as string) || null,
          storeTxId,
          status: 'verified',
          purchasedAt: now,
          meta: { walletDelta: { coins: walletDelta.coins || 0, diamonds: diamondsDelta } },
        },
      });

      await tx.economyWallet.upsert({ where: { userId: 'unknown' }, update: { coins: { increment: walletDelta.coins || 0 }, diamonds: { increment: diamondsDelta } }, create: { userId: 'unknown', coins: walletDelta.coins || 0, diamonds: diamondsDelta, tickets: 0 } });

      await tx.event.create({ data: { userId: 'unknown', name: 'iap_verified', props: { sku, storeTxId, walletDelta: { coins: walletDelta.coins || 0, diamonds: diamondsDelta } }, ts: now } });

      return p;
    });

    return { ok: true, purchase: { id: purchase.id, platform: purchase.platform, sku: purchase.sku, storeTxId: purchase.storeTxId, status: purchase.status }, walletDelta: (purchase.meta as any)?.walletDelta || { coins: 0, diamonds: 0 }, entitlementsDelta: [] };
  }

  private async mapSkuToDelta(sku: string): Promise<{ coins?: number; diamonds?: number }> {
    switch (sku) {
      case 'coins_300': return { coins: 300 };
      case 'coins_750': return { coins: 750 };
      case 'coins_1500': return { coins: 1500 };
      case 'd_5': return { diamonds: 5 };
      case 'd_15': return { diamonds: 15 };
      case 'd_40': return { diamonds: 40 };
      case 'd_100': return { diamonds: 100 };
      default: throw new BadRequestException({ code: 'IAP_SKU_UNKNOWN', message: 'Unknown SKU' });
    }
  }
}


