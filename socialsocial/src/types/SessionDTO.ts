// socialsocial/src/types/SessionDTO.ts
// Step 5.3: Shared DTO types for session data (allowlisted fields used by 5.3 + 5.4)

import { RarityTier } from '../navigation/types';

/**
 * Message role union matching backend contract
 */
export type MessageRole = 'USER' | 'AI' | 'SYSTEM';

/**
 * Normalized message trait data (allowlisted subset)
 * Matches backend ApiChatMessage.traitData contract (simplified, hooks/patterns not exposed in API)
 */
export interface TraitData {
  traits: Record<string, any>;
  flags: string[];
  label: string | null;
  // Note: hooks/patterns exist in backend normalization but are not exposed in ApiChatMessage
  // They are available internally but not in the public API contract
}

/**
 * Session message (allowlisted fields)
 */
export interface SessionMessage {
  turnIndex: number;
  role: MessageRole;
  content: string;
  /** @deprecated - legacy numeric score, kept for cosmetic display only */
  score: number | null;
  traitData: TraitData;
}

/**
 * Rewards message breakdown (per-message rewards)
 */
export interface RewardsMessageBreakdown {
  index: number;
  score: number;
  rarity: RarityTier;
  xp: number;
  coins: number;
  gems: number;
}

/**
 * Session rewards summary
 */
export interface SessionRewardsDTO {
  /** @deprecated - legacy numeric score, kept for cosmetic display only */
  score: number;
  /** @deprecated - legacy numeric score, kept for cosmetic display only */
  messageScore: number;
  isSuccess: boolean;
  xpGained: number;
  coinsGained: number;
  gemsGained: number;
  rarityCounts: Record<string, number>;
  messages: RewardsMessageBreakdown[];
}

/**
 * Mission state (allowlisted subset)
 */
export interface MissionStateDTO {
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAIL';
  progressPct: number;
  /** @deprecated - legacy numeric score, kept for cosmetic display only */
  averageScore: number;
  totalMessages: number;
  endReasonCode: string | null;
  endReasonMeta: Record<string, any> | null;
}

/**
 * Phase 3: Checklist-native summary (matches backend PracticeSessionResponsePublic.checklist)
 */
export interface PracticeChecklistSummary {
  positiveHookCount: number;
  objectiveProgressCount: number;
  boundarySafeStreak: number;
  momentumStreak: number;
  lastMessageFlags: string[]; // MessageChecklistFlag[]
}

/**
 * Complete session DTO (allowlisted fields from GET /v1/sessions/:id)
 */
export interface SessionDTO {
  sessionId: string;
  templateId: string | null;
  personaId: string | null;
  rewards: SessionRewardsDTO;
  messages: SessionMessage[];
  missionState: MissionStateDTO;
  // Phase 3: Checklist-native aggregates
  checklist?: PracticeChecklistSummary;
  // Optional: mission metadata (may be null in GET response)
  mission?: {
    templateId: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'ELITE';
    goalType: 'CONVERSATION' | 'PERSUASION' | 'NEGOTIATION' | null;
    maxMessages: number;
    scoring: {
      /** @deprecated - legacy numeric threshold, mission success now checklist-driven */
      successScore: number;
      /** @deprecated - legacy numeric threshold, mission fail now checklist-driven */
      failScore: number;
    };
    aiStyle: any | null;
    aiContract: Record<string, any> | null;
  } | null;
}

