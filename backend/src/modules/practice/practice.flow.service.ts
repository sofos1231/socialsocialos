import { Injectable, UnauthorizedException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type MissionStatus = 'locked' | 'available' | 'in_progress' | 'completed';

@Injectable()
export class PracticeFlowService {
  constructor(private prisma: PrismaService) {}

  private toJerusalemDay(date: Date): string {
    const p = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(date);
    const y = p.find(x => x.type === 'year')!.value;
    const m = p.find(x => x.type === 'month')!.value;
    const d = p.find(x => x.type === 'day')!.value;
    return `${y}-${m}-${d}`;
  }

  private jerusalemYesterday(date: Date): string {
    const dt = new Date(date);
    dt.setUTCDate(dt.getUTCDate() - 1);
    return this.toJerusalemDay(dt);
  }

  async getHubAggregate(userId: string) {
    const [user, profile, activeSession, categories, missions, progress] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.practiceSession.findFirst({ where: { userId, state: { in: ['active', 'paused'] } }, include: { mission: true } }),
      this.prisma.category.findMany(),
      this.prisma.mission.findMany(),
      this.prisma.userProgress.findUnique({ where: { userId } })
    ]);

    if (!user || !profile) throw new UnauthorizedException();

    const completedIds: Set<string> = new Set(
      Array.isArray(progress?.completedMissions)
        ? (progress!.completedMissions as any)
        : (() => { try { return JSON.parse((progress as any)?.completedMissions || '[]'); } catch { return []; } })()
    );

    const now = new Date();
    const todayJerusalem = this.toJerusalemDay(now);
    const lastActiveJerusalem = profile.lastActiveAt ? this.toJerusalemDay(profile.lastActiveAt) : null;
    const shouldIncrementStreak = lastActiveJerusalem !== todayJerusalem;

    const categoriesWithCounts = categories.map((c) => {
      const catMissions = missions.filter((m) => m.category === c.key);
      const completed = catMissions.filter((m) => completedIds.has(m.id)).length;
      return { key: c.key, title: c.title, total: catMissions.length, completed };
    });

    const quickDrill = { durationSec: 30, xp: 5 };
    const dailyTip = 'Consistency beats intensity.';

    return {
      user: {
        id: user.id,
        level: profile.level,
        xp: profile.xp,
        levelXp: profile.levelXp,
        coins: profile.coins,
        diamonds: profile.diamonds,
        premium: profile.premium,
        streak: { current: profile.streakCurrent, lastActiveDate: profile.lastActiveAt },
        onboardingComplete: true,
      },
      activeSession: activeSession ? {
        id: activeSession.id,
        mode: activeSession.mode,
        state: activeSession.state,
        mission: activeSession.mission ? { id: activeSession.mission.id, key: activeSession.mission.key, title: activeSession.mission.title } : null
      } : null,
      categories: categoriesWithCounts,
      quickDrill,
      dailyTip,
    };
  }

  computeMissionStatus(params: {
    mission: any; profile: any; progress: any; activeSession?: any; now: Date;
  }): { status: MissionStatus; reason?: string; availableAt?: string } {
    const { mission, profile, progress, activeSession, now } = params;
    const completedIds: Set<string> = new Set(Array.isArray(progress?.completedMissions) ? (progress.completedMissions as any) : []);
    if (completedIds.has(mission.id)) return { status: 'completed' };
    if (activeSession && activeSession.missionId === mission.id && ['active', 'paused'].includes(activeSession.state)) return { status: 'in_progress' };

    const req = (() => { try { return mission.requirements ? JSON.parse(mission.requirements as any) : {}; } catch { return {}; } })();
    if (mission.premium && !profile.premium) return { status: 'locked', reason: 'premium' };
    if (req.minLevel && profile.level < req.minLevel) return { status: 'locked', reason: 'level' };
    if (req.prerequisiteMissionIds) {
      const ok = (req.prerequisiteMissionIds as string[]).every((id) => completedIds.has(id));
      if (!ok) return { status: 'locked', reason: 'prereq' };
    }
    // cooldown
    const last = (() => { try { return JSON.parse((progress as any)?.lastCompletionByMission || '{}')?.[mission.id]; } catch { return undefined; } })();
    if (mission.cooldownSec && last) {
      const availableAtDate = new Date(new Date(last).getTime() + mission.cooldownSec * 1000);
      if (availableAtDate > now) return { status: 'locked', reason: 'cooldown', availableAt: availableAtDate.toISOString() };
    }
    return { status: 'available' };
  }

  async listMissions(userId: string, categoryKey?: string) {
    const [profile, missions, activeSession, progress] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.mission.findMany({ where: categoryKey ? { category: categoryKey } : {} }),
      this.prisma.practiceSession.findFirst({ where: { userId, state: { in: ['active', 'paused'] } } }),
      this.prisma.userProgress.findUnique({ where: { userId } })
    ]);
    if (!profile) throw new UnauthorizedException();
    const now = new Date();
    return missions.map((m) => ({
      id: m.id,
      key: m.key,
      title: m.title,
      category: m.category,
      status: this.computeMissionStatus({ mission: m, profile, progress, activeSession, now }),
    }));
  }

  async startSession(userId: string, { missionId, mode }: { missionId?: string; mode: 'standard'|'quick'|'shadow' }) {
    // Check active fast path
    const active = await this.prisma.practiceSession.findFirst({ where: { userId, state: { in: ['active', 'paused'] } } });
    if (active) return active;
    let mission: any = null;
    if (mode === 'standard') {
      if (!missionId) throw new ForbiddenException('missionId required for standard');
      mission = await this.prisma.mission.findUnique({ where: { id: missionId } });
      if (!mission) throw new ForbiddenException('mission not found');
      // enforce availability
      const [profile, progress] = await Promise.all([
        this.prisma.userProfile.findUnique({ where: { userId } }),
        this.prisma.userProgress.findUnique({ where: { userId } })
      ]);
      const status = this.computeMissionStatus({ mission, profile, progress, now: new Date(), activeSession: null });
      if (status.status === 'locked') {
        throw new ForbiddenException(status);
      }
    }
    // Serialize creation with UserActiveSession guard
    const created = await this.prisma.$transaction(async (tx) => {
      // If guard exists, return existing session
      const guard = await tx.userActiveSession.findUnique({ where: { userId } });
      if (guard) {
        const existing = await tx.practiceSession.findUnique({ where: { id: guard.sessionId } });
        if (existing && ['active','paused'].includes(existing.state)) return existing;
        // Stale guard; cleanup and continue
        await tx.userActiveSession.delete({ where: { userId } }).catch(()=>{});
      }
      const s = await tx.practiceSession.create({
        data: {
          userId,
          missionId: mission?.id ?? null,
          category: mission?.category ?? 'general',
          mode,
          state: 'active',
          metrics: JSON.stringify({ turns: 0, mistakes: 0, durationSec: 0 })
        }
      });
      await tx.userActiveSession.create({ data: { userId, sessionId: s.id } });
      return s;
    });
    return created;
  }

  async submitTurn(userId: string, sessionId: string, turn: any) {
    const session = await this.prisma.practiceSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) throw new UnauthorizedException();
    const currentMetrics = (() => { try { return session.metrics ? JSON.parse(session.metrics as any) : {}; } catch { return {}; } })();
    const metrics = { ...currentMetrics, turns: currentMetrics?.turns ? currentMetrics.turns + 1 : 1 };
    await this.prisma.practiceSession.update({ where: { id: sessionId }, data: { metrics: JSON.stringify(metrics) } });
    return { events: [{ type: 'turn.accepted' }] };
  }

  async completeSession(userId: string, sessionId: string) {
    // Fetch session and compute rewards eagerly
    const session = await this.prisma.practiceSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) throw new UnauthorizedException();

    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    const mission = session.missionId ? await this.prisma.mission.findUnique({ where: { id: session.missionId } }) : null;
    const progress = await this.prisma.userProgress.upsert({ where: { userId }, update: {}, create: { userId } });
    let baseXp = 0; let coins = 0; let diamonds = 0;
    if (session.mode === 'shadow') baseXp = 0; else if (session.mode === 'quick') baseXp = 5; else if (mission) {
      const rewards = (() => { try { return mission.rewards ? JSON.parse(mission.rewards as any) : { xp: 10 }; } catch { return { xp: 10 }; } })();
      baseXp = rewards.xp || 10; coins = rewards.coins || 0; diamonds = rewards.diamonds || 0;
    }
    const streakBonusPct = (profile!.streakCurrent > 3) ? 10 : 0;
    const bonusXp = Math.floor(baseXp * streakBonusPct / 100);
    const totalXp = baseXp + bonusXp;
    const now = new Date();
    const todayJerusalem = this.toJerusalemDay(now);
    const yesterdayJerusalem = this.jerusalemYesterday(now);
    const lastActiveJerusalem = profile!.lastActiveAt ? this.toJerusalemDay(profile!.lastActiveAt) : null;
    let newStreak = profile!.streakCurrent;
    if (lastActiveJerusalem === todayJerusalem) newStreak = profile!.streakCurrent;
    else if (lastActiveJerusalem === yesterdayJerusalem) newStreak = profile!.streakCurrent + 1;
    else newStreak = 1;

    const currentMetrics = (() => { try { return session.metrics ? JSON.parse(session.metrics as any) : {}; } catch { return {}; } })();
    const updatedMetrics = { ...currentMetrics, rewardLast: { xp: totalXp, coins, diamonds } };

    // Atomic guard: only apply once by updating rewardApplied=false row
    const result = await this.prisma.$transaction(async (tx) => {
      const updateRes = await tx.practiceSession.updateMany({ where: { id: sessionId, userId, rewardApplied: false }, data: { state: 'completed', rewardApplied: true, completedAt: now, metrics: JSON.stringify(updatedMetrics) } });
      if (updateRes.count === 0) {
        // Already applied by another concurrent call → replay
        const latest = await tx.practiceSession.findUnique({ where: { id: sessionId } });
        const prev = (() => { try { return latest?.metrics ? JSON.parse(latest.metrics as any) : {}; } catch { return {}; } })();
        const rewardLast = (prev as any)?.rewardLast || { xp: 0, coins: 0, diamonds: 0 };
        return { idempotent: true, reward: rewardLast } as const;
      }
      // First applier: apply side effects
      await tx.userProfile.update({ where: { userId }, data: { xp: profile!.xp + totalXp, coins: profile!.coins + coins, diamonds: profile!.diamonds + diamonds, lastActiveAt: now, streakCurrent: newStreak } });
      const completedArray = (() => { try { return JSON.parse((progress as any)?.completedMissions || '[]'); } catch { return []; } })();
      const lastMap = (() => { try { return JSON.parse((progress as any)?.lastCompletionByMission || '{}'); } catch { return {}; } })();
      const newCompleted = session.missionId ? [...completedArray, session.missionId] : completedArray;
      const newLast = session.missionId ? { ...lastMap, [session.missionId]: now.toISOString() } : lastMap;
      await tx.userProgress.update({ where: { userId }, data: { completedMissions: JSON.stringify(newCompleted), lastCompletionByMission: JSON.stringify(newLast) } });
      // Clear active session guard on completion
      await tx.userActiveSession.delete({ where: { userId } }).catch(() => {});
      return { idempotent: false, reward: { xp: totalXp, coins, diamonds } } as const;
    });

    return { ok: true, id: sessionId, reward: result.reward, idempotent: result.idempotent };
  }

  async abortSession(userId: string, sessionId: string) {
    const session = await this.prisma.practiceSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) throw new UnauthorizedException();
    if (session.state === 'completed') throw new ConflictException('already completed');
    await this.prisma.$transaction(async (tx) => {
      await tx.practiceSession.update({ where: { id: sessionId }, data: { state: 'aborted' } });
      await tx.userActiveSession.delete({ where: { userId } }).catch(()=>{});
    });
    return { ok: true };
  }
}


