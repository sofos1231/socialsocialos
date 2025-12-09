// backend/src/modules/stats/templates/bias.explanations.ts
// Step 5.6: Deterministic bias explanations

/**
 * Generate deterministic explanation for a behavioral bias/pattern
 */
export function getBiasExplanation(biasKey: string, countThisWeek: number, deltaVsLastWeek: number | null): string {
  const explanations: Record<string, string> = {
    'PATTERN_FILLER_WORDS': 'Using filler words like "um" or "like" reduces clarity and confidence.',
    'PATTERN_LOW_CONFIDENCE': 'Messages show hesitation or uncertainty, impacting your presence.',
    'PATTERN_UNCLEAR': 'Communication lacks clarity, making it harder for others to understand your intent.',
    'PATTERN_OVEREXPLAINING': 'Providing too much detail can overwhelm listeners and reduce impact.',
    'PATTERN_UNDEREXPLAINING': 'Messages lack sufficient context, leaving listeners confused.',
    'PATTERN_EMOTIONAL_DISTANCE': 'Maintaining emotional distance can prevent deeper connections.',
    'PATTERN_TOO_FORMAL': 'Being overly formal can create barriers in casual interactions.',
    'PATTERN_TOO_CASUAL': 'Using overly casual language may not match the context or audience.',
    'PATTERN_DOMINANCE_ISSUE': 'Difficulty asserting boundaries or taking appropriate leadership.',
  };

  const baseExplanation = explanations[biasKey] || `Pattern ${biasKey} detected in your communication style.`;

  if (deltaVsLastWeek !== null) {
    if (deltaVsLastWeek > 0) {
      return `${baseExplanation} This pattern has increased this week (+${deltaVsLastWeek}).`;
    } else if (deltaVsLastWeek < 0) {
      return `${baseExplanation} This pattern has decreased this week (${deltaVsLastWeek}).`;
    }
  }

  if (countThisWeek > 0) {
    return `${baseExplanation} Occurred ${countThisWeek} time${countThisWeek !== 1 ? 's' : ''} this week.`;
  }

  return baseExplanation;
}

