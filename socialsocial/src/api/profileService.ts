// FILE: socialsocial/src/api/profileService.ts

import apiClient from './apiClient';

export type AvatarType = 'DEFAULT' | 'UPLOADED';

export interface SetupProfilePayload {
  displayName: string;
  avatarType?: AvatarType;
  avatarId?: string;
  avatarUrl?: string;
  profileTags?: string[];
  countryCode?: string;
  allowLeaderboardVisibility?: boolean;
}

export interface Profile {
  displayName: string | null;
  avatarType: string;
  avatarId: string | null;
  avatarUrl: string | null;
  profileTags: string[];
  countryCode: string | null;
  allowLeaderboardVisibility: boolean;
}

/**
 * Sets up the user's profile for the first time.
 * Backend sets profileCompleted = true and profileCompletedAt = now.
 */
export async function setupProfile(payload: SetupProfilePayload): Promise<void> {
  await apiClient.post('/profile/setup', payload);
}

/**
 * Gets the current user's profile information.
 */
export async function getProfile(): Promise<Profile> {
  const res = await apiClient.get<Profile>('/profile/me');
  return res.data;
}

/**
 * Updates profile fields (all optional).
 * Does NOT toggle profileCompleted flag.
 * Use this for later profile editing, not first-time setup.
 */
export async function updateProfile(payload: Partial<SetupProfilePayload>): Promise<Profile> {
  const res = await apiClient.patch<Profile>('/profile', payload);
  return res.data;
}
