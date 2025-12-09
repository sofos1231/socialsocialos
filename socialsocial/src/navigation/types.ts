// FILE: socialsocial/src/navigation/types.ts

import type { MissionEndReasonCode, EndReasonMeta } from '../logic/missionEndReasons';

// ----- Root + Tabs -----

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  ProfileSetup: undefined;
  Dashboard: undefined;
};

export type MainTabParamList = {
  PracticeTab: undefined;
  StatsTab: undefined;
  ProfileTab: undefined;
};

// ----- FreePlay types -----

export type FreePlayPlace =
  | 'TINDER'
  | 'WHATSAPP'
  | 'BAR'
  | 'INSTAGRAM'
  | 'DM'
  | 'COLD_APPROACH';

export type FreePlayDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'ELITE';

export type FreePlayMode = 'freeplay' | 'mission';

export interface FreePlayConfig {
  place: FreePlayPlace;
  difficulty: FreePlayDifficulty;
  situation: string;

  /**
   * ✅ Part 2: sent to backend as a real field (not just encoded in topic)
   * Should match backend AiStyle.key (usually AiStyleKey enum strings).
   */
  aiStyleKey?: string;
  aiStyleName?: string;
}

// ----- Practice stack -----

export type PracticeStackParamList = {
  PracticeHub: undefined;

  MissionRoad: undefined;

  FreePlayConfig: undefined;

  PracticeSession:
    | {
        // existing mission params
        missionId?: string;
        templateId?: string;
        personaId?: string;

        // display
        title?: string;

        // NEW: optional overrides (safe additions)
        mode?: FreePlayMode;

        /**
         * What we send to backend as "topic".
         * FreePlay sends the built multi-line scenario here.
         */
        topic?: string;

        freeplay?: FreePlayConfig;
      }
    | undefined;

  VoicePracticeSession: {
    topic: string;
  };

  ABPracticeSession: {
    topic: string;
  };

  MissionEnd: {
    sessionId: string;
    templateId?: string;
    personaId?: string;
    missionId?: string;
    title?: string;
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

  /**
   * ✅ Part 2: real style selector for FreePlay (optional).
   * Backend should ignore it when templateId exists (missions have style on template).
   */
  aiStyleKey?: string;
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
  endReasonCode?: MissionEndReasonCode | null;
  endReasonMeta?: EndReasonMeta;
}

// ✅ Step 5.2: Normalized ChatMessage fields
export type ApiMessageRole = 'USER' | 'AI' | 'SYSTEM';

export type ApiTraitData = {
  traits: Record<string, any>;
  flags: string[];
  label: string | null;
};

export interface ApiChatMessage {
  turnIndex: number;
  role: ApiMessageRole;
  content: string;
  score: number | null;
  traitData: ApiTraitData;
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
  messages?: ApiChatMessage[];
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
