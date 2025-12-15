import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { normalizeMissionConfigV1 } from '../practice/mission-config-runtime';
import { MissionProgressStatus, Gender, AttractionPreference } from '@prisma/client';

const STATUS_LOCKED = MissionProgressStatus.LOCKED;
const STATUS_UNLOCKED = MissionProgressStatus.UNLOCKED;
const STATUS_COMPLETED = MissionProgressStatus.COMPLETED;

@Injectable()
export class MissionsService {
  private readonly logger = new Logger(MissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Used by Mission Road UI.
   * Returns ordered mission templates + per-user progress + computed unlock/current flags.
   * Filters attraction-sensitive missions based on user's attraction preference.
   */
  async getRoadForUser(userId: string) {
    // Load user preferences for filtering
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        gender: true,
        attractedTo: true,
        preferencePath: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const templates = await this.prisma.practiceMissionTemplate.findMany({
      where: { active: true },
      orderBy: [{ laneIndex: 'asc' }, { orderIndex: 'asc' }],
      include: { persona: true, category: true },
    });

    // Filter templates by attraction sensitivity
    const filteredTemplates = templates.filter((t) => {
      // Non-attraction-sensitive missions: always include
      if (!t.isAttractionSensitive) {
        return true;
      }

      // Attraction-sensitive missions: filter based on user preference
      const targetGender = t.targetRomanticGender;

      switch (user.attractedTo) {
        case AttractionPreference.WOMEN:
          return targetGender === Gender.FEMALE;
        case AttractionPreference.MEN:
          return targetGender === Gender.MALE;
        case AttractionPreference.BOTH:
          return targetGender === Gender.FEMALE || targetGender === Gender.MALE;
        case AttractionPreference.OTHER:
        case AttractionPreference.UNKNOWN:
        default:
          // Hide attraction-sensitive missions for OTHER/UNKNOWN
          return false;
      }
    });

    const ids = (filteredTemplates as any[]).map((t) => t.id);

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
    for (const t of filteredTemplates as any[]) {
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
    for (const t of filteredTemplates as any[]) {
      const isUnlocked = unlockedById.get(t.id) ?? false;
      const prog = progressByTemplateId.get(t.id);
      const isCompleted = prog?.status === STATUS_COMPLETED;
      if (!currentId && isUnlocked && !isCompleted) currentId = t.id;
    }

    // Helper to compute dynamic category label
    const computeCategoryLabel = (category: any): string => {
      if (!category) return '';
      
      // If category is not attraction-sensitive or has no template, use static label
      if (!category.isAttractionSensitive || !category.dynamicLabelTemplate) {
        return category.label;
      }

      // Compute targetPlural based on user's attraction preference
      let targetPlural = 'People';
      switch (user.attractedTo) {
        case AttractionPreference.WOMEN:
          targetPlural = 'Women';
          break;
        case AttractionPreference.MEN:
          targetPlural = 'Men';
          break;
        case AttractionPreference.BOTH:
          targetPlural = 'Women & Men';
          break;
        case AttractionPreference.OTHER:
        case AttractionPreference.UNKNOWN:
        default:
          targetPlural = 'People';
          break;
      }

      // Replace {{targetPlural}} placeholder
      return category.dynamicLabelTemplate.replace('{{targetPlural}}', targetPlural);
    };

    return (filteredTemplates as any[]).map((t) => {
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
          ? {
              id: t.category.id,
              code: t.category.code,
              label: t.category.label,
              displayLabel: computeCategoryLabel(t.category),
            }
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
        isActive: !!t.active,
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
    // Load user preferences for persona compatibility check
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        gender: true,
        attractedTo: true,
        preferencePath: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const template = await this.prisma.practiceMissionTemplate.findUnique({
      where: { id: templateId },
      include: { persona: true, category: true },
    });

    if (!template) {
      const code = 'MISSION_TEMPLATE_NOT_FOUND';
      const message = 'Mission template not found.';
      this.logger.warn(
        `startMissionForUser failed: code=${code} userId=${userId} templateId=${templateId} reason=${message}`,
      );
      throw new NotFoundException({
        code,
        message,
        templateId,
      });
    }

    if (!(template as any).active) {
      const code = 'MISSION_INACTIVE';
      const message = 'Mission is inactive.';
      this.logger.warn(
        `startMissionForUser failed: code=${code} userId=${userId} templateId=${template.id} templateCode=${template.code} reason=${message}`,
      );
      throw new ForbiddenException({
        code,
        message,
        templateId: template.id,
        templateCode: template.code,
      });
    }

    // ✅ STEP 4.2: Pre-flight validation - ensure template has valid aiContract
    if (!template.aiContract || template.aiContract === null) {
      const code = 'MISSION_TEMPLATE_INVALID_AT_START';
      const message = 'Mission template is missing aiContract configuration';
      this.logger.warn(
        `startMissionForUser failed: code=${code} userId=${userId} templateId=${template.id} templateCode=${template.code} reason=${message}`,
      );
      throw new BadRequestException({
        code,
        message,
        templateId: template.id,
        templateCode: template.code,
      });
    }

    const normalizeResult = normalizeMissionConfigV1(template.aiContract);
    if (!normalizeResult.ok) {
      const failedResult = normalizeResult as { ok: false; reason: string; errors?: any[] };
      const code = 'MISSION_TEMPLATE_INVALID_AT_START';
      const message =
        failedResult.reason === 'missing'
          ? 'Mission template aiContract is missing missionConfigV1'
          : failedResult.reason === 'invalid'
            ? 'Mission template aiContract is invalid'
            : 'Mission template aiContract is not a valid object';
      
      // Log first 3 validation errors for debugging
      const errors = failedResult.errors ?? [];
      const firstErrors = errors.slice(0, 3).map(e => `${e.path}: ${e.message}`).join('; ');
      const errorSummary = firstErrors ? ` (${firstErrors})` : '';
      
      this.logger.warn(
        `startMissionForUser failed: code=${code} userId=${userId} templateId=${template.id} templateCode=${template.code} reason=${message}${errorSummary}`,
      );
      throw new BadRequestException({
        code,
        message,
        templateId: template.id,
        templateCode: template.code,
        details: errors,
      });
    }

    const isUnlocked = await this.isUnlockedForUser(userId, template as any);
    if (!isUnlocked) {
      const code = 'MISSION_LOCKED_PREVIOUS_NOT_COMPLETED';
      const message = 'You must complete earlier missions in this lane first.';
      this.logger.warn(
        `startMissionForUser failed: code=${code} userId=${userId} templateId=${template.id} templateCode=${template.code} reason=${message}`,
      );
      throw new ForbiddenException({
        code,
        message,
        templateId: template.id,
        templateCode: template.code,
      });
    }

    // Select compatible persona for attraction-sensitive missions
    const compatiblePersona = await this.selectCompatiblePersona(
      template as any,
      (template as any).persona,
    );

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

      persona: compatiblePersona
        ? {
            id: compatiblePersona.id,
            name: compatiblePersona.name,
            bio:
              compatiblePersona.bio ??
              compatiblePersona.description ??
              '',
            avatarUrl: compatiblePersona.avatarUrl ?? null,
            voicePreset: compatiblePersona.voicePreset ?? null,
            personaGender: compatiblePersona.personaGender ?? null,
          }
        : null,
    };
  }

  /**
   * Single source of truth: Select compatible persona for attraction-sensitive missions
   * Returns the persona that matches the mission's target gender, or falls back to current persona
   * 
   * This method is used by both startMissionForUser() and practice service to ensure
   * persona compatibility is handled consistently across the codebase.
   */
  async selectCompatiblePersona(
    template: any,
    currentPersona: any,
  ): Promise<any> {
    // If mission is not attraction-sensitive, use current persona as-is
    if (!template.isAttractionSensitive) {
      return currentPersona;
    }

    const targetGender = template.targetRomanticGender;
    
    // If no target gender specified, treat as ANY and keep current persona
    if (!targetGender) {
      return currentPersona;
    }

    // If current persona exists and matches target gender, use it
    if (currentPersona && currentPersona.personaGender === targetGender) {
      return currentPersona;
    }

    // Find a compatible persona with matching gender
    const compatiblePersona = await this.prisma.aiPersona.findFirst({
      where: {
        active: true,
        personaGender: targetGender,
      },
    });

    if (compatiblePersona) {
      return compatiblePersona;
    }

    // Fallback: return current persona to avoid hard crashes
    // TODO: Log warning that no compatible persona was found
    return currentPersona;
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
