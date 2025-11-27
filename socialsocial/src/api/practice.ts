// FILE: socialsocial/src/api/practice.ts

import apiClient from './apiClient';

export interface PracticeMessageInput {
  role: 'USER' | 'AI';
  content: string;
}

export interface PracticeSessionRequest {
  topic: string;
  messages: PracticeMessageInput[];
  templateId?: string;   // NEW
  personaId?: string;    // NEW
}

export async function createPracticeSession(payload: PracticeSessionRequest) {
  const res = await apiClient.post('/practice/session', payload);
  return res.data;
}
