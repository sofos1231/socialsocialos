// backend/src/modules/stats/templates/signatureStyle.descriptions.ts
// Step 5.6: Deterministic signature style descriptions

import { TraitKey } from '../stats.types';

/**
 * Generate deterministic description for signature style based on dominant trait
 */
export function getSignatureStyleDescription(
  dominantTrait: TraitKey,
  mostCommonLabels: string[],
  mostCommonHooks: string[],
): string {
  const traitDescriptions: Record<TraitKey, string> = {
    confidence: 'Your communication style is marked by assertiveness and clear presence.',
    clarity: 'You prioritize clear, direct communication that gets to the point.',
    humor: 'You use humor effectively to connect and lighten interactions.',
    tensionControl: 'You handle challenging situations with composure and grace.',
    emotionalWarmth: 'Your interactions are characterized by empathy and genuine connection.',
    dominance: 'You naturally take leadership and set clear boundaries in conversations.',
  };

  const baseDescription = traitDescriptions[dominantTrait] || 'Your communication style is developing.';

  if (mostCommonHooks.length > 0) {
    return `${baseDescription} You frequently demonstrate: ${mostCommonHooks.slice(0, 2).join(', ')}.`;
  }

  return baseDescription;
}

