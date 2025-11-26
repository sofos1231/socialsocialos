// FILE: backend/src/modules/missions/missions.service.ts
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { MissionProgressStatus } from '@prisma/client';
import { CompleteMissionDto } from './dto/complete-mission.dto';

type MissionVisualState = 'completed' | 'current' | 'locked';

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService) {}

  private roadOrder() {
    // Display order = lane then order inside lane.
    // Progression order = same (stable + intuitive).
    return [{ laneIndex: 'asc' as const }, { orderIndex: 'asc' as const }, { createdAt: 'asc' as const }];
  }

  private async loadActiveTemplates() {
    return this.prisma.practiceMissionTemplate.findMany({
      where: { active: true },
      include: { category: true, persona: true },
      orderBy: this.roadOrder(),
    });
  }

  // ---------- PUBLIC ROAD (no auth, no DB writes) ----------
  async getRoadPublic() {
    const templates = await this.loadActiveTemplates();
    const firstId = templates[0]?.id ?? null;

    const missions = templates.map((t) => {
      const isUnlocked = firstId ? t.id === firstId : false;
      const isCompleted = false;

      const visualState: MissionVisualState = isUnlocked ? 'current' : 'locked';

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
          xp: t.baseXpReward ?? 0,
          coins: t.baseCoinsReward ?? 0,
          gems: t.baseGemsReward ?? 0,
        },

        category: t.category
          ? {
              id: t.category.id,
              code: t.category.code,
              label: t.category.label,
              description: t.category.description ?? null,
            }
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

        isCompleted,
        isUnlocked,
        visualState,
        bestScore: null,
      };
    });

    const lanes = this.groupIntoLanes(missions);

    return {
      ok: true,
      lanes,
      summary: {
        totalMissions: missions.length,
        unlockedCount: missions.filter((m) => m.isUnlocked).length,
        completedCount: 0,
        completionPercent: 0,
      },
    };
  }

  // ---------- USER ROAD (auth, writes normalized progress) ----------
  async getRoadForUser(userId: string) {
    if (!userId) throw new ForbiddenException('Missing user id');

    const templates = await this.loadActiveTemplates();
    const templateIds = templates.map((t) => t.id);

    if (!templateIds.length) {
      return {
        ok: true,
        lanes: [],
        summary: {
          totalMissions: 0,
          unlockedCount: 0,
          completedCount: 0,
          completionPercent: 0,
        },
      };
    }

    // Ensure progress rows exist (idempotent)
    await this.prisma.missionProgress.createMany({
      data: templateIds.map((templateId) => ({
        userId,
        templateId,
        status: MissionProgressStatus.LOCKED,
      })),
      skipDuplicates: true,
    });

    const progressRows = await this.prisma.missionProgress.findMany({
      where: { userId, templateId: { in: templateIds } },
      select: { templateId: true, status: true, bestScore: true },
    });

    const statusMap = new Map(progressRows.map((p) => [p.templateId, p.status]));
    const bestMap = new Map(progressRows.map((p) => [p.templateId, p.bestScore ?? null]));

    const isCompleted = (id: string) => statusMap.get(id) === MissionProgressStatus.COMPLETED;

    // first incomplete mission becomes the ONLY unlocked mission
    const unlockedTemplate = templates.find((t) => !isCompleted(t.id));
    const unlockedId = unlockedTemplate?.id ?? null;

    // Normalize in DB: everything not completed => LOCKED, and unlockedId => UNLOCKED
    await this.prisma.$transaction(async (tx) => {
      await tx.missionProgress.updateMany({
        where: {
          userId,
          templateId: { in: templateIds },
          status: { not: MissionProgressStatus.COMPLETED },
        },
        data: { status: MissionProgressStatus.LOCKED },
      });

      if (unlockedId) {
        await tx.missionProgress.update({
          where: { userId_templateId: { userId, templateId: unlockedId } },
          data: { status: MissionProgressStatus.UNLOCKED },
        });
      }
    });

    const missions = templates.map((t) => {
      const completed = isCompleted(t.id);
      const unlocked = unlockedId ? t.id === unlockedId : false;

      const visualState: MissionVisualState =
        completed ? 'completed' : unlocked ? 'current' : 'locked';

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
          xp: t.baseXpReward ?? 0,
          coins: t.baseCoinsReward ?? 0,
          gems: t.baseGemsReward ?? 0,
        },

        category: t.category
          ? {
              id: t.category.id,
              code: t.category.code,
              label: t.category.label,
              description: t.category.description ?? null,
            }
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

        isCompleted: completed,
        isUnlocked: completed || unlocked,
        visualState,
        bestScore: bestMap.get(t.id) ?? null,
      };
    });

    const lanes = this.groupIntoLanes(missions);

    const totalMissions = missions.length;
    const completedCount = missions.filter((m) => m.isCompleted).length;
    const unlockedCount = missions.filter((m) => m.isUnlocked).length;
    const completionPercent = totalMissions
      ? Math.round((completedCount / totalMissions) * 100)
      : 0;

    return {
      ok: true,
      lanes,
      summary: {
        totalMissions,
        unlockedCount,
        completedCount,
        completionPercent,
      },
    };
  }

  private groupIntoLanes(missions: any[]) {
    const lanesMap = new Map<number, any[]>();

    for (const m of missions) {
      const arr = lanesMap.get(m.laneIndex) ?? [];
      arr.push(m);
      lanesMap.set(m.laneIndex, arr);
    }

    return Array.from(lanesMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([laneIndex, ms]) => ({
        laneIndex,
        title: `Lane ${laneIndex + 1}`,
        missions: ms.sort(
          (a, b) => (a.orderIndex - b.orderIndex) || a.id.localeCompare(b.id),
        ),
      }));
  }

  async getMissionForUser(userId: string, templateId: string) {
    const road = await this.getRoadForUser(userId);
    const mission = road.lanes.flatMap((l) => l.missions).find((m) => m.id === templateId);
    if (!mission) throw new NotFoundException({ code: 'MISSION_NOT_FOUND', message: 'mission not found' });
    return { ok: true, mission };
  }

  async startMission(userId: string, templateId: string) {
    const { mission } = await this.getMissionForUser(userId, templateId);

    if (!mission.isUnlocked) {
      throw new ForbiddenException({
        code: 'MISSION_LOCKED',
        message: 'Mission is locked',
      });
    }

    return { ok: true, mission };
  }

  async completeMission(userId: string, templateId: string, dto: CompleteMissionDto) {
    const isSuccess = dto.isSuccess !== false;
    const score = typeof dto.score === 'number' ? dto.score : null;

    // Ensure row exists
    await this.prisma.missionProgress.upsert({
      where: { userId_templateId: { userId, templateId } },
      update: {},
      create: { userId, templateId, status: MissionProgressStatus.LOCKED },
    });

    if (isSuccess) {
      const existing = await this.prisma.missionProgress.findUnique({
        where: { userId_templateId: { userId, templateId } },
        select: { bestScore: true },
      });

      const nextBest =
        score === null
          ? existing?.bestScore ?? null
          : Math.max(existing?.bestScore ?? 0, score);

      await this.prisma.missionProgress.update({
        where: { userId_templateId: { userId, templateId } },
        data: { status: MissionProgressStatus.COMPLETED, bestScore: nextBest },
      });

      // Normalize afterwards (unlock next incomplete)
      const road = await this.getRoadForUser(userId);
      return { ok: true, completed: true, road };
    }

    // No advancement on fail; still return road so client can refresh
    const road = await this.getRoadForUser(userId);
    return { ok: true, completed: false, road };
  }
}
