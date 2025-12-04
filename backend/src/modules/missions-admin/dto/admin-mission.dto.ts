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

function trimKeepEmpty({ value }: { value: any }) {
  if (value === null || value === undefined) return undefined;
  return String(value).trim(); // can be ''
}

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
  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  @MaxLength(40)
  code?: string;

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

  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  categoryCode?: string;

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

  /**
   * ✅ DB-synced AI style selection
   * - Send aiStyleKey: "NEUTRAL" | "FLIRTY" | ...
   * - To CLEAR style on update: send aiStyleKey: "" (empty string)
   *
   * NOTE: We don't use @IsEnum(AiStyle) because AiStyle is a Prisma model (runtime undefined).
   */
  @IsOptional()
  @Transform(trimKeepEmpty)
  @IsString()
  @MaxLength(40)
  aiStyleKey?: string;

  /**
   * ✅ Legacy alias (some dashboards already send "aiStyle")
   * We treat it exactly like aiStyleKey.
   */
  @IsOptional()
  @Transform(trimKeepEmpty)
  @IsString()
  @MaxLength(40)
  aiStyle?: string;

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

  @IsOptional()
  aiContract?: any;

  @IsOptional()
  @Transform(boolToUndef)
  @IsBoolean()
  active?: boolean;
}

export class UpdateMissionDto extends CreateMissionDto {}
