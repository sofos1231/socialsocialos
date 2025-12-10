// backend/src/modules/ai-engine/persona-drift.types.ts
// Step 6.8: Persona Drift Detection Types

import { ActiveModifier } from './mission-state-v1.schema';
import { MissionConfigV1Style, MissionConfigV1Dynamics, MissionConfigV1Difficulty } from '../missions-admin/mission-config-v1.schema';
import { MissionMoodStateV1 } from './mission-state-v1.schema';

/**
 * Step 6.8: Context for persona stability computation
 */
export interface PersonaStabilityContext {
  style: MissionConfigV1Style | null;
  dynamics: MissionConfigV1Dynamics | null;
  difficulty: MissionConfigV1Difficulty | null;
  moodState: MissionMoodStateV1;
  recentScores: number[]; // Last 2-3 message scores
  recentFlags: string[][]; // Last 2-3 message flags
  recentTraits: Array<Record<string, number> | null>; // Last 2-3 message traits
}

/**
 * Step 6.8: Persona stability result
 */
export interface PersonaStabilityResult {
  personaStability: number; // 0-100, where 100 = perfectly consistent
  lastDriftReason: string | null; // Reason for drift (if any)
}

/**
 * Step 6.8: Event that may trigger modifiers
 */
export interface ModifierEvent {
  type: 'tension_spike' | 'mood_drop' | 'score_collapse' | 'flag_negative' | 'trait_drop';
  severity: number; // 0-1, how severe the event is
  context: {
    currentScore?: number;
    tensionLevel?: number;
    moodState?: string;
    flags?: string[];
    traits?: Record<string, number>;
  };
}

