// FILE: socialsocial/src/api/meService.ts

import apiClient from './apiClient';

export interface AppState {
  user: {
    id: string;
    email: string;
    onboardingCompleted: boolean;
    profileCompleted: boolean;
    onboardingVersion: string | null;
    onboardingStep: number;
    onboardingCompletedAt: string | null;
    profileCompletedAt: string | null;
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

/**
 * Fetches the complete app state for the authenticated user.
 * Returns user flags, profile data, preferences, and onboarding state.
 */
export async function getAppState(): Promise<AppState> {
  const res = await apiClient.get<AppState>('/me/app-state');
  return res.data;
}

