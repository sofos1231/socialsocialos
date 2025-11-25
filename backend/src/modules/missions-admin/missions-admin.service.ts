// FILE: backend/src/modules/missions-admin/missions-admin.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { MissionDifficulty, MissionGoalType, Prisma } from '@prisma/client';
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
    .slice(0, 28);
}

function normalizeCode(raw: string) {
  const v = String(raw ?? '').trim();
  if (!v) return '';
  // allow user to type "Flirting & Tension" and still get something safe-ish
  const safe = v.replace(/[^a-zA-Z0-9_]+/g, '_').replace(/_+/g, '_');
  return safe.toUpperCase().replace(/^_+|_+$/g, '').slice(0, 40);
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

    const t = typeof raw;
    if (t === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return this.sanitizeAiContract(parsed);
      } catch {
        throw new BadRequestException({
          code: 'AI_CONTRACT_INVALID_JSON',
          message: 'aiContract must be valid JSON',
        });
      }
    }

    const size = JSON.stringify(raw).length;
    if (size > 50_000) {
      throw new BadRequestException({
        code: 'AI_CONTRACT_TOO_LARGE',
        message: 'aiContract too large (max 50KB)',
      });
    }

    return raw;
  }

  // ---------------------------------------------------------------------------
  // META + ROAD
  // ---------------------------------------------------------------------------

  async getMeta() {
    const [categories, personas] = await this.prisma.$transaction([
      this.prisma.missionCategory.findMany({ orderBy: { code: 'asc' } }),
      this.prisma.aiPersona.findMany({
        where: { active: true },
        orderBy: { code: 'asc' },
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
    // lane ordering is visual; orderIndex is “progression”
    return this.prisma.practiceMissionTemplate.findMany({
      where: { active: true },
      include: { category: true, persona: true },
      orderBy: [{ orderIndex: 'asc' }, { laneIndex: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // ---------------------------------------------------------------------------
  // MISSIONS – CRUD + REORDER
  // ---------------------------------------------------------------------------

  async listMissions() {
    return this.prisma.practiceMissionTemplate.findMany({
      include: { category: true, persona: true },
      orderBy: [{ orderIndex: 'asc' }, { laneIndex: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createMission(dto: CreateMissionDto) {
    try {
      const missionCategoryId = String(dto.missionCategoryId ?? '').trim();
      if (!missionCategoryId) {
        throw new BadRequestException({
          code: 'CATEGORY_REQUIRED',
          message: 'missionCategoryId is required',
        });
      }

      const category = await this.prisma.missionCategory.findUnique({
        where: { id: missionCategoryId },
        select: { id: true, code: true },
      });
      if (!category) {
        throw new BadRequestException({
          code: 'CATEGORY_NOT_FOUND',
          message: 'missionCategoryId not found',
        });
      }

      const laneIndex = dto.laneIndex ?? 0;
      const orderIndex = dto.orderIndex ?? 0;

      const aiContract = this.sanitizeAiContract(dto.aiContract);

      const requestedCode = dto.code ? normalizeCode(dto.code) : '';
      const code =
        requestedCode ||
        `${category.code}_${laneIndex}_${orderIndex}_${slugify(dto.title)}_${Math.random()
          .toString(36)
          .slice(2, 7)}`;

      try {
        return await this.prisma.practiceMissionTemplate.create({
          data: {
            code,
            title: dto.title,
            description: dto.description ?? null,

            categoryId: missionCategoryId,
            personaId:
              dto.aiPersonaId && String(dto.aiPersonaId).trim().length
                ? String(dto.aiPersonaId).trim()
                : null,

            laneIndex,
            orderIndex,

            difficulty: dto.difficulty ?? MissionDifficulty.EASY,
            goalType: dto.goalType ?? null,

            timeLimitSec: dto.timeLimitSec ?? 30,
            maxMessages: dto.maxMessages ?? null,
            wordLimit: dto.wordLimit ?? null,

            isVoiceSupported: dto.isVoiceSupported ?? true,

            baseXpReward: dto.rewardXp ?? 50,
            baseCoinsReward: dto.rewardCoins ?? 10,
            baseGemsReward: dto.rewardGems ?? 0,

            aiContract: aiContract ?? null,

            active: dto.active ?? true,
          } as any,
        });
      } catch (e: any) {
        // Make creation idempotent by code to prevent "works once then 500"
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          const exists = await this.prisma.practiceMissionTemplate.findUnique({ where: { code } });
          if (exists) {
            return await this.prisma.practiceMissionTemplate.update({
              where: { id: exists.id },
              data: {
                title: dto.title ?? exists.title,
                description: dto.description ?? exists.description,
                categoryId: missionCategoryId,
                personaId:
                  dto.aiPersonaId && String(dto.aiPersonaId).trim().length
                    ? String(dto.aiPersonaId).trim()
                    : null,
                laneIndex,
                orderIndex,
                difficulty: dto.difficulty ?? exists.difficulty,
                goalType: dto.goalType ?? exists.goalType,
                timeLimitSec: dto.timeLimitSec ?? exists.timeLimitSec,
                maxMessages: dto.maxMessages ?? exists.maxMessages,
                wordLimit: dto.wordLimit ?? exists.wordLimit,
                isVoiceSupported: dto.isVoiceSupported ?? exists.isVoiceSupported,
                baseXpReward: dto.rewardXp ?? exists.baseXpReward,
                baseCoinsReward: dto.rewardCoins ?? exists.baseCoinsReward,
                baseGemsReward: dto.rewardGems ?? exists.baseGemsReward,
                aiContract: aiContract ?? exists.aiContract,
                active: dto.active ?? exists.active,
              } as any,
            });
          }
        }
        throw e;
      }
    } catch (e: any) {
      throw this.mapPrismaError(e);
    }
  }

  async updateMission(id: string, dto: UpdateMissionDto) {
    try {
      const exists = await this.prisma.practiceMissionTemplate.findUnique({
        where: { id },
      });
      if (!exists) throw new NotFoundException('Mission not found');

      const aiContract =
        dto.aiContract !== undefined
          ? this.sanitizeAiContract(dto.aiContract)
          : undefined;

      const nextCode =
        dto.code !== undefined && dto.code !== null
          ? normalizeCode(String(dto.code))
          : undefined;

      return await this.prisma.practiceMissionTemplate.update({
        where: { id },
        data: {
          ...(nextCode !== undefined && { code: nextCode }),
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && {
            description: dto.description ?? null,
          }),
          ...(dto.missionCategoryId !== undefined && {
            categoryId: String(dto.missionCategoryId).trim(),
          }),
          ...(dto.aiPersonaId !== undefined && {
            personaId:
              dto.aiPersonaId && String(dto.aiPersonaId).trim().length
                ? String(dto.aiPersonaId).trim()
                : null,
          }),
          ...(dto.laneIndex !== undefined && { laneIndex: dto.laneIndex ?? 0 }),
          ...(dto.orderIndex !== undefined && {
            orderIndex: dto.orderIndex ?? 0,
          }),
          ...(dto.difficulty !== undefined && {
            difficulty: dto.difficulty ?? MissionDifficulty.EASY,
          }),
          ...(dto.goalType !== undefined && { goalType: dto.goalType ?? null }),
          ...(dto.timeLimitSec !== undefined && {
            timeLimitSec: dto.timeLimitSec ?? 30,
          }),
          ...(dto.maxMessages !== undefined && {
            maxMessages: dto.maxMessages ?? null,
          }),
          ...(dto.wordLimit !== undefined && { wordLimit: dto.wordLimit ?? null }),
          ...(dto.isVoiceSupported !== undefined && {
            isVoiceSupported: dto.isVoiceSupported ?? true,
          }),
          ...(dto.rewardXp !== undefined && { baseXpReward: dto.rewardXp ?? 50 }),
          ...(dto.rewardCoins !== undefined && {
            baseCoinsReward: dto.rewardCoins ?? 10,
          }),
          ...(dto.rewardGems !== undefined && {
            baseGemsReward: dto.rewardGems ?? 0,
          }),
          ...(aiContract !== undefined && { aiContract: aiContract ?? null }),
          ...(dto.active !== undefined && { active: dto.active ?? true }),
        } as any,
      });
    } catch (e: any) {
      throw this.mapPrismaError(e);
    }
  }

  async softDeleteMission(id: string) {
    const exists = await this.prisma.practiceMissionTemplate.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Mission not found');

    return this.prisma.practiceMissionTemplate.update({
      where: { id },
      data: { active: false },
    });
  }

  async reorderMissions(dto: ReorderMissionsDto) {
    try {
      if (dto.items && dto.items.length > 0) {
        await this.prisma.$transaction(
          dto.items.map((it) =>
            this.prisma.practiceMissionTemplate.update({
              where: { id: it.id },
              data: { laneIndex: it.laneIndex, orderIndex: it.orderIndex },
            }),
          ),
        );
        return { ok: true, mode: 'items' };
      }

      if (!dto.orderedIds || dto.orderedIds.length === 0) {
        throw new BadRequestException('orderedIds must not be empty');
      }

      await this.prisma.$transaction(
        dto.orderedIds.map((id, index) =>
          this.prisma.practiceMissionTemplate.update({
            where: { id },
            data: { orderIndex: index + 1 },
          }),
        ),
      );

      return { ok: true, mode: 'orderedIds' };
    } catch (e: any) {
      throw this.mapPrismaError(e);
    }
  }

  // ---------------------------------------------------------------------------
  // CATEGORIES – CRUD
  // ---------------------------------------------------------------------------

  async listCategories() {
    return this.prisma.missionCategory.findMany({ orderBy: { code: 'asc' } });
  }

  async createCategory(dto: CreateMissionCategoryDto) {
    try {
      const label = (dto.label ?? dto.name ?? '').trim();
      if (!label) {
        throw new BadRequestException({
          code: 'CATEGORY_LABEL_REQUIRED',
          message: 'Category label/name is required',
        });
      }

      const rawCode = dto.code ?? '';
      const code = normalizeCode(rawCode);
      if (!code) {
        throw new BadRequestException({
          code: 'CATEGORY_CODE_REQUIRED',
          message: 'Category code is required',
        });
      }

      const description =
        (dto.description ?? dto.subtitle ?? '').trim() || null;

      // ✅ Idempotent by code: create if missing, otherwise update
      return await this.prisma.missionCategory.upsert({
        where: { code },
        create: { code, label, description },
        update: { label, description },
      });
    } catch (e: any) {
      throw this.mapPrismaError(e);
    }
  }

  async updateCategory(id: string, dto: UpdateMissionCategoryDto) {
    try {
      const exists = await this.prisma.missionCategory.findUnique({
        where: { id },
      });
      if (!exists) throw new NotFoundException('Category not found');

      const nextLabel = (dto.label ?? dto.name ?? exists.label)?.trim();
      if (!nextLabel) {
        throw new BadRequestException({
          code: 'CATEGORY_LABEL_REQUIRED',
          message: 'Category label/name is required',
        });
      }

      const nextDescriptionRaw = dto.description ?? dto.subtitle;
      const nextDescription =
        nextDescriptionRaw === undefined
          ? exists.description
          : (nextDescriptionRaw ?? '').trim() || null;

      const nextCode =
        dto.code === undefined ? undefined : normalizeCode(dto.code);

      if (nextCode !== undefined && !nextCode) {
        throw new BadRequestException({
          code: 'CATEGORY_CODE_INVALID',
          message: 'Category code is invalid',
        });
      }

      return await this.prisma.missionCategory.update({
        where: { id },
        data: {
          ...(nextCode !== undefined && { code: nextCode }),
          label: nextLabel,
          description: nextDescription,
        },
      });
    } catch (e: any) {
      throw this.mapPrismaError(e);
    }
  }

  async deleteCategory(id: string) {
    try {
      const exists = await this.prisma.missionCategory.findUnique({
        where: { id },
      });
      if (!exists) throw new NotFoundException('Category not found');

      await this.prisma.missionCategory.delete({ where: { id } });
      return { ok: true };
    } catch (e: any) {
      throw this.mapPrismaError(e);
    }
  }

  async listAdminPersonas() {
    return this.prisma.aiPersona.findMany({
      where: { active: true },
      orderBy: { code: 'asc' },
    });
  }
}
