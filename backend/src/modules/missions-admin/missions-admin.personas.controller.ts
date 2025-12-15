// FILE: backend/src/modules/missions-admin/missions-admin.personas.controller.ts

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
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AdminGuard } from '../auth/admin.guard';

function trimOrNull(v: any): string | null {
  if (v === null) return null;
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

function normalizeCode(v: any): string {
  const t = trimOrNull(v);
  if (!t) throw new BadRequestException({ message: 'Persona code is required.' });
  return t.toUpperCase();
}

function normalizeName(v: any): string {
  const t = trimOrNull(v);
  if (!t) throw new BadRequestException({ message: 'Persona name is required.' });
  return t;
}

function normalizeDifficulty(v: any): number | null {
  if (v === null) return null;
  if (v === undefined) return undefined as any; // signals "not provided"
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequestException({ message: 'Invalid difficulty.' });
  return Math.trunc(n);
}

function prismaToHttp(e: unknown): never {
  if (e instanceof PrismaClientKnownRequestError) {
    if (e.code === 'P2002') {
      throw new ConflictException({
        message: 'Unique constraint violation (likely: persona code already exists).',
        meta: e.meta,
      });
    }
    if (e.code === 'P2025') {
      throw new NotFoundException({ message: 'Persona not found.' });
    }
  }
  throw e;
}

@Controller('admin/personas')
@UseGuards(AdminGuard)
export class MissionsAdminPersonasController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /v1/admin/personas
   * Admin list: by default returns ALL (active + inactive), so dashboard can manage.
   * Use ?activeOnly=true to return only active personas.
   */
  @Get()
  async list(@Query('activeOnly') activeOnly?: string) {
    const onlyActive = activeOnly === 'true' || activeOnly === '1';

    return this.prisma.aiPersona.findMany({
      ...(onlyActive ? { where: { active: true } } : {}),
      orderBy: { code: 'asc' },
    });
  }

  /**
   * POST /v1/admin/personas
   * Creates a new persona.
   * Dashboard expects response to include top-level "id".
   */
  @Post()
  async create(@Body() body: any) {
    try {
      const persona = await this.prisma.aiPersona.create({
        data: {
          code: normalizeCode(body?.code),
          name: normalizeName(body?.name),

          shortLabel: trimOrNull(body?.shortLabel),
          description: trimOrNull(body?.description),
          style: trimOrNull(body?.style),
          avatarUrl: trimOrNull(body?.avatarUrl),
          voicePreset: trimOrNull(body?.voicePreset),

          difficulty:
            body?.difficulty === undefined ? null : normalizeDifficulty(body?.difficulty),

          active: typeof body?.active === 'boolean' ? body.active : true,
        },
      });

      // Return persona directly so dashboard can do: res.id
      return persona;
    } catch (e) {
      prismaToHttp(e);
    }
  }

  /**
   * PUT /v1/admin/personas/:id
   * Partial update allowed. Supports clearing optional fields by sending null.
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    if (!id) throw new BadRequestException({ message: 'Missing id.' });

    const data: any = {};

    if ('code' in body) data.code = normalizeCode(body.code);
    if ('name' in body) data.name = normalizeName(body.name);

    if ('shortLabel' in body) data.shortLabel = trimOrNull(body.shortLabel);
    if ('description' in body) data.description = trimOrNull(body.description);
    if ('style' in body) data.style = trimOrNull(body.style);
    if ('avatarUrl' in body) data.avatarUrl = trimOrNull(body.avatarUrl);
    if ('voicePreset' in body) data.voicePreset = trimOrNull(body.voicePreset);

    if ('difficulty' in body) {
      const d = normalizeDifficulty(body.difficulty);
      data.difficulty = d;
    }

    if ('active' in body) data.active = !!body.active;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException({ message: 'No fields provided to update.' });
    }

    try {
      const persona = await this.prisma.aiPersona.update({
        where: { id },
        data,
      });
      return persona; // includes id
    } catch (e) {
      prismaToHttp(e);
    }
  }

  /**
   * DELETE /v1/admin/personas/:id
   * Soft delete (active=false).
   */
  @Delete(':id')
  async softDelete(@Param('id') id: string) {
    if (!id) throw new BadRequestException({ message: 'Missing id.' });

    try {
      await this.prisma.aiPersona.update({
        where: { id },
        data: { active: false },
      });
      return { ok: true };
    } catch (e) {
      prismaToHttp(e);
    }
  }
}
