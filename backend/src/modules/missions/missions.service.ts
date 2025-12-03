import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { MissionProgressStatus } from '@prisma/client';

const STATUS_LOCKED = MissionProgressStatus.LOCKED;
const STATUS_UNLOCKED = MissionProgressStatus.UNLOCKED;
const STATUS_COMPLETED = MissionProgressStatus.COMPLETED;

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

    const ids = (templates as any[]).map((t) => t.id);

    const progresses =
      ids.length > 0
        ? await this.prisma.missionProgress.findMany({
            where: {
              userId,
              templateId: { in: ids },
            },
          })
        : [];

    const progressByTemplateId = new Map<string, any>();
    for (const p of progresses as any[]) {
      progressByTemplateId.set(p.templateId, p);
    }

    // group templates by lane and sort inside lane
    const templatesByLane = new Map<number, any[]>();
    for (const t of templates as any[]) {
      const lane = Number((t as any).laneIndex ?? 0);
      const arr = templatesByLane.get(lane) ?? [];
      arr.push(t);
      templatesByLane.set(lane, arr);
    }
    for (const [lane, arr] of templatesByLane.entries()) {
      arr.sort((a, b) => Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0));
      templatesByLane.set(lane, arr);
    }

    // unlock rules: first in lane unlocked, others require previous completed
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

    // current: first unlocked-but-not-completed in overall order
    let currentId: string | null = null;
    for (const t of templates as any[]) {
      const isUnlocked = unlockedById.get(t.id) ?? false;
      const prog = progressByTemplateId.get(t.id);
      const isCompleted = prog?.status === STATUS_COMPLETED;
      if (!currentId && isUnlocked && !isCompleted) currentId = t.id;
    }

    return (templates as any[]).map((t) => {
      const prog = progressByTemplateId.get(t.id);
      const isUnlocked = unlockedById.get(t.id) ?? false;
      const isCompleted = prog?.status === STATUS_COMPLETED;

      // field not guaranteed in schema — keep defensive access
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
          ? { id: t.category.id, code: t.category.code, label: t.category.label }
          : null,

        persona: t.persona
          ? {
              id: t.persona.id,
              name: t.persona.name,
              bio: (t.persona as any).bio ?? (t.persona as any).description ?? '',
              avatarUrl: (t.persona as any).avatarUrl ?? null,
              voicePreset: (t.persona as any).voicePreset ?? null,
            }
          : null,

        progress: prog
          ? {
              status: prog.status,
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
   * - ensure MissionProgress row exists (UNLOCKED, not LOCKED)
   */
  async startMissionForUser(userId: string, templateId: string) {
    const template = await this.prisma.practiceMissionTemplate.findUnique({
      where: { id: templateId },
      include: { persona: true, category: true },
    });

    if (!template) throw new NotFoundException('Mission template not found.');
    if (!(template as any).active)
      throw new ForbiddenException('Mission is inactive.');

    const isUnlocked = await this.isUnlockedForUser(userId, template as any);
    if (!isUnlocked)
      throw new ForbiddenException('You must complete earlier missions first.');

    const existing = await this.prisma.missionProgress.findFirst({
      where: { userId, templateId },
    });

    if (!existing) {
      await this.prisma.missionProgress.create({
        data: {
          userId,
          templateId,
          status: STATUS_UNLOCKED,
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
