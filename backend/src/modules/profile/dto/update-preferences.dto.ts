// backend/src/modules/profile/dto/update-preferences.dto.ts

import { IsEnum, IsOptional } from 'class-validator';
import { Gender, AttractionPreference } from '@prisma/client';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(AttractionPreference)
  attractedTo?: AttractionPreference;
}
