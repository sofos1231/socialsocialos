// FILE: backend/src/modules/missions-admin/mission-config-v1.builders.ts
// Phase 2 / Part 1: Typed builders for MissionConfigV1

import {
  MissionConfigV1,
  MissionConfigV1Dynamics,
  MissionConfigV1Objective,
  MissionConfigV1Difficulty,
  MissionConfigV1Style,
  MissionConfigV1StatePolicy,
  MissionMode,
  MissionLocationTag,
  MissionObjectiveKind,
  MissionEndReasonCode,
} from './mission-config-v1.schema';
import { AiStyleKey, MissionDifficulty } from '@prisma/client';

/**
 * Builds a conservative, valid MissionConfigV1 for opener missions.
 * All fields are set to safe defaults that pass validation.
 */
export function buildOpenersMissionConfigV1(params: {
  difficultyLevel: MissionDifficulty;
  aiStyleKey: AiStyleKey;
  maxMessages: number;
  timeLimitSec: number;
  wordLimit?: number | null;
  userTitle: string;
  userDescription: string;
  objectiveKind?: MissionObjectiveKind;
}): MissionConfigV1 {
  const {
    difficultyLevel,
    aiStyleKey,
    maxMessages,
    timeLimitSec,
    wordLimit,
    userTitle,
    userDescription,
    objectiveKind = 'PRACTICE_OPENING',
  } = params;

  // Dynamics: Conservative defaults for opener missions
  const dynamics: MissionConfigV1Dynamics = {
    mode: 'CHAT' as MissionMode,
    locationTag: 'APP_CHAT' as MissionLocationTag,
    hasPerMessageTimer: timeLimitSec > 0,
    defaultEntryRoute: 'TEXT_CHAT',
    // Tuning parameters: null (use defaults) or safe mid-range values
    pace: null,
    emojiDensity: null,
    flirtiveness: null,
    hostility: null,
    dryness: null,
    vulnerability: null,
    escalationSpeed: null,
    randomness: null,
  };

  // Objective: Matches opener mission type
  const objective: MissionConfigV1Objective = {
    kind: objectiveKind,
    userTitle,
    userDescription,
  };

  // Difficulty: Matches template difficulty, conservative tuning
  const difficulty: MissionConfigV1Difficulty = {
    level: difficultyLevel,
    recommendedMaxMessages: maxMessages,
    recommendedSuccessScore: null,
    recommendedFailScore: null,
    // Tuning parameters: null (use defaults)
    strictness: null,
    ambiguityTolerance: null,
    emotionalPenalty: null,
    bonusForCleverness: null,
    failThreshold: null,
    recoveryDifficulty: null,
  };

  // Style: Must match AiStyleKey enum
  const style: MissionConfigV1Style = {
    aiStyleKey,
    // styleIntensity is optional, omit for simplicity
  };

  // StatePolicy: Conservative defaults that work for opener missions
  const statePolicy: MissionConfigV1StatePolicy = {
    maxMessages,
    minMessagesBeforeEnd: null,
    maxStrikes: 3,
    timerSecondsPerMessage: timeLimitSec > 0 ? timeLimitSec : null,
    allowTimerExtension: true,
    // Deprecated but required by validation
    successScoreThreshold: 70,
    failScoreThreshold: 40,
    enableGateSequence: true,
    enableMoodCollapse: true,
    enableObjectiveAutoSuccess: false,
    allowedEndReasons: [
      'SUCCESS_OBJECTIVE',
      'FAIL_MAX_MESSAGES',
      'FAIL_TIMER_EXPIRED',
      'ABORT_USER_EXIT',
    ] as MissionEndReasonCode[],
    // endReasonPrecedence: null (use global precedence)
    // Feature toggles default to true (handled by normalization)
  };

  return {
    version: 1,
    dynamics,
    objective,
    difficulty,
    style,
    statePolicy,
    // Optional sections: null for simplicity
    openings: null,
    responseArchitecture: null,
    aiRuntimeProfile: null,
    scoringProfileCode: null,
    dynamicsProfileCode: null,
  };
}

/**
 * Builds a conservative, valid MissionConfigV1 for flirting missions.
 * Similar to opener missions but with slightly different defaults.
 */
export function buildFlirtingMissionConfigV1(params: {
  difficultyLevel: MissionDifficulty;
  aiStyleKey: AiStyleKey;
  maxMessages: number;
  timeLimitSec: number;
  wordLimit?: number | null;
  userTitle: string;
  userDescription: string;
}): MissionConfigV1 {
  const {
    difficultyLevel,
    aiStyleKey,
    maxMessages,
    timeLimitSec,
    userTitle,
    userDescription,
  } = params;

  // Dynamics: Similar to opener but may have different tuning
  const dynamics: MissionConfigV1Dynamics = {
    mode: 'CHAT' as MissionMode,
    locationTag: 'APP_CHAT' as MissionLocationTag,
    hasPerMessageTimer: timeLimitSec > 0,
    defaultEntryRoute: 'TEXT_CHAT',
    pace: null,
    emojiDensity: null,
    flirtiveness: null,
    hostility: null,
    dryness: null,
    vulnerability: null,
    escalationSpeed: null,
    randomness: null,
  };

  const objective: MissionConfigV1Objective = {
    kind: 'FREE_EXPLORATION', // Flirting missions are more exploratory
    userTitle,
    userDescription,
  };

  const difficulty: MissionConfigV1Difficulty = {
    level: difficultyLevel,
    recommendedMaxMessages: maxMessages,
    recommendedSuccessScore: null,
    recommendedFailScore: null,
    strictness: null,
    ambiguityTolerance: null,
    emotionalPenalty: null,
    bonusForCleverness: null,
    failThreshold: null,
    recoveryDifficulty: null,
  };

  const style: MissionConfigV1Style = {
    aiStyleKey,
  };

  const statePolicy: MissionConfigV1StatePolicy = {
    maxMessages,
    minMessagesBeforeEnd: null,
    maxStrikes: 3,
    timerSecondsPerMessage: timeLimitSec > 0 ? timeLimitSec : null,
    allowTimerExtension: true,
    successScoreThreshold: 70,
    failScoreThreshold: 40,
    enableGateSequence: true,
    enableMoodCollapse: true,
    enableObjectiveAutoSuccess: false,
    allowedEndReasons: [
      'SUCCESS_OBJECTIVE',
      'FAIL_MAX_MESSAGES',
      'FAIL_TIMER_EXPIRED',
      'ABORT_USER_EXIT',
    ] as MissionEndReasonCode[],
  };

  return {
    version: 1,
    dynamics,
    objective,
    difficulty,
    style,
    statePolicy,
    openings: null,
    responseArchitecture: null,
    aiRuntimeProfile: null,
    scoringProfileCode: null,
    dynamicsProfileCode: null,
  };
}

