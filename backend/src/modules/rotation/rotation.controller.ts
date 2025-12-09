// backend/src/modules/rotation/rotation.controller.ts
// Step 5.11: Rotation debug controller (optional but recommended)

import { Controller, Get, Param, Query, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { RotationService } from './rotation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RotationSurface } from './rotation.types';

@Controller('rotation')
@UseGuards(JwtAuthGuard)
export class RotationController {
  constructor(private readonly rotationService: RotationService) {}

  /**
   * Step 5.11: Debug endpoint for rotation engine
   * GET /v1/rotation/debug/:sessionId?surface=MISSION_END
   * 
   * Returns detailed rotation state for debugging:
   * - allCandidates count
   * - history counts
   * - filtered candidates at each stage
   * - selected insights
   * - seed and premium status
   * 
   * @param sessionId - Session ID
   * @param surface - Rotation surface (default: 'MISSION_END')
   * @param req - Request with user from JWT
   * @returns Debug information
   */
  @Get('debug/:sessionId')
  async debugRotation(
    @Param('sessionId') sessionId: string,
    @Query('surface') surface: RotationSurface = 'MISSION_END',
    @Req() req: any,
  ) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }

    return this.rotationService.debugRotation(String(userId), sessionId, surface);
  }
}

