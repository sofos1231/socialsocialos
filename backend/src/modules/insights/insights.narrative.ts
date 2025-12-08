// backend/src/modules/insights/insights.narrative.ts
// Phase 1: Narrative insights generation (template-based, v1)

import { NarrativeInsights, SessionLabels, SessionTraitProfile } from './insights.types';
import { CharismaTraitKey } from '../ai/ai-scoring.types';

/**
 * Generate narrative insights from trait profile and labels
 */
export function generateNarrativeInsights(
  traitProfile: SessionTraitProfile,
  labels: SessionLabels,
  bestMessagesCount: number,
  worstMessagesCount: number,
  improvementTrend?: 'improving' | 'declining' | 'stable',
): NarrativeInsights {
  const insights: NarrativeInsights = {
    primaryInsight: '',
    secondaryInsight: undefined,
    actionableAdvice: undefined,
  };

  // Build primary insight
  const primaryParts: string[] = [];

  // Start with strengths if any
  if (labels.strengths.length > 0) {
    const topStrength = labels.strengths[0];
    const traitName = topStrength.replace('strong_', '').replace('excellent_', '');
    primaryParts.push(
      `You showed strong ${traitName === 'charisma' ? 'overall charisma' : traitName} throughout the conversation.`,
    );
  }

  // Add weaknesses if any
  if (labels.weaknesses.length > 0) {
    const topWeakness = labels.weaknesses[0];
    const traitName = topWeakness.replace('low_', '');
    primaryParts.push(
      `However, your ${traitName} could use improvement—this is a key area to focus on next time.`,
    );
  } else if (labels.strengths.length === 0) {
    primaryParts.push('Your performance was balanced across different traits.');
  }

  // Add best/worst message context
  if (bestMessagesCount > 0 && worstMessagesCount > 0) {
    primaryParts.push(
      `Your best moments demonstrated clear, confident communication, while some messages came across as less effective.`,
    );
  } else if (bestMessagesCount > 0) {
    primaryParts.push(`Your best messages showed excellent communication skills.`);
  }

  // Add improvement trend if available
  if (improvementTrend === 'improving') {
    primaryParts.push(`You improved significantly as the conversation progressed—great job!`);
  } else if (improvementTrend === 'declining') {
    primaryParts.push(
      `Your performance declined slightly toward the end—try to maintain consistency throughout.`,
    );
  }

  insights.primaryInsight = primaryParts.join(' ') || 'You completed the practice session.';

  // Secondary insight (optional) - focus on specific patterns
  if (labels.primaryLabels.length > 0) {
    const label = labels.primaryLabels[0];
    if (label === 'too_needy') {
      insights.secondaryInsight =
        'Some of your messages came across as seeking validation. Try to be more independent and confident in your approach.';
    } else if (label === 'high_charisma_low_warmth') {
      insights.secondaryInsight =
        'You have strong charisma and confidence, but adding more emotional warmth would make you even more effective.';
    } else if (label === 'consistent_clarity') {
      insights.secondaryInsight = 'You maintained clear, understandable communication throughout—this is a strength to build on.';
    }
  }

  // Actionable advice based on weaknesses
  if (labels.weaknesses.length > 0) {
    const topWeakness = labels.weaknesses[0];
    const traitName = topWeakness.replace('low_', '');

    const adviceMap: Partial<Record<CharismaTraitKey, string>> = {
      confidence:
        'Practice being more direct and assertive. Avoid filler words like "um" or "I think". State your intentions clearly.',
      clarity:
        'Focus on being more concise and direct. Get to the point faster and avoid overexplaining.',
      humor:
        'Try to lighten the mood occasionally with appropriate humor or playful comments. This helps build connection.',
      tensionControl:
        'Work on staying calm and composed. Avoid reacting defensively to challenging situations.',
      emotionalWarmth:
        'Add more personal touches to your messages. Show empathy and genuine interest in the other person.',
      dominance:
        'Practice taking more initiative in conversations. Lead the direction of the interaction rather than just responding.',
    };

    insights.actionableAdvice =
      adviceMap[traitName as CharismaTraitKey] ||
      `Focus on improving your ${traitName} by practicing more and getting feedback.`;
  } else if (labels.strengths.length > 0) {
    insights.actionableAdvice =
      'Continue building on your strengths while looking for opportunities to improve weaker areas.';
  }

  return insights;
}

