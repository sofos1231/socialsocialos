// FILE: socialsocial/src/api/practice.ts

import apiClient from './apiClient';
import {
  PracticeMessageInput,
  PracticeSessionRequest,
  PracticeSessionResponse,
  VoicePracticeRequest,
  VoicePracticeResponse,
} from '../navigation/types';

/**
 * Regular chat practice session (text chat with AI).
 * Used by PracticeScreen.
 */
export async function createPracticeSession(
  payload: PracticeSessionRequest,
): Promise<PracticeSessionResponse> {
  const res = await apiClient.post('/practice/session', payload);
  return res.data;
}

/**
 * Voice practice – transcript-based scoring.
 * Used by VoicePracticeScreen.
 */
export async function createVoicePracticeSession(
  token: string,
  payload: VoicePracticeRequest,
): Promise<VoicePracticeResponse> {
  const res = await apiClient.post('/practice/voice', payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
}

/**
 * A/B missions – NOT part of final product but currently wired
 * to the Tinder-game tab. We keep it working until that tab מוחלף.
 */
export async function createABPracticeSession(
  token: string,
  payload: {
    topic: string;
    optionA: string;
    optionB: string;
  },
): Promise<any> {
  const res = await apiClient.post('/practice/ab', payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
}

// Re-export types here if needed by callers that prefer importing from api layer
export type { PracticeMessageInput, PracticeSessionRequest, PracticeSessionResponse };
