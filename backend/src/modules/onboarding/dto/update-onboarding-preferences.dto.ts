// FILE: backend/src/modules/onboarding/dto/update-onboarding-preferences.dto.ts

import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import {
  MainGoal,
  CommitmentLevel,
  Gender,
  AttractionPreference,
} from '@prisma/client';

export class UpdateOnboardingPreferencesDto {
  @IsInt()
  @Min(0)
  @Max(10)
  stepNumber: number;

  // Core preferences
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(AttractionPreference)
  attractedTo?: AttractionPreference;

  @IsOptional()
  @IsEnum(MainGoal)
  mainGoal?: MainGoal;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  dailyEffortMinutes?: number;

  @IsOptional()
  @IsEnum(CommitmentLevel)
  commitmentLevel?: CommitmentLevel;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  selfRatedLevel?: number;

  @IsOptional()
  @IsBoolean()
  wantsHarshFeedback?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredStyles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interestTags?: string[];

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @IsString()
  preferredReminderTime?: string;

  // Additional fields that might be used in specific steps
  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goalTags?: string[];
}

