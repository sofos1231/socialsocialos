// FILE: backend/src/modules/missions/missions.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MissionsService } from './missions.service';
import { CompleteMissionDto } from './dto/complete-mission.dto';

@Controller('missions')
export class MissionsController {
  constructor(private readonly missions: MissionsService) {}

  /**
   * ✅ PUBLIC
   * GET /v1/missions/road
   * If user is logged-in => returns road with progress.
   * If user is NOT logged-in => returns a safe public road (first mission unlocked).
   */
  @Get('road')
  async road(@Req() req: any) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? null;

    if (!userId) {
      return this.missions.getRoadPublic();
    }

    return this.missions.getRoadForUser(String(userId));
  }

  /**
   * 🔒 PROTECTED
   * GET /v1/missions/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async byId(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    return this.missions.getMissionForUser(String(userId), id);
  }

  /**
   * 🔒 PROTECTED
   * POST /v1/missions/:id/start
   */
  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  async start(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    return this.missions.startMission(String(userId), id);
  }

  /**
   * 🔒 PROTECTED
   * POST /v1/missions/:id/complete
   */
  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  async complete(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CompleteMissionDto,
  ) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    return this.missions.completeMission(String(userId), id, dto);
  }
}
