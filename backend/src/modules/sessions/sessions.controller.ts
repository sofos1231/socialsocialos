// src/modules/sessions/sessions.controller.ts
import { Controller, Get, Post, Req, UseGuards, Param } from '@nestjs/common';
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

  /**
   * ✅ Step 5.7: GET /v1/sessions/last
   * Returns the most recent session (prefers IN_PROGRESS, else most recent finalized)
   */
  @Get('last')
  async getLast(@Req() req: any) {
    const userId = req.user?.sub;
    return this.sessionsService.getLastSessionPublic(userId);
  }

  /**
   * ✅ Step 5.7: GET /v1/sessions/:id
   * Returns a specific session by ID (user must own the session)
   */
  @Get(':id')
  async getById(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub;
    return this.sessionsService.getSessionByIdPublic(userId, id);
  }

  /**
   * Step 5.13: GET /v1/sessions/:id/summary
   * Returns unified session-end read model for finalized sessions
   * Note: This endpoint is NOT wrapped in LockedResponse (plain DTO for now)
   */
  @Get(':id/summary')
  async getSessionSummary(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    return this.sessionsService.getSessionEndReadModel(String(userId), id);
  }
}
