// FILE: backend/src/modules/stats/stats.controller.ts

import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    return this.statsService.getDashboardForUser(String(userId));
  }

  @Get('badges')
  async getBadges(@Req() req: any) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    return this.statsService.getBadgesForUser(String(userId));
  }

  @Get('traits/summary')
  async getTraitsSummary(@Req() req: any) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    return this.statsService.getTraitsSummaryForUser(String(userId));
  }

  @Get('traits/history')
  async getTraitHistory(@Req() req: any, @Query('limit') limit?: string) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.statsService.getTraitHistoryForUser(String(userId), limitNum);
  }

  @Get('summary')
  async getStatsSummary(@Req() req: any) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    return this.statsService.getStatsSummaryForUser(String(userId));
  }

  /**
   * Step 5.6: Get advanced metrics (Premium feature)
   * Returns all 7 systems: message evolution, radar360, persona sensitivity, etc.
   */
  @Get('advanced')
  async getAdvancedMetrics(@Req() req: any) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    return this.statsService.getAdvancedMetricsForUser(String(userId));
  }
}
