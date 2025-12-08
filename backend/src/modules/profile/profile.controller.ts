// backend/src/modules/profile/profile.controller.ts

import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { CreateOrUpdateProfileDto, UpdateProfileDto } from './dto/create-or-update-profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * PATCH /v1/profile/preferences
   * Updates user preferences used for personalization + gating logic later.
   */
  @Patch('preferences')
  async updatePreferences(@Req() req: any, @Body() dto: UpdatePreferencesDto) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.profileService.updatePreferences(userId, dto);
  }

  /**
   * POST /v1/profile/setup
   * First-time profile setup after onboarding.
   * Sets profileCompleted = true and profileCompletedAt = now.
   */
  @Post('setup')
  async setupProfile(@Req() req: any, @Body() dto: CreateOrUpdateProfileDto) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    return this.profileService.setupProfile(String(userId), dto);
  }

  /**
   * GET /v1/profile/me
   * Returns the current user's profile information.
   */
  @Get('me')
  async getProfile(@Req() req: any) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    return this.profileService.getProfile(String(userId));
  }

  /**
   * PATCH /v1/profile
   * Updates profile fields (all optional).
   * Does NOT toggle profileCompleted flag.
   */
  @Patch()
  async updateProfile(
    @Req() req: any,
    @Body() dto: UpdateProfileDto,
  ) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    return this.profileService.updateProfile(String(userId), dto);
  }
}
