import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { Time, weekStartJeru, jeruYMD } from '../../common/time/time';
import { addDays } from 'date-fns';
import crypto from 'crypto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async bulk(items: { name: string; props?: any; ts?: string }[]) {
    const now = Time.nowJeru();
    await this.prisma.$transaction(items.map((i) => {
      // Server authoritative: ignore client-provided timestamps
      const ts = now;
      return this.prisma.event.create({ data: { userId: 'unknown', name: i.name, props: i.props ?? {}, ts } });
    }));
    return { ok: true };
  }

  async weeklyXp(from?: string, to?: string) {
    // Determine user scope (stub 'unknown' until wired with guard)
    const userId = 'unknown';
    const now = Time.nowJeru();
    // Default range: last 8 completed weeks ending before current week
    const endAnchor = weekStartJeru(now); // start of current week
    const startAnchor = addDays(endAnchor, -56);
    // Query existing rollups
    const rows = await this.prisma.metricsWeekly.findMany({
      where: { userId, weekStart: { gte: startAnchor, lt: endAnchor } },
      orderBy: { weekStart: 'asc' },
    });
    // On-demand compute for missing/stale weeks by reading events
    const events = await this.prisma.event.findMany({
      where: { userId, name: 'mission_complete', ts: { gte: startAnchor, lt: endAnchor } },
      orderBy: { ts: 'asc' },
    });
    const byWeek = new Map<number, number>();
    for (let i = 0; i < 8; i++) {
      byWeek.set(i, 0);
    }
    for (const ev of events) {
      const w0 = weekStartJeru(ev.ts);
      const idx = Math.floor((ev.ts.getTime() - startAnchor.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const granted = typeof (ev.props as any)?.xpGranted === 'number' ? (ev.props as any).xpGranted : 0;
      if (idx >= 0 && idx < 8) byWeek.set(idx, (byWeek.get(idx) || 0) + granted);
      // Upsert rollup for that week
      await this.prisma.metricsWeekly.upsert({
        where: { userId_weekStart: { userId, weekStart: w0 } },
        update: { xp: { increment: granted } },
        create: { userId, weekStart: w0, xp: granted },
      });
    }

    const labels: string[] = [];
    const xp: number[] = [];
    for (let i = 0; i < 8; i++) {
      const ws = addDays(startAnchor, i * 7);
      const ymd = jeruYMD(ws);
      labels.push(`${ymd.y}-${String(ymd.m).padStart(2, '0')}-${String(ymd.d).padStart(2, '0')}`);
      const existing = rows.find((r) => r.weekStart.getTime() === ws.getTime());
      xp.push(existing ? existing.xp : (byWeek.get(i) || 0));
    }

    // ETag generation based on max(updatedAt)
    const maxUpdated = rows.reduce<Date | null>((acc, r) => (!acc || r.updatedAt > acc ? r.updatedAt : acc), null);
    const etag = crypto.createHash('sha1').update(`${userId}:${startAnchor.toISOString()}:${endAnchor.toISOString()}:${maxUpdated?.toISOString() || '0'}`).digest('hex');

    return { labels, xp, etag };
  }

  async dashboard() {
    const userId = 'unknown';
    const [user, entitlements] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { streakCurrent: true, streakLastActiveAt: true } }),
      this.prisma.entitlement.findMany({ where: { userId, active: true }, select: { key: true } }),
    ]);
    const hasAiCoach = entitlements.some((e) => e.key === 'ai_coach_boost_7d');
    const lockedPayload = { locked: true, required: 'ai_coach_boost' };
    return {
      confidence: hasAiCoach ? 0.0 : lockedPayload,
      fillerPerMin: hasAiCoach ? 0.0 : lockedPayload,
      energy: hasAiCoach ? 'medium' : lockedPayload,
      sentiment: hasAiCoach ? 0.0 : lockedPayload,
      xpTotal: 0,
      aiInsightsCount: hasAiCoach ? 0 : lockedPayload,
      streak: { current: user?.streakCurrent || 0, lastActiveDate: user?.streakLastActiveAt || null },
    };
  }
}


