// FILE: backend/src/modules/missions-admin/mission-config-v1.schema.ts
// Phase 0: MissionConfigV1 schema definition and validation (no DB changes, no runtime wiring)

import { AiStyleKey, MissionDifficulty } from '@prisma/client';

// ============================================================================
// 1. End Reason Domain
// ============================================================================

export type MissionEndReasonCode =
  | 'SUCCESS_OBJECTIVE'
  | 'SUCCESS_GATE_SEQUENCE'
  | 'SUCCESS_SCORE_MILESTONE'
  | 'FAIL_OBJECTIVE'
  | 'FAIL_MAX_MESSAGES'
  | 'FAIL_TIMER_EXPIRED'
  | 'FAIL_TOO_MANY_STRIKES'
  | 'FAIL_GATE_SEQUENCE'
  | 'FAIL_MOOD_COLLAPSE'
  | 'ABORT_USER_EXIT'
  | 'ABORT_SYSTEM_ERROR';

export type MissionEndReasonCategory = 'SUCCESS' | 'FAIL' | 'ABORT';

export interface MissionEndReasonMeta {
  code: MissionEndReasonCode;
  category: MissionEndReasonCategory;
  label: string; // short display name for future UI
  description: string; // human explanation for tooltips & insights
}

export const MISSION_END_REASON_PRECEDENCE: MissionEndReasonCode[] = [
  // Highest priority first when multiple reasons could apply
  'ABORT_SYSTEM_ERROR',
  'FAIL_TIMER_EXPIRED',
  'FAIL_TOO_MANY_STRIKES',
  'FAIL_GATE_SEQUENCE',
  'FAIL_MOOD_COLLAPSE',
  'FAIL_MAX_MESSAGES',
  'FAIL_OBJECTIVE',
  'SUCCESS_OBJECTIVE',
  'SUCCESS_GATE_SEQUENCE',
  'SUCCESS_SCORE_MILESTONE',
  'ABORT_USER_EXIT',
];

export const MISSION_END_REASON_META_DEFAULT: Record<
  MissionEndReasonCode,
  MissionEndReasonMeta
> = {
  SUCCESS_OBJECTIVE: {
    code: 'SUCCESS_OBJECTIVE',
    category: 'SUCCESS',
    label: 'Objective Achieved',
    description: 'Mission objective was successfully completed.',
  },
  SUCCESS_GATE_SEQUENCE: {
    code: 'SUCCESS_GATE_SEQUENCE',
    category: 'SUCCESS',
    label: 'Gate Sequence Passed',
    description: 'All required gates in the sequence were passed.',
  },
  SUCCESS_SCORE_MILESTONE: {
    code: 'SUCCESS_SCORE_MILESTONE',
    category: 'SUCCESS',
    label: 'Score Milestone Reached',
    description: 'Achieved the target score milestone.',
  },
  FAIL_OBJECTIVE: {
    code: 'FAIL_OBJECTIVE',
    category: 'FAIL',
    label: 'Objective Not Met',
    description: 'Failed to meet the mission objective requirements.',
  },
  FAIL_MAX_MESSAGES: {
    code: 'FAIL_MAX_MESSAGES',
    category: 'FAIL',
    label: 'Message Limit Reached',
    description: 'Reached the maximum number of messages allowed.',
  },
  FAIL_TIMER_EXPIRED: {
    code: 'FAIL_TIMER_EXPIRED',
    category: 'FAIL',
    label: 'Timer Expired',
    description: 'Time limit for the message was exceeded.',
  },
  FAIL_TOO_MANY_STRIKES: {
    code: 'FAIL_TOO_MANY_STRIKES',
    category: 'FAIL',
    label: 'Too Many Strikes',
    description: 'Exceeded the maximum number of strikes allowed.',
  },
  FAIL_GATE_SEQUENCE: {
    code: 'FAIL_GATE_SEQUENCE',
    category: 'FAIL',
    label: 'Gate Sequence Failed',
    description: 'Failed to pass a required gate in the sequence.',
  },
  FAIL_MOOD_COLLAPSE: {
    code: 'FAIL_MOOD_COLLAPSE',
    category: 'FAIL',
    label: 'Mood Collapsed',
    description: 'Conversation mood dropped below the collapse threshold.',
  },
  ABORT_USER_EXIT: {
    code: 'ABORT_USER_EXIT',
    category: 'ABORT',
    label: 'User Exited',
    description: 'Mission was aborted by the user.',
  },
  ABORT_SYSTEM_ERROR: {
    code: 'ABORT_SYSTEM_ERROR',
    category: 'ABORT',
    label: 'System Error',
    description: 'Mission was aborted due to a system error.',
  },
};

// ============================================================================
// 2. MissionConfigV1 Schema
// ============================================================================

export type MissionMode = 'CHAT' | 'REAL_LIFE';

export type MissionLocationTag =
  | 'BAR'
  | 'CLUB'
  | 'CAFE'
  | 'STREET'
  | 'APP_CHAT'
  | 'HOME'
  | 'OFFICE'
  | 'OTHER';

export interface MissionConfigV1Dynamics {
  mode: MissionMode; // CHAT vs REAL_LIFE
  locationTag: MissionLocationTag;
  hasPerMessageTimer: boolean; // whether a timer is active at all
  defaultEntryRoute: 'TEXT_CHAT' | 'VOICE_SIM';
  // reserved for future tuning:
  // responsiveness, cooperation, questionFrequency, etc.
}

export type MissionObjectiveKind =
  | 'GET_NUMBER'
  | 'GET_INSTAGRAM'
  | 'GET_DATE_AGREEMENT'
  | 'FIX_AWKWARD_MOMENT'
  | 'HOLD_BOUNDARY'
  | 'PRACTICE_OPENING'
  | 'FREE_EXPLORATION'
  | 'CUSTOM';

export interface MissionConfigV1Objective {
  kind: MissionObjectiveKind;
  userTitle: string; // shown in mission UI
  userDescription: string; // short explanation of what the user should achieve
  // We intentionally do NOT embed full AI contract here, only meta.
}

export interface MissionConfigV1Difficulty {
  level: MissionDifficulty; // from @prisma/client
  recommendedMaxMessages?: number | null;
  recommendedSuccessScore?: number | null; // 0–100
  recommendedFailScore?: number | null; // 0–100
}

export interface MissionConfigV1Style {
  aiStyleKey: AiStyleKey; // maps to AiStyle
  styleIntensity?: 'SOFT' | 'NORMAL' | 'HARD';
}

export interface MissionConfigV1StatePolicy {
  maxMessages: number; // hard cap
  minMessagesBeforeEnd?: number | null;
  maxStrikes: number; // bad-move strikes
  timerSecondsPerMessage?: number | null;
  allowTimerExtension: boolean; // whether MORE_TIME powerup is allowed
  successScoreThreshold: number; // 0–100
  failScoreThreshold: number; // 0–100
  enableGateSequence: boolean;
  enableMoodCollapse: boolean;
  enableObjectiveAutoSuccess: boolean;
  allowedEndReasons: MissionEndReasonCode[]; // subset of the full enum
  endReasonPrecedence?: MissionEndReasonCode[] | null; // optional override; if missing, use global PRECEDENCE
}

export interface MissionConfigV1 {
  version: 1;
  dynamics: MissionConfigV1Dynamics;
  objective: MissionConfigV1Objective;
  difficulty: MissionConfigV1Difficulty;
  style: MissionConfigV1Style;
  statePolicy: MissionConfigV1StatePolicy;
}

// ============================================================================
// 3. Validation
// ============================================================================

export interface MissionConfigValidationError {
  path: string; // e.g. "aiContract.missionConfigV1.statePolicy.maxMessages"
  message: string; // human readable
}

const VALID_MISSION_MODES: MissionMode[] = ['CHAT', 'REAL_LIFE'];
const VALID_LOCATION_TAGS: MissionLocationTag[] = [
  'BAR',
  'CLUB',
  'CAFE',
  'STREET',
  'APP_CHAT',
  'HOME',
  'OFFICE',
  'OTHER',
];
const VALID_OBJECTIVE_KINDS: MissionObjectiveKind[] = [
  'GET_NUMBER',
  'GET_INSTAGRAM',
  'GET_DATE_AGREEMENT',
  'FIX_AWKWARD_MOMENT',
  'HOLD_BOUNDARY',
  'PRACTICE_OPENING',
  'FREE_EXPLORATION',
  'CUSTOM',
];
const VALID_DIFFICULTY_LEVELS: string[] = ['EASY', 'MEDIUM', 'HARD', 'ELITE'];
const VALID_AI_STYLE_KEYS: string[] = [
  'NEUTRAL',
  'FLIRTY',
  'PLAYFUL',
  'CHALLENGING',
  'WARM',
  'COLD',
  'SHY',
  'DIRECT',
  'JUDGMENTAL',
  'CHAOTIC',
];
const VALID_END_REASON_CODES: MissionEndReasonCode[] = [
  'SUCCESS_OBJECTIVE',
  'SUCCESS_GATE_SEQUENCE',
  'SUCCESS_SCORE_MILESTONE',
  'FAIL_OBJECTIVE',
  'FAIL_MAX_MESSAGES',
  'FAIL_TIMER_EXPIRED',
  'FAIL_TOO_MANY_STRIKES',
  'FAIL_GATE_SEQUENCE',
  'FAIL_MOOD_COLLAPSE',
  'ABORT_USER_EXIT',
  'ABORT_SYSTEM_ERROR',
];
const VALID_DEFAULT_ENTRY_ROUTES: string[] = ['TEXT_CHAT', 'VOICE_SIM'];
const VALID_STYLE_INTENSITIES: string[] = ['SOFT', 'NORMAL', 'HARD'];

function addError(
  errors: MissionConfigValidationError[],
  path: string,
  message: string,
): void {
  errors.push({ path, message });
}

function isValidString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidNumber(value: any, min?: number, max?: number): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

function isValidArray<T>(
  value: any,
  validator?: (item: any) => item is T,
): value is T[] {
  if (!Array.isArray(value)) return false;
  if (validator) {
    return value.every(validator);
  }
  return true;
}

export function validateMissionConfigV1Shape(
  aiContract: any,
): MissionConfigValidationError[] {
  const errors: MissionConfigValidationError[] = [];

  // Check aiContract is an object (not string, not array, not null)
  if (aiContract === null || aiContract === undefined) {
    addError(
      errors,
      'aiContract',
      'aiContract must be an object (not null or undefined)',
    );
    return errors; // Early return - can't validate further
  }

  if (typeof aiContract !== 'object' || Array.isArray(aiContract)) {
    addError(
      errors,
      'aiContract',
      'aiContract must be an object (not string or array)',
    );
    return errors; // Early return
  }

  // Check missionConfigV1 exists
  if (!('missionConfigV1' in aiContract)) {
    addError(
      errors,
      'aiContract.missionConfigV1',
      'missionConfigV1 is required',
    );
    return errors; // Early return
  }

  const config = aiContract.missionConfigV1;

  // Check missionConfigV1 is an object
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    addError(
      errors,
      'aiContract.missionConfigV1',
      'missionConfigV1 must be an object',
    );
    return errors; // Early return
  }

  // Validate version
  if (config.version !== 1) {
    addError(
      errors,
      'aiContract.missionConfigV1.version',
      'version must be 1',
    );
  }

  // Validate dynamics
  if (!config.dynamics || typeof config.dynamics !== 'object') {
    addError(
      errors,
      'aiContract.missionConfigV1.dynamics',
      'dynamics is required and must be an object',
    );
  } else {
    const dynamics = config.dynamics;
    if (!VALID_MISSION_MODES.includes(dynamics.mode)) {
      addError(
        errors,
        'aiContract.missionConfigV1.dynamics.mode',
        `mode must be one of: ${VALID_MISSION_MODES.join(', ')}`,
      );
    }
    if (!VALID_LOCATION_TAGS.includes(dynamics.locationTag)) {
      addError(
        errors,
        'aiContract.missionConfigV1.dynamics.locationTag',
        `locationTag must be one of: ${VALID_LOCATION_TAGS.join(', ')}`,
      );
    }
    if (typeof dynamics.hasPerMessageTimer !== 'boolean') {
      addError(
        errors,
        'aiContract.missionConfigV1.dynamics.hasPerMessageTimer',
        'hasPerMessageTimer must be a boolean',
      );
    }
    if (!VALID_DEFAULT_ENTRY_ROUTES.includes(dynamics.defaultEntryRoute)) {
      addError(
        errors,
        'aiContract.missionConfigV1.dynamics.defaultEntryRoute',
        `defaultEntryRoute must be one of: ${VALID_DEFAULT_ENTRY_ROUTES.join(', ')}`,
      );
    }
  }

  // Validate objective
  if (!config.objective || typeof config.objective !== 'object') {
    addError(
      errors,
      'aiContract.missionConfigV1.objective',
      'objective is required and must be an object',
    );
  } else {
    const objective = config.objective;
    if (!VALID_OBJECTIVE_KINDS.includes(objective.kind)) {
      addError(
        errors,
        'aiContract.missionConfigV1.objective.kind',
        `kind must be one of: ${VALID_OBJECTIVE_KINDS.join(', ')}`,
      );
    }
    if (!isValidString(objective.userTitle)) {
      addError(
        errors,
        'aiContract.missionConfigV1.objective.userTitle',
        'userTitle is required and must be a non-empty string',
      );
    }
    if (!isValidString(objective.userDescription)) {
      addError(
        errors,
        'aiContract.missionConfigV1.objective.userDescription',
        'userDescription is required and must be a non-empty string',
      );
    }
  }

  // Validate difficulty
  if (!config.difficulty || typeof config.difficulty !== 'object') {
    addError(
      errors,
      'aiContract.missionConfigV1.difficulty',
      'difficulty is required and must be an object',
    );
  } else {
    const difficulty = config.difficulty;
    if (
      !difficulty.level ||
      !VALID_DIFFICULTY_LEVELS.includes(String(difficulty.level))
    ) {
      addError(
        errors,
        'aiContract.missionConfigV1.difficulty.level',
        `level must be one of: ${VALID_DIFFICULTY_LEVELS.join(', ')}`,
      );
    }
    if (
      difficulty.recommendedMaxMessages !== undefined &&
      difficulty.recommendedMaxMessages !== null &&
      !isValidNumber(difficulty.recommendedMaxMessages, 1)
    ) {
      addError(
        errors,
        'aiContract.missionConfigV1.difficulty.recommendedMaxMessages',
        'recommendedMaxMessages must be a positive number or null',
      );
    }
    if (
      difficulty.recommendedSuccessScore !== undefined &&
      difficulty.recommendedSuccessScore !== null &&
      !isValidNumber(difficulty.recommendedSuccessScore, 0, 100)
    ) {
      addError(
        errors,
        'aiContract.missionConfigV1.difficulty.recommendedSuccessScore',
        'recommendedSuccessScore must be a number between 0 and 100, or null',
      );
    }
    if (
      difficulty.recommendedFailScore !== undefined &&
      difficulty.recommendedFailScore !== null &&
      !isValidNumber(difficulty.recommendedFailScore, 0, 100)
    ) {
      addError(
        errors,
        'aiContract.missionConfigV1.difficulty.recommendedFailScore',
        'recommendedFailScore must be a number between 0 and 100, or null',
      );
    }
  }

  // Validate style
  if (!config.style || typeof config.style !== 'object') {
    addError(
      errors,
      'aiContract.missionConfigV1.style',
      'style is required and must be an object',
    );
  } else {
    const style = config.style;
    if (!isValidString(style.aiStyleKey)) {
      addError(
        errors,
        'aiContract.missionConfigV1.style.aiStyleKey',
        'aiStyleKey is required and must be a non-empty string',
      );
    } else if (!VALID_AI_STYLE_KEYS.includes(style.aiStyleKey)) {
      addError(
        errors,
        'aiContract.missionConfigV1.style.aiStyleKey',
        `aiStyleKey must be one of: ${VALID_AI_STYLE_KEYS.join(', ')}`,
      );
    }
    if (
      style.styleIntensity !== undefined &&
      !VALID_STYLE_INTENSITIES.includes(style.styleIntensity)
    ) {
      addError(
        errors,
        'aiContract.missionConfigV1.style.styleIntensity',
        `styleIntensity must be one of: ${VALID_STYLE_INTENSITIES.join(', ')} or undefined`,
      );
    }
  }

  // Validate statePolicy
  if (!config.statePolicy || typeof config.statePolicy !== 'object') {
    addError(
      errors,
      'aiContract.missionConfigV1.statePolicy',
      'statePolicy is required and must be an object',
    );
  } else {
    const statePolicy = config.statePolicy;
    if (!isValidNumber(statePolicy.maxMessages, 1)) {
      addError(
        errors,
        'aiContract.missionConfigV1.statePolicy.maxMessages',
        'maxMessages is required and must be a positive number',
      );
    }
    if (
      statePolicy.minMessagesBeforeEnd !== undefined &&
      statePolicy.minMessagesBeforeEnd !== null &&
      !isValidNumber(statePolicy.minMessagesBeforeEnd, 0)
    ) {
      addError(
        errors,
        'aiContract.missionConfigV1.statePolicy.minMessagesBeforeEnd',
        'minMessagesBeforeEnd must be a non-negative number or null',
      );
    }
    if (!isValidNumber(statePolicy.maxStrikes, 0)) {
      addError(
        errors,
        'aiContract.missionConfigV1.statePolicy.maxStrikes',
        'maxStrikes is required and must be a non-negative number',
      );
    }
    if (
      statePolicy.timerSecondsPerMessage !== undefined &&
      statePolicy.timerSecondsPerMessage !== null &&
      !isValidNumber(statePolicy.timerSecondsPerMessage, 1)
    ) {
      addError(
        errors,
        'aiContract.missionConfigV1.statePolicy.timerSecondsPerMessage',
        'timerSecondsPerMessage must be a positive number or null',
      );
    }
    if (typeof statePolicy.allowTimerExtension !== 'boolean') {
      addError(
        errors,
        'aiContract.missionConfigV1.statePolicy.allowTimerExtension',
        'allowTimerExtension must be a boolean',
      );
    }
    if (!isValidNumber(statePolicy.successScoreThreshold, 0, 100)) {
      addError(
        errors,
        'aiContract.missionConfigV1.statePolicy.successScoreThreshold',
        'successScoreThreshold is required and must be a number between 0 and 100',
      );
    }
    if (!isValidNumber(statePolicy.failScoreThreshold, 0, 100)) {
      addError(
        errors,
        'aiContract.missionConfigV1.statePolicy.failScoreThreshold',
        'failScoreThreshold is required and must be a number between 0 and 100',
      );
    }
    if (typeof statePolicy.enableGateSequence !== 'boolean') {
      addError(
        errors,
        'aiContract.missionConfigV1.statePolicy.enableGateSequence',
        'enableGateSequence must be a boolean',
      );
    }
    if (typeof statePolicy.enableMoodCollapse !== 'boolean') {
      addError(
        errors,
        'aiContract.missionConfigV1.statePolicy.enableMoodCollapse',
        'enableMoodCollapse must be a boolean',
      );
    }
    if (typeof statePolicy.enableObjectiveAutoSuccess !== 'boolean') {
      addError(
        errors,
        'aiContract.missionConfigV1.statePolicy.enableObjectiveAutoSuccess',
        'enableObjectiveAutoSuccess must be a boolean',
      );
    }
    if (
      !isValidArray<MissionEndReasonCode>(
        statePolicy.allowedEndReasons,
        (item): item is MissionEndReasonCode =>
          VALID_END_REASON_CODES.includes(item),
      ) ||
      statePolicy.allowedEndReasons.length === 0
    ) {
      addError(
        errors,
        'aiContract.missionConfigV1.statePolicy.allowedEndReasons',
        'allowedEndReasons is required and must be a non-empty array of valid MissionEndReasonCode values',
      );
    } else {
      // Validate endReasonPrecedence if present
      if (statePolicy.endReasonPrecedence !== undefined) {
        if (statePolicy.endReasonPrecedence === null) {
          // null is allowed (means use global precedence)
        } else if (
          !isValidArray<MissionEndReasonCode>(
            statePolicy.endReasonPrecedence,
            (item): item is MissionEndReasonCode =>
              VALID_END_REASON_CODES.includes(item),
          )
        ) {
          addError(
            errors,
            'aiContract.missionConfigV1.statePolicy.endReasonPrecedence',
            'endReasonPrecedence must be an array of valid MissionEndReasonCode values or null',
          );
        } else {
          // Check that precedence is a subset of allowedEndReasons
          const invalidCodes = statePolicy.endReasonPrecedence.filter(
            (code) => !statePolicy.allowedEndReasons.includes(code),
          );
          if (invalidCodes.length > 0) {
            addError(
              errors,
              'aiContract.missionConfigV1.statePolicy.endReasonPrecedence',
              `endReasonPrecedence contains codes not in allowedEndReasons: ${invalidCodes.join(', ')}`,
            );
          }
        }
      }
    }
  }

  return errors;
}

