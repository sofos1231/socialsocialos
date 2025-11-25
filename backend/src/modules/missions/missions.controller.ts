// FILE: backend/src/modules/missions/missions.controller.ts
import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MissionsService } from './missions.service';
import { CompleteMissionDto } from './dto/complete-mission.dto';

@Controller('missions')
@UseGuards(JwtAuthGuard)
export class MissionsController {
  constructor(private readonly missions: MissionsService) {}

  /**
   * GET /v1/missions/road
   * Returns mission road for the logged-in user (DB templates + per-user progress).
   */
  @Get('road')
  async road(@Req() req: any) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.missions.getRoadForUser(userId);
  }

  /**
   * GET /v1/missions/:id
   * Returns a single mission (template) + per-user state.
   */
  @Get(':id')
  async byId(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.missions.getMissionForUser(userId, id);
  }

  /**
   * POST /v1/missions/:id/start
   * Validates unlock state and returns mission + persona + aiContract (if any).
   */
  @Post(':id/start')
  async start(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.missions.startMission(userId, id);
  }

  /**
   * POST /v1/missions/:id/complete
   * Marks COMPLETED (if success) and unlocks the next mission in global order.
   */
  @Post(':id/complete')
  async complete(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CompleteMissionDto,
  ) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.missions.completeMission(userId, id, dto);
  }
}
