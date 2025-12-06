import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import {
  AiStyleKey,
  MissionDifficulty,
  MissionGoalType,
  Prisma,
} from '@prisma/client';
import { CreateMissionDto, UpdateMissionDto } from './dto/admin-mission.dto';
import {
  CreateMissionCategoryDto,
  UpdateMissionCategoryDto,
} from './dto/admin-category.dto';
import { ReorderMissionsDto } from './dto/admin-missions-reorder.dto';
import {
  validateMissionConfigV1Shape,
  MissionConfigValidationError,
} from './mission-config-v1.schema';
import {
  normalizeMissionConfigV1,
  type NormalizedMissionConfigV1,
} from '../practice/mission-config-runtime';

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
}

function normalizeCode(raw: any) {
  const v = String(raw ?? '').trim();
  if (!v) return '';
  const safe = v.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/_+/g, '_');
  return safe.toUpperCase().replace(/^_+|_+$/g, '').slice(0, 40);
}

function pickTitle(dto: { title?: any; name?: any }) {
  const t = String(dto.title ?? '').trim();
  if (t) return t;
  const n = String(dto.name ?? '').trim();
  if (n) return n;
  return '';
}

function cleanStr(v: any) {
  const s = String(v ?? '').trim();
  return s.length ? s : undefined;
}

function safeInt(v: any, fallback: number) {
  const n = typeof v === 'number' ? v : Number(String(v));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

@Injectable()
export class MissionsAdminService {
  constructor(private readonly prisma: PrismaService) {}

  private mapPrismaError(e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        return new BadRequestException({
          code: 'UNIQUE_CONSTRAINT',
          message: 'Unique constraint violation',
          details: { target: (e.meta as any)?.target ?? null },
        });
      }
      if (e.code === 'P2003') {
        return new BadRequestException({
          code: 'FK_CONSTRAINT',
          message: 'Foreign key constraint violation',
        });
      }
    }
    return e;
  }

  private sanitizeAiContract(raw: any) {
    if (raw === undefined) return undefined;
    if (raw === null) return null;

    if (typeof raw === 'string') {
      const s = raw.trim();
      if (!s.length) return undefined;
      try {
        return JSON.parse(s);
      } catch {
        return { raw: s };
      }
    }

    return raw;
  }

  private async ensureUniqueTemplateCode(base: string) {
    const normalized = normalizeCode(base);
    if (!normalized) return '';

    let code = normalized.slice(0, 40);
    for (let i = 0; i < 50; i++) {
      const exists = await this.prisma.practiceMissionTemplate.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!exists) return code;

      const suffix = `_${i + 2}`;
      code = (normalized.slice(0, 40 - suffix.length) + suffix).slice(0, 40);
    }

    const tail = Math.random().toString(36).slice(2, 6).toUpperCase();
    return (normalized.slice(0, 35) + '_' + tail).slice(0, 40);
  }

  private normalizeAiStyleKey(raw: any): string | undefined | null {
    if (raw === undefined) return undefined; // not provided -> don't change on update
    if (raw === null) return null; // explicit null -> clear style
    const s = String(raw).trim();
    if (!s.length) return null; // empty string -> clear style
    const key = s
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return key.length ? key : null;
  }

  private assertAiStyleKeyIsValidEnum(key: string) {
    const allowed = Object.values(AiStyleKey) as string[];
    if (!allowed.includes(key)) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Invalid aiStyleKey "${key}". Must be one of: ${allowed.join(', ')}`,
      });
    }
  }

  private async resolveAiStyleIdByKeyOrThrow(key: string) {
    this.assertAiStyleKeyIsValidEnum(key);

    const style = await this.prisma.aiStyle.findUnique({
      where: { key: key as any },
      select: { id: true, key: true, name: true, isActive: true },
    });

    if (!style) {
      throw new BadRequestException({
        code: 'INVALID_AI_STYLE',
        message: `aiStyleKey "${key}" does not exist in DB`,
      });
    }

    if (!style.isActive) {
      throw new BadRequestException({
        code: 'AI_STYLE_INACTIVE',
        message: `aiStyleKey "${key}" is inactive`,
      });
    }

    return style.id;
  }

  private missionInclude() {
    return {
      category: true,
      persona: true,
      aiStyle: {
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          isActive: true,
        },
      },
    } as const;
  }

  async getMeta() {
    const [categories, personas, aiStyles] = await Promise.all([
      this.prisma.missionCategory.findMany({ orderBy: [{ label: 'asc' }] }),
      this.prisma.aiPersona.findMany({ orderBy: [{ name: 'asc' }] }),
      this.prisma.aiStyle.findMany({
        where: { isActive: true },
        orderBy: [{ name: 'asc' }],
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          isActive: true,
        },
      }),
    ]);

    // Keep backward-compat for dashboards that expect enums.aiStyles
    return {
      ok: true,
      categories,
      personas,
      aiStyles, // ✅ DB-synced dropdown data
      enums: {
        difficulties: Object.values(MissionDifficulty),
        goalTypes: Object.values(MissionGoalType),
        aiStyles: aiStyles.map((s) => s.key), // ✅ compat: list of keys
        aiStyleKeys: Object.values(AiStyleKey), // ✅ useful for debugging
      },
    };
  }

  // -------- ADMIN (dashboard) --------

  async getRoad() {
    const templates = await this.prisma.practiceMissionTemplate.findMany({
      where: { active: true },
      include: this.missionInclude(),
      orderBy: [{ laneIndex: 'asc' }, { orderIndex: 'asc' }],
    });

    const normalized = templates
      .map((t) => ({
        ...t,
        laneIndex: safeInt((t as any).laneIndex, 0),
        orderIndex: safeInt((t as any).orderIndex, 0),
      }))
      .sort((a, b) => a.laneIndex - b.laneIndex || a.orderIndex - b.orderIndex);

    return {
      ok: true,
      templates: normalized,
      missions: normalized,
      items: normalized,
      count: normalized.length,
    };
  }

  async listMissionsFlat() {
    const templates = await this.prisma.practiceMissionTemplate.findMany({
      include: this.missionInclude(),
      orderBy: [{ laneIndex: 'asc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
    });

    return templates.map((t) => ({
      ...t,
      laneIndex: safeInt((t as any).laneIndex, 0),
      orderIndex: safeInt((t as any).orderIndex, 0),
    }));
  }

  async listMissions() {
    const templates = await this.prisma.practiceMissionTemplate.findMany({
      include: this.missionInclude(),
      orderBy: [{ createdAt: 'desc' }],
    });

    return {
      ok: true,
      templates,
      missions: templates,
      items: templates,
      count: templates.length,
    };
  }

  // -------- PUBLIC (mobile app) --------
  async getPublicRoad() {
    const templates = await this.prisma.practiceMissionTemplate.findMany({
      where: { active: true },
      include: this.missionInclude(),
      orderBy: [{ laneIndex: 'asc' }, { orderIndex: 'asc' }],
    });

    const normalized = templates
      .map((t) => ({
        ...t,
        laneIndex: safeInt((t as any).laneIndex, 0),
        orderIndex: safeInt((t as any).orderIndex, 0),
      }))
      .sort((a, b) => a.laneIndex - b.laneIndex || a.orderIndex - b.orderIndex);

    const firstId = normalized[0]?.id;

    const byLane = new Map<number, any[]>();
    for (const t of normalized) {
      const lane = t.laneIndex ?? 0;
      if (!byLane.has(lane)) byLane.set(lane, []);
      byLane.get(lane)!.push(t);
    }

    const lanes = Array.from(byLane.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([laneIndex, laneTemplates]) => {
        const missions = laneTemplates
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((t) => {
            const isUnlocked = t.id === firstId;
            const isCompleted = false;

            const visualState: 'completed' | 'current' | 'locked' =
              isCompleted ? 'completed' : isUnlocked ? 'current' : 'locked';

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

              aiStyle: t.aiStyle
                ? {
                    key: t.aiStyle.key,
                    name: t.aiStyle.name,
                    description: t.aiStyle.description,
                  }
                : null,

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

        return {
          laneIndex,
          title: `Lane ${laneIndex + 1}`,
          missions,
        };
      });

    const totalMissions = normalized.length;
    const unlockedCount = totalMissions > 0 ? 1 : 0;

    return {
      ok: true,
      lanes,
      summary: {
        totalMissions,
        unlockedCount,
        completedCount: 0,
        completionPercent: 0,
      },
    };
  }

  // -------- create/update/delete/reorder --------

  async createMission(dto: CreateMissionDto) {
    const title = pickTitle(dto);
    if (!title) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'title is required (or provide "name")',
      });
    }

    const laneIndex =
      Number.isFinite(dto.laneIndex as any) ? (dto.laneIndex as number) : 0;

    let orderIndex =
      Number.isFinite(dto.orderIndex as any)
        ? (dto.orderIndex as number)
        : undefined;

    if (orderIndex === undefined) {
      const last = await this.prisma.practiceMissionTemplate.findFirst({
        where: { laneIndex },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });
      orderIndex = (last?.orderIndex ?? -1) + 1;
    }

    const categoryId = cleanStr(dto.categoryId);
    const categoryCode = normalizeCode(dto.categoryCode);

    const personaId = cleanStr(dto.personaId);
    const personaCode = normalizeCode(dto.personaCode);

    const preferredCode =
      normalizeCode(dto.code) ||
      normalizeCode(`${categoryCode || 'MISSION'}_${slugify(title)}`) ||
      normalizeCode(`MISSION_${slugify(title)}`);

    const code = await this.ensureUniqueTemplateCode(preferredCode);
    if (!code) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'could not generate mission code',
      });
    }

    const aiContract = this.sanitizeAiContract(dto.aiContract);

    // Phase 0: Validate missionConfigV1 for create
    // For create, aiContract must exist and be valid (no undefined/null allowed)
    const validationErrors = validateMissionConfigV1Shape(aiContract);
    if (validationErrors.length > 0) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'Invalid aiContract.missionConfigV1',
        details: validationErrors,
      });
    }

    // ✅ STEP 4.1: Normalize missionConfigV1 before save
    const normalizeResult = normalizeMissionConfigV1(aiContract);
    if (!normalizeResult.ok) {
      const failedResult = normalizeResult as { ok: false; reason: string; errors?: any[] };
      throw new BadRequestException({
        code: 'MISSION_TEMPLATE_INVALID_CONFIG',
        message:
          failedResult.reason === 'missing'
            ? 'Mission template is missing missionConfigV1'
            : failedResult.reason === 'invalid'
              ? 'Mission template aiContract is invalid'
              : 'Mission template aiContract is not a valid object',
        details: failedResult.errors ?? [],
      });
    }

    // Extract normalized config (without endReasonPrecedenceResolved which is runtime-only)
    const normalizedConfig = normalizeResult.value;
    const normalizedAiContract = {
      missionConfigV1: {
        version: normalizedConfig.version,
        dynamics: normalizedConfig.dynamics,
        objective: normalizedConfig.objective,
        difficulty: normalizedConfig.difficulty,
        style: normalizedConfig.style,
        statePolicy: normalizedConfig.statePolicy,
      },
    };

    // ✅ STEP 4.1: Consistency checks
    // Check difficulty consistency
    const templateDifficulty = dto.difficulty ?? MissionDifficulty.EASY;
    if (normalizedConfig.difficulty.level !== templateDifficulty) {
      throw new BadRequestException({
        code: 'MISSION_TEMPLATE_INCONSISTENT_DIFFICULTY',
        message: `Template difficulty (${templateDifficulty}) does not match missionConfigV1.difficulty.level (${normalizedConfig.difficulty.level})`,
      });
    }

    // ✅ aiStyleKey (new) + legacy alias dto.aiStyle
    const normalizedStyleKey = this.normalizeAiStyleKey(
      (dto as any).aiStyleKey ?? (dto as any).aiStyle,
    );

    // ✅ STEP 4.1: Check style consistency
    if (normalizedStyleKey && normalizedStyleKey !== null) {
      if (normalizedConfig.style.aiStyleKey !== normalizedStyleKey) {
        throw new BadRequestException({
          code: 'MISSION_TEMPLATE_INCONSISTENT_STYLE',
          message: `Template aiStyleKey (${normalizedStyleKey}) does not match missionConfigV1.style.aiStyleKey (${normalizedConfig.style.aiStyleKey})`,
        });
      }
    } else if (normalizedConfig.style.aiStyleKey) {
      // Template has no aiStyleKey but missionConfigV1 does - this is OK, missionConfigV1 is source of truth
    }

    // ✅ STEP 4.1: Validate persona exists and is active
    if (personaId) {
      const persona = await this.prisma.aiPersona.findUnique({
        where: { id: personaId },
        select: { id: true, active: true },
      });
      if (!persona) {
        throw new BadRequestException({
          code: 'MISSION_TEMPLATE_INVALID_PERSONA',
          message: `Persona with id "${personaId}" does not exist`,
        });
      }
      if (!persona.active) {
        throw new BadRequestException({
          code: 'MISSION_TEMPLATE_INACTIVE_PERSONA',
          message: `Persona with id "${personaId}" is inactive`,
        });
      }
    }

    const data: Prisma.PracticeMissionTemplateCreateInput = {
      code,
      title,
      description: cleanStr(dto.description) ?? null,

      laneIndex,
      orderIndex,

      timeLimitSec: dto.timeLimitSec ?? 30,
      maxMessages: dto.maxMessages ?? null,
      wordLimit: dto.wordLimit ?? null,

      isVoiceSupported: dto.isVoiceSupported ?? true,

      baseXpReward: dto.baseXpReward ?? 50,
      baseCoinsReward: dto.baseCoinsReward ?? 10,
      baseGemsReward: dto.baseGemsReward ?? 0,

      difficulty: dto.difficulty ?? MissionDifficulty.EASY,
      goalType: dto.goalType ?? null,

      active: dto.active ?? true,
      aiContract: normalizedAiContract as any, // Store normalized version

      ...(categoryId
        ? { category: { connect: { id: categoryId } } }
        : categoryCode
          ? { category: { connect: { code: categoryCode } } }
          : {}),

      ...(personaId
        ? { persona: { connect: { id: personaId } } }
        : personaCode
          ? { persona: { connect: { code: personaCode } } }
          : {}),
    };

    if (normalizedStyleKey && normalizedStyleKey !== null) {
      const aiStyleId = await this.resolveAiStyleIdByKeyOrThrow(normalizedStyleKey);
      (data as any).aiStyle = { connect: { id: aiStyleId } };
    }

    try {
      const created = await this.prisma.practiceMissionTemplate.create({
        data,
        include: this.missionInclude(),
      });
      return { ok: true, template: created };
    } catch (e) {
      throw this.mapPrismaError(e);
    }
  }

  async updateMission(id: string, dto: UpdateMissionDto) {
    const existing = await this.prisma.practiceMissionTemplate.findUnique({
      where: { id },
      select: { id: true, active: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'mission not found',
      });
    }

    const title = pickTitle(dto);
    const categoryId = cleanStr(dto.categoryId);
    const categoryCode = normalizeCode(dto.categoryCode);
    const personaId = cleanStr(dto.personaId);
    const personaCode = normalizeCode(dto.personaCode);

    const aiContract = this.sanitizeAiContract(dto.aiContract);

    // ✅ STEP 4.1: For stability, require valid config for active missions
    // Only allow null if explicitly clearing AND mission is being deactivated
    // Determine final active status: use dto.active if provided, otherwise keep existing
    const willBeActive = dto.active !== undefined ? dto.active : existing.active;
    
    let normalizedAiContract: any = undefined;
    if (dto.aiContract !== undefined) {
      if (aiContract === null) {
        // Only allow null if mission is being deactivated (or already inactive)
        if (willBeActive) {
          throw new BadRequestException({
            code: 'MISSION_TEMPLATE_CANNOT_CLEAR_CONFIG',
            message: 'Cannot clear aiContract for active missions. Deactivate the mission first or provide a valid config.',
          });
        }
        normalizedAiContract = null;
      } else {
        // Validate and normalize
        const validationErrors = validateMissionConfigV1Shape(aiContract);
        if (validationErrors.length > 0) {
          throw new BadRequestException({
            code: 'VALIDATION',
            message: 'Invalid aiContract.missionConfigV1',
            details: validationErrors,
          });
        }

        const normalizeResult = normalizeMissionConfigV1(aiContract);
        if (!normalizeResult.ok) {
          const failedResult = normalizeResult as { ok: false; reason: string; errors?: any[] };
          throw new BadRequestException({
            code: 'MISSION_TEMPLATE_INVALID_CONFIG',
            message:
              failedResult.reason === 'missing'
                ? 'Mission template is missing missionConfigV1'
                : failedResult.reason === 'invalid'
                  ? 'Mission template aiContract is invalid'
                  : 'Mission template aiContract is not a valid object',
            details: failedResult.errors ?? [],
          });
        }

        const normalizedConfig = normalizeResult.value;
        normalizedAiContract = {
          missionConfigV1: {
            version: normalizedConfig.version,
            dynamics: normalizedConfig.dynamics,
            objective: normalizedConfig.objective,
            difficulty: normalizedConfig.difficulty,
            style: normalizedConfig.style,
            statePolicy: normalizedConfig.statePolicy,
          },
        };

        // ✅ STEP 4.1: Consistency checks for update
        // Check difficulty consistency (only if both are being updated)
        if (dto.difficulty !== undefined) {
          if (normalizedConfig.difficulty.level !== dto.difficulty) {
            throw new BadRequestException({
              code: 'MISSION_TEMPLATE_INCONSISTENT_DIFFICULTY',
              message: `Template difficulty (${dto.difficulty}) does not match missionConfigV1.difficulty.level (${normalizedConfig.difficulty.level})`,
            });
          }
        } else {
          // Load existing difficulty to check consistency
          const existing = await this.prisma.practiceMissionTemplate.findUnique({
            where: { id },
            select: { difficulty: true },
          });
          if (existing && normalizedConfig.difficulty.level !== existing.difficulty) {
            throw new BadRequestException({
              code: 'MISSION_TEMPLATE_INCONSISTENT_DIFFICULTY',
              message: `Template difficulty (${existing.difficulty}) does not match missionConfigV1.difficulty.level (${normalizedConfig.difficulty.level})`,
            });
          }
        }
      }
    }

    const data: Prisma.PracticeMissionTemplateUpdateInput = {
      ...(title ? { title } : {}),
      ...(dto.description !== undefined
        ? { description: cleanStr(dto.description) ?? null }
        : {}),

      ...(dto.laneIndex !== undefined ? { laneIndex: dto.laneIndex } : {}),
      ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),

      ...(dto.timeLimitSec !== undefined ? { timeLimitSec: dto.timeLimitSec } : {}),
      ...(dto.maxMessages !== undefined
        ? { maxMessages: dto.maxMessages ?? null }
        : {}),
      ...(dto.wordLimit !== undefined ? { wordLimit: dto.wordLimit ?? null } : {}),

      ...(dto.isVoiceSupported !== undefined
        ? { isVoiceSupported: dto.isVoiceSupported }
        : {}),

      ...(dto.baseXpReward !== undefined ? { baseXpReward: dto.baseXpReward } : {}),
      ...(dto.baseCoinsReward !== undefined
        ? { baseCoinsReward: dto.baseCoinsReward }
        : {}),
      ...(dto.baseGemsReward !== undefined
        ? { baseGemsReward: dto.baseGemsReward }
        : {}),

      ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
      ...(dto.goalType !== undefined ? { goalType: dto.goalType ?? null } : {}),

      ...(dto.active !== undefined ? { active: dto.active } : {}),
      ...(normalizedAiContract !== undefined
        ? { aiContract: normalizedAiContract as any }
        : {}),

      ...(dto.code ? { code: normalizeCode(dto.code) } : {}),
    };

    if (dto.categoryId !== undefined || dto.categoryCode !== undefined) {
      (data as any).category = categoryId
        ? { connect: { id: categoryId } }
        : categoryCode
          ? { connect: { code: categoryCode } }
          : { disconnect: true };
    }

    if (dto.personaId !== undefined || dto.personaCode !== undefined) {
      (data as any).persona = personaId
        ? { connect: { id: personaId } }
        : personaCode
          ? { connect: { code: personaCode } }
          : { disconnect: true };
    }

    // ✅ aiStyleKey update rules:
    // - undefined -> do nothing
    // - null / '' -> disconnect (clear)
    // - otherwise -> connect by DB key
    const normalizedStyleKey = this.normalizeAiStyleKey(
      (dto as any).aiStyleKey ?? (dto as any).aiStyle,
    );

    // ✅ STEP 4.1: Check style consistency if both aiContract and aiStyleKey are being updated
    if (normalizedAiContract !== undefined && normalizedStyleKey !== undefined) {
      const configStyleKey = (normalizedAiContract as any)?.missionConfigV1?.style?.aiStyleKey;
      if (normalizedStyleKey !== null && configStyleKey && configStyleKey !== normalizedStyleKey) {
        throw new BadRequestException({
          code: 'MISSION_TEMPLATE_INCONSISTENT_STYLE',
          message: `Template aiStyleKey (${normalizedStyleKey}) does not match missionConfigV1.style.aiStyleKey (${configStyleKey})`,
        });
      }
    } else if (normalizedAiContract !== undefined) {
      // Check against existing aiStyleId
      const existing = await this.prisma.practiceMissionTemplate.findUnique({
        where: { id },
        select: { aiStyleId: true, aiStyle: { select: { key: true } } },
      });
      if (existing?.aiStyle) {
        const configStyleKey = (normalizedAiContract as any)?.missionConfigV1?.style?.aiStyleKey;
        if (configStyleKey && configStyleKey !== existing.aiStyle.key) {
          throw new BadRequestException({
            code: 'MISSION_TEMPLATE_INCONSISTENT_STYLE',
            message: `Template aiStyle (${existing.aiStyle.key}) does not match missionConfigV1.style.aiStyleKey (${configStyleKey})`,
          });
        }
      }
    }

    if (normalizedStyleKey !== undefined) {
      if (normalizedStyleKey === null) {
        (data as any).aiStyle = { disconnect: true };
      } else {
        const aiStyleId = await this.resolveAiStyleIdByKeyOrThrow(normalizedStyleKey);
        (data as any).aiStyle = { connect: { id: aiStyleId } };
      }
    }

    // ✅ STEP 4.1: Validate persona exists and is active (if being updated)
    if (personaId !== undefined || personaCode !== undefined) {
      const targetPersonaId = personaId
        ? personaId
        : personaCode
          ? (
              await this.prisma.aiPersona.findUnique({
                where: { code: personaCode },
                select: { id: true },
              })
            )?.id
          : null;

      if (targetPersonaId) {
        const persona = await this.prisma.aiPersona.findUnique({
          where: { id: targetPersonaId },
          select: { id: true, active: true },
        });
        if (!persona) {
          throw new BadRequestException({
            code: 'MISSION_TEMPLATE_INVALID_PERSONA',
            message: `Persona with id "${targetPersonaId}" does not exist`,
          });
        }
        if (!persona.active) {
          throw new BadRequestException({
            code: 'MISSION_TEMPLATE_INACTIVE_PERSONA',
            message: `Persona with id "${targetPersonaId}" is inactive`,
          });
        }
      }
    }

    try {
      const updated = await this.prisma.practiceMissionTemplate.update({
        where: { id },
        data,
        include: this.missionInclude(),
      });
      return { ok: true, template: updated };
    } catch (e) {
      throw this.mapPrismaError(e);
    }
  }

  async softDeleteMission(id: string) {
    try {
      const updated = await this.prisma.practiceMissionTemplate.update({
        where: { id },
        data: { active: false },
        select: { id: true, active: true },
      });
      return { ok: true, template: updated };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'mission not found',
        });
      }
      throw this.mapPrismaError(e);
    }
  }

  async reorderMissions(dto: ReorderMissionsDto) {
    const effectiveItems =
      dto.items?.length
        ? dto.items
        : (dto as any).missions?.length
          ? (dto as any).missions
          : (dto as any).templates?.length
            ? (dto as any).templates
            : undefined;

    const effectiveOrderedIds =
      dto.orderedIds?.length
        ? dto.orderedIds
        : (dto as any).orderedIDs?.length
          ? (dto as any).orderedIDs
          : (dto as any).ids?.length
            ? (dto as any).ids
            : undefined;

    if (effectiveItems?.length) {
      try {
        await this.prisma.$transaction(
          effectiveItems.map((it: any) =>
            this.prisma.practiceMissionTemplate.update({
              where: { id: it.id },
              data: { laneIndex: it.laneIndex, orderIndex: it.orderIndex },
              select: { id: true },
            }),
          ),
        );
        return { ok: true };
      } catch (e) {
        throw this.mapPrismaError(e);
      }
    }

    if (effectiveOrderedIds?.length) {
      try {
        await this.prisma.$transaction(
          effectiveOrderedIds.map((id: string, idx: number) =>
            this.prisma.practiceMissionTemplate.update({
              where: { id },
              data: { orderIndex: idx },
              select: { id: true },
            }),
          ),
        );
        return { ok: true };
      } catch (e) {
        throw this.mapPrismaError(e);
      }
    }

    throw new BadRequestException({
      code: 'VALIDATION',
      message:
        'Provide either items[] or orderedIds[] (aliases accepted: missions/templates/ids/orderedIDs)',
    });
  }

  // ---------- Categories ----------
  async listCategories() {
    const categories = await this.prisma.missionCategory.findMany({
      orderBy: [{ label: 'asc' }],
    });
    return { ok: true, categories };
  }

  async createCategory(dto: CreateMissionCategoryDto) {
    const label = String(dto.label ?? dto.title ?? '').trim();
    if (!label) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'label is required (or provide "title")',
      });
    }

    const code =
      normalizeCode(dto.code) ||
      normalizeCode(slugify(label)) ||
      normalizeCode(`CAT_${slugify(label)}`);

    try {
      const created = await this.prisma.missionCategory.create({
        data: {
          code,
          label,
          description: cleanStr(dto.description) ?? null,
        },
      });
      return { ok: true, category: created };
    } catch (e) {
      throw this.mapPrismaError(e);
    }
  }

  async updateCategory(id: string, dto: UpdateMissionCategoryDto) {
    const label = String(dto.label ?? dto.title ?? '').trim();
    const data: Prisma.MissionCategoryUpdateInput = {
      ...(dto.code ? { code: normalizeCode(dto.code) } : {}),
      ...(label ? { label } : {}),
      ...(dto.description !== undefined
        ? { description: cleanStr(dto.description) ?? null }
        : {}),
    };

    try {
      const updated = await this.prisma.missionCategory.update({
        where: { id },
        data,
      });
      return { ok: true, category: updated };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: 'category not found',
        });
      }
      throw this.mapPrismaError(e);
    }
  }

  async deleteCategory(id: string) {
    try {
      const deleted = await this.prisma.missionCategory.delete({
        where: { id },
        select: { id: true },
      });
      return { ok: true, category: deleted };
    } catch (e) {
      throw this.mapPrismaError(e);
    }
  }

  // ---------- Personas ----------
  async listPersonas() {
    const personas = await this.prisma.aiPersona.findMany({
      orderBy: [{ name: 'asc' }],
    });
    return { ok: true, personas };
  }
}
