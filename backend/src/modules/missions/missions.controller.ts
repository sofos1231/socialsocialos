// FILE: backend/src/modules/missions/missions.controller.ts

import {
  Controller,
  Get,
  Post,
  Req,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { MissionsService } from './missions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('missions')
export class MissionsController {
  constructor(private readonly missions: MissionsService) {}

  /**
   * GET /v1/missions/road
   * Returns mission lanes + ordering + unlock information for this user.
   */
  @Get('road')
  @UseGuards(JwtAuthGuard)
  async getRoad(@Req() req: any) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    return this.missions.getRoadForUser(String(userId));
  }

  /**
   * POST /v1/missions/:id/start
   * Called when user taps "Start Mission".
   *
   * - Validates mission exists & active
   * - Checks unlock rules
   * - Ensures MissionProgress row
   * - Returns normalized mission payload
   */
  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  async startMission(@Req() req: any, @Param('id') id: string) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);

    const result = await this.missions.startMissionForUser(
      String(userId),
      String(id),
    );

    if (!result) {
      throw new ForbiddenException({
        code: 'MISSION_CANNOT_BE_STARTED',
        message: 'Mission cannot be started due to an internal constraint.',
        templateId: id,
      });
    }

    return {
      ok: true,
      mission: result,
    };
  }
}
