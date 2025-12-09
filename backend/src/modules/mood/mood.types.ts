// backend/src/modules/mood/mood.types.ts
// Phase 0: State Machine / Mission Mood contract types

/**
 * Step 5.10: Mood state enum (updated for Step 5.10)
 */
export type MoodState = 'COLD' | 'NEUTRAL' | 'WARM' | 'TENSE' | 'FLOW';

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
 * Step 5.10: Single mood point in timeline (updated structure)
 */
export interface MoodSnapshot {
  turnIndex: number; // full transcript turn index
  rawScore: number; // 0-100, raw computed score
  smoothedMoodScore: number; // 0-100, EMA-smoothed score (α=0.35)
  moodState: MoodState; // Determined from smoothedMoodScore + tension/warmth
  tension: number; // 0-100, computed from tensionControl trait + patterns
  warmth: number; // 0-100, computed from emotionalWarmth trait
  vibe: number; // 0-100, computed from humor + confidence
  flow: number; // 0-100, EMA of score stability
}

/**
 * Step 5.10: Mood insight (for timeline payload)
 */
export interface MoodInsight {
  id: string;
  title: string;
  body: string;
  categoryKey?: string;
  evidence: string;
  priorityScore: number;
}

/**
 * Step 5.10: Runtime mood timeline for a session
 * This is what will be stored in MissionMoodTimeline.timelineJson
 */
export interface MoodTimelinePayload {
  version: 1;
  snapshots: MoodSnapshot[];
  current: {
    moodState: MoodState;
    moodPercent: number;
  };
  moodInsights?: {
    pickedIds: string[];
    insights: MoodInsight[];
  };
}

/**
 * Legacy type alias for backward compatibility
 */
export interface MissionMoodTimelinePayload {
  sessionId: string;
  userId: string;
  missionId: string;
  snapshots: MoodSnapshot[];
  createdAt: string;
  updatedAt: string;
  version: string;
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

