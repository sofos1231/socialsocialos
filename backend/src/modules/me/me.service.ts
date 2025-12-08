// FILE: backend/src/modules/me/me.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';

export interface AppStateDto {
  user: {
    id: string;
    email: string;
    onboardingCompleted: boolean;
    profileCompleted: boolean;
    onboardingVersion: string | null;
    onboardingStep: number;
    onboardingCompletedAt: Date | null;
    profileCompletedAt: Date | null;
  };
  profile: {
    displayName: string | null;
    avatarType: string;
    avatarId: string | null;
    avatarUrl: string | null;
    profileTags: string[];
    countryCode: string | null;
    allowLeaderboardVisibility: boolean;
  };
  preferences: {
    gender: string;
    attractedTo: string;
    preferencePath: string;
    mainGoal: string | null;
    dailyEffortMinutes: number | null;
    commitmentLevel: string | null;
    selfRatedLevel: number | null;
    wantsHarshFeedback: boolean | null;
    preferredStyles: string[];
    interestTags: string[];
    notificationsEnabled: boolean;
    preferredReminderTime: string | null;
  };
  onboardingState: {
    onboardingVersion: string | null;
    currentStep: number;
    skipped: boolean;
  } | null;
}

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getAppState(userId: string): Promise<AppStateDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        onboardingCompleted: true,
        profileCompleted: true,
        onboardingVersion: true,
        onboardingCompletedAt: true,
        profileCompletedAt: true,
        onboardingStep: true,
        // Profile identity
        displayName: true,
        avatarType: true,
        avatarId: true,
        avatarUrl: true,
        profileTags: true,
        countryCode: true,
        allowLeaderboardVisibility: true,
        // Preferences
        gender: true,
        attractedTo: true,
        preferencePath: true,
        mainGoal: true,
        dailyEffortMinutes: true,
        commitmentLevel: true,
        selfRatedLevel: true,
        wantsHarshFeedback: true,
        preferredStyles: true,
        interestTags: true,
        notificationsEnabled: true,
        preferredReminderTime: true,
        // Onboarding state relation
        onboardingState: {
          select: {
            onboardingVersion: true,
            currentStep: true,
            skipped: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        onboardingCompleted: user.onboardingCompleted,
        profileCompleted: user.profileCompleted,
        onboardingVersion: user.onboardingVersion,
        onboardingStep: user.onboardingStep,
        onboardingCompletedAt: user.onboardingCompletedAt,
        profileCompletedAt: user.profileCompletedAt,
      },
      profile: {
        displayName: user.displayName,
        avatarType: user.avatarType,
        avatarId: user.avatarId,
        avatarUrl: user.avatarUrl,
        profileTags: user.profileTags,
        countryCode: user.countryCode,
        allowLeaderboardVisibility: user.allowLeaderboardVisibility,
      },
      preferences: {
        gender: user.gender,
        attractedTo: user.attractedTo,
        preferencePath: user.preferencePath,
        mainGoal: user.mainGoal,
        dailyEffortMinutes: user.dailyEffortMinutes,
        commitmentLevel: user.commitmentLevel,
        selfRatedLevel: user.selfRatedLevel,
        wantsHarshFeedback: user.wantsHarshFeedback,
        preferredStyles: user.preferredStyles,
        interestTags: user.interestTags,
        notificationsEnabled: user.notificationsEnabled,
        preferredReminderTime: user.preferredReminderTime,
      },
      onboardingState: user.onboardingState
        ? {
            onboardingVersion: user.onboardingState.onboardingVersion,
            currentStep: user.onboardingState.currentStep,
            skipped: user.onboardingState.skipped,
          }
        : null,
    };
  }
}

