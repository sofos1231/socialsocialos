// socialsocial/src/api/sessionsService.ts
// Step 5.3: API wrapper for session endpoints

import apiClient from './apiClient';
import { SessionDTO } from '../types/SessionDTO';

/**
 * Fetch session by ID (GET /v1/sessions/:id)
 * 
 * @param sessionId - Session ID
 * @returns SessionDTO with allowlisted fields
 * @throws Error if session not found or access denied
 */
export async function fetchSessionById(sessionId: string): Promise<SessionDTO> {
  const res = await apiClient.get(`/sessions/${sessionId}`);
  const data = res.data;

  // Normalize response to SessionDTO (allowlist only)
  // Note: backend returns sessionId in response, templateId/personaId may be in session object or mission
  return {
    sessionId: data.sessionId || sessionId,
    templateId: data.templateId || data.mission?.templateId || null,
    personaId: data.personaId || null,
    rewards: {
      score: data.rewards?.score ?? 0,
      messageScore: data.rewards?.messageScore ?? 0,
      isSuccess: data.rewards?.isSuccess ?? false,
      xpGained: data.rewards?.xpGained ?? 0,
      coinsGained: data.rewards?.coinsGained ?? 0,
      gemsGained: data.rewards?.gemsGained ?? 0,
      rarityCounts: data.rewards?.rarityCounts ?? {},
      messages: data.rewards?.messages ?? [],
    },
    messages: (data.messages ?? []).map((m: any) => ({
      turnIndex: m.turnIndex ?? 0,
      role: m.role || 'SYSTEM',
      content: m.content || '',
      score: m.score ?? null,
      traitData: {
        traits: m.traitData?.traits ?? {},
        flags: m.traitData?.flags ?? [],
        label: m.traitData?.label ?? null,
        // hooks/patterns not exposed in ApiChatMessage public contract
      },
    })),
    missionState: {
      status: data.missionState?.status || 'IN_PROGRESS',
      progressPct: data.missionState?.progressPct ?? 0,
      averageScore: data.missionState?.averageScore ?? 0,
      totalMessages: data.missionState?.totalMessages ?? 0,
      endReasonCode: data.missionState?.endReasonCode ?? null,
      endReasonMeta: data.missionState?.endReasonMeta ?? null,
    },
    mission: data.mission || null,
  };
}

