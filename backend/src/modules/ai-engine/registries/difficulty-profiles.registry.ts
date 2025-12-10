// FILE: backend/src/modules/ai-engine/registries/difficulty-profiles.registry.ts
// Step 6.0: Centralized Difficulty Profiles Registry

import { MissionDifficulty } from '@prisma/client';
import { MissionConfigV1Difficulty } from '../../missions-admin/mission-config-v1.schema';

export type DifficultyProfileKey =
  | 'LENIENT'
  | 'STRICT'
  | 'BALANCED'
  | 'HARSH'
  | 'FORGIVING'
  | 'PRECISE';

export interface DifficultyProfile {
  key: DifficultyProfileKey;
  name: string;
  description: string;
  difficulty: Partial<MissionConfigV1Difficulty> & {
    strictness?: number;
    ambiguityTolerance?: number;
    emotionalPenalty?: number;
    bonusForCleverness?: number;
    failThreshold?: number;
    recoveryDifficulty?: number;
  };
}

/**
 * Centralized registry of difficulty profiles.
 * 
 * NOTE: This registry is a DESIGN-TIME CATALOG only.
 * It is NOT used at runtime to derive difficulty configs.
 * 
 * Purpose:
 * - Provides reference examples of difficulty profiles
 * - Can be used by admin UI to suggest or preview difficulty settings
 * - Documents common difficulty configurations
 * 
 * Runtime behavior:
 * - Actual difficulty config comes from MissionConfigV1.difficulty (stored in mission template)
 * - This registry is NOT consulted during mission execution
 * - If you need to map MissionDifficulty level to a profile, use getDefaultDifficultyProfileForLevel()
 *   but note that this is for UI/display purposes only, not runtime enforcement
 */
export const AI_DIFFICULTY_PROFILES: Record<DifficultyProfileKey, DifficultyProfile> = {
  LENIENT: {
    key: 'LENIENT',
    name: 'Lenient',
    description: 'Forgiving grading, high ambiguity tolerance, easy recovery',
    difficulty: {
      strictness: 25,
      ambiguityTolerance: 80,
      emotionalPenalty: 10,
      bonusForCleverness: 30,
      failThreshold: 35,
      recoveryDifficulty: 20,
    },
  },

  STRICT: {
    key: 'STRICT',
    name: 'Strict',
    description: 'Harsh grading, low ambiguity tolerance, hard recovery',
    difficulty: {
      strictness: 85,
      ambiguityTolerance: 20,
      emotionalPenalty: 60,
      bonusForCleverness: 15,
      failThreshold: 55,
      recoveryDifficulty: 80,
    },
  },

  BALANCED: {
    key: 'BALANCED',
    name: 'Balanced',
    description: 'Moderate grading across all dimensions',
    difficulty: {
      strictness: 50,
      ambiguityTolerance: 50,
      emotionalPenalty: 30,
      bonusForCleverness: 40,
      failThreshold: 45,
      recoveryDifficulty: 50,
    },
  },

  HARSH: {
    key: 'HARSH',
    name: 'Harsh',
    description: 'Very strict grading, severe penalties, difficult recovery',
    difficulty: {
      strictness: 95,
      ambiguityTolerance: 10,
      emotionalPenalty: 80,
      bonusForCleverness: 10,
      failThreshold: 60,
      recoveryDifficulty: 90,
    },
  },

  FORGIVING: {
    key: 'FORGIVING',
    name: 'Forgiving',
    description: 'Very lenient grading, high tolerance, easy recovery',
    difficulty: {
      strictness: 15,
      ambiguityTolerance: 90,
      emotionalPenalty: 5,
      bonusForCleverness: 50,
      failThreshold: 30,
      recoveryDifficulty: 10,
    },
  },

  PRECISE: {
    key: 'PRECISE',
    name: 'Precise',
    description: 'High strictness but rewards cleverness, moderate recovery',
    difficulty: {
      strictness: 75,
      ambiguityTolerance: 30,
      emotionalPenalty: 40,
      bonusForCleverness: 70,
      failThreshold: 50,
      recoveryDifficulty: 60,
    },
  },
};

/**
 * Get a difficulty profile by key
 */
export function getDifficultyProfile(key: DifficultyProfileKey): DifficultyProfile {
  return AI_DIFFICULTY_PROFILES[key];
}

/**
 * Get all difficulty profile keys
 */
export function getAllDifficultyProfileKeys(): DifficultyProfileKey[] {
  return Object.keys(AI_DIFFICULTY_PROFILES) as DifficultyProfileKey[];
}

/**
 * Check if a difficulty profile key is valid
 */
export function isValidDifficultyProfileKey(key: string): key is DifficultyProfileKey {
  return key in AI_DIFFICULTY_PROFILES;
}

/**
 * Get default difficulty profile for a MissionDifficulty level
 */
export function getDefaultDifficultyProfileForLevel(
  level: MissionDifficulty,
): DifficultyProfileKey {
  switch (level) {
    case MissionDifficulty.EASY:
      return 'LENIENT';
    case MissionDifficulty.MEDIUM:
      return 'BALANCED';
    case MissionDifficulty.HARD:
      return 'STRICT';
    case MissionDifficulty.ELITE:
      return 'HARSH';
    default:
      return 'BALANCED';
  }
}

