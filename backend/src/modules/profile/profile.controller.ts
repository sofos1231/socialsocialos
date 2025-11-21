// backend/src/modules/profile/profile.controller.ts

import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Patch('preferences')
  async updatePreferences(@Req() req: any, @Body() dto: UpdatePreferencesDto) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.profile.updatePreferences(userId, dto);
  }
}

// Example usage (Postman):
// PATCH /v1/profile/preferences
// Authorization: Bearer <accessToken>
//
// {
//   "gender": "MALE",
//   "attractedTo": "WOMEN"
// }
//
// Response:
// {
//   "ok": true,
//   "userId": "...",
//   "gender": "MALE",
//   "attractedTo": "WOMEN",
//   "preferencePath": "FEMALE_PATH"
// }
