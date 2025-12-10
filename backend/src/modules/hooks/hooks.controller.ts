// backend/src/modules/hooks/hooks.controller.ts
// Step 7.2: Hooks admin controller

import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
// TODO: Add admin guard when available
// import { AdminGuard } from '../auth/admin.guard';

@Controller('v1/admin/hooks')
// @UseGuards(AdminGuard) // TODO: Enable when admin guard is available
export class HooksController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /v1/admin/hooks
   * List hooks with optional filters
   */
  @Get()
  async listHooks(
    @Query('type') type?: string,
    @Query('enabled') enabled?: string,
    @Query('category') category?: string,
  ) {
    const where: any = {};
    if (type) where.type = type;
    if (enabled !== undefined) where.isEnabled = enabled === 'true';
    if (category) where.category = category;

    const hooks = await this.prisma.promptHook.findMany({
      where,
      orderBy: { priority: 'desc' },
    });

    return { ok: true, hooks };
  }

  /**
   * GET /v1/admin/hooks/:id
   */
  @Get(':id')
  async getHook(@Param('id') id: string) {
    const hook = await this.prisma.promptHook.findUnique({
      where: { id },
    });

    if (!hook) {
      return { ok: false, error: 'Hook not found' };
    }

    return { ok: true, hook };
  }

  /**
   * POST /v1/admin/hooks
   */
  @Post()
  async createHook(@Body() body: any) {
    const hook = await this.prisma.promptHook.create({
      data: {
        name: body.name,
        type: body.type,
        textTemplate: body.textTemplate,
        conditionsJson: body.conditionsJson || {},
        category: body.category || 'general',
        tags: body.tags || [],
        priority: body.priority ?? 50,
        isEnabled: body.isEnabled !== false,
        metaJson: body.metaJson || {},
        version: body.version || 'v1',
      },
    });

    return { ok: true, hook };
  }

  /**
   * PUT /v1/admin/hooks/:id
   */
  @Put(':id')
  async updateHook(@Param('id') id: string, @Body() body: any) {
    const hook = await this.prisma.promptHook.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.textTemplate !== undefined && { textTemplate: body.textTemplate }),
        ...(body.conditionsJson !== undefined && { conditionsJson: body.conditionsJson }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.isEnabled !== undefined && { isEnabled: body.isEnabled }),
        ...(body.metaJson !== undefined && { metaJson: body.metaJson }),
      },
    });

    return { ok: true, hook };
  }

  /**
   * GET /v1/admin/hooks/triggers
   * Aggregated trigger stats for monitoring
   */
  @Get('triggers/stats')
  async getTriggerStats(
    @Query('days') days: string = '7',
    @Query('hookId') hookId?: string,
  ) {
    const daysNum = parseInt(days, 10) || 7;
    const since = new Date();
    since.setDate(since.getDate() - daysNum);

    const where: any = {
      triggeredAt: { gte: since },
    };
    if (hookId) where.hookId = hookId;

    // Get trigger counts per hook
    const triggers = await this.prisma.promptHookTrigger.groupBy({
      by: ['hookId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    // Get hook details
    const hookIds = triggers.map((t) => t.hookId);
    const hooks = await this.prisma.promptHook.findMany({
      where: { id: { in: hookIds } },
      select: { id: true, name: true, type: true },
    });

    const hookMap = new Map(hooks.map((h) => [h.id, h]));

    const stats = triggers.map((t) => ({
      hookId: t.hookId,
      hookName: hookMap.get(t.hookId)?.name || 'Unknown',
      hookType: hookMap.get(t.hookId)?.type || 'UNKNOWN',
      triggerCount: t._count.id,
    }));

    return { ok: true, stats, periodDays: daysNum };
  }
}

