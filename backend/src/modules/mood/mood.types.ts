// backend/src/modules/mood/mood.types.ts
// Phase 0: State Machine / Mission Mood contract types

/**
 * Mood state enum (extends current simple enum to support timeline)
 */
export type MoodState = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'RECOVERING' | 'COLLAPSED';

/**
 * Reason code for mood state transition
 */
export type MoodTransitionReason =
  | 'S_TIER_STREAK' // Multiple S/S+ messages in a row
  | 'MULTIPLE_D_TIER' // Multiple D-tier messages
  | 'TRAIT_DROP' // Significant trait drop (e.g. confidence -20 points)
  | 'TRAIT_SPIKE' // Significant trait spike
  | 'CONSISTENT_IMPROVEMENT' // Gradual upward trend
  | 'CONSISTENT_DECLINE' // Gradual downward trend
  | 'STABLE_PATTERN' // No significant change
  | 'MESSAGE_COUNT_THRESHOLD' // Reached certain message count
  | 'SCORE_MILESTONE' // Crossed score threshold
  | 'CUSTOM'; // Custom reason from mission config

/**
 * Single mood point in timeline
 */
export interface MoodSnapshot {
  messageIndex: number; // user message index at which this mood was computed
  turnIndex: number; // full transcript turn index
  timestamp: string; // ISO 8601 timestamp
  moodState: MoodState;
  moodPercent: number; // 0-100, computed value (e.g., 0-30 = NEGATIVE, 31-50 = NEUTRAL, 51-75 = RECOVERING, 76-100 = POSITIVE)
  reasonCode?: MoodTransitionReason; // why this state was reached
  context?: {
    recentScores?: number[]; // last N message scores
    recentTraits?: Record<string, number>; // aggregated traits for last N messages
    trendDirection?: 'up' | 'down' | 'stable';
  };
}

/**
 * Runtime mood timeline for a session
 * This is what will be stored in MissionMoodTimeline.timelineJson
 */
export interface MissionMoodTimelinePayload {
  sessionId: string;
  userId: string;
  missionId: string;
  snapshots: MoodSnapshot[]; // ordered by messageIndex/turnIndex
  createdAt: string; // ISO 8601 timestamp when first snapshot created
  updatedAt: string; // ISO 8601 timestamp when last snapshot added
  version: string; // e.g. "v1"
}

/**
 * Rare tier weights for mood computation
 */
export interface RareTierWeights {
  D: number; // negative impact (e.g., -10)
  C: number; // slight negative (e.g., -5)
  B: number; // neutral (e.g., 0)
  A: number; // positive (e.g., +5)
  S: number; // strong positive (e.g., +10)
  'S+': number; // very strong positive (e.g., +15)
}

/**
 * Trait weights for mood computation
 */
export interface TraitWeights {
  confidence: number; // e.g., 1.2 (higher weight = more impact)
  clarity: number;
  humor: number;
  tensionControl: number;
  emotionalWarmth: number;
  dominance: number;
}

/**
 * Mood state transition thresholds
 */
export interface MoodThresholds {
  positiveMin: number; // moodPercent >= this → POSITIVE (e.g., 75)
  neutralMin: number; // moodPercent >= this → NEUTRAL (e.g., 50)
  recoveringMin: number; // moodPercent >= this → RECOVERING (e.g., 40)
  negativeMin: number; // moodPercent >= this → NEGATIVE (e.g., 30)
  // Below negativeMin → COLLAPSED (or use separate threshold)
  collapsedMax?: number; // moodPercent <= this → COLLAPSED (e.g., 20)
}

/**
 * Mission-specific mood configuration
 * This is what will be stored in MissionMoodConfig.configJson
 */
export interface MissionMoodConfigPayload {
  missionId: string; // templateId
  version: string; // e.g. "v1"

  // Base weights (can be overridden per mission)
  rareTierWeights: RareTierWeights;
  traitWeights: TraitWeights;

  // Thresholds for state transitions
  thresholds: MoodThresholds;

  // Optional overrides for specific dynamics
  dynamicsOverrides?: Record<string, Partial<MissionMoodConfigPayload>>;

  // Window size for mood computation (how many recent messages to consider)
  windowSize: number; // e.g., 3 (last 3 messages affect current mood)

  // Decay factor (how quickly old messages lose influence)
  decayFactor?: number; // e.g., 0.9 (each message's weight = 0.9 ^ age)

  createdAt: string;
  updatedAt: string;
}

