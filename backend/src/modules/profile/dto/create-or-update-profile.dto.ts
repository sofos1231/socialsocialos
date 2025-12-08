// FILE: backend/src/modules/profile/dto/create-or-update-profile.dto.ts

import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { AvatarType } from '@prisma/client';

export class CreateOrUpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(16)
  displayName: string;

  @IsOptional()
  @IsEnum(AvatarType)
  avatarType?: AvatarType;

  @IsOptional()
  @IsString()
  avatarId?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  profileTags?: string[];

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsBoolean()
  allowLeaderboardVisibility?: boolean;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(16)
  displayName?: string;

  @IsOptional()
  @IsEnum(AvatarType)
  avatarType?: AvatarType;

  @IsOptional()
  @IsString()
  avatarId?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  profileTags?: string[];

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsBoolean()
  allowLeaderboardVisibility?: boolean;
}

