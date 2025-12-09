// backend/src/modules/analytics/category-taxonomy.ts
// Step 5.4: Shared category taxonomy (used by badges + 5.5 trait bars)

/**
 * Category keys - MUST be consistent across backend and frontend
 */
export enum CategoryKey {
  CONFIDENCE = 'CONFIDENCE',
  HUMOR = 'HUMOR',
  EMPATHY = 'EMPATHY',
  CLARITY = 'CLARITY',
  TENSION = 'TENSION',
  DOMINANCE = 'DOMINANCE',
}

/**
 * Map hook keys to category keys
 */
export function getCategoryForHook(hookKey: string): CategoryKey | null {
  const mapping: Record<string, CategoryKey> = {
    'HOOK_CONFIDENT_TONE': CategoryKey.CONFIDENCE,
    'HOOK_CHARISMATIC': CategoryKey.CONFIDENCE,
    'HOOK_STRONG_OPENER': CategoryKey.CONFIDENCE,
    'HOOK_CONSISTENT_PERFORMANCE': CategoryKey.CONFIDENCE,
    'HOOK_HIGH_HUMOR': CategoryKey.HUMOR,
    'HOOK_EMOTIONAL_WARMTH': CategoryKey.EMPATHY,
    'HOOK_CLEAR_COMMUNICATION': CategoryKey.CLARITY,
    'HOOK_RECOVERY_MOMENT': CategoryKey.CONFIDENCE,
  };
  return mapping[hookKey] || null;
}

/**
 * Map pattern keys to category keys
 */
export function getCategoryForPattern(patternKey: string): CategoryKey | null {
  const mapping: Record<string, CategoryKey> = {
    'PATTERN_LOW_CONFIDENCE': CategoryKey.CONFIDENCE,
    'PATTERN_FILLER_WORDS': CategoryKey.CLARITY,
    'PATTERN_UNCLEAR': CategoryKey.CLARITY,
    'PATTERN_OVEREXPLAINING': CategoryKey.CLARITY,
    'PATTERN_UNDEREXPLAINING': CategoryKey.CLARITY,
    'PATTERN_EMOTIONAL_DISTANCE': CategoryKey.EMPATHY,
    'PATTERN_TOO_FORMAL': CategoryKey.CONFIDENCE,
    'PATTERN_TOO_CASUAL': CategoryKey.CONFIDENCE,
    'PATTERN_DOMINANCE_ISSUE': CategoryKey.DOMINANCE,
  };
  return mapping[patternKey] || null;
}

/**
 * Map trait keys to category keys
 */
export function getCategoryForTrait(traitKey: string): CategoryKey | null {
  const mapping: Record<string, CategoryKey> = {
    'confidence': CategoryKey.CONFIDENCE,
    'humor': CategoryKey.HUMOR,
    'emotionalWarmth': CategoryKey.EMPATHY,
    'clarity': CategoryKey.CLARITY,
    'tensionControl': CategoryKey.TENSION,
    'dominance': CategoryKey.DOMINANCE,
  };
  return mapping[traitKey] || null;
}

