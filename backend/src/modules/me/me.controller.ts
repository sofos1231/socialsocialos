// FILE: backend/src/modules/me/me.controller.ts

import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MeService } from './me.service';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  /**
   * GET /v1/me/app-state
   * Returns the complete app state for the authenticated user:
   * - User core data (onboarding/profile flags, step tracking)
   * - Profile identity (displayName, avatar, tags, etc.)
   * - Preferences (gender, goals, commitment, etc.)
   * - Onboarding state (if UserOnboardingState exists)
   */
  @Get('app-state')
  async getAppState(@Req() req: any) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    return this.meService.getAppState(String(userId));
  }
}

