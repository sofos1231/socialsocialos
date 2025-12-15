// backend/src/modules/stats/config/stats.config.ts
// Step 5.6: Stats configuration constants

/**
 * @deprecated - Phase 3: Hall of Fame now uses checklist criteria instead of numeric threshold
 * Kept for backward compatibility and as a fallback tie-breaker
 */
export const HALL_OF_FAME_SCORE_THRESHOLD = 90;

/**
 * Phase 3: Hall of Fame checklist-based selection criteria
 * Messages must meet these criteria to be eligible for Hall of Fame
 */
import { MessageChecklistFlag } from '../../sessions/scoring';

export const HOF_CRITERIA = {
  minTier: 'S+' as const,
  requiredFlags: [MessageChecklistFlag.POSITIVE_HOOK_HIT, MessageChecklistFlag.OBJECTIVE_PROGRESS] as MessageChecklistFlag[],
  bonusFlags: [MessageChecklistFlag.MULTIPLE_HOOKS_HIT] as MessageChecklistFlag[],
};

/**
 * Maximum number of sessions to include in message evolution timeline
 */
export const MESSAGE_EVOLUTION_MAX_SESSIONS = 20;

/**
 * Number of weeks to include in trending traits heatmap
 */
export const TRENDING_TRAITS_WEEKS = 12;

/**
 * Maximum number of Hall of Fame messages to return
 */
export const HALL_OF_FAME_MAX_RESULTS = 20;

