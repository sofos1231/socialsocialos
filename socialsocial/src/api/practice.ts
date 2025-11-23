// socialsocial/src/api/practice.ts
import { api } from './client';
import type {
  PracticeSessionRequest,
  PracticeSessionResponse,
  VoicePracticeRequest,
  VoicePracticeResponse,
  ABPracticeRequest,
  ABPracticeResponse,
} from '../navigation/types';

export async function createPracticeSession(
  accessToken: string,
  payload: PracticeSessionRequest,
): Promise<PracticeSessionResponse> {
  const res = await api.post<PracticeSessionResponse>(
    '/practice/session',
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return res.data;
}

export async function createVoicePracticeSession(
  accessToken: string,
  payload: VoicePracticeRequest,
): Promise<VoicePracticeResponse> {
  const res = await api.post<VoicePracticeResponse>(
    '/practice/voice-session',
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return res.data;
}

export async function createABPracticeSession(
  accessToken: string,
  payload: ABPracticeRequest,
): Promise<ABPracticeResponse> {
  const res = await api.post<ABPracticeResponse>(
    '/practice/ab-session',
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return res.data;
}
