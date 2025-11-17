import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import bcrypt from 'bcryptjs';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async handleReceipt(userId: string, input: { store: string; productId: string; token: string; deviceId?: string }) {
    const receiptKey = await this.key(input.store, input.token);
    const dup = await this.prisma.subscription.findFirst({ where: { receiptKey } });
    if (dup) {
      return { status: 'DUPLICATE', entitlementFlipped: false, currentStatus: dup.status, periodEnd: dup.periodEnd };
    }
    const sub = await this.prisma.subscription.create({
      data: {
        userId,
        store: input.store,
        productId: input.productId,
        status: 'ACTIVE',
        periodEnd: null,
        receiptKey,
      },
    });
    await this.flipEntitlement(sub.userId, 'premium', true, input.store);
    return { status: 'ACCEPTED', entitlementFlipped: true, currentStatus: sub.status, periodEnd: sub.periodEnd };
  }

  async handleWebhook(_body: any) {
    // TODO: verify, normalize, upsert subscription and entitlements
    return;
  }

  async getEntitlements(userId: string) {
    const items = await this.prisma.userEntitlement.findMany({ where: { userId, active: true } });
    return { items };
  }

  private async key(store: string, token: string) {
    const hash = await bcrypt.hash(token, 8);
    return `${store}:${hash}`;
  }

  private async flipEntitlement(userId: string, key: string, active: boolean, source: string) {
    if (active) {
      await this.prisma.userEntitlement.upsert({
        where: { id: 'noop' }, // placeholder, Prisma requires unique selector; using updateMany below
        update: {},
        create: { userId, key, active: true, source },
      }).catch(async () => {
        // fallback: create if none exists; update many otherwise
        const existing = await this.prisma.userEntitlement.findFirst({ where: { userId, key } });
        if (existing) {
          await this.prisma.userEntitlement.updateMany({ where: { userId, key }, data: { active: true, endsAt: null, source } });
        } else {
          await this.prisma.userEntitlement.create({ data: { userId, key, active: true, source } });
        }
      });
    } else {
      await this.prisma.userEntitlement.updateMany({ where: { userId, key, active: true }, data: { active: false, endsAt: new Date() } });
    }
  }
}


