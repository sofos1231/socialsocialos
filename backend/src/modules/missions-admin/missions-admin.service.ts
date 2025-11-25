// FILE: backend/src/modules/missions-admin/missions-admin.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import {
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
        // allow raw string as-is (dashboard might put "..." accidentally)
        return { raw: s };
      }
    }

    // object/array/number/bool are valid JSON values
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

    // if we somehow spammed 50 collisions, force a random tail
    const tail = Math.random().toString(36).slice(2, 6).toUpperCase();
    return (normalized.slice(0, 35) + '_' + tail).slice(0, 40);
  }

  async getMeta() {
    const [categories, personas] = await Promise.all([
      this.prisma.missionCategory.findMany({
        orderBy: [{ label: 'asc' }],
      }),
      this.prisma.aiPersona.findMany({
        orderBy: [{ name: 'asc' }],
      }),
    ]);

    return {
      categories,
      personas,
      enums: {
        difficulties: Object.values(MissionDifficulty),
        goalTypes: Object.values(MissionGoalType),
      },
    };
  }

  async getRoad() {
    const templates = await this.prisma.practiceMissionTemplate.findMany({
      where: { active: true },
      include: { category: true, persona: true },
      orderBy: [{ laneIndex: 'asc' }, { orderIndex: 'asc' }],
    });

    return { templates };
  }

  async listMissions() {
    const templates = await this.prisma.practiceMissionTemplate.findMany({
      include: { category: true, persona: true },
      orderBy: [{ createdAt: 'desc' }],
    });

    return { templates };
  }

  async createMission(dto: CreateMissionDto) {
    const title = pickTitle(dto);
    if (!title) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'title is required (or provide "name")',
      });
    }

    const laneIndex = Number.isFinite(dto.laneIndex as any)
      ? (dto.laneIndex as number)
      : 0;

    // If dashboard didn't provide orderIndex, place at end of lane
    let orderIndex =
      Number.isFinite(dto.orderIndex as any) ? (dto.orderIndex as number) : undefined;

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

    // Build a stable base code if dashboard omitted it
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
      aiContract: aiContract ?? null,

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

    try {
      const created = await this.prisma.practiceMissionTemplate.create({
        data,
        include: { category: true, persona: true },
      });
      return { ok: true, template: created };
    } catch (e) {
      throw this.mapPrismaError(e);
    }
  }

  async updateMission(id: string, dto: UpdateMissionDto) {
    const existing = await this.prisma.practiceMissionTemplate.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException({ code: 'NOT_FOUND', message: 'mission not found' });

    const title = pickTitle(dto);
    const categoryId = cleanStr(dto.categoryId);
    const categoryCode = normalizeCode(dto.categoryCode);
    const personaId = cleanStr(dto.personaId);
    const personaCode = normalizeCode(dto.personaCode);

    const aiContract = this.sanitizeAiContract(dto.aiContract);

    const data: Prisma.PracticeMissionTemplateUpdateInput = {
      ...(title ? { title } : {}),
      ...(dto.description !== undefined ? { description: cleanStr(dto.description) ?? null } : {}),

      ...(dto.laneIndex !== undefined ? { laneIndex: dto.laneIndex } : {}),
      ...(dto.orderIndex !== undefined ? { orderIndex: dto.orderIndex } : {}),

      ...(dto.timeLimitSec !== undefined ? { timeLimitSec: dto.timeLimitSec } : {}),
      ...(dto.maxMessages !== undefined ? { maxMessages: dto.maxMessages ?? null } : {}),
      ...(dto.wordLimit !== undefined ? { wordLimit: dto.wordLimit ?? null } : {}),

      ...(dto.isVoiceSupported !== undefined ? { isVoiceSupported: dto.isVoiceSupported } : {}),

      ...(dto.baseXpReward !== undefined ? { baseXpReward: dto.baseXpReward } : {}),
      ...(dto.baseCoinsReward !== undefined ? { baseCoinsReward: dto.baseCoinsReward } : {}),
      ...(dto.baseGemsReward !== undefined ? { baseGemsReward: dto.baseGemsReward } : {}),

      ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
      ...(dto.goalType !== undefined ? { goalType: dto.goalType ?? null } : {}),

      ...(dto.active !== undefined ? { active: dto.active } : {}),
      ...(dto.aiContract !== undefined ? { aiContract: aiContract ?? null } : {}),

      ...(dto.code ? { code: normalizeCode(dto.code) } : {}),
    };

    // Relations — allow switching by id/code
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

    try {
      const updated = await this.prisma.practiceMissionTemplate.update({
        where: { id },
        data,
        include: { category: true, persona: true },
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
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'mission not found' });
      }
      throw this.mapPrismaError(e);
    }
  }

  async reorderMissions(dto: ReorderMissionsDto) {
    if (dto.items?.length) {
      try {
        await this.prisma.$transaction(
          dto.items.map((it) =>
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

    if (dto.orderedIds?.length) {
      // simple mode: just re-number orderIndex in given order, laneIndex stays unchanged
      try {
        await this.prisma.$transaction(
          dto.orderedIds.map((id, idx) =>
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
      message: 'Provide either items[] or orderedIds[]',
    });
  }

  // ---------- Categories (used by missions-admin.categories.controller) ----------

  async listCategories() {
    const categories = await this.prisma.missionCategory.findMany({
      orderBy: [{ label: 'asc' }],
    });
    return { categories };
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
      normalizeCode(dto.code) || normalizeCode(slugify(label)) || normalizeCode(`CAT_${slugify(label)}`);

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
      ...(dto.description !== undefined ? { description: cleanStr(dto.description) ?? null } : {}),
    };

    try {
      const updated = await this.prisma.missionCategory.update({
        where: { id },
        data,
      });
      return { ok: true, category: updated };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'category not found' });
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

  // ---------- Personas (used by missions-admin.personas.controller) ----------

  async listPersonas() {
    const personas = await this.prisma.aiPersona.findMany({
      orderBy: [{ name: 'asc' }],
    });
    return { personas };
  }
}
