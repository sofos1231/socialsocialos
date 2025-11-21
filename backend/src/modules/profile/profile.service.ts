// backend/src/modules/profile/profile.service.ts

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
  } from '@prisma/client';
  import { PrismaService } from '../../db/prisma.service';
  import { UpdatePreferencesDto } from './dto/update-preferences.dto';
  
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
  
    async updatePreferences(userId: string | undefined, dto: UpdatePreferencesDto) {
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
  
      const nextGender: Gender =
        dto.gender ?? existing.gender ?? Gender.UNKNOWN;
  
      const nextAttractedTo: AttractionPreference =
        dto.attractedTo ?? existing.attractedTo ?? AttractionPreference.UNKNOWN;
  
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
  }
  