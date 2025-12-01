// FILE: backend/src/modules/stats/stats.controller.ts

import { Controller, Get, Req, UseGuards } from '@nestjs/common';
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
}
