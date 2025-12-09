// backend/src/modules/stats/bias/bias.config.ts
// Step 5.6: Bias key definitions and mappings

/**
 * All recognized bias keys (patterns/hooks/flags that map to behavioral biases)
 */
export const BIAS_KEYS = [
  'PATTERN_FILLER_WORDS',
  'PATTERN_LOW_CONFIDENCE',
  'PATTERN_UNCLEAR',
  'PATTERN_OVEREXPLAINING',
  'PATTERN_UNDEREXPLAINING',
  'PATTERN_EMOTIONAL_DISTANCE',
  'PATTERN_TOO_FORMAL',
  'PATTERN_TOO_CASUAL',
  'PATTERN_DOMINANCE_ISSUE',
] as const;

export type BiasKey = typeof BIAS_KEYS[number];

/**
 * Map pattern keys from ChatMessage.traitData.patterns to biasKey
 * Patterns are already in the correct format (e.g., "PATTERN_FILLER_WORDS")
 */
export function mapPatternToBiasKey(patternKey: string): BiasKey | null {
  if (BIAS_KEYS.includes(patternKey as BiasKey)) {
    return patternKey as BiasKey;
  }
  return null;
}

/**
 * Map hook keys from ChatMessage.traitData.hooks to biasKey
 * Some hooks may indicate positive patterns, but we focus on negative biases here
 */
export function mapHookToBiasKey(hookKey: string): BiasKey | null {
  // Most hooks are positive, but some may indicate issues
  // For now, hooks don't map to biases (they're positive signals)
  return null;
}

/**
 * Map flag keys from ChatMessage.traitData.flags to biasKey
 */
export function mapFlagToBiasKey(flagKey: string): BiasKey | null {
  const flagToBiasMap: Record<string, BiasKey> = {
    'neediness': 'PATTERN_LOW_CONFIDENCE',
    'overexplaining': 'PATTERN_OVEREXPLAINING',
    'unclear': 'PATTERN_UNCLEAR',
    'emotional_distance': 'PATTERN_EMOTIONAL_DISTANCE',
    'too_formal': 'PATTERN_TOO_FORMAL',
    'too_casual': 'PATTERN_TOO_CASUAL',
  };
  
  return flagToBiasMap[flagKey] || null;
}

/**
 * Get all bias keys from a message's traitData
 */
export function extractBiasKeysFromTraitData(traitData: {
  patterns?: string[];
  hooks?: string[];
  flags?: string[];
}): BiasKey[] {
  const biasKeys = new Set<BiasKey>();
  
  // Extract from patterns
  if (Array.isArray(traitData.patterns)) {
    for (const pattern of traitData.patterns) {
      const biasKey = mapPatternToBiasKey(pattern);
      if (biasKey) {
        biasKeys.add(biasKey);
      }
    }
  }
  
  // Extract from flags
  if (Array.isArray(traitData.flags)) {
    for (const flag of traitData.flags) {
      const biasKey = mapFlagToBiasKey(flag);
      if (biasKey) {
        biasKeys.add(biasKey);
      }
    }
  }
  
  return Array.from(biasKeys);
}

