// FILE: backend/src/modules/missions-admin/dto/admin-missions-reorder.dto.ts
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

function intToUndef({ value }: { value: any }) {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(String(value));
  if (!Number.isFinite(n)) return undefined;
  return Math.trunc(n);
}

export class ReorderMissionItemDto {
  @IsString()
  id!: string;

  @Transform(intToUndef)
  @IsInt()
  @Min(0)
  laneIndex!: number;

  @Transform(intToUndef)
  @IsInt()
  @Min(0)
  orderIndex!: number;
}

export class ReorderMissionsDto {
  // ✅ canonical
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderMissionItemDto)
  items?: ReorderMissionItemDto[];

  // ✅ aliases (to survive ValidationPipe whitelist)
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedIDs?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderMissionItemDto)
  missions?: ReorderMissionItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderMissionItemDto)
  templates?: ReorderMissionItemDto[];

  // Also allow dashboard to send lanes[] and we’ll flatten in service.
  // Keep as any[] so whitelist doesn’t strip it, and we can parse safely.
  @IsOptional()
  @IsArray()
  lanes?: any[];
}
