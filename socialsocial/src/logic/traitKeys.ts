// socialsocial/src/logic/traitKeys.ts
// Step 5.5: Trait key type safety (matches backend)

/**
 * Trait key type (must match backend CharismaTraitKey)
 */
export type TraitKey =
  | 'confidence'
  | 'clarity'
  | 'humor'
  | 'tensionControl'
  | 'emotionalWarmth'
  | 'dominance';

/**
 * All trait keys in fixed order
 */
export const TRAIT_KEYS: TraitKey[] = [
  'confidence',
  'clarity',
  'humor',
  'tensionControl',
  'emotionalWarmth',
  'dominance',
];

/**
 * Trait display labels
 */
export const TraitLabels: Record<TraitKey, string> = {
  confidence: 'Confidence',
  clarity: 'Clarity',
  humor: 'Humor',
  tensionControl: 'Tension Control',
  emotionalWarmth: 'Emotional Warmth',
  dominance: 'Dominance',
};

