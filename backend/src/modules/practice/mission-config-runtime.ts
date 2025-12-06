// FILE: backend/src/modules/practice/mission-config-runtime.ts
// Phase 1 / Step 1: Runtime normalization of MissionConfigV1 for practice sessions

import {
    MissionConfigV1,
    MissionEndReasonCode,
    MISSION_END_REASON_PRECEDENCE,
    validateMissionConfigV1Shape,
    type MissionConfigValidationError,
  } from '../missions-admin/mission-config-v1.schema';
  
  /**
   * JSON-safe normalized mission config snapshot.
   * Stored in session.payload for persistence across continuations.
   */
  export interface NormalizedMissionConfigV1 {
    version: 1;
    dynamics: MissionConfigV1['dynamics'];
    objective: MissionConfigV1['objective'];
    difficulty: MissionConfigV1['difficulty'];
    style: MissionConfigV1['style'];
    statePolicy: MissionConfigV1['statePolicy'];
  
    /**
     * Resolved end reason precedence: uses statePolicy.endReasonPrecedence if provided,
     * otherwise falls back to global MISSION_END_REASON_PRECEDENCE.
     */
    endReasonPrecedenceResolved: MissionEndReasonCode[];
  }
  
  export type NormalizeResult =
    | { ok: true; value: NormalizedMissionConfigV1 }
    | {
        ok: false;
        reason: 'missing' | 'invalid' | 'not_object';
        errors?: MissionConfigValidationError[];
      };
  
  function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.prototype.toString.call(value) === '[object Object]'
    );
  }
  
  /**
   * Normalizes aiContract.missionConfigV1 into a runtime-friendly, JSON-safe snapshot.
   * - Accepts only plain objects (guards Prisma JsonValue weirdness)
   * - Validates via Phase 0 validator
   * - Produces JSON-only output (no Set/Map/functions)
   * 
   * Expected input shape: { missionConfigV1: { version: 1, dynamics: {...}, ... } }
   * 
   * IDEMPOTENCY: This function is idempotent. Passing a previously normalized config
   * (wrapped in { missionConfigV1: {...} }) will validate and normalize again, producing
   * the same result. This allows safe re-normalization at different stages (admin save,
   * mission start, session runtime) without data corruption.
   */
  export function normalizeMissionConfigV1(
    aiContractUnknown: unknown,
  ): NormalizeResult {
    if (!isPlainObject(aiContractUnknown)) {
      return { ok: false, reason: 'not_object' };
    }
  
    if (!('missionConfigV1' in aiContractUnknown)) {
      return { ok: false, reason: 'missing' };
    }
  
    const validationErrors = validateMissionConfigV1Shape(aiContractUnknown);
    if (validationErrors.length > 0) {
      return { ok: false, reason: 'invalid', errors: validationErrors };
    }
  
    const config = (aiContractUnknown as any).missionConfigV1 as MissionConfigV1;
  
    const override = config.statePolicy.endReasonPrecedence;
    const endReasonPrecedenceResolved: MissionEndReasonCode[] =
      Array.isArray(override) && override.length > 0
        ? [...override]
        : [...MISSION_END_REASON_PRECEDENCE];
  
    const style: MissionConfigV1['style'] = config.style.styleIntensity
      ? { aiStyleKey: config.style.aiStyleKey, styleIntensity: config.style.styleIntensity }
      : { aiStyleKey: config.style.aiStyleKey };
  
    const normalized: NormalizedMissionConfigV1 = {
      version: config.version,
  
      dynamics: {
        mode: config.dynamics.mode,
        locationTag: config.dynamics.locationTag,
        hasPerMessageTimer: config.dynamics.hasPerMessageTimer,
        defaultEntryRoute: config.dynamics.defaultEntryRoute,
      },
  
      objective: {
        kind: config.objective.kind,
        userTitle: config.objective.userTitle,
        userDescription: config.objective.userDescription,
      },
  
      difficulty: {
        level: config.difficulty.level,
        recommendedMaxMessages: config.difficulty.recommendedMaxMessages ?? null,
        recommendedSuccessScore: config.difficulty.recommendedSuccessScore ?? null,
        recommendedFailScore: config.difficulty.recommendedFailScore ?? null,
      },
  
      style,
  
      statePolicy: {
        maxMessages: config.statePolicy.maxMessages,
        minMessagesBeforeEnd: config.statePolicy.minMessagesBeforeEnd ?? null,
        maxStrikes: config.statePolicy.maxStrikes,
        timerSecondsPerMessage: config.statePolicy.timerSecondsPerMessage ?? null,
        allowTimerExtension: config.statePolicy.allowTimerExtension,
        successScoreThreshold: config.statePolicy.successScoreThreshold,
        failScoreThreshold: config.statePolicy.failScoreThreshold,
        enableGateSequence: config.statePolicy.enableGateSequence,
        enableMoodCollapse: config.statePolicy.enableMoodCollapse,
        enableObjectiveAutoSuccess: config.statePolicy.enableObjectiveAutoSuccess,
        allowedEndReasons: [...config.statePolicy.allowedEndReasons],
        endReasonPrecedence: Array.isArray(config.statePolicy.endReasonPrecedence)
          ? [...config.statePolicy.endReasonPrecedence]
          : (config.statePolicy.endReasonPrecedence ?? null),
      },
  
      endReasonPrecedenceResolved,
    };
  
    return { ok: true, value: normalized };
  }
  
