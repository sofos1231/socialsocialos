// FILE: backend/src/modules/missions/missions.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MissionProgressStatus } from '@prisma/client';

function pickEnumValue<T extends Record<string, any>>(
  enumObj: T,
  preferredKeys: string[],
): T[keyof T] {
  for (const k of preferredKeys) {
    if ((enumObj as any)[k] !== undefined) return (enumObj as any)[k];
  }
  const vals = Object.values(enumObj);
  if (!vals.length) throw new Error('Enum has no values');
  return vals[0] as any;
}

const STATUS_NOT_STARTED = pickEnumValue(MissionProgressStatus as any, [
  'NOT_STARTED',
  'PENDING',
  'NEW',
  'STARTED',
]);

const STATUS_COMPLETED = pickEnumValue(MissionProgressStatus as any, [
  'COMPLETED',
  'DONE',
  'FINISHED',
  'SUCCESS',
]);

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Used by Mission Road UI.
   * Returns ordered mission templates + per-user progress + computed unlock/current flags.
   */
  async getRoadForUser(userId: string) {
    const templates = await this.prisma.practiceMissionTemplate.findMany({
      where: { active: true },
      orderBy: [{ laneIndex: 'asc' }, { orderIndex: 'asc' }],
      include: { persona: true, category: true },
    });

    const ids = templates.map((t: any) => t.id);

    const progresses = ids.length
      ? await this.prisma.missionProgress.findMany({
          where: {
            userId,
            templateId: { in: ids },
          },
        })
      : [];

    const progressByTemplateId = new Map<string, any>();
    for (const p of progresses as any[]) {
      // MissionProgress.templateId (from schema)
      progressByTemplateId.set(p.templateId, p);
    }

    // Compute unlock per lane: first is unlocked; next unlocked only if previous completed
    const templatesByLane = new Map<number, any[]>();
    for (const t of templates as any[]) {
      const lane = Number((t as any).laneIndex ?? 0);
      const arr = templatesByLane.get(lane) ?? [];
      arr.push(t);
      templatesByLane.set(lane, arr);
    }

    // Ensure lane ordering stable
    for (const [lane, arr] of templatesByLane.entries()) {
      arr.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      templatesByLane.set(lane, arr);
    }

    const unlockedById = new Map<string, boolean>();
    for (const [, arr] of templatesByLane.entries()) {
      for (let i = 0; i < arr.length; i++) {
        const t = arr[i];
        if (i === 0) {
          unlockedById.set(t.id, true);
          continue;
        }
        const prev = arr[i - 1];
        const prevProg = progressByTemplateId.get(prev.id);
        const prevCompleted = prevProg?.status === STATUS_COMPLETED;
        unlockedById.set(t.id, !!prevCompleted);
      }
    }

    // Pick "current": first unlocked-but-not-completed across all templates
    let currentId: string | null = null;
    for (const t of templates as any[]) {
      const isUnlocked = unlockedById.get(t.id) ?? false;
      const prog = progressByTemplateId.get(t.id);
      const isCompleted = prog?.status === STATUS_COMPLETED;
      if (!currentId && isUnlocked && !isCompleted) {
        currentId = t.id;
      }
    }

    return templates.map((t: any) => {
      const prog = progressByTemplateId.get(t.id);
      const isUnlocked = unlockedById.get(t.id) ?? false;
      const isCompleted = prog?.status === STATUS_COMPLETED;

      // estMinutes is not typed in your prisma client -> read defensively
      const estMinutes =
        (t as any).estMinutes ??
        (t as any).estimatedMinutes ??
        (t as any).estimateMinutes ??
        null;

      return {
        id: t.id,
        code: t.code ?? null,
        title: t.title ?? '',
        description: t.description ?? '',
        laneIndex: t.laneIndex ?? 0,
        orderIndex: t.orderIndex ?? 0,
        difficulty: t.difficulty,
        goalType: t.goalType,
        estMinutes,

        category: t.category
          ? {
              id: t.category.id,
              code: t.category.code,
              label: t.category.label,
            }
          : null,

        persona: t.persona
          ? {
              id: t.persona.id,
              name: t.persona.name,
              bio:
                (t.persona as any).bio ??
                (t.persona as any).description ??
                '',
              avatarUrl: (t.persona as any).avatarUrl ?? null,
              voicePreset: (t.persona as any).voicePreset ?? null,
            }
          : null,

        progress: prog
          ? {
              status: prog.status,
              // schema currently has no "attempts" column; this will just be undefined
              attempts: (prog as any).attempts ?? 0,
              bestScore: prog.bestScore ?? null,
              updatedAt: prog.updatedAt ?? null,
            }
          : null,

        isUnlocked,
        isCompleted,
        isCurrent: currentId === t.id,
      };
    });
  }

  /**
   * Start mission flow:
   * - validate template exists + active
   * - validate unlocked
   * - ensure MissionProgress row exists (without relying on compound unique name)
   */
  async startMissionForUser(userId: string, templateId: string) {
    const template = await this.prisma.practiceMissionTemplate.findUnique({
      where: { id: templateId },
      include: { persona: true, category: true },
    });

    if (!template) {
      throw new NotFoundException('Mission template not found.');
    }
    if (!(template as any).active) {
      throw new ForbiddenException('Mission is inactive.');
    }

    const isUnlocked = await this.isUnlockedForUser(userId, template as any);
    if (!isUnlocked) {
      throw new ForbiddenException('You must complete earlier missions first.');
    }

    const existing = await this.prisma.missionProgress.findFirst({
      where: { userId, templateId },
    });

    if (!existing) {
      await this.prisma.missionProgress.create({
        data: {
          userId,
          templateId,
          status: STATUS_NOT_STARTED,
        } as any,
      });
    }

    const estMinutes =
      (template as any).estMinutes ??
      (template as any).estimatedMinutes ??
      (template as any).estimateMinutes ??
      null;

    return {
      id: (template as any).id,
      title: (template as any).title ?? '',
      description: (template as any).description ?? '',
      laneIndex: (template as any).laneIndex ?? 0,
      orderIndex: (template as any).orderIndex ?? 0,
      difficulty: (template as any).difficulty,
      goalType: (template as any).goalType,
      estMinutes,

      category: (template as any).category
        ? {
            id: (template as any).category.id,
            code: (template as any).category.code,
            label: (template as any).category.label,
          }
        : null,

      persona: (template as any).persona
        ? {
            id: (template as any).persona.id,
            name: (template as any).persona.name,
            bio:
              (template as any).persona.bio ??
              (template as any).persona.description ??
              '',
            avatarUrl: (template as any).persona.avatarUrl ?? null,
            voicePreset: (template as any).persona.voicePreset ?? null,
          }
        : null,
    };
  }

  /**
   * Unlock rule:
   * - first in lane is unlocked
   * - otherwise requires previous mission in the same lane completed
   */
  private async isUnlockedForUser(userId: string, template: any) {
    const orderIndex = Number(template.orderIndex ?? 0);
    if (orderIndex <= 0) return true;

    const prev = await this.prisma.practiceMissionTemplate.findFirst({
      where: {
        active: true,
        laneIndex: template.laneIndex,
        orderIndex: { lt: orderIndex },
      },
      orderBy: { orderIndex: 'desc' },
    });

    if (!prev) return true;

    const prevProgress = await this.prisma.missionProgress.findFirst({
      where: { userId, templateId: (prev as any).id },
    });

    return prevProgress?.status === STATUS_COMPLETED;
  }
}
