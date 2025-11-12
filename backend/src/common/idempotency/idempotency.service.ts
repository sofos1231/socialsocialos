import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import crypto from 'crypto';

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  private hashBody(body: unknown): string {
    const json = JSON.stringify(body ?? {});
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  async handle<T>(params: {
    key: string;
    userId: string;
    route: string;
    body: unknown;
    handler: () => Promise<T>;
  }): Promise<{ reused: boolean; response: T } | { conflict: true; originalBodyHash: string }>{
    const { key, userId, route, body, handler } = params;
    const bodyHash = this.hashBody(body);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { key_userId_route: { key, userId, route } },
    });
    if (existing) {
      // For side-effecting POSTs, treat any replay as conflict per policy
      return { conflict: true, originalBodyHash: existing.bodyHash } as const;
    }

    const result = await handler();
    try {
      await this.prisma.idempotencyKey.create({
        data: {
          key,
          userId,
          route,
          bodyHash,
          status: 200,
          responseJson: JSON.stringify(result),
          expiresAt,
        },
      });
      return { reused: false, response: result } as const;
    } catch (e: any) {
      const msg = String(e?.message || '');
      const code = String(e?.code || '');
      if (msg.includes('Unique') || code.toUpperCase() === 'P2002') {
        return { conflict: true, originalBodyHash: bodyHash } as const;
      }
      throw e;
    }
  }
}


