// backend/src/modules/profile/profile.controller.ts

import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
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
}
