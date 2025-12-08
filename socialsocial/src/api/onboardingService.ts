// FILE: socialsocial/src/api/onboardingService.ts

import apiClient from './apiClient';

// Enum types matching backend
export type MainGoal = 'DATING' | 'SOCIAL' | 'CAREER' | 'ALL';
export type CommitmentLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

// Payload for PUT /onboarding/preferences
export type OnboardingPreferencesPayload = {
  stepNumber: number;
  mainGoal?: MainGoal;
  goalTags?: string[];
  dailyEffortMinutes?: number;
  commitmentLevel?: CommitmentLevel;
  selfRatedLevel?: number;
  wantsHarshFeedback?: boolean;
  preferredStyles?: string[];
  interestTags?: string[];
  notificationsEnabled?: boolean;
  preferredReminderTime?: string;
  language?: string;
};

/**
 * Updates onboarding preferences for a specific step.
 * Backend will merge the provided fields and update onboardingStep.
 */
export async function updateOnboardingPreferences(
  payload: OnboardingPreferencesPayload,
): Promise<void> {
  await apiClient.put('/onboarding/preferences', payload);
}

/**
 * Skips onboarding with safe defaults.
 * Backend sets onboardingCompleted = true and applies defaults.
 */
export async function skipOnboarding(): Promise<void> {
  await apiClient.post('/onboarding/skip', {});
}

/**
 * Marks onboarding as completed.
 * Backend validates required fields and sets onboardingCompleted = true.
 */
export async function completeOnboarding(): Promise<void> {
  await apiClient.post('/onboarding/complete', {});
}

