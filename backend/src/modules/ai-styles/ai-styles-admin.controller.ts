// FILE: backend/src/modules/ai-styles/ai-styles-admin.controller.ts
// Admin CRUD for AI Styles

import {
  BadRequestException,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Body,
  Param,
  Post,
  Put,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AiStyleKey } from '@prisma/client';
import { AdminGuard } from '../auth/admin.guard';

function trimOrNull(v: any): string | null {
  if (v === null) return null;
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

function normalizeKey(v: any): AiStyleKey {
  const t = trimOrNull(v);
  if (!t) throw new BadRequestException({ message: 'AI Style key is required.' });
  const upper = t.toUpperCase();
  if (!Object.values(AiStyleKey).includes(upper as AiStyleKey)) {
    throw new BadRequestException({ message: `Invalid AI Style key: ${upper}. Must be one of: ${Object.values(AiStyleKey).join(', ')}` });
  }
  return upper as AiStyleKey;
}

function normalizeName(v: any): string {
  const t = trimOrNull(v);
  if (!t) throw new BadRequestException({ message: 'AI Style name is required.' });
  return t;
}

function normalizeInt(v: any, min: number = 0, max: number = 100): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException({ message: `Invalid integer value: ${v}` });
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function normalizeFloat(v: any, min: number = 0, max: number = 1): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException({ message: `Invalid float value: ${v}` });
  return Math.max(min, Math.min(max, n));
}

function prismaToHttp(e: unknown): never {
  if (e instanceof PrismaClientKnownRequestError) {
    if (e.code === 'P2002') {
      throw new ConflictException({
        message: 'Unique constraint violation (likely: AI Style key already exists).',
        meta: e.meta,
      });
    }
    if (e.code === 'P2025') {
      throw new NotFoundException({ message: 'AI Style not found.' });
    }
  }
  throw e;
}

@Controller('admin/ai-styles')
@UseGuards(AdminGuard)
export class AiStylesAdminController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /v1/admin/ai-styles
   * Admin list: by default returns ALL (active + inactive), so dashboard can manage.
   * Use ?activeOnly=true to return only active styles.
   */
  @Get()
  async list(@Query('activeOnly') activeOnly?: string) {
    const onlyActive = activeOnly === 'true' || activeOnly === '1';

    return this.prisma.aiStyle.findMany({
      ...(onlyActive ? { where: { isActive: true } } : {}),
      orderBy: { name: 'asc' },
    });
  }

  /**
   * GET /v1/admin/ai-styles/:id
   * Get a single AI Style by ID
   */
  @Get(':id')
  async get(@Param('id') id: string) {
    try {
      const style = await this.prisma.aiStyle.findUnique({
        where: { id },
      });
      if (!style) {
        throw new NotFoundException({ message: 'AI Style not found.' });
      }
      return style;
    } catch (e) {
      prismaToHttp(e);
    }
  }

  /**
   * POST /v1/admin/ai-styles
   * Creates a new AI Style.
   */
  @Post()
  async create(@Body() body: any) {
    try {
      const style = await this.prisma.aiStyle.create({
        data: {
          key: normalizeKey(body?.key),
          name: normalizeName(body?.name),
          description: trimOrNull(body?.description) || '',
          stylePrompt: trimOrNull(body?.stylePrompt) || '',
          forbiddenBehavior: trimOrNull(body?.forbiddenBehavior) || '',
          tags: Array.isArray(body?.tags) ? body.tags.filter((t: any) => typeof t === 'string') : [],
          maxChars: normalizeInt(body?.maxChars, 0, 10000) ?? 500,
          maxLines: normalizeInt(body?.maxLines, 0, 100) ?? 10,
          questionRate: normalizeInt(body?.questionRate, 0, 100) ?? 50,
          emojiRate: normalizeInt(body?.emojiRate, 0, 100) ?? 30,
          initiative: normalizeInt(body?.initiative, 0, 100) ?? 50,
          warmth: normalizeInt(body?.warmth, 0, 100) ?? 50,
          judgment: normalizeInt(body?.judgment, 0, 100) ?? 50,
          flirtTension: normalizeInt(body?.flirtTension, 0, 100) ?? 50,
          formality: normalizeInt(body?.formality, 0, 100) ?? 50,
          temperature: body?.temperature !== undefined ? normalizeFloat(body?.temperature, 0, 2) : null,
          topP: body?.topP !== undefined ? normalizeFloat(body?.topP, 0, 1) : null,
          fewShotExamples: body?.fewShotExamples ? (typeof body.fewShotExamples === 'object' ? body.fewShotExamples : null) : null,
          isActive: body?.isActive !== undefined ? Boolean(body.isActive) : true,
        },
      });
      return style;
    } catch (e) {
      prismaToHttp(e);
    }
  }

  /**
   * PUT /v1/admin/ai-styles/:id
   * Full update of an AI Style.
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    try {
      const style = await this.prisma.aiStyle.update({
        where: { id },
        data: {
          ...(body?.key !== undefined && { key: normalizeKey(body.key) }),
          ...(body?.name !== undefined && { name: normalizeName(body.name) }),
          ...(body?.description !== undefined && { description: trimOrNull(body.description) || '' }),
          ...(body?.stylePrompt !== undefined && { stylePrompt: trimOrNull(body.stylePrompt) || '' }),
          ...(body?.forbiddenBehavior !== undefined && { forbiddenBehavior: trimOrNull(body.forbiddenBehavior) || '' }),
          ...(body?.tags !== undefined && { tags: Array.isArray(body.tags) ? body.tags.filter((t: any) => typeof t === 'string') : [] }),
          ...(body?.maxChars !== undefined && { maxChars: normalizeInt(body.maxChars, 0, 10000) ?? 500 }),
          ...(body?.maxLines !== undefined && { maxLines: normalizeInt(body.maxLines, 0, 100) ?? 10 }),
          ...(body?.questionRate !== undefined && { questionRate: normalizeInt(body.questionRate, 0, 100) ?? 50 }),
          ...(body?.emojiRate !== undefined && { emojiRate: normalizeInt(body.emojiRate, 0, 100) ?? 30 }),
          ...(body?.initiative !== undefined && { initiative: normalizeInt(body.initiative, 0, 100) ?? 50 }),
          ...(body?.warmth !== undefined && { warmth: normalizeInt(body.warmth, 0, 100) ?? 50 }),
          ...(body?.judgment !== undefined && { judgment: normalizeInt(body.judgment, 0, 100) ?? 50 }),
          ...(body?.flirtTension !== undefined && { flirtTension: normalizeInt(body.flirtTension, 0, 100) ?? 50 }),
          ...(body?.formality !== undefined && { formality: normalizeInt(body.formality, 0, 100) ?? 50 }),
          ...(body?.temperature !== undefined && { temperature: body.temperature !== null ? normalizeFloat(body.temperature, 0, 2) : null }),
          ...(body?.topP !== undefined && { topP: body.topP !== null ? normalizeFloat(body.topP, 0, 1) : null }),
          ...(body?.fewShotExamples !== undefined && { fewShotExamples: body.fewShotExamples ? (typeof body.fewShotExamples === 'object' ? body.fewShotExamples : null) : null }),
          ...(body?.isActive !== undefined && { isActive: Boolean(body.isActive) }),
        },
      });
      return style;
    } catch (e) {
      prismaToHttp(e);
    }
  }

  /**
   * PATCH /v1/admin/ai-styles/:id/disable
   * Soft delete / deactivate an AI Style.
   */
  @Patch(':id/disable')
  async disable(@Param('id') id: string) {
    try {
      const style = await this.prisma.aiStyle.update({
        where: { id },
        data: { isActive: false },
      });
      return style;
    } catch (e) {
      prismaToHttp(e);
    }
  }

  /**
   * PATCH /v1/admin/ai-styles/:id/enable
   * Reactivate an AI Style.
   */
  @Patch(':id/enable')
  async enable(@Param('id') id: string) {
    try {
      const style = await this.prisma.aiStyle.update({
        where: { id },
        data: { isActive: true },
      });
      return style;
    } catch (e) {
      prismaToHttp(e);
    }
  }

  /**
   * DELETE /v1/admin/ai-styles/:id
   * Hard delete an AI Style (use with caution - may break missions).
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      await this.prisma.aiStyle.delete({
        where: { id },
      });
      return { ok: true, message: 'AI Style deleted.' };
    } catch (e) {
      prismaToHttp(e);
    }
  }
}

