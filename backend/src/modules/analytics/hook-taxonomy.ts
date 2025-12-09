// backend/src/modules/analytics/hook-taxonomy.ts
// Step 5.1: Hook and Pattern taxonomy for deterministic message classification

/**
 * Hook keys - deterministic positive signals derived from traits, labels, or scores
 * These are used to identify positive patterns in user messages
 */
export type HookKey =
  | 'HOOK_CONFIDENT_TONE'
  | 'HOOK_HIGH_HUMOR'
  | 'HOOK_EMOTIONAL_WARMTH'
  | 'HOOK_CLEAR_COMMUNICATION'
  | 'HOOK_CHARISMATIC'
  | 'HOOK_STRONG_OPENER'
  | 'HOOK_RECOVERY_MOMENT'
  | 'HOOK_CONSISTENT_PERFORMANCE';

/**
 * Pattern keys - deterministic negative patterns derived from flags
 * These are used to identify areas for improvement
 */
export type PatternKey =
  | 'PATTERN_OVEREXPLAINING'
  | 'PATTERN_UNDEREXPLAINING'
  | 'PATTERN_FILLER_WORDS'
  | 'PATTERN_LOW_CONFIDENCE'
  | 'PATTERN_UNCLEAR'
  | 'PATTERN_TOO_FORMAL'
  | 'PATTERN_TOO_CASUAL'
  | 'PATTERN_EMOTIONAL_DISTANCE'
  | 'PATTERN_DOMINANCE_ISSUE';

/**
 * Derives hook keys from message traits, label, and score
 * Deterministic algorithm: checks trait thresholds and label indicators
 * 
 * @param traits - Trait values (e.g., { confidence: 75, humor: 80 })
 * @param label - Optional label string (e.g., "charismatic", "strong opener")
 * @param score - Optional normalized score (0-100)
 * @returns Array of hook keys that match
 */
export function deriveHooks(params: {
  traits: Record<string, number>;
  label?: string | null;
  score?: number | null;
}): HookKey[] {
  const { traits, label, score } = params;
  const hooks: HookKey[] = [];

  // Trait-based hooks (threshold-based)
  if (typeof traits.confidence === 'number' && traits.confidence >= 75) {
    hooks.push('HOOK_CONFIDENT_TONE');
  }

  if (typeof traits.humor === 'number' && traits.humor >= 70) {
    hooks.push('HOOK_HIGH_HUMOR');
  }

  if (typeof traits.emotionalWarmth === 'number' && traits.emotionalWarmth >= 75) {
    hooks.push('HOOK_EMOTIONAL_WARMTH');
  }

  if (typeof traits.clarity === 'number' && traits.clarity >= 80) {
    hooks.push('HOOK_CLEAR_COMMUNICATION');
  }

  // Charisma composite (multiple high traits)
  const highTraitCount =
    (typeof traits.confidence === 'number' && traits.confidence >= 70 ? 1 : 0) +
    (typeof traits.humor === 'number' && traits.humor >= 70 ? 1 : 0) +
    (typeof traits.emotionalWarmth === 'number' && traits.emotionalWarmth >= 70 ? 1 : 0);
  if (highTraitCount >= 2) {
    hooks.push('HOOK_CHARISMATIC');
  }

  // Label-based hooks
  if (label) {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('opener') || lowerLabel.includes('strong start')) {
      hooks.push('HOOK_STRONG_OPENER');
    }
    if (lowerLabel.includes('recovery') || lowerLabel.includes('bounce back')) {
      hooks.push('HOOK_RECOVERY_MOMENT');
    }
  }

  // Score-based hooks
  if (typeof score === 'number' && score >= 80) {
    hooks.push('HOOK_CONSISTENT_PERFORMANCE');
  }

  // Remove duplicates
  return Array.from(new Set(hooks));
}

/**
 * Mapping from raw flag strings to normalized pattern keys
 * TODO: Expand this mapping as more flags are identified
 */
const FLAG_TO_PATTERN_MAP: Record<string, PatternKey> = {
  overexplaining: 'PATTERN_OVEREXPLAINING',
  overexplain: 'PATTERN_OVEREXPLAINING',
  verbose: 'PATTERN_OVEREXPLAINING',
  underexplaining: 'PATTERN_UNDEREXPLAINING',
  underexplain: 'PATTERN_UNDEREXPLAINING',
  too_short: 'PATTERN_UNDEREXPLAINING',
  filler_words: 'PATTERN_FILLER_WORDS',
  fillers: 'PATTERN_FILLER_WORDS',
  um_uh: 'PATTERN_FILLER_WORDS',
  low_confidence: 'PATTERN_LOW_CONFIDENCE',
  unconfident: 'PATTERN_LOW_CONFIDENCE',
  unclear: 'PATTERN_UNCLEAR',
  confusing: 'PATTERN_UNCLEAR',
  too_formal: 'PATTERN_TOO_FORMAL',
  formal: 'PATTERN_TOO_FORMAL',
  too_casual: 'PATTERN_TOO_CASUAL',
  casual: 'PATTERN_TOO_CASUAL',
  emotional_distance: 'PATTERN_EMOTIONAL_DISTANCE',
  distant: 'PATTERN_EMOTIONAL_DISTANCE',
  dominance_issue: 'PATTERN_DOMINANCE_ISSUE',
  too_dominant: 'PATTERN_DOMINANCE_ISSUE',
  too_submissive: 'PATTERN_DOMINANCE_ISSUE',
};

/**
 * Derives pattern keys from message flags
 * Maps raw flag strings to normalized pattern keys
 * 
 * @param flags - Array of raw flag strings (e.g., ["overexplaining", "filler_words"])
 * @returns Array of normalized pattern keys
 */
export function derivePatterns(flags: string[]): PatternKey[] {
  if (!Array.isArray(flags)) {
    return [];
  }

  const patterns = new Set<PatternKey>();

  for (const flag of flags) {
    if (typeof flag !== 'string') {
      continue;
    }

    // Direct mapping
    const normalized = flag.toLowerCase().trim();
    const pattern = FLAG_TO_PATTERN_MAP[normalized];
    if (pattern) {
      patterns.add(pattern);
    }

    // Partial matching for compound flags (e.g., "has_filler_words" -> "filler_words")
    for (const [flagKey, patternKey] of Object.entries(FLAG_TO_PATTERN_MAP)) {
      if (normalized.includes(flagKey)) {
        patterns.add(patternKey);
      }
    }
  }

  return Array.from(patterns);
}

