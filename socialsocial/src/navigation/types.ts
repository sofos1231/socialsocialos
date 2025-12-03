// FILE: socialsocial/src/navigation/types.ts

// ----- Root + Tabs -----

export type RootStackParamList = {
  Auth: undefined;
  Dashboard: undefined;
};

export type MainTabParamList = {
  PracticeTab: undefined;
  StatsTab: undefined;
  ProfileTab: undefined;
};

// ----- Practice stack -----

export type PracticeStackParamList = {
  PracticeHub: undefined;

  MissionRoad: undefined;

  PracticeSession:
    | {
        missionId?: string;
        templateId?: string;
        personaId?: string;
        title?: string;
      }
    | undefined;

  VoicePracticeSession: {
    topic: string;
  };

  ABPracticeSession: {
    topic: string;
  };
};

// ----- Shared practice types -----

export type RarityTier = 'C' | 'B' | 'A' | 'S' | 'S+';

export interface PracticeMessageInput {
  role: 'USER' | 'AI';
  content: string;
}

export interface PracticeSessionRequest {
  /**
   * ✅ Step 8: continue an existing server session while staying in the screen.
   * IMPORTANT: we do NOT persist this to storage (no pause/resume).
   */
  sessionId?: string;

  topic: string;
  messages: PracticeMessageInput[];

  templateId?: string; // mission template
  personaId?: string; // persona context
}

// Per-message breakdown inside rewards.messages
export interface SessionRewardMessageBreakdown {
  index: number;
  score: number;
  rarity: RarityTier;
  xp: number;
  coins: number;
  gems: number;
}

export interface SessionRewards {
  score: number;
  messageScore: number;
  isSuccess: boolean;
  xpGained: number;
  coinsGained: number;
  gemsGained: number;
  rarityCounts: Record<string, number>;
  messages: SessionRewardMessageBreakdown[];
}

// 🔥 Backend missionState payload
export type MissionStateStatus = 'IN_PROGRESS' | 'SUCCESS' | 'FAIL';

export interface MissionStatePayload {
  status: MissionStateStatus;
  progressPct: number; // 0–100
  averageScore: number;
  totalMessages: number;
}

// Base response shape from /v1/practice/session
export interface PracticeSessionResponse {
  ok: boolean;
  rewards: SessionRewards;
  dashboard?: any;
  sessionId?: string;
  aiReply?: string;
  aiDebug?: any;
  mission?: any;
  aiStructured?: any; // backend returns this; FE can ignore for now
  missionState?: MissionStatePayload;
}

// ----- Voice practice -----

export interface VoicePracticeRequest {
  topic: string;
  transcript: string;
}

export interface VoicePracticeResponse {
  ok: boolean;
  rewards: SessionRewards;
  ai?: any;
  dashboard?: any;
}

// Re-use rewards in several places
export type SessionRewardsLike = SessionRewards;
