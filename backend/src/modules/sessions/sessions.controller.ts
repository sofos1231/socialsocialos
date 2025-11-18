// src/modules/sessions/sessions.controller.ts
import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sessions')
@UseGuards(JwtAuthGuard) // כל הסשנים מאובטחים בטוקן
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('mock')
  async createMockSession(@Req() req: any) {
    const userId = req.user?.sub;
    return this.sessionsService.createMockSession(userId);
  }

  // נשאיר alias לנתיב הישן אם משהו יתבסס עליו
  @Get('dashboard/summary')
  async getDashboardSnapshot(@Req() req: any) {
    const userId = req.user?.sub;
    return this.sessionsService.getDashboardSnapshot(userId);
  }
}
