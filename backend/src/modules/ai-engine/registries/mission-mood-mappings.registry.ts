// FILE: backend/src/modules/ai-engine/registries/mission-mood-mappings.registry.ts
// Step 6.5: Mission Mood Mappings Registry

import { MissionMoodStateV1 } from '../mission-state-v1.schema';

export type MoodChangeReason =
  | 'low_score'
  | 'high_score'
  | 'negative_flag'
  | 'positive_flag'
  | 'trait_trend'
  | 'score_threshold'
  | 'flag_pattern'
  | 'recovery'
  | 'escalation';

/**
 * Mapping from flags to mood changes
 */
export interface FlagToMoodMapping {
  flag: string | RegExp; // Flag pattern or exact string
  moodShift: Partial<MissionMoodStateV1>; // How mood should change
  reason: MoodChangeReason;
}

/**
 * Mapping from score ranges to mood changes
 */
export interface ScoreToMoodMapping {
  scoreRange: [number, number]; // [min, max] score range
  moodShift: Partial<MissionMoodStateV1>;
  reason: MoodChangeReason;
}

/**
 * Mapping from trait trends to persona adjustments
 */
export interface TraitTrendToMoodMapping {
  traitKey: string; // e.g., 'confidence', 'dominance'
  trend: 'increasing' | 'decreasing' | 'high' | 'low';
  moodShift: Partial<MissionMoodStateV1>;
  reason: MoodChangeReason;
}

/**
 * Centralized registry of flag → mood mappings
 */
export const FLAG_TO_MOOD_MAPPINGS: FlagToMoodMapping[] = [
  {
    flag: 'tooDirect',
    moodShift: { currentMood: 'testing', tensionLevel: 0.6 },
    reason: 'negative_flag',
  },
  {
    flag: 'overexplaining',
    moodShift: { currentMood: 'annoyed', tensionLevel: 0.5 },
    reason: 'negative_flag',
  },
  {
    flag: 'low-effort',
    moodShift: { currentMood: 'bored', positivityPct: 40 },
    reason: 'negative_flag',
  },
  {
    flag: 'uncertainty',
    moodShift: { currentMood: 'testing', tensionLevel: 0.4 },
    reason: 'negative_flag',
  },
  {
    flag: /flirt|playful|witty/i,
    moodShift: { currentMood: 'warm', positivityPct: 70 },
    reason: 'positive_flag',
  },
  {
    flag: /confident|bold|assertive/i,
    moodShift: { currentMood: 'interested', tensionLevel: 0.3 },
    reason: 'positive_flag',
  },
  {
    flag: /vulnerable|open|honest/i,
    moodShift: { currentMood: 'warm', positivityPct: 75 },
    reason: 'positive_flag',
  },
];

/**
 * Centralized registry of score → mood mappings
 */
export const SCORE_TO_MOOD_MAPPINGS: ScoreToMoodMapping[] = [
  {
    scoreRange: [0, 30],
    moodShift: { currentMood: 'cold', positivityPct: 20, tensionLevel: 0.8 },
    reason: 'low_score',
  },
  {
    scoreRange: [30, 50],
    moodShift: { currentMood: 'annoyed', positivityPct: 35, tensionLevel: 0.6 },
    reason: 'low_score',
  },
  {
    scoreRange: [50, 70],
    moodShift: { currentMood: 'neutral', positivityPct: 50, tensionLevel: 0.4 },
    reason: 'score_threshold',
  },
  {
    scoreRange: [70, 85],
    moodShift: { currentMood: 'warm', positivityPct: 70, tensionLevel: 0.3 },
    reason: 'high_score',
  },
  {
    scoreRange: [85, 100],
    moodShift: { currentMood: 'excited', positivityPct: 90, tensionLevel: 0.2 },
    reason: 'high_score',
  },
];

/**
 * Centralized registry of trait trend → mood mappings
 */
export const TRAIT_TREND_TO_MOOD_MAPPINGS: TraitTrendToMoodMapping[] = [
  {
    traitKey: 'dominance',
    trend: 'high',
    moodShift: { currentMood: 'testing', tensionLevel: 0.5 },
    reason: 'trait_trend',
  },
  {
    traitKey: 'dominance',
    trend: 'increasing',
    moodShift: { currentMood: 'interested', tensionLevel: 0.4 },
    reason: 'trait_trend',
  },
  {
    traitKey: 'emotionalWarmth',
    trend: 'high',
    moodShift: { currentMood: 'warm', positivityPct: 75 },
    reason: 'trait_trend',
  },
  {
    traitKey: 'emotionalWarmth',
    trend: 'increasing',
    moodShift: { currentMood: 'warm', positivityPct: 70 },
    reason: 'trait_trend',
  },
  {
    traitKey: 'confidence',
    trend: 'high',
    moodShift: { currentMood: 'interested', tensionLevel: 0.3 },
    reason: 'trait_trend',
  },
  {
    traitKey: 'confidence',
    trend: 'low',
    moodShift: { currentMood: 'testing', tensionLevel: 0.5 },
    reason: 'trait_trend',
  },
  {
    traitKey: 'humor',
    trend: 'high',
    moodShift: { currentMood: 'excited', positivityPct: 80 },
    reason: 'trait_trend',
  },
];

/**
 * Apply flag-based mood changes
 */
export function applyFlagToMood(
  currentMood: MissionMoodStateV1,
  flags: string[],
): { mood: MissionMoodStateV1; changed: boolean; reason: string | null } {
  let updatedMood = { ...currentMood };
  let changed = false;
  let reason: string | null = null;

  for (const flag of flags) {
    for (const mapping of FLAG_TO_MOOD_MAPPINGS) {
      const matches =
        typeof mapping.flag === 'string'
          ? flag.toLowerCase().includes(mapping.flag.toLowerCase())
          : mapping.flag.test(flag);

      if (matches) {
        updatedMood = {
          ...updatedMood,
          ...mapping.moodShift,
          lastChangeReason: mapping.reason,
          lastChangedAt: new Date().toISOString(),
          isStable: false,
        };
        changed = true;
        reason = mapping.reason;
        break; // Apply first matching flag
      }
    }
  }

  return { mood: updatedMood, changed, reason };
}

/**
 * Apply score-based mood changes
 */
export function applyScoreToMood(
  currentMood: MissionMoodStateV1,
  score: number,
): { mood: MissionMoodStateV1; changed: boolean; reason: string | null } {
  let updatedMood = { ...currentMood };
  let changed = false;
  let reason: string | null = null;

  for (const mapping of SCORE_TO_MOOD_MAPPINGS) {
    const [min, max] = mapping.scoreRange;
    if (score >= min && score <= max) {
      // Only update if mood would actually change
      const wouldChange =
        mapping.moodShift.currentMood !== currentMood.currentMood ||
        Math.abs((mapping.moodShift.positivityPct ?? currentMood.positivityPct) - currentMood.positivityPct) > 10 ||
        Math.abs((mapping.moodShift.tensionLevel ?? currentMood.tensionLevel) - currentMood.tensionLevel) > 0.2;

      if (wouldChange) {
        updatedMood = {
          ...updatedMood,
          ...mapping.moodShift,
          lastChangeReason: mapping.reason,
          lastChangedAt: new Date().toISOString(),
          isStable: false,
        };
        changed = true;
        reason = mapping.reason;
      }
      break;
    }
  }

  return { mood: updatedMood, changed, reason };
}

/**
 * Apply trait trend-based mood changes
 */
export function applyTraitTrendToMood(
  currentMood: MissionMoodStateV1,
  traitKey: string,
  traitValue: number,
  previousValue: number | null,
): { mood: MissionMoodStateV1; changed: boolean; reason: string | null } {
  let updatedMood = { ...currentMood };
  let changed = false;
  let reason: string | null = null;

  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'high' | 'low' | null = null;
  if (previousValue !== null) {
    if (traitValue > previousValue + 10) trend = 'increasing';
    else if (traitValue < previousValue - 10) trend = 'decreasing';
  }
  if (traitValue >= 80) trend = 'high';
  else if (traitValue <= 30) trend = 'low';

  if (!trend) return { mood: currentMood, changed: false, reason: null };

  for (const mapping of TRAIT_TREND_TO_MOOD_MAPPINGS) {
    if (mapping.traitKey === traitKey && mapping.trend === trend) {
      updatedMood = {
        ...updatedMood,
        ...mapping.moodShift,
        lastChangeReason: mapping.reason,
        lastChangedAt: new Date().toISOString(),
        isStable: false,
      };
      changed = true;
      reason = mapping.reason;
      break;
    }
  }

  return { mood: updatedMood, changed, reason };
}

/**
 * Calculate tension based on score and difficulty thresholds
 */
export function calculateTensionFromScore(
  score: number,
  failThreshold: number,
  successThreshold: number,
  currentTension: number,
): number {
  // If score is below fail threshold, increase tension
  if (score < failThreshold) {
    return Math.min(1.0, currentTension + 0.2);
  }

  // If score is above success threshold, decrease tension
  if (score >= successThreshold) {
    return Math.max(0.1, currentTension - 0.15);
  }

  // Gradual adjustment based on distance from thresholds
  const distanceFromFail = score - failThreshold;
  const distanceFromSuccess = successThreshold - score;
  const range = successThreshold - failThreshold;

  if (range > 0) {
    const tensionAdjustment = (distanceFromFail / range) * 0.3 - 0.15;
    return Math.max(0.1, Math.min(1.0, currentTension + tensionAdjustment));
  }

  return currentTension;
}

