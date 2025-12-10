// FILE: backend/src/modules/onboarding/onboarding.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  MainGoal,
  CommitmentLevel,
  Gender,
  AttractionPreference,
  PreferencePath,
} from '@prisma/client';
import { PrismaService } from '../../db/prisma.service';
import { UpdateOnboardingPreferencesDto } from './dto/update-onboarding-preferences.dto';
import { MeService, AppStateDto } from '../me/me.service';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly meService: MeService,
  ) {}

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
    dto: UpdateOnboardingPreferencesDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        onboardingStep: true,
        gender: true,
        attractedTo: true,
        preferencePath: true,
        onboardingState: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Build update data
    const updateData: any = {};

    // Update onboarding step (max of current and provided)
    const newStep = Math.max(user.onboardingStep, dto.stepNumber);
    updateData.onboardingStep = newStep;

    // Update gender if provided
    if (dto.gender !== undefined) {
      updateData.gender = dto.gender;
    }

    // Update attractedTo and derive preferencePath
    if (dto.attractedTo !== undefined) {
      updateData.attractedTo = dto.attractedTo;
      updateData.preferencePath = this.derivePreferencePath(dto.attractedTo);
    }

    // Update other preference fields
    if (dto.mainGoal !== undefined) {
      updateData.mainGoal = dto.mainGoal;
    }
    if (dto.dailyEffortMinutes !== undefined) {
      updateData.dailyEffortMinutes = dto.dailyEffortMinutes;
    }
    if (dto.commitmentLevel !== undefined) {
      updateData.commitmentLevel = dto.commitmentLevel;
    }
    if (dto.selfRatedLevel !== undefined) {
      updateData.selfRatedLevel = dto.selfRatedLevel;
    }
    if (dto.wantsHarshFeedback !== undefined) {
      updateData.wantsHarshFeedback = dto.wantsHarshFeedback;
    }
    if (dto.preferredStyles !== undefined) {
      updateData.preferredStyles = dto.preferredStyles;
    }
    if (dto.interestTags !== undefined) {
      updateData.interestTags = dto.interestTags;
    }
    if (dto.notificationsEnabled !== undefined) {
      updateData.notificationsEnabled = dto.notificationsEnabled;
    }
    if (dto.preferredReminderTime !== undefined) {
      updateData.preferredReminderTime = dto.preferredReminderTime;
    }

    // Update User record
    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Update UserOnboardingState if it exists
    if (user.onboardingState) {
      await this.prisma.userOnboardingState.update({
        where: { userId },
        data: {
          currentStep: newStep,
          lastUpdatedAt: new Date(),
        },
      });
    }

    return {
      ok: true,
      stepNumber: newStep,
    };
  }

  async skipOnboarding(userId: string | undefined): Promise<AppStateDto> {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        gender: true,
        attractedTo: true,
        onboardingStep: true,
        onboardingState: true,
        mainGoal: true,
        dailyEffortMinutes: true,
        selfRatedLevel: true,
        preferredStyles: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const now = new Date();
    const maxStep = 999; // Maximum step index for skipped onboarding

    // Apply safe defaults
    const updateData: any = {
      onboardingCompleted: true,
      onboardingCompletedAt: now,
      onboardingStep: maxStep,
    };

    // Only set defaults if fields are null/undefined
    if (user.mainGoal === null || user.mainGoal === undefined) {
      updateData.mainGoal = MainGoal.ALL;
    }
    if (user.dailyEffortMinutes === null || user.dailyEffortMinutes === undefined) {
      updateData.dailyEffortMinutes = 15;
    }
    if (user.selfRatedLevel === null || user.selfRatedLevel === undefined) {
      updateData.selfRatedLevel = 2;
    }
    if (!user.preferredStyles || user.preferredStyles.length === 0) {
      updateData.preferredStyles = ['CHILL'];
    }

    // Set safe defaults for gender/attraction to ensure mission routing has stable inputs
    // This prevents users from getting stuck with UNKNOWN preferences that would hide all attraction-sensitive missions
    if (user.gender === Gender.UNKNOWN || user.gender === null || user.gender === undefined) {
      updateData.gender = Gender.OTHER;
    }
    if (user.attractedTo === AttractionPreference.UNKNOWN || user.attractedTo === null || user.attractedTo === undefined) {
      updateData.attractedTo = AttractionPreference.OTHER;
      updateData.preferencePath = PreferencePath.OTHER_PATH;
    }

    // Update User
    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Update or create UserOnboardingState
    if (user.onboardingState) {
      await this.prisma.userOnboardingState.update({
        where: { userId },
        data: {
          skipped: true,
          currentStep: maxStep,
          completedAt: now,
          lastUpdatedAt: now,
        },
      });
    } else {
      // Create if it doesn't exist
      await this.prisma.userOnboardingState.create({
        data: {
          userId,
          onboardingVersion: 'v1',
          currentStep: maxStep,
          skipped: true,
          completedAt: now,
          startedAt: user.createdAt || now,
        },
      });
    }

    return this.meService.getAppState(userId);
  }

  async completeOnboarding(userId: string | undefined): Promise<AppStateDto> {
    if (!userId) {
      throw new UnauthorizedException({
        code: 'AUTH_INVALID',
        message: 'Missing user id',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mainGoal: true,
        dailyEffortMinutes: true,
        gender: true,
        attractedTo: true,
        onboardingState: true,
        createdAt: true,
        onboardingVersion: true,
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const now = new Date();
    const updateData: any = {
      onboardingCompleted: true,
      onboardingCompletedAt: now,
    };

    // Apply defaults if required fields are missing
    if (user.mainGoal === null || user.mainGoal === undefined) {
      updateData.mainGoal = MainGoal.ALL;
    }
    if (user.dailyEffortMinutes === null || user.dailyEffortMinutes === undefined) {
      updateData.dailyEffortMinutes = 15;
    }

    // Set safe defaults for gender/attraction to ensure mission routing has stable inputs
    // This prevents users from getting stuck with UNKNOWN preferences that would hide all attraction-sensitive missions
    if (user.gender === Gender.UNKNOWN || user.gender === null || user.gender === undefined) {
      updateData.gender = Gender.OTHER;
    }
    if (user.attractedTo === AttractionPreference.UNKNOWN || user.attractedTo === null || user.attractedTo === undefined) {
      updateData.attractedTo = AttractionPreference.OTHER;
      updateData.preferencePath = PreferencePath.OTHER_PATH;
    }

    // Update User
    await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Update UserOnboardingState if it exists
    if (user.onboardingState) {
      await this.prisma.userOnboardingState.update({
        where: { userId },
        data: {
          completedAt: now,
          lastUpdatedAt: now,
        },
      });
    } else {
      // Create if it doesn't exist
      await this.prisma.userOnboardingState.create({
        data: {
          userId,
          onboardingVersion: user.onboardingVersion || 'v1',
          currentStep: 10, // Assume completed means step 10
          skipped: false,
          completedAt: now,
          startedAt: user.createdAt || now,
        },
      });
    }

    return this.meService.getAppState(userId);
  }
}

