// FILE: backend/src/modules/missions-admin/dto/admin-category.dto.ts

import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

/**
 * Category DTO is designed to play nice with the Mission Builder dashboard.
 *
 * The HTML sends:
 *  - name      → human name of the category
 *  - code      → short code/tag (e.g. "OPENERS", "FLIRTING")
 *  - subtitle  → UI subtitle (mapped to description)
 *  - minLevel  → used only by the app logic / UI, NOT stored in MissionCategory schema
 *
 * Prisma model MissionCategory has:
 *  - code (string, unique)
 *  - label (string)
 *  - description (string | null)
 */
export class CreateMissionCategoryDto {
  // Dashboard uses "name"; we also accept "label" for future-proofing.

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  // Stored as description
  @IsString()
  @IsOptional()
  description?: string;

  // Dashboard uses "subtitle"; mapped to description if provided.
  @IsString()
  @IsOptional()
  subtitle?: string;

  // Not persisted in MissionCategory for now, but allowed for future use.
  @IsInt()
  @IsOptional()
  @Min(1)
  minLevel?: number;
}

export class UpdateMissionCategoryDto extends PartialType(
  CreateMissionCategoryDto,
) {}
