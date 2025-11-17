// backend/src/modules/dashboard/dashboard.controller.ts

import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../modules/auth/jwt-auth.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  async getSummary(@Req() req) {
    const userId = req.user.sub ?? req.user.id;
    return this.dashboardService.getSummary(userId);
  }
}
