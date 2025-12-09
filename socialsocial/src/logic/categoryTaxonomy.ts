// socialsocial/src/logic/categoryTaxonomy.ts
// Step 5.4: Frontend category taxonomy (matches backend)

/**
 * Category keys - MUST match backend CategoryKey enum
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
 * Category display labels
 */
export const CategoryLabels: Record<CategoryKey, string> = {
  [CategoryKey.CONFIDENCE]: 'Confidence',
  [CategoryKey.HUMOR]: 'Humor',
  [CategoryKey.EMPATHY]: 'Empathy',
  [CategoryKey.CLARITY]: 'Clarity',
  [CategoryKey.TENSION]: 'Tension Control',
  [CategoryKey.DOMINANCE]: 'Dominance',
};

/**
 * Category icons (optional, for UI)
 */
export const CategoryIcons: Record<CategoryKey, string> = {
  [CategoryKey.CONFIDENCE]: '💪',
  [CategoryKey.HUMOR]: '😄',
  [CategoryKey.EMPATHY]: '❤️',
  [CategoryKey.CLARITY]: '💬',
  [CategoryKey.TENSION]: '⚡',
  [CategoryKey.DOMINANCE]: '👑',
};

