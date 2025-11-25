// FILE: backend/src/modules/missions-admin/dto/admin-category.dto.ts
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

function trimToUndef({ value }: { value: any }) {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s.length ? s : undefined;
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
}

export class UpdateMissionCategoryDto extends CreateMissionCategoryDto {}
