// socialsocial/src/api/insightsService.ts
// Step 5.3: API wrapper for insights endpoints

import apiClient from './apiClient';
import { InsightsDTO } from '../types/InsightsDTO';

/**
 * Fetch insights for a session (GET /v1/insights/session/:sessionId)
 * 
 * @param sessionId - Session ID
 * @returns InsightsDTO with normalized safe defaults
 * @throws Error if session not found, access denied, or network error
 */
export async function fetchInsightsBySessionId(sessionId: string): Promise<InsightsDTO> {
  try {
    const res = await apiClient.get(`/insights/session/${sessionId}`);
    return res.data;
  } catch (error: any) {
    // Re-throw to let caller handle (MissionEndScreen will set insights = null)
    throw error;
  }
}

