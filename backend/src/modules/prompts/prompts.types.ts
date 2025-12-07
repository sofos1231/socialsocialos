// backend/src/modules/prompts/prompts.types.ts
// Phase 0: Prompt / Hook System contract types

import { MoodState } from '../mood/mood.types';

/**
 * Prompt/Hook type
 */
export type PromptType = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

/**
 * Trait level enum for condition matching
 */
export type TraitLevel = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

/**
 * Trait condition (for matching)
 */
export interface TraitCondition {
  trait: string; // CharismaTraitKey or custom trait name
  level: TraitLevel; // required level
  operator?: 'eq' | 'gte' | 'lte' | 'gt' | 'lt'; // default: 'gte'
}

export interface LayerRange {
  min?: number;
  max?: number;
}

/**
 * Layer pattern condition
 */
export interface LayerPatternCondition {
  requiredLayers?: {
    L1?: LayerRange;
    L2?: LayerRange;
    L3?: LayerRange;
    L4?: LayerRange;
    L5?: LayerRange;
  };
  forbiddenLayers?: {
    L1?: LayerRange;
    L2?: LayerRange;
    L3?: LayerRange;
    L4?: LayerRange;
    L5?: LayerRange;
  };
}

/**
 * Count-based condition (e.g., "at least 3 S-tier messages")
 */
export interface CountCondition {
  rareTier?: Record<
    'D' | 'C' | 'B' | 'A' | 'S' | 'S+',
    { min?: number; max?: number } | undefined
  >;
  totalMessages?: { min?: number; max?: number };
  consecutiveStreak?: {
    tier: 'D' | 'C' | 'B' | 'A' | 'S' | 'S+';
    count: number; // e.g., 3 means "3 consecutive S-tier messages"
  };
}

/**
 * Mood condition
 */
export interface MoodCondition {
  moodState?: MoodState | MoodState[]; // e.g., ['POSITIVE', 'RECOVERING']
  moodPercent?: { min?: number; max?: number }; // e.g., { min: 75 }
  duration?: number; // e.g., 3 means "mood >= min for 3+ messages"
}

/**
 * Segment filters (user/mission characteristics)
 */
export interface SegmentFilters {
  ageRange?: { min?: number; max?: number };
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  missionType?: string | string[]; // TODO: refine to MissionGoalType
  missionDifficulty?: string | string[]; // TODO: refine to MissionDifficulty
  userSegment?: string[]; // custom segment tags
}

/**
 * Prompt/Hook conditions bundle
 */
export interface PromptHookConditions {
  requiredTraits?: TraitCondition[];
  forbiddenTraits?: TraitCondition[];
  requiredMoodRange?: MoodCondition;
  requiredLayerPattern?: LayerPatternCondition;
  requiredCounts?: CountCondition;
  segmentFilters?: SegmentFilters;
}

/**
 * Prompt/Hook definition
 * This is what will be stored in PromptHook.conditionsJson and related fields
 */
export interface PromptHookPayload {
  id: string; // unique identifier (e.g., "hook_super_charismatic_001")
  name: string; // human-readable name
  type: PromptType; // POSITIVE / NEGATIVE / NEUTRAL

  // Text template (supports variable placeholders like {{trait}})
  textTemplate: string; // e.g., "You're showing incredible charisma! Your {{confidence}} confidence combined with {{humor}} humor is creating a strong connection."

  // Condition fields (ALL must match for hook to trigger)
  conditions: PromptHookConditions;

  // Metadata
  category: string; // e.g., "charisma+humor", "recovery", "improvement"
  tags: string[]; // e.g., ["charisma", "humor", "high_performance"]
  priority: number; // 1-100, higher = checked first (if multiple hooks match, highest priority wins)
  isEnabled: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  version: string; // e.g., "v1"

  // Optional: hook-specific metadata
  meta?: {
    cooldownSeconds?: number; // don't trigger same hook twice within this window
    maxTriggersPerSession?: number; // e.g., 1 means only trigger once per session
    description?: string; // internal notes
  };
}

export interface MatchedHookContextSnapshot {
  messageIndex?: number;
  sessionSnapshot?: {
    moodState?: MoodState;
    moodPercent?: number;
    traitProfile?: Record<string, number>;
    rareTierCounts?: Record<string, number>;
  };
}

/**
 * Matched hook result (returned by prompt engine)
 */
export interface MatchedHook {
  hook: PromptHookPayload;
  matchedAt: string; // ISO 8601 timestamp
  matchedContext: MatchedHookContextSnapshot;
}

