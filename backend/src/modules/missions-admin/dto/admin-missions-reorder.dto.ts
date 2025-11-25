// FILE: backend/src/modules/missions-admin/dto/admin-missions-reorder.dto.ts

import {
    IsArray,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateNested,
  } from 'class-validator';
  import { Type } from 'class-transformer';
  
  export class ReorderMissionItemDto {
    @IsString()
    @IsNotEmpty()
    id: string;
  
    @IsInt()
    laneIndex: number;
  
    @IsInt()
    orderIndex: number;
  }
  
  export class ReorderMissionsDto {
    // Supports your HTML version:
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    orderedIds?: string[];
  
    // Also supports a structured version:
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => ReorderMissionItemDto)
    items?: ReorderMissionItemDto[];
  }
  