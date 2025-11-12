import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { Time } from '../common/time/time';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Liveness: always OK
  @Get()
  async getHealth() {
    const start = Date.now();
    let db: 'up' | 'down' = 'down';
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      db = 'up';
    } catch {
      db = 'down';
    }
    const latencyMs = Date.now() - start;
    return { ok: true, db, latencyMs, ts: Time.toJeruISO(Time.nowJeru()) };
  }

  // Readiness: DB must be up (Redis later)
  @Get('/ready')
  async getReady() {
    const start = Date.now();
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      const latencyMs = Date.now() - start;
      return { ok: true, db: 'up', latencyMs, ts: Time.toJeruISO(Time.nowJeru()) };
    } catch {
      const latencyMs = Date.now() - start;
      return {
        ok: false,
        error: { code: 'READINESS_FAILED', message: 'Database not reachable' },
        requestId: undefined,
        ts: Time.toJeruISO(Time.nowJeru()),
        db: 'down',
        latencyMs,
      };
    }
  }
}


