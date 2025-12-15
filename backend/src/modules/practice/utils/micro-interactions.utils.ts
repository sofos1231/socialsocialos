// FILE: backend/src/modules/practice/utils/micro-interactions.utils.ts
// Step 8: Helper functions for micro-interaction UX signals

/**
 * Step 8: Compute UI event hint based on score tier, flags, and boundary risk
 */
export function computeUiEventHint(
  localScoreTier: string | undefined,
  microFlags: string[] | undefined,
  boundaryRisk: string | undefined,
): 'celebration' | 'warning' | 'neutral' {
  // Celebration: S/S+ tier OR brilliant flag
  if (
    localScoreTier === 'S' ||
    localScoreTier === 'S+' ||
    (microFlags && microFlags.includes('brilliant'))
  ) {
    return 'celebration';
  }

  // Warning: High boundary risk OR needy flag
  if (boundaryRisk === 'high' || (microFlags && microFlags.includes('needy'))) {
    return 'warning';
  }

  return 'neutral';
}

/**
 * Step 8: Compute rarity based on score tier
 */
export function computeRarity(
  localScoreTier: string | undefined,
): 'common' | 'rare' | 'epic' {
  if (localScoreTier === 'S+' || localScoreTier === 'S') {
    return 'epic';
  }
  if (localScoreTier === 'A') {
    return 'rare';
  }
  return 'common';
}

