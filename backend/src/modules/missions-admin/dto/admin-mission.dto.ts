// FILE: backend/src/modules/missions-admin/dto/admin-mission.dto.ts
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { MissionDifficulty, MissionGoalType } from '@prisma/client';

export class CreateMissionDto {
  // Make code optional: dashboard can auto-generate if left empty
  @IsString()
  @IsOptional()
  code?: string; // e.g. "OPENERS_L1_M1"

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  // category is effectively required for your builder
  @IsString()
  @IsNotEmpty()
  missionCategoryId: string;

  // persona is optional (schema personaId is nullable)
  @IsString()
  @IsOptional()
  aiPersonaId?: string | null;

  @IsInt()
  @IsOptional()
  @Min(0)
  laneIndex?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  orderIndex?: number;

  @IsEnum(MissionDifficulty)
  @IsOptional()
  difficulty?: MissionDifficulty;

  @IsEnum(MissionGoalType)
  @IsOptional()
  goalType?: MissionGoalType;

  @IsInt()
  @IsOptional()
  @Min(0)
  timeLimitSec?: number | null;

  @IsInt()
  @IsOptional()
  @Min(0)
  maxMessages?: number | null;

  @IsInt()
  @IsOptional()
  @Min(0)
  wordLimit?: number | null;

  @IsBoolean()
  @IsOptional()
  isVoiceSupported?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  rewardXp?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  rewardCoins?: number | null;

  @IsInt()
  @IsOptional()
  @Min(0)
  rewardGems?: number | null;

  // ✅ NEW
  @IsOptional()
  aiContract?: any;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateMissionDto extends PartialType(CreateMissionDto) {}
