// FILE: backend/src/modules/profile/profile.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AttractionPreference,
  Gender,
  PreferencePath,
  AvatarType,
} from '@prisma/client';
import { PrismaService } from '../../db/prisma.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { CreateOrUpdateProfileDto, UpdateProfileDto } from './dto/create-or-update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  private derivePreferencePath(
    attractedTo: AttractionPreference | null | undefined,
  ): PreferencePath {
    switch (attractedTo) {
      case AttractionPreference.WOMEN:
        return PreferencePath.FEMALE_PATH;
      case AttractionPreference.MEN:
        return PreferencePath.MALE_PATH;
      case AttractionPreference.BOTH:
        return PreferencePath.DUAL_PATH;
      case AttractionPreference.OTHER:
        return PreferencePath.OTHER_PATH;
      case AttractionPreference.UNKNOWN:
      default:
        return PreferencePath.UNKNOWN_PATH;
    }
  }

  async updatePreferences(
    userId: string | undefined,
    dto: UpdatePreferencesDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }

    if (!dto.gender && !dto.attractedTo) {
      throw new BadRequestException({
        code: 'PREFS_EMPTY',
        message: 'At least one of gender or attractedTo must be provided',
      });
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        gender: true,
        attractedTo: true,
        preferencePath: true,
      },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const nextGender: Gender = dto.gender ?? existing.gender ?? Gender.UNKNOWN;

    const nextAttractedTo: AttractionPreference =
      dto.attractedTo ??
      existing.attractedTo ??
      AttractionPreference.UNKNOWN;

    const nextPreferencePath = this.derivePreferencePath(nextAttractedTo);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        gender: nextGender,
        attractedTo: nextAttractedTo,
        preferencePath: nextPreferencePath,
      },
      select: {
        id: true,
        gender: true,
        attractedTo: true,
        preferencePath: true,
      },
    });

    return {
      ok: true,
      userId: updated.id,
      gender: updated.gender,
      attractedTo: updated.attractedTo,
      preferencePath: updated.preferencePath,
    };
  }

  async setupProfile(
    userId: string | undefined,
    dto: CreateOrUpdateProfileDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Validate displayName
    if (!dto.displayName || dto.displayName.length < 2 || dto.displayName.length > 16) {
      throw new BadRequestException({
        code: 'INVALID_DISPLAY_NAME',
        message: 'Display name must be between 2 and 16 characters',
      });
    }

    // Determine avatarType (default to DEFAULT if not provided)
    const avatarType = dto.avatarType ?? AvatarType.DEFAULT;

    // Ensure avatarId or avatarUrl is set, or assign default
    let avatarId = dto.avatarId;
    let avatarUrl = dto.avatarUrl;

    if (!avatarId && !avatarUrl) {
      // Assign a system default avatarId
      avatarId = 'default_01';
    }

    // If avatarType is UPLOADED, avatarUrl should be set
    if (avatarType === AvatarType.UPLOADED && !avatarUrl) {
      throw new BadRequestException({
        code: 'MISSING_AVATAR_URL',
        message: 'avatarUrl is required when avatarType is UPLOADED',
      });
    }

    const now = new Date();

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
        avatarType,
        avatarId,
        avatarUrl,
        profileTags: dto.profileTags ?? [],
        countryCode: dto.countryCode,
        allowLeaderboardVisibility:
          dto.allowLeaderboardVisibility ?? true,
        profileCompleted: true,
        profileCompletedAt: now,
      },
      select: {
        id: true,
        displayName: true,
        avatarType: true,
        avatarId: true,
        avatarUrl: true,
        profileTags: true,
        countryCode: true,
        allowLeaderboardVisibility: true,
        profileCompleted: true,
        profileCompletedAt: true,
      },
    });

    return {
      ok: true,
      profile: updated,
    };
  }

  async getProfile(userId: string | undefined) {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        displayName: true,
        avatarType: true,
        avatarId: true,
        avatarUrl: true,
        profileTags: true,
        countryCode: true,
        allowLeaderboardVisibility: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return {
      displayName: user.displayName,
      avatarType: user.avatarType,
      avatarId: user.avatarId,
      avatarUrl: user.avatarUrl,
      profileTags: user.profileTags,
      countryCode: user.countryCode,
      allowLeaderboardVisibility: user.allowLeaderboardVisibility,
    };
  }

  async updateProfile(
    userId: string | undefined,
    dto: UpdateProfileDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Validate displayName if provided
    if (dto.displayName !== undefined) {
      if (dto.displayName.length < 2 || dto.displayName.length > 16) {
        throw new BadRequestException({
          code: 'INVALID_DISPLAY_NAME',
          message: 'Display name must be between 2 and 16 characters',
        });
      }
    }

    // Build update data (only include provided fields)
    const updateData: any = {};

    if (dto.displayName !== undefined) {
      updateData.displayName = dto.displayName;
    }
    if (dto.avatarType !== undefined) {
      updateData.avatarType = dto.avatarType;
    }
    if (dto.avatarId !== undefined) {
      updateData.avatarId = dto.avatarId;
    }
    if (dto.avatarUrl !== undefined) {
      updateData.avatarUrl = dto.avatarUrl;
    }
    if (dto.profileTags !== undefined) {
      updateData.profileTags = dto.profileTags;
    }
    if (dto.countryCode !== undefined) {
      updateData.countryCode = dto.countryCode;
    }
    if (dto.allowLeaderboardVisibility !== undefined) {
      updateData.allowLeaderboardVisibility = dto.allowLeaderboardVisibility;
    }

    // Validate avatar consistency if avatarType is UPLOADED
    if (updateData.avatarType === AvatarType.UPLOADED && !updateData.avatarUrl) {
      // Check existing avatarUrl if not being updated
      const existing = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true },
      });
      if (!existing?.avatarUrl) {
        throw new BadRequestException({
          code: 'MISSING_AVATAR_URL',
          message: 'avatarUrl is required when avatarType is UPLOADED',
        });
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        displayName: true,
        avatarType: true,
        avatarId: true,
        avatarUrl: true,
        profileTags: true,
        countryCode: true,
        allowLeaderboardVisibility: true,
      },
    });

    return {
      ok: true,
      profile: updated,
    };
  }
}
