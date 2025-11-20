// src/api/practice.ts
import { api } from './client';
import type {
  PracticeSessionRequest,
  PracticeSessionResponse,
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
