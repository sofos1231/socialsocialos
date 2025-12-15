// backend/src/modules/engine-config/engine-config.types.ts
// Step 7.2: Engine Config types for global knobs

/**
 * Scoring profile - defines how messages are scored
 */
export interface EngineScoringProfile {
  code: string; // "DEFAULT_DATING_V1"
  name: string;
  description?: string;
  active: boolean;

  // Trait weights for charismaIndex calculation
  traitWeights: {
    confidence: number; // 0-1, sum should be ~1.0
    clarity: number;
    humor: number;
    tensionControl: number;
    emotionalWarmth: number;
    dominance: number;
  };

  // Base scoring thresholds
  lengthThresholds: {
    empty: number; // 0 chars
    veryShort: number; // <5 chars
    short: number; // <15 chars
    medium: number; // <40 chars
    long: number; // <80 chars
    veryLong: number; // >=80 chars
  };

  // Punctuation bonuses
  punctuationBonuses: {
    questionPerMark: number; // 2
    questionMax: number; // 10
    exclamationPerMark: number; // 3
    exclamationMax: number; // 12
  };

  // Position bonuses
  positionBonuses: number[]; // [0, 2, 4, 5] for indices 0, 1, 2, 3+

  // Rarity thresholds
  rarityThresholds: {
    sPlus: number; // 92
    s: number; // 84
    a: number; // 72
    b: number; // 58
    c: number; // <58 (not used, but kept for symmetry)
  };

  // Multipliers
  xpMultipliers: {
    sPlus: number; // 1.8
    s: number; // 1.5
    a: number; // 1.25
    b: number; // 1.0
    c: number; // 0.8
  };

  coinsMultipliers: {
    sPlus: number; // 1.7
    s: number; // 1.4
    a: number; // 1.2
    b: number; // 1.0
    c: number; // 0.7
  };

  // Base trait values (used when baseScore is not directly applied to a trait)
  traitBaseValues: {
    humor: number; // 40
    tensionControl: number; // 50
    emotionalWarmth: number; // 50
    dominance: number; // 50
  };

  // Pattern-based trait adjustments
  traitAdjustments: Array<{
    pattern: string; // "questionMark", "emoji", "softLanguage", "leadingLanguage", "warmWords"
    trait: string; // "confidence", "clarity", "humor", etc.
    value: number; // +10, -15, etc.
  }>;

  // Filler words
  fillerWords: string[]; // ['like', 'um', 'uh', ...]

  // Trait buckets (for trait level classification)
  traitBuckets: {
    [trait: string]: {
      veryLow: number; // 0-20
      low: number; // 20-40
      medium: number; // 40-60
      high: number; // 60-80
      veryHigh: number; // 80-100
    };
  };

  // Trait EMA alpha (for long-term trait updates)
  traitEmaAlpha: number; // default 0.3

  // Flags
  strictMode: boolean;
  softCoachingMode: boolean;
}

/**
 * Dynamics profile - defines AI persona behavior
 */
export interface EngineDynamicsProfile {
  code: string; // e.g. "COLD_APPROACH_EASY", "COLD_APPROACH_HARD", "NEUTRAL"
  name: string;
  description: string;
  active: boolean;

  // Dynamics values (0-100)
  pace: number;
  emojiDensity: number;
  flirtiveness: number;
  hostility: number;
  dryness: number;
  vulnerability: number;
  escalationSpeed: number;
  randomness: number;
}

/**
 * Micro-dynamics configuration - thresholds for risk/momentum/flow calculations
 */
export interface EngineMicroDynamicsConfig {
  // Risk index calculation
  risk: {
    baseRiskFromScore: { min: number; max: number }; // Score 0-50: min, Score 70-100: max
    tensionPenalty: { threshold: number; maxPenalty: number }; // Tension > threshold applies penalty
    difficultyAdjustments: { [key: string]: number }; // HARD: -15, MEDIUM: -5, etc.
    progressAdjustments: { early: number; late: number }; // Early (<30%): -10, Late (>70%): +10
  };
  // Momentum index calculation
  momentum: {
    scoreDeltaMultiplier: number; // 0.5
    gateProgressMultiplier: number; // 0.3
    moodBonuses: { positive: number; negative: number }; // +10, -10
    trendMultiplier: number; // 0.3
  };
  // Flow index calculation
  flow: {
    varianceToFlowMultiplier: number; // 2.0 (converts stdDev to flow reduction)
  };
}

/**
 * Persona drift configuration - thresholds for persona stability detection
 */
export interface EnginePersonaConfig {
  // Stability penalties for different drift types
  driftPenalties: {
    styleMoodConflict: number; // -20 for FLIRTY vs cold/annoyed
    styleMoodConflictMinor: number; // -15 for WARM vs cold
    dynamicsMoodConflict: number; // -15 for high flirtiveness vs cold/annoyed
    vulnerabilityMoodConflict: number; // -10 for high vulnerability vs cold
    scoreStyleConflict: number; // -15 for low scores with warm style/mood
    negativeFlagsConflict: number; // -10 for negative flags with positive style
  };
  // Modifier event thresholds
  modifierEvents: {
    tensionSpikeThreshold: number; // 0.7
    moodDropSeverity: { low: number; high: number }; // 0.6, 0.9
    scoreCollapseThreshold: number; // 30 point drop
    scoreCollapseSeverityDivisor: number; // 50
    negativeFlagsThreshold: number; // 2 flags
    negativeFlagsSeverityDivisor: number; // 3
  };
  // Modifier effects
  modifierEffects: {
    reduceRiskAmount: number; // -20
    lowerWarmthAmount: number; // -15
  };
}

/**
 * Gate configuration
 */
export interface EngineGateConfig {
  key: string; // gate key (e.g. "GATE_MIN_MESSAGES")
  description: string;
  active: boolean;

  // Gate-specific thresholds
  minMessages?: number; // For GATE_MIN_MESSAGES
  successThreshold?: number; // For GATE_SUCCESS_THRESHOLD
  failFloor?: number; // For GATE_FAIL_FLOOR
  minScore?: number; // Generic min score requirement
  requiredTraitLevels?: Array<{
    trait: string;
    min: number;
  }>;
  maxFailures?: number; // Max failures before gate fails
}

/**
 * Gate Requirement Template - defines which gates are required for a mission
 */
export interface EngineGateRequirementTemplate {
  code: string; // e.g. "BASIC_CHAT_FLOW", "QUALITY_THRESHOLD"
  name: string;
  description: string;
  active: boolean;
  requiredGates: string[]; // Array of GateKey strings (e.g. ["GATE_MIN_MESSAGES", "GATE_SUCCESS_THRESHOLD"])
}

/**
 * Mood configuration
 */
export interface EngineMoodConfig {
  // EMA smoothing constant
  emaAlpha: number; // default 0.35

  // Mood state classification thresholds
  moodStateThresholds: {
    flow: {
      minScore: number; // 80
      minFlow: number; // 70
      maxTension: number; // 40
    };
    tense: {
      minTension: number; // 70
      orLowScore: {
        maxScore: number; // 50
        minTension: number; // 50
      };
    };
    warm: {
      minScore: number; // 60
      maxScore: number; // 80
      minWarmth: number; // 50
    };
    cold: {
      maxScore: number; // 30
      maxWarmth: number; // 40
    };
  };

  // Mood bands (for state policy)
  bands: Array<{
    key: string; // e.g. "CRITICAL", "LOW", "OK", "HIGH"
    minPercent: number;
    maxPercent: number;
  }>;

  // Decay and boost/penalty
  decayPerTurn?: number; // How much mood decays per turn
  boostOnGoodMessage?: number; // Boost on good message
  penaltyOnBadMessage?: number; // Penalty on bad message
}

/**
 * State policy configuration
 */
export interface EngineStatePolicyConfig {
  // High-level flags for Step 6 "mission mood timeline/state"
  minMessagesForVerdict?: number;
  failOnThreeCriticalMessages?: boolean;
  allowRecoveryAfterFailGate?: boolean;
}

/**
 * Micro feedback configuration - per-score-band feedback messages
 */
export interface EngineMicroFeedbackConfig {
  bands: Array<{
    minScore: number;
    maxScore: number;
    rarity: string; // 'S+', 'S', 'A', 'B', 'C'
    message: string; // Default feedback text
    labelKey?: string; // Optional i18n key
  }>;
  // Special cases
  veryShortMessage?: string; // For messages < 5 chars
  defaultMessage?: string; // Fallback if no band matches
}

/**
 * Root EngineConfig JSON structure
 */
export interface EngineConfigJson {
  scoringProfiles: EngineScoringProfile[];
  defaultScoringProfileCode: string;

  dynamicsProfiles: EngineDynamicsProfile[];
  defaultDynamicsProfileCode: string;

  gates: EngineGateConfig[];

  gateRequirementTemplates: EngineGateRequirementTemplate[];

  mood: EngineMoodConfig;

  statePolicy: EngineStatePolicyConfig;

  microFeedback?: EngineMicroFeedbackConfig;

  microDynamics?: EngineMicroDynamicsConfig;

  persona?: EnginePersonaConfig;

  // Config Slots (stored in slots array, not in main config)
  slots?: Array<{
    name: string;
    createdAt: string;
    config: EngineConfigJson;
  }>;
}

