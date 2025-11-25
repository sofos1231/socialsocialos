// FILE: socialsocial/src/api/missionsService.ts
import api from './apiClient';

export type MissionVisualState = 'completed' | 'current' | 'locked';

export interface MissionRoadMission {
  id: string;
  code: string;
  title: string;
  description: string | null;

  laneIndex: number;
  orderIndex: number;

  difficulty: string;
  goalType: string | null;

  timeLimitSec: number;
  maxMessages: number | null;
  wordLimit: number | null;
  isVoiceSupported: boolean;

  rewards: { xp: number; coins: number; gems: number };

  category: { id: string; code: string; label: string; description: string | null } | null;
  persona:
    | {
        id: string;
        code: string;
        name: string;
        shortLabel: string | null;
        description: string | null;
        style: string | null;
        avatarUrl: string | null;
        difficulty: number | null;
      }
    | null;

  aiContract: any | null;

  isCompleted: boolean;
  isUnlocked: boolean;
  visualState: MissionVisualState;
  bestScore: number | null;
}

export interface MissionLane {
  laneIndex: number;
  title: string;
  missions: MissionRoadMission[];
}

export interface MissionRoadResponse {
  ok: boolean;
  lanes: MissionLane[];
  summary: {
    totalMissions: number;
    unlockedCount: number;
    completedCount: number;
    completionPercent: number;
  };
}

export async function fetchMissionRoad(): Promise<MissionRoadResponse> {
  const res = await api.get<MissionRoadResponse>('/missions/road');
  return res.data;
}

export async function startMission(templateId: string) {
  const res = await api.post(`/missions/${templateId}/start`, {});
  return res.data;
}

export async function completeMission(
  templateId: string,
  body: { sessionId?: string; isSuccess?: boolean; score?: number },
) {
  const res = await api.post(`/missions/${templateId}/complete`, body);
  return res.data;
}
