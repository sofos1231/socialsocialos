// FILE: backend/src/modules/missions-admin/dto/admin-mission.dto.ts
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { MissionDifficulty, MissionGoalType } from '@prisma/client';

function trimToUndef({ value }: { value: any }) {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s.length ? s : undefined;
}

function intToUndef({ value }: { value: any }) {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(String(value));
  if (!Number.isFinite(n)) return undefined;
  return Math.trunc(n);
}

function boolToUndef({ value }: { value: any }) {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const s = String(value).trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
  return undefined;
}

export class CreateMissionDto {
  // Some dashboards don't send code — backend will generate if missing
  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  @MaxLength(40)
  code?: string;

  // dashboards sometimes use "name" instead of "title"
  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  @MaxLength(140)
  name?: string;

  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  @MaxLength(2000)
  description?: string;

  // allow either categoryId or categoryCode
  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  categoryCode?: string;

  // allow either personaId or personaCode
  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  personaId?: string;

  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  personaCode?: string;

  @IsOptional()
  @IsEnum(MissionGoalType)
  goalType?: MissionGoalType;

  @IsOptional()
  @IsEnum(MissionDifficulty)
  difficulty?: MissionDifficulty;

  @IsOptional()
  @Transform(intToUndef)
  @IsInt()
  @Min(1)
  timeLimitSec?: number;

  @IsOptional()
  @Transform(intToUndef)
  @IsInt()
  @Min(1)
  maxMessages?: number;

  @IsOptional()
  @Transform(intToUndef)
  @IsInt()
  @Min(1)
  wordLimit?: number;

  @IsOptional()
  @Transform(intToUndef)
  @IsInt()
  @Min(0)
  laneIndex?: number;

  @IsOptional()
  @Transform(intToUndef)
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @Transform(boolToUndef)
  @IsBoolean()
  isVoiceSupported?: boolean;

  @IsOptional()
  @Transform(intToUndef)
  @IsInt()
  @Min(0)
  baseXpReward?: number;

  @IsOptional()
  @Transform(intToUndef)
  @IsInt()
  @Min(0)
  baseCoinsReward?: number;

  @IsOptional()
  @Transform(intToUndef)
  @IsInt()
  @Min(0)
  baseGemsReward?: number;

  // may arrive as object OR JSON string; service normalizes
  @IsOptional()
  aiContract?: any;

  @IsOptional()
  @Transform(boolToUndef)
  @IsBoolean()
  active?: boolean;
}

export class UpdateMissionDto extends CreateMissionDto {}
