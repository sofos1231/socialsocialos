// backend/src/modules/stats/templates/messageBreakdown.templates.ts
// Step 5.6: Deterministic message breakdown templates

import { TraitKey } from '../stats.types';

/**
 * Generate "why it worked" explanations deterministically
 */
export function generateWhyItWorked(
  score: number,
  traits: Record<TraitKey, number>,
  hooks: string[],
): string[] {
  const explanations: string[] = [];

  if (score >= 90) {
    explanations.push('Exceptional score - demonstrates mastery of social communication');
  } else if (score >= 75) {
    explanations.push('Strong performance with effective communication strategies');
  }

  // High trait explanations
  const highTraits: TraitKey[] = [];
  for (const [key, value] of Object.entries(traits)) {
    if (value >= 80) {
      highTraits.push(key as TraitKey);
    }
  }
  if (highTraits.length > 0) {
    const traitLabels: Record<TraitKey, string> = {
      confidence: 'Confidence',
      clarity: 'Clarity',
      humor: 'Humor',
      tensionControl: 'Tension Control',
      emotionalWarmth: 'Emotional Warmth',
      dominance: 'Dominance',
    };
    const labels = highTraits.map(t => traitLabels[t]).join(' and ');
    explanations.push(`Strong ${labels} traits contributed to success`);
  }

  // Hook explanations
  if (hooks.length > 0) {
    explanations.push(`Demonstrated positive patterns: ${hooks.slice(0, 2).join(', ')}`);
  }

  return explanations.slice(0, 3); // Max 3 explanations
}

/**
 * Generate "what to improve" suggestions deterministically
 */
export function generateWhatToImprove(
  score: number,
  traits: Record<TraitKey, number>,
  patterns: string[],
): string[] {
  const suggestions: string[] = [];

  if (score < 70) {
    suggestions.push('Focus on clarity and directness in your messages');
  }

  // Low trait suggestions
  const lowTraits: TraitKey[] = [];
  for (const [key, value] of Object.entries(traits)) {
    if (value < 60) {
      lowTraits.push(key as TraitKey);
    }
  }
  if (lowTraits.length > 0) {
    const traitLabels: Record<TraitKey, string> = {
      confidence: 'confidence',
      clarity: 'clarity',
      humor: 'humor',
      tensionControl: 'tension control',
      emotionalWarmth: 'emotional warmth',
      dominance: 'dominance',
    };
    const labels = lowTraits.slice(0, 2).map(t => traitLabels[t]).join(' and ');
    suggestions.push(`Work on improving ${labels}`);
  }

  // Pattern-based suggestions
  if (patterns.length > 0) {
    suggestions.push(`Address negative patterns: ${patterns.slice(0, 2).join(', ')}`);
  }

  return suggestions.slice(0, 3); // Max 3 suggestions
}

