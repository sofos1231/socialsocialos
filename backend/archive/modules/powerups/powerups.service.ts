import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Time } from '../../common/time/time';

@Injectable()
export class PowerupsService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  private getUser(token: string) {
    return this.jwt.decode(token) as any;
  }

  async list(token: string) {
    const userId = this.getUser(token)?.sub;
    const now = Time.nowJeru();
    const active = await this.prisma.powerupInventory.findMany({
      where: { userId, expiresAt: { gt: now } },
      select: { type: true, expiresAt: true },
    });
    const inventory = await this.prisma.powerupInventory.findMany({
      where: { userId },
      select: { type: true, charges: true },
    });
    return { active, inventory };
  }

  async activate(token: string, body: { type: string; attemptId: string }) {
    const userId = this.getUser(token)?.sub as string;
    if (!userId) throw new BadRequestException({ code: 'AUTH_INVALID', message: 'Invalid token' });
    const now = Time.nowJeru();
    if (body.type === 'xp_boost_2x_24h') {
      // Open a 24h window
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await this.prisma.powerupInventory.upsert({
        where: { id: `${userId}:${body.type}` },
        update: { startsAt: now, expiresAt },
        create: { id: `${userId}:${body.type}`, userId, type: body.type, charges: 0, startsAt: now, expiresAt },
      });
      return { ok: true, type: body.type, expiresAt };
    }
    if (body.type === 'confidence_booster_next') {
      // One-use flag
      const inv = await this.prisma.powerupInventory.upsert({
        where: { id: `${userId}:${body.type}` },
        update: { charges: { increment: 1 } },
        create: { id: `${userId}:${body.type}`, userId, type: body.type, charges: 1 },
      });
      return { ok: true, type: body.type, charges: inv.charges };
    }
    throw new BadRequestException({ code: 'POWERUP_UNKNOWN', message: 'Unknown powerup type' });
  }
}


