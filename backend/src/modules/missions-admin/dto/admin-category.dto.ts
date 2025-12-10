// FILE: backend/src/modules/missions-admin/dto/admin-category.dto.ts
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { AttractionPath } from '@prisma/client';

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

export class CreateMissionCategoryDto {
  // code optional — service can generate from label
  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  @MaxLength(40)
  code?: string;

  // dashboards sometimes use "title"
  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  @MaxLength(500)
  description?: string;

  // Practice Hub Designer fields
  @IsOptional()
  @IsEnum(AttractionPath)
  attractionPath?: AttractionPath;

  @IsOptional()
  @Transform(boolToUndef)
  @IsBoolean()
  isAttractionSensitive?: boolean;

  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  @MaxLength(200)
  dynamicLabelTemplate?: string;

  @IsOptional()
  @Transform(intToUndef)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @IsOptional()
  @Transform(trimToUndef)
  @IsString()
  @MaxLength(500)
  iconUrl?: string;

  @IsOptional()
  @Transform(boolToUndef)
  @IsBoolean()
  active?: boolean;
}

export class UpdateMissionCategoryDto extends CreateMissionCategoryDto {}
