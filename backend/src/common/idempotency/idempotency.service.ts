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
      if (existing.bodyHash !== bodyHash) {
        return { conflict: true, originalBodyHash: existing.bodyHash } as const;
      }
      return { reused: true, response: JSON.parse(existing.responseJson) } as const;
    }

    const result = await handler();
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
  }
}


