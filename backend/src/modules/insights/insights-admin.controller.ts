// backend/src/modules/insights/insights-admin.controller.ts
// Step 7.2: Insights admin controller (read-only catalog)

import { Controller, Get, Query } from '@nestjs/common';
import { InsightCatalog } from './catalog/insight-catalog.v1';
import { InsightKind } from './insights.types';

@Controller('v1/admin/insights')
export class InsightsAdminController {
  private catalog = new InsightCatalog();

  /**
   * GET /v1/admin/insights/catalog
   * Get all insight templates (read-only)
   */
  @Get('catalog')
  async getCatalog(@Query('kind') kind?: string) {
    let templates: any[] = [];

    if (kind && Object.values(InsightKind).includes(kind as InsightKind)) {
      templates = this.catalog.getByKind(kind as InsightKind);
    } else {
      // Get all templates
      templates = [
        ...this.catalog.getByKind('GATE_FAIL'),
        ...this.catalog.getByKind('POSITIVE_HOOK'),
        ...this.catalog.getByKind('NEGATIVE_PATTERN'),
        ...this.catalog.getByKind('GENERAL_TIP'),
      ];
    }

    // Filter by kind if provided
    if (kind && Object.values(InsightKind).includes(kind as InsightKind)) {
      templates = templates.filter((t) => t.kind === (kind as InsightKind));
    }

    return {
      ok: true,
      templates: templates,
    };
  }
}

