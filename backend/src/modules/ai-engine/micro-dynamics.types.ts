// backend/src/modules/ai-engine/micro-dynamics.types.ts
// Step 6.6: Micro-Dynamics Types

/**
 * Step 6.6: Micro-dynamics state computed per message
 * Provides lightweight "per-turn dynamics lens" for real-time adjustments
 */
export interface MicroDynamicsState {
  riskIndex: number; // 0-100: how risky the next reply should be
  momentumIndex: number; // 0-100: how "on a roll" this mission is
  flowIndex: number; // 0-100: per-message flow approximation
  computedAt: string; // ISO timestamp
}

/**
 * Step 6.6: Input context for micro-dynamics computation
 */
export interface MicroDynamicsContext {
  currentScore: number; // Last message score
  recentScores: number[]; // Last 2-3 message scores
  tensionLevel: number; // Current tension (0-1)
  moodState: string; // Current mood state
  difficultyLevel?: string | null; // Difficulty level (EASY/MEDIUM/HARD)
  progressPct: number; // Mission progress (0-100)
  gateProgress?: {
    metGates: string[];
    unmetGates: string[];
  } | null;
}

/**
 * Step 6.6: Future micro-gates evaluation result (stub for now)
 */
export interface MicroGatesResult {
  passed: boolean;
  blockedReasons: string[];
  // Future: can add more fields as micro-gates are implemented
}

