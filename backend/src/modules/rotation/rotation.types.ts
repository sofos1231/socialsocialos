// backend/src/modules/rotation/rotation.types.ts
// Step 5.11: Rotation engine types (prerequisite layer)
// Types only - no selection logic yet

import { InsightCard } from '../insights/insights.types';
import { DeepParagraphDTO } from '../analyzer/analyzer.types';

/**
 * Step 5.11: Rotation surface types
 * Defines which UI surface is requesting insights
 */
export type RotationSurface =
  | 'MISSION_END'
  | 'ADVANCED_TAB'
  | 'ANALYZER'
  | 'SYNERGY_MAP'
  | 'MOOD_TIMELINE';

/**
 * Step 5.11: Rotation quotas per surface
 * Defines how many insights of each kind can be selected for a surface
 */
export interface RotationQuotas {
  gate: number;
  hook: number;
  pattern: number;
  tip: number;
  mood?: number; // Optional: mood insights quota
  synergy?: number; // Optional: synergy insights quota
  analyzer?: number; // Optional: analyzer paragraph quota
}

/**
 * Step 5.11: Rotation pack response
 * Contains selected insights for a specific surface
 * 
 * ⚠️ NOTE: This is the response type. Selection logic comes in Step 5.11 Part 2.
 */
export interface RotationPackResponse {
  sessionId: string;
  surface: RotationSurface;
  selectedInsights: InsightCard[];
  selectedParagraphs?: DeepParagraphDTO[]; // For ANALYZER surface
  meta: {
    seed: string; // Deterministic seed used for selection
    excludedIds: string[]; // All IDs excluded from last 5 sessions
    pickedIds: string[]; // IDs selected for this pack
    quotas: RotationQuotas; // Quotas applied for this surface
    version: 'v1';
  };
}

