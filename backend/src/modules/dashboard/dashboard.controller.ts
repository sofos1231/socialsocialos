// src/modules/dashboard/dashboard.controller.ts
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { StatsService } from '../stats/stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard) // 👈 protect all routes in this controller
export class DashboardController {
  constructor(private readonly statsService: StatsService) {}

  @Get('summary')
  async getSummary(@Req() req: any) {
    // JwtAuthGuard + JwtStrategy put the payload on req.user
    const userId = req.user?.sub;
    return this.statsService.getDashboardForUser(userId);
  }
}
