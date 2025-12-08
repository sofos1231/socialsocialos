// FILE: backend/src/modules/onboarding/onboarding.controller.ts

import { Body, Controller, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OnboardingService } from './onboarding.service';
import { UpdateOnboardingPreferencesDto } from './dto/update-onboarding-preferences.dto';

@ApiTags('onboarding')
@ApiBearerAuth()
@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * PUT /v1/onboarding/preferences
   * Updates onboarding preferences and advances the step number.
   * Merges provided fields into User record and updates onboarding step.
   */
  @Put('preferences')
  async updatePreferences(
    @Req() req: any,
    @Body() dto: UpdateOnboardingPreferencesDto,
  ) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    return this.onboardingService.updatePreferences(String(userId), dto);
  }

  /**
   * POST /v1/onboarding/skip
   * Skips onboarding with safe defaults.
   * Sets onboardingCompleted = true, applies defaults, and returns app-state.
   */
  @Post('skip')
  async skipOnboarding(@Req() req: any) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    return this.onboardingService.skipOnboarding(String(userId));
  }

  /**
   * POST /v1/onboarding/complete
   * Marks onboarding as completed.
   * Validates required fields (applies defaults if missing) and returns app-state.
   */
  @Post('complete')
  async completeOnboarding(@Req() req: any) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    return this.onboardingService.completeOnboarding(String(userId));
  }
}

