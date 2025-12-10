import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator';
import { MissionDifficulty, MissionGoalType, AiStyleKey, Gender } from '@prisma/client';

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

/**
 * Custom validator for aiStyleKey to ensure it matches Prisma AiStyleKey enum
 */
@ValidatorConstraint({ name: 'isAiStyleKey', async: false })
export class IsAiStyleKeyConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    // Allow empty string (for clearing style on update)
    if (value === '' || value === null || value === undefined) return true;
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toUpperCase();
    return Object.values(AiStyleKey).includes(normalized as AiStyleKey);
  }

  defaultMessage(args: ValidationArguments) {
    const validKeys = Object.values(AiStyleKey).join(', ');
    return `aiStyleKey must be one of: ${validKeys}, or empty string to clear`;
  }
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
  @Validate(IsAiStyleKeyConstraint)
  aiStyleKey?: string;

  /**
   * ✅ Legacy alias (some dashboards already send "aiStyle")
   * We treat it exactly like aiStyleKey.
   */
  @IsOptional()
  @Transform(trimKeepEmpty)
  @IsString()
  @MaxLength(40)
  @Validate(IsAiStyleKeyConstraint)
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

  // Attraction-based routing
  @IsOptional()
  @Transform(boolToUndef)
  @IsBoolean()
  isAttractionSensitive?: boolean;

  @IsOptional()
  @IsEnum(Gender)
  targetRomanticGender?: Gender;
}

export class UpdateMissionDto extends CreateMissionDto {}
