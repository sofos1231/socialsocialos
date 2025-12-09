// backend/src/modules/traits/trait-adjuster.v1.ts
// Step 5.2: Trait deltas computer (deterministic)

import { createSeededPRNG } from '../insights/engine/insight-prng';

/**
 * Compute per-trait deltas for a mission
 * 
 * Deltas are small changes (±0.2 to ±1.5) that represent how traits shifted during the mission.
 * For long-term persistence, UserTraitScores handles the actual updates (Step 5.1).
 * 
 * @param currentSnapshot - Current trait snapshot from session
 * @param previousScores - Previous long-term scores (from UserTraitScores) or null
 * @param seed - Deterministic seed for fallback (if previousScores is null)
 * @returns Record of trait deltas (e.g., { confidence: 0.5, clarity: -0.2 })
 */
export function computeTraitDeltas(
  currentSnapshot: Record<string, number>,
  previousScores: Record<string, number> | null,
  seed: string,
): Record<string, number> {
  const deltas: Record<string, number> = {};
  const traitKeys = ['confidence', 'clarity', 'humor', 'tensionControl', 'emotionalWarmth', 'dominance'];

  if (previousScores) {
    // Compute deltas based on actual change
    for (const key of traitKeys) {
      const current = currentSnapshot[key] ?? 0;
      const previous = previousScores[key] ?? 0;
      
      // Delta = (current - previous) * 0.1 (scale to small range)
      let delta = (current - previous) * 0.1;
      
      // Clamp to ±1.5
      delta = Math.max(-1.5, Math.min(1.5, delta));
      
      // Round to 1 decimal place
      deltas[key] = Math.round(delta * 10) / 10;
    }
  } else {
    // First session: use seeded PRNG for small positive deltas (reward first completion)
    const rng = createSeededPRNG(seed);
    
    for (const key of traitKeys) {
      // Generate small positive delta (±0.5 range)
      // Slightly favor positive (0.3 to 0.5) to reward first completion
      const baseValue = rng() * 0.3 + 0.3; // Range: [0.3, 0.6)
      const delta = Math.round(baseValue * 10) / 10; // Round to 1 decimal
      deltas[key] = delta;
    }
  }

  return deltas;
}

