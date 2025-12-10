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
 * Step 5.12: Rotation pack meta (non-optional premium fields)
 */
export interface RotationPackMeta {
  seed: string;
  excludedIds: string[];
  pickedIds: string[]; // IDs of insights visible to current user
  quotas: RotationQuotas;
  version: 'v1';
  // Step 5.12: Premium metadata (always populated)
  totalAvailable: number; // Total insights in base pack (premium + free)
  filteredBecausePremium: number; // How many were removed for this user
  isPremiumUser: boolean; // Premium status when pack was returned
  premiumInsightIds: string[]; // IDs of premium insights in base pack (empty for premium users)
}

/**
 * Step 5.11: Rotation pack response
 * Contains selected insights for a specific surface
 * 
 * Step 5.12: Meta is always fully populated with premium fields
 */
export interface RotationPackResponse {
  sessionId: string;
  surface: RotationSurface;
  selectedInsights: InsightCard[]; // Visible insights for current user (filtered if free)
  selectedParagraphs?: DeepParagraphDTO[]; // For ANALYZER surface
  meta: RotationPackMeta;
}

