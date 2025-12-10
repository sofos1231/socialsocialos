// FILE: backend/src/modules/ai-engine/mission-state-v1.schema.ts
// Step 6.5: Mission State and Mood State Schemas
// Step 6.6: Extended with micro-dynamics
// Step 6.8: Extended with persona stability and modifiers

/**
 * Step 6.5: Mission Mood State
 * Tracks the emotional/relational state of the persona during the mission
 */
export interface MissionMoodStateV1 {
  currentMood:
    | 'warm'
    | 'neutral'
    | 'cold'
    | 'excited'
    | 'annoyed'
    | 'shy'
    | 'testing'
    | 'interested'
    | 'bored';
  positivityPct: number; // 0-100, derived from scores
  tensionLevel: number; // 0-1
  isStable: boolean; // Whether mood is stable or shifting
  lastChangeReason: string | null; // Why mood changed (e.g., "low_score", "negative_flag")
  lastChangedAt?: string | null; // ISO timestamp of last mood change
}

/**
 * Step 6.4: Gate State
 * Tracks which gates are met/unmet for the current mission
 */
export interface GateState {
  gates: Record<string, {
    passed: boolean;
    reasonCode?: string | null;
    evaluatedAt?: string | null;
  }>;
  allRequiredGatesMet: boolean; // True if all required gates for objective are met
  requiredGates: string[]; // List of gate keys required for current objective
  metGates: string[]; // List of gate keys that are currently met
  unmetGates: string[]; // List of gate keys that are currently unmet
}

/**
 * Step 6.8: Active modifier affecting persona behavior
 */
export interface ActiveModifier {
  key: string; // Unique identifier (e.g., "lowerRiskForNext3Turns")
  effect: string; // Effect type (e.g., "lowerWarmth", "reduceRisk")
  remainingTurns: number; // How many more messages this modifier applies
  appliedAt: string; // ISO timestamp when modifier was applied
  reason?: string | null; // Why this modifier was applied
}

/**
 * Step 6.5: Mission State
 * Overall mission state including mood, progress, stability, and gates
 * Step 6.6: Extended with micro-dynamics
 * Step 6.8: Extended with persona stability and modifiers
 */
export interface MissionStateV1 {
  mood: MissionMoodStateV1;
  progressPct: number; // 0-100
  successLikelihood: number; // 0-100, estimated chance of success
  stabilityScore: number; // 0-100, how stable the conversation is (score variance-based)
  messageCount: number; // Number of user messages so far
  averageScore: number; // Average score of user messages
  lastScore?: number | null; // Last user message score
  lastFlags?: string[] | null; // Flags from last message
  // Step 6.4: Gate state tracking
  gateState?: GateState | null; // Gate state for objective-based missions
  // Step 6.6: Micro-dynamics state (per-message dynamics lens)
  microDynamics?: import('./micro-dynamics.types').MicroDynamicsState | null;
  // Step 6.8: Persona stability and modifiers
  personaStability?: number | null; // 0-100, persona consistency with contract
  lastDriftReason?: string | null; // Reason for persona drift (if any)
  activeModifiers?: ActiveModifier[] | null; // Active modifiers affecting persona behavior
}

/**
 * Default initial mood state
 */
export function createDefaultMoodState(
  initMood?: 'warm' | 'neutral' | 'cold' | 'mysterious' | null,
): MissionMoodStateV1 {
  const moodMap: Record<string, MissionMoodStateV1['currentMood']> = {
    warm: 'warm',
    neutral: 'neutral',
    cold: 'cold',
    mysterious: 'neutral', // mysterious defaults to neutral
  };

  return {
    currentMood: initMood ? moodMap[initMood] || 'neutral' : 'neutral',
    positivityPct: initMood === 'warm' ? 70 : initMood === 'cold' ? 30 : 50,
    tensionLevel: 0.3,
    isStable: true,
    lastChangeReason: null,
    lastChangedAt: null,
  };
}

/**
 * Create default gate state
 */
export function createDefaultGateState(requiredGates: string[] = []): GateState {
  return {
    gates: {},
    allRequiredGatesMet: false,
    requiredGates: [...requiredGates],
    metGates: [],
    unmetGates: [...requiredGates],
  };
}

/**
 * Default initial mission state
 */
export function createDefaultMissionState(
  initMood?: 'warm' | 'neutral' | 'cold' | 'mysterious' | null,
  requiredGates?: string[] | null,
): MissionStateV1 {
  return {
    mood: createDefaultMoodState(initMood),
    progressPct: 0,
    successLikelihood: 50,
    stabilityScore: 80,
    messageCount: 0,
    averageScore: 0,
    lastScore: null,
    lastFlags: null,
    // Step 6.4: Initialize gate state if gates are required
    gateState: requiredGates && requiredGates.length > 0
      ? createDefaultGateState(requiredGates)
      : null,
  };
}

