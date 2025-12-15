// backend/src/modules/insights/insights-admin.controller.ts
// Step 7.2: Insights admin controller (read-only catalog)
// Patch A: Extended with DB-backed custom insights (create/delete)

import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { InsightCatalog } from './catalog/insight-catalog.v1';
import { InsightKind } from './insights.types';
import { AdminGuard } from '../auth/admin.guard';
import { PrismaService } from '../../db/prisma.service';

// Runtime values for InsightKind
const INSIGHT_KINDS = ['GATE_FAIL', 'POSITIVE_HOOK', 'NEGATIVE_PATTERN', 'GENERAL_TIP', 'MOOD', 'SYNERGY', 'ANALYZER_PARAGRAPH'] as const;

@Controller('admin/insights')
@UseGuards(AdminGuard)
export class InsightsAdminController {
  private catalog = new InsightCatalog();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /v1/admin/insights/catalog
   * Get all insight templates (code catalog + custom DB templates)
   * Patch A: Merges code catalog with custom DB templates
   */
  @Get('catalog')
  async getCatalog(@Query('kind') kind?: string) {
    let catalogTemplates: any[] = [];

    if (kind && INSIGHT_KINDS.includes(kind as any)) {
      catalogTemplates = this.catalog.getByKind(kind as InsightKind);
    } else {
      // Get all templates
      catalogTemplates = [
        ...this.catalog.getByKind('GATE_FAIL'),
        ...this.catalog.getByKind('POSITIVE_HOOK'),
        ...this.catalog.getByKind('NEGATIVE_PATTERN'),
        ...this.catalog.getByKind('GENERAL_TIP'),
      ];
    }

    // Filter by kind if provided
    if (kind && INSIGHT_KINDS.includes(kind as any)) {
      catalogTemplates = catalogTemplates.filter((t) => t.kind === (kind as InsightKind));
    }

    // Patch A: Load custom DB templates
    const customWhere: any = {};
    if (kind && INSIGHT_KINDS.includes(kind as any)) {
      customWhere.kind = kind;
    }
    const customTemplates = await this.prisma.customInsightTemplate.findMany({
      where: customWhere,
      orderBy: { createdAt: 'desc' },
    });

    // Merge: catalog templates marked as source: 'catalog', custom as source: 'custom'
    const mergedTemplates = [
      ...catalogTemplates.map((t) => ({ ...t, source: 'catalog' as const })),
      ...customTemplates.map((t) => ({
        id: t.key,
        kind: t.kind as InsightKind,
        category: t.category,
        weight: t.weight,
        cooldownMissions: t.cooldownMissions,
        title: t.title,
        body: t.body,
        requires: t.requiresJson || undefined,
        source: 'custom' as const,
        _dbId: t.id, // Internal ID for delete operations
      })),
    ];

    return {
      ok: true,
      templates: mergedTemplates,
    };
  }

  /**
   * Patch A: POST /v1/admin/insights
   * Create a custom insight template
   */
  @Post()
  async createCustomInsight(@Body() body: any) {
    if (!body.key || !body.title || !body.body || !body.kind) {
      return { ok: false, error: 'Missing required fields: key, title, body, kind' };
    }

    if (!INSIGHT_KINDS.includes(body.kind as any)) {
      return { ok: false, error: `Invalid kind. Must be one of: ${INSIGHT_KINDS.join(', ')}` };
    }

    const custom = await this.prisma.customInsightTemplate.create({
      data: {
        key: body.key,
        kind: body.kind,
        category: body.category || 'general',
        title: body.title,
        body: body.body,
        weight: body.weight ?? 50,
        cooldownMissions: body.cooldownMissions ?? 3,
        tags: body.tags || [],
        requiresJson: body.requires || null,
      },
    });

    return {
      ok: true,
      template: {
        id: custom.key,
        kind: custom.kind,
        category: custom.category,
        weight: custom.weight,
        cooldownMissions: custom.cooldownMissions,
        title: custom.title,
        body: custom.body,
        requires: custom.requiresJson || undefined,
        source: 'custom' as const,
        _dbId: custom.id,
      },
    };
  }

  /**
   * Patch A: DELETE /v1/admin/insights/:id
   * Delete a custom insight template (by DB ID, not key)
   */
  @Delete(':id')
  async deleteCustomInsight(@Param('id') id: string) {
    const custom = await this.prisma.customInsightTemplate.findUnique({
      where: { id },
    });

    if (!custom) {
      throw new NotFoundException(`Custom insight with ID ${id} not found.`);
    }

    await this.prisma.customInsightTemplate.delete({
      where: { id },
    });

    return { ok: true, deleted: { id: custom.key } };
  }
}

