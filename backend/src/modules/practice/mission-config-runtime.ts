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
    // Step 6.3: Openings layer
    openings: MissionConfigV1['openings'] | null;
    // Step 6.4: Response architecture
    responseArchitecture: MissionConfigV1['responseArchitecture'] | null;
    // Step 6.9: AI runtime profile
    aiRuntimeProfile: MissionConfigV1['aiRuntimeProfile'] | null;
  
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
  
    // Phase 2: Accept raw MissionConfigV1 format (wrap it internally)
    let wrappedContract: any;
    if ('missionConfigV1' in aiContractUnknown) {
      // Already wrapped
      wrappedContract = aiContractUnknown;
    } else {
      // Check if it's raw MissionConfigV1 (has version:1 and required fields)
      const raw = aiContractUnknown as any;
      if (
        raw.version === 1 &&
        typeof raw.dynamics === 'object' &&
        typeof raw.objective === 'object' &&
        typeof raw.difficulty === 'object' &&
        typeof raw.style === 'object' &&
        typeof raw.statePolicy === 'object'
      ) {
        // Wrap it internally
        wrappedContract = { missionConfigV1: raw };
      } else {
        // Not wrapped and not raw MissionConfigV1
        return { ok: false, reason: 'missing' };
      }
    }
  
    const validationErrors = validateMissionConfigV1Shape(wrappedContract);
    if (validationErrors.length > 0) {
      return { ok: false, reason: 'invalid', errors: validationErrors };
    }
  
    const config = (wrappedContract as any).missionConfigV1 as MissionConfigV1;
  
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
        // Step 6.1: Normalize dynamics tuning parameters
        pace: config.dynamics.pace ?? null,
        emojiDensity: config.dynamics.emojiDensity ?? null,
        flirtiveness: config.dynamics.flirtiveness ?? null,
        hostility: config.dynamics.hostility ?? null,
        dryness: config.dynamics.dryness ?? null,
        vulnerability: config.dynamics.vulnerability ?? null,
        escalationSpeed: config.dynamics.escalationSpeed ?? null,
        randomness: config.dynamics.randomness ?? null,
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
        // Step 6.2: Normalize difficulty tuning parameters
        strictness: config.difficulty.strictness ?? null,
        ambiguityTolerance: config.difficulty.ambiguityTolerance ?? null,
        emotionalPenalty: config.difficulty.emotionalPenalty ?? null,
        bonusForCleverness: config.difficulty.bonusForCleverness ?? null,
        failThreshold: config.difficulty.failThreshold ?? null,
        recoveryDifficulty: config.difficulty.recoveryDifficulty ?? null,
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
        // Step 6.10: Normalize feature toggles (all default to true for backward compatibility)
        enableMicroDynamics: config.statePolicy.enableMicroDynamics ?? true,
        enableModifiers: config.statePolicy.enableModifiers ?? true,
        enableArcDetection: config.statePolicy.enableArcDetection ?? true,
        enablePersonaDriftDetection: config.statePolicy.enablePersonaDriftDetection ?? true,
      },

      // Step 6.3: Normalize openings (optional)
      openings: config.openings ?? null,

      // Step 6.4: Normalize response architecture (optional)
      responseArchitecture: config.responseArchitecture ?? null,

      // Step 6.9: Normalize AI runtime profile (optional)
      aiRuntimeProfile: config.aiRuntimeProfile ?? null,
  
      endReasonPrecedenceResolved,
    };
    
    // Step 7.2: Preserve dynamicsProfileCode, scoringProfileCode, and gateRequirementTemplateCode for runtime use
    // (These are not part of NormalizedMissionConfigV1 but are used by services)
    if (config.dynamicsProfileCode !== undefined || config.scoringProfileCode !== undefined || config.gateRequirementTemplateCode !== undefined) {
      (normalized as any).dynamicsProfileCode = config.dynamicsProfileCode ?? null;
      (normalized as any).scoringProfileCode = config.scoringProfileCode ?? null;
      (normalized as any).gateRequirementTemplateCode = config.gateRequirementTemplateCode ?? null;
    }
  
    return { ok: true, value: normalized };
  }
  
