// FILE: backend/src/modules/missions/missions.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { CompleteMissionDto } from './dto/complete-mission.dto';
import { MissionProgressStatus } from '@prisma/client';

type VisualState = 'completed' | 'current' | 'locked';

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService) {}

  private orderByRoad() {
    // The builder states "global order is what the app respects"
    // => orderIndex is the primary progression axis.
    return [{ orderIndex: 'asc' as const }, { laneIndex: 'asc' as const }, { createdAt: 'asc' as const }];
  }

  private async loadActiveTemplates() {
    return this.prisma.practiceMissionTemplate.findMany({
      where: { active: true },
      include: { category: true, persona: true },
      orderBy: this.orderByRoad(),
    });
  }

  private async ensureProgressRows(userId: string, templateIds: string[]) {
    if (templateIds.length === 0) return;

    const existing = await this.prisma.missionProgress.findMany({
      where: { userId, templateId: { in: templateIds } },
      select: { templateId: true },
    });
    const have = new Set(existing.map((x) => x.templateId));
    const missing = templateIds.filter((id) => !have.has(id));

    if (missing.length === 0) return;

    await this.prisma.missionProgress.createMany({
      data: missing.map((templateId) => ({
        userId,
        templateId,
        status: MissionProgressStatus.LOCKED,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Server-authoritative normalization:
   * - Exactly one "current" mission at a time.
   * - COMPLETED stays COMPLETED.
   * - UNLOCKED is assigned to the first incomplete mission in global order.
   */
  private async normalizeProgress(userId: string, templates: { id: string }[]) {
    if (templates.length === 0) return { unlockedId: null as string | null };

    const templateIds = templates.map((t) => t.id);
    await this.ensureProgressRows(userId, templateIds);

    const progress = await this.prisma.missionProgress.findMany({
      where: { userId, templateId: { in: templateIds } },
      select: { templateId: true, status: true },
    });

    const statusMap = new Map(progress.map((p) => [p.templateId, p.status]));
    const completed = (id: string) => statusMap.get(id) === MissionProgressStatus.COMPLETED;

    const firstIncompleteIndex = templates.findIndex((t) => !completed(t.id));
    const unlockedId = firstIncompleteIndex === -1 ? null : templates[firstIncompleteIndex].id;

    const lockIds: string[] = [];
    const unlockIds: string[] = [];

    templates.forEach((t, idx) => {
      const cur = statusMap.get(t.id) ?? MissionProgressStatus.LOCKED;
      if (cur === MissionProgressStatus.COMPLETED) return;

      const desired =
        unlockedId && idx === firstIncompleteIndex
          ? MissionProgressStatus.UNLOCKED
          : MissionProgressStatus.LOCKED;

      if (desired === MissionProgressStatus.LOCKED && cur !== desired) lockIds.push(t.id);
      if (desired === MissionProgressStatus.UNLOCKED && cur !== desired) unlockIds.push(t.id);
    });

    if (lockIds.length === 0 && unlockIds.length === 0) {
      return { unlockedId };
    }

    await this.prisma.$transaction([
      lockIds.length
        ? this.prisma.missionProgress.updateMany({
            where: { userId, templateId: { in: lockIds }, status: { not: MissionProgressStatus.COMPLETED } },
            data: { status: MissionProgressStatus.LOCKED },
          })
        : this.prisma.missionProgress.updateMany({ where: { userId, templateId: { in: [] } }, data: { status: MissionProgressStatus.LOCKED } }),
      unlockIds.length
        ? this.prisma.missionProgress.updateMany({
            where: { userId, templateId: { in: unlockIds }, status: { not: MissionProgressStatus.COMPLETED } },
            data: { status: MissionProgressStatus.UNLOCKED },
          })
        : this.prisma.missionProgress.updateMany({ where: { userId, templateId: { in: [] } }, data: { status: MissionProgressStatus.UNLOCKED } }),
    ]);

    return { unlockedId };
  }

  private toVisualState(p: { status: MissionProgressStatus } | undefined, unlockedId: string | null, templateId: string): VisualState {
    const status = p?.status ?? MissionProgressStatus.LOCKED;
    if (status === MissionProgressStatus.COMPLETED) return 'completed';
    if (unlockedId && templateId === unlockedId) return 'current';
    return 'locked';
  }

  async getRoadForUser(userId: string) {
    const templates = await this.loadActiveTemplates();
    const normalized = await this.normalizeProgress(userId, templates);

    const progress = await this.prisma.missionProgress.findMany({
      where: { userId, templateId: { in: templates.map((t) => t.id) } },
      select: { templateId: true, status: true, bestScore: true },
    });
    const progressMap = new Map(progress.map((p) => [p.templateId, p]));

    const missions = templates.map((t) => {
      const p = progressMap.get(t.id);
      const visualState = this.toVisualState(p, normalized.unlockedId, t.id);
      const isCompleted = p?.status === MissionProgressStatus.COMPLETED;
      const isUnlocked = isCompleted || visualState === 'current';

      return {
        id: t.id,
        code: t.code,
        title: t.title,
        description: t.description ?? null,

        laneIndex: t.laneIndex,
        orderIndex: t.orderIndex,

        difficulty: t.difficulty,
        goalType: t.goalType ?? null,

        timeLimitSec: t.timeLimitSec,
        maxMessages: t.maxMessages ?? null,
        wordLimit: t.wordLimit ?? null,
        isVoiceSupported: t.isVoiceSupported,

        rewards: {
          xp: t.baseXpReward,
          coins: t.baseCoinsReward,
          gems: t.baseGemsReward,
        },

        category: t.category
          ? { id: t.category.id, code: t.category.code, label: t.category.label, description: t.category.description ?? null }
          : null,

        persona: t.persona
          ? {
              id: t.persona.id,
              code: t.persona.code,
              name: t.persona.name,
              shortLabel: t.persona.shortLabel ?? null,
              description: t.persona.description ?? null,
              style: t.persona.style ?? null,
              avatarUrl: t.persona.avatarUrl ?? null,
              difficulty: t.persona.difficulty ?? null,
            }
          : null,

        aiContract: (t as any).aiContract ?? null,

        // per-user state:
        isCompleted,
        isUnlocked,
        visualState,
        bestScore: p?.bestScore ?? null,
      };
    });

    // Group into lanes for UI layout (laneIndex is visual column)
    const laneMap = new Map<number, any[]>();
    missions.forEach((m) => {
      const arr = laneMap.get(m.laneIndex) ?? [];
      arr.push(m);
      laneMap.set(m.laneIndex, arr);
    });

    const lanes = Array.from(laneMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([laneIndex, ms]) => ({
        laneIndex,
        title: `Lane ${laneIndex + 1}`,
        missions: ms.sort((a, b) => (a.orderIndex - b.orderIndex) || (a.id.localeCompare(b.id))),
      }));

    const totalMissions = missions.length;
    const completedCount = missions.filter((m) => m.isCompleted).length;
    const unlockedCount = missions.filter((m) => m.isUnlocked).length;
    const completionPercent = totalMissions === 0 ? 0 : Math.round((completedCount / totalMissions) * 100);

    return {
      ok: true,
      lanes,
      summary: { totalMissions, unlockedCount, completedCount, completionPercent },
    };
  }

  async getMissionForUser(userId: string, templateId: string) {
    const road = await this.getRoadForUser(userId);
    const mission = road.lanes.flatMap((l: any) => l.missions).find((m: any) => m.id === templateId);
    if (!mission) throw new NotFoundException({ code: 'MISSION_NOT_FOUND', message: 'Mission not found' });
    return { ok: true, mission };
  }

  async startMission(userId: string, templateId: string) {
    const { ok, mission } = await this.getMissionForUser(userId, templateId);

    if (!mission.isUnlocked) {
      throw new ForbiddenException({
        code: 'MISSION_LOCKED',
        message: 'Complete previous missions to unlock this mission.',
        details: { templateId },
      });
    }

    return { ok, mission };
  }

  async completeMission(userId: string, templateId: string, dto: CompleteMissionDto) {
    // If client doesn’t pass isSuccess, we assume success (MVP)
    const isSuccess = dto.isSuccess !== false;

    // Ensure row exists
    await this.prisma.missionProgress.upsert({
      where: { userId_templateId: { userId, templateId } },
      update: {},
      create: { userId, templateId, status: MissionProgressStatus.LOCKED },
    });

    if (!isSuccess) {
      // no progression, keep as-is; still normalize to keep single "current"
      await this.normalizeProgress(userId, await this.loadActiveTemplates());
      return { ok: true, completed: false };
    }

    await this.prisma.missionProgress.update({
      where: { userId_templateId: { userId, templateId } },
      data: {
        status: MissionProgressStatus.COMPLETED,
        ...(typeof dto.score === 'number' ? { bestScore: dto.score } : {}),
      },
    });

    // unlock next mission
    await this.normalizeProgress(userId, await this.loadActiveTemplates());

    return { ok: true, completed: true };
  }
}
