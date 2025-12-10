// FILE: backend/src/modules/ai-engine/registries/objective-gate-mappings.registry.ts
// Step 6.4: Objective → Gate Requirements Mapping

import { MissionObjectiveKind } from '../../missions-admin/mission-config-v1.schema';
import { MissionDifficulty } from '@prisma/client';
import type { GateKey } from '../../gates/gates.service';

/**
 * Step 6.4: Gate requirement for an objective at a specific difficulty level
 */
export interface ObjectiveGateRequirement {
  objectiveKind: MissionObjectiveKind;
  difficultyLevel: MissionDifficulty;
  requiredGates: GateKey[];
  /**
   * Optional: Additional conditions beyond gates (e.g., mood must be warm)
   * Format: "mood > warm" | "tension < 0.5" | etc.
   */
  additionalConditions?: string[];
  /**
   * Description of what this requirement means
   */
  description: string;
}

/**
 * Step 6.4: Centralized mapping of objective + difficulty → required gates
 * 
 * This registry defines which gates must be met before rewards can be given
 * for each objective type at different difficulty levels.
 */
export const OBJECTIVE_GATE_MAPPINGS: ObjectiveGateRequirement[] = [
  // GET_NUMBER - Easy
  {
    objectiveKind: 'GET_NUMBER',
    difficultyLevel: MissionDifficulty.EASY,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD'],
    description: 'Easy: Just need minimum messages and decent score',
  },
  // GET_NUMBER - Medium
  {
    objectiveKind: 'GET_NUMBER',
    difficultyLevel: MissionDifficulty.MEDIUM,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    description: 'Medium: Need progress toward objective',
  },
  // GET_NUMBER - Hard
  {
    objectiveKind: 'GET_NUMBER',
    difficultyLevel: MissionDifficulty.HARD,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    additionalConditions: ['mood >= warm'],
    description: 'Hard: Need progress + warm mood',
  },
  // GET_NUMBER - Elite
  {
    objectiveKind: 'GET_NUMBER',
    difficultyLevel: MissionDifficulty.ELITE,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    additionalConditions: ['mood >= warm', 'tension < 0.4'],
    description: 'Elite: Need progress + warm mood + low tension',
  },

  // GET_INSTAGRAM - Easy
  {
    objectiveKind: 'GET_INSTAGRAM',
    difficultyLevel: MissionDifficulty.EASY,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD'],
    description: 'Easy: Just need minimum messages and decent score',
  },
  // GET_INSTAGRAM - Medium
  {
    objectiveKind: 'GET_INSTAGRAM',
    difficultyLevel: MissionDifficulty.MEDIUM,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    description: 'Medium: Need progress toward objective',
  },
  // GET_INSTAGRAM - Hard
  {
    objectiveKind: 'GET_INSTAGRAM',
    difficultyLevel: MissionDifficulty.HARD,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    additionalConditions: ['mood >= neutral'],
    description: 'Hard: Need progress + neutral or better mood',
  },
  // GET_INSTAGRAM - Elite
  {
    objectiveKind: 'GET_INSTAGRAM',
    difficultyLevel: MissionDifficulty.ELITE,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    additionalConditions: ['mood >= warm', 'tension < 0.5'],
    description: 'Elite: Need progress + warm mood + moderate tension',
  },

  // GET_DATE_AGREEMENT - Easy
  {
    objectiveKind: 'GET_DATE_AGREEMENT',
    difficultyLevel: MissionDifficulty.EASY,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    description: 'Easy: Need progress toward date agreement',
  },
  // GET_DATE_AGREEMENT - Medium
  {
    objectiveKind: 'GET_DATE_AGREEMENT',
    difficultyLevel: MissionDifficulty.MEDIUM,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    additionalConditions: ['mood >= neutral'],
    description: 'Medium: Need progress + neutral mood',
  },
  // GET_DATE_AGREEMENT - Hard
  {
    objectiveKind: 'GET_DATE_AGREEMENT',
    difficultyLevel: MissionDifficulty.HARD,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    additionalConditions: ['mood >= warm', 'tension < 0.5'],
    description: 'Hard: Need progress + warm mood + low tension',
  },
  // GET_DATE_AGREEMENT - Elite
  {
    objectiveKind: 'GET_DATE_AGREEMENT',
    difficultyLevel: MissionDifficulty.ELITE,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    additionalConditions: ['mood >= warm', 'tension < 0.3'],
    description: 'Elite: Need progress + warm mood + very low tension',
  },

  // FIX_AWKWARD_MOMENT - Easy
  {
    objectiveKind: 'FIX_AWKWARD_MOMENT',
    difficultyLevel: MissionDifficulty.EASY,
    requiredGates: ['GATE_MIN_MESSAGES'],
    description: 'Easy: Just need minimum messages',
  },
  // FIX_AWKWARD_MOMENT - Medium
  {
    objectiveKind: 'FIX_AWKWARD_MOMENT',
    difficultyLevel: MissionDifficulty.MEDIUM,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD'],
    description: 'Medium: Need decent score',
  },
  // FIX_AWKWARD_MOMENT - Hard
  {
    objectiveKind: 'FIX_AWKWARD_MOMENT',
    difficultyLevel: MissionDifficulty.HARD,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    description: 'Hard: Need progress toward fixing awkwardness',
  },
  // FIX_AWKWARD_MOMENT - Elite
  {
    objectiveKind: 'FIX_AWKWARD_MOMENT',
    difficultyLevel: MissionDifficulty.ELITE,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    additionalConditions: ['mood >= neutral', 'tension < 0.6'],
    description: 'Elite: Need progress + neutral mood + moderate tension',
  },

  // HOLD_BOUNDARY - Easy
  {
    objectiveKind: 'HOLD_BOUNDARY',
    difficultyLevel: MissionDifficulty.EASY,
    requiredGates: ['GATE_MIN_MESSAGES'],
    description: 'Easy: Just need minimum messages',
  },
  // HOLD_BOUNDARY - Medium
  {
    objectiveKind: 'HOLD_BOUNDARY',
    difficultyLevel: MissionDifficulty.MEDIUM,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD'],
    description: 'Medium: Need decent score',
  },
  // HOLD_BOUNDARY - Hard
  {
    objectiveKind: 'HOLD_BOUNDARY',
    difficultyLevel: MissionDifficulty.HARD,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    description: 'Hard: Need progress toward holding boundary',
  },
  // HOLD_BOUNDARY - Elite
  {
    objectiveKind: 'HOLD_BOUNDARY',
    difficultyLevel: MissionDifficulty.ELITE,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    additionalConditions: ['mood >= neutral'],
    description: 'Elite: Need progress + neutral mood',
  },

  // PRACTICE_OPENING - Easy
  {
    objectiveKind: 'PRACTICE_OPENING',
    difficultyLevel: MissionDifficulty.EASY,
    requiredGates: ['GATE_MIN_MESSAGES'],
    description: 'Easy: Just need minimum messages',
  },
  // PRACTICE_OPENING - Medium
  {
    objectiveKind: 'PRACTICE_OPENING',
    difficultyLevel: MissionDifficulty.MEDIUM,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD'],
    description: 'Medium: Need decent score',
  },
  // PRACTICE_OPENING - Hard
  {
    objectiveKind: 'PRACTICE_OPENING',
    difficultyLevel: MissionDifficulty.HARD,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD'],
    additionalConditions: ['mood >= neutral'],
    description: 'Hard: Need decent score + neutral mood',
  },
  // PRACTICE_OPENING - Elite
  {
    objectiveKind: 'PRACTICE_OPENING',
    difficultyLevel: MissionDifficulty.ELITE,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD'],
    additionalConditions: ['mood >= warm'],
    description: 'Elite: Need decent score + warm mood',
  },

  // FREE_EXPLORATION - Easy
  {
    objectiveKind: 'FREE_EXPLORATION',
    difficultyLevel: MissionDifficulty.EASY,
    requiredGates: ['GATE_MIN_MESSAGES'],
    description: 'Easy: Just need minimum messages',
  },
  // FREE_EXPLORATION - Medium
  {
    objectiveKind: 'FREE_EXPLORATION',
    difficultyLevel: MissionDifficulty.MEDIUM,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD'],
    description: 'Medium: Need decent score',
  },
  // FREE_EXPLORATION - Hard
  {
    objectiveKind: 'FREE_EXPLORATION',
    difficultyLevel: MissionDifficulty.HARD,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    description: 'Hard: Need progress',
  },
  // FREE_EXPLORATION - Elite
  {
    objectiveKind: 'FREE_EXPLORATION',
    difficultyLevel: MissionDifficulty.ELITE,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    additionalConditions: ['mood >= neutral'],
    description: 'Elite: Need progress + neutral mood',
  },

  // CUSTOM - Easy
  {
    objectiveKind: 'CUSTOM',
    difficultyLevel: MissionDifficulty.EASY,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD'],
    description: 'Easy: Need minimum messages and decent score',
  },
  // CUSTOM - Medium
  {
    objectiveKind: 'CUSTOM',
    difficultyLevel: MissionDifficulty.MEDIUM,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    description: 'Medium: Need progress toward custom objective',
  },
  // CUSTOM - Hard
  {
    objectiveKind: 'CUSTOM',
    difficultyLevel: MissionDifficulty.HARD,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    additionalConditions: ['mood >= neutral'],
    description: 'Hard: Need progress + neutral mood',
  },
  // CUSTOM - Elite
  {
    objectiveKind: 'CUSTOM',
    difficultyLevel: MissionDifficulty.ELITE,
    requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_OBJECTIVE_PROGRESS'],
    additionalConditions: ['mood >= warm', 'tension < 0.4'],
    description: 'Elite: Need progress + warm mood + low tension',
  },
];

/**
 * Get gate requirements for an objective at a specific difficulty level
 */
export function getGateRequirementsForObjective(
  objectiveKind: MissionObjectiveKind,
  difficultyLevel: MissionDifficulty,
): ObjectiveGateRequirement | null {
  return (
    OBJECTIVE_GATE_MAPPINGS.find(
      (m) => m.objectiveKind === objectiveKind && m.difficultyLevel === difficultyLevel,
    ) ?? null
  );
}

/**
 * Get all gate requirements for an objective (across all difficulty levels)
 */
export function getAllGateRequirementsForObjective(
  objectiveKind: MissionObjectiveKind,
): ObjectiveGateRequirement[] {
  return OBJECTIVE_GATE_MAPPINGS.filter((m) => m.objectiveKind === objectiveKind);
}

/**
 * Check if a gate is required for an objective at a difficulty level
 */
export function isGateRequiredForObjective(
  objectiveKind: MissionObjectiveKind,
  difficultyLevel: MissionDifficulty,
  gateKey: GateKey,
): boolean {
  const requirement = getGateRequirementsForObjective(objectiveKind, difficultyLevel);
  return requirement?.requiredGates.includes(gateKey) ?? false;
}

