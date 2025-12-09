// backend/src/modules/analyzer/templates/deepParagraph.registry.ts
// Step 5.7: Deep paragraph registry with deterministic selection
// Glue for Step 5.8: Stable IDs for cooldown tracking

import { MessageBreakdownDTO } from '../../stats/stats.types';
import { DeepParagraphDTO } from '../analyzer.types';

/**
 * Step 5.7: Deep paragraph template interface
 */
interface DeepParagraphTemplate {
  id: string; // stable ID, never changes (glue for 5.8)
  category: 'strengths' | 'improvement' | 'patterns' | 'insights';
  title: string;
  body: (ctx: {
    score: number;
    traits: Record<string, number>;
    hooks: string[];
    patterns: string[];
  }) => string;
}

/**
 * Step 5.7: Deep paragraph templates (~13 deterministic templates)
 */
const DEEP_PARAGRAPH_TEMPLATES: DeepParagraphTemplate[] = [
  // High-score strengths
  {
    id: 'deep_high_score_confidence',
    category: 'strengths',
    title: 'Confidence That Resonates',
    body: (ctx) =>
      `Your message demonstrates exceptional confidence (${ctx.traits.confidence}/100), which creates a strong presence. This level of assertiveness helps you communicate your ideas clearly and makes others take notice. Confidence is contagious—when you project it, others respond with respect and engagement.`,
  },
  {
    id: 'deep_high_score_warmth',
    category: 'strengths',
    title: 'Emotional Connection',
    body: (ctx) =>
      `Your emotional warmth (${ctx.traits.emotionalWarmth}/100) shines through in this message. You're creating genuine connections by showing empathy and understanding. This trait is crucial for building lasting relationships and making others feel valued.`,
  },
  {
    id: 'deep_high_score_clarity',
    category: 'strengths',
    title: 'Crystal Clear Communication',
    body: (ctx) =>
      `Your clarity (${ctx.traits.clarity}/100) ensures your message is easily understood. Clear communication reduces misunderstandings and builds trust. You're making it easy for others to follow your thoughts and respond appropriately.`,
  },
  {
    id: 'deep_high_score_humor',
    category: 'strengths',
    title: 'Humor That Connects',
    body: (ctx) =>
      `Your use of humor (${ctx.traits.humor}/100) adds lightness and connection to your message. Appropriate humor breaks down barriers and makes interactions more enjoyable. You're using this tool effectively to build rapport.`,
  },
  {
    id: 'deep_high_score_mastery',
    category: 'strengths',
    title: 'Masterful Communication',
    body: (ctx) =>
      `With a score of ${ctx.score}/100, this message demonstrates mastery of social communication. Your balanced approach across multiple traits shows you understand how to adapt your style to different situations. This is the mark of a skilled communicator.`,
  },

  // Medium-score insights
  {
    id: 'deep_medium_insight_balance',
    category: 'insights',
    title: 'Finding Your Balance',
    body: (ctx) =>
      `Your message shows a solid foundation (score: ${ctx.score}/100) with room to grow. The key is finding the right balance between being assertive and being approachable. Consider how you can strengthen your weaker traits while maintaining your strengths.`,
  },
  {
    id: 'deep_medium_insight_adaptation',
    category: 'insights',
    title: 'Adaptive Communication',
    body: (ctx) =>
      `This message reflects a developing communication style. Your score of ${ctx.score}/100 suggests you're on the right track, but there's potential to elevate your impact. Focus on understanding your audience and adjusting your approach accordingly.`,
  },

  // Low-score improvement
  {
    id: 'deep_low_score_foundation',
    category: 'improvement',
    title: 'Building Strong Foundations',
    body: (ctx) =>
      `With a score of ${ctx.score}/100, this message shows areas for significant improvement. Start by focusing on clarity and confidence—these are foundational traits that support everything else. Practice being more direct and assertive in your communication.`,
  },
  {
    id: 'deep_low_score_engagement',
    category: 'improvement',
    title: 'Increasing Engagement',
    body: (ctx) =>
      `Your message needs more energy and engagement. A score of ${ctx.score}/100 suggests you're holding back. Try to express more enthusiasm, ask questions, and show genuine interest in the conversation. Engagement is a skill that improves with practice.`,
  },

  // Pattern-based tips
  {
    id: 'deep_pattern_filler_words',
    category: 'patterns',
    title: 'Reducing Filler Words',
    body: (ctx) =>
      `Your message shows patterns that reduce clarity. Filler words like "um," "like," or "you know" weaken your message. Practice pausing instead of filling silence—this makes you sound more confident and thoughtful.`,
  },
  {
    id: 'deep_pattern_overexplaining',
    category: 'patterns',
    title: 'Avoiding Over-Explanation',
    body: (ctx) =>
      `You're providing more detail than necessary, which can overwhelm your listener. Practice being concise—get to the point faster and trust that others will ask for clarification if needed. Less is often more in communication.`,
  },
  {
    id: 'deep_pattern_confidence_issue',
    category: 'patterns',
    title: 'Building Assertiveness',
    body: (ctx) =>
      `Your message shows hesitation or uncertainty. Work on stating your opinions and needs more directly. Confidence comes from practice—start with small assertions and build from there. You have valuable things to say.`,
  },

  // Hook-based strengths
  {
    id: 'deep_hook_positive_patterns',
    category: 'strengths',
    title: 'Positive Patterns in Action',
    body: (ctx) =>
      `Your message demonstrates positive communication patterns: ${ctx.hooks.slice(0, 3).join(', ')}. These patterns show you're using effective communication strategies. Keep leveraging these strengths—they're working well for you.`,
  },

  // Trait combination insights
  {
    id: 'deep_trait_combination_power',
    category: 'insights',
    title: 'The Power of Trait Combinations',
    body: (ctx) => {
      const topTraits = Object.entries(ctx.traits)
        .filter(([_, v]) => v >= 70)
        .map(([k, _]) => k)
        .slice(0, 2);
      if (topTraits.length >= 2) {
        return `Your combination of strong ${topTraits[0]} and ${topTraits[1]} creates a powerful communication style. When these traits work together, they amplify each other's impact. This is a signature strength you can leverage in future interactions.`;
      }
      return `Your trait profile shows potential for growth. Focus on developing one or two key traits to a high level, then let them support the others. Strong traits create a foundation for overall improvement.`;
    },
  },
];

/**
 * Step 5.7: Select deep paragraphs deterministically
 * Glue for Step 5.8: Excludes paragraphs by ID for cooldown
 */
export function selectDeepParagraphs(
  breakdown: MessageBreakdownDTO,
  excludedIds: string[] = [],
): DeepParagraphDTO[] {
  // Filter out excluded templates
  let candidates = DEEP_PARAGRAPH_TEMPLATES.filter(
    (t) => !excludedIds.includes(t.id),
  );

  // If all filtered out, fall back to using all templates
  if (candidates.length === 0) {
    candidates = DEEP_PARAGRAPH_TEMPLATES;
  }

  const selected: DeepParagraphDTO[] = [];
  const selectedIds = new Set<string>();

  // Deterministic selection logic
  const ctx = {
    score: breakdown.score,
    traits: breakdown.traits,
    hooks: breakdown.hooks,
    patterns: breakdown.patterns,
  };

  // Step 1: Score-based primary selection
  if (breakdown.score >= 80) {
    // Pick first 'strengths' template
    const strengthTemplate = candidates.find(
      (t) => t.category === 'strengths' && !selectedIds.has(t.id),
    );
    if (strengthTemplate) {
      selected.push({
        id: strengthTemplate.id,
        title: strengthTemplate.title,
        body: strengthTemplate.body(ctx),
        category: strengthTemplate.category,
      });
      selectedIds.add(strengthTemplate.id);
    }
  } else if (breakdown.score < 60) {
    // Pick first 'improvement' template
    const improvementTemplate = candidates.find(
      (t) => t.category === 'improvement' && !selectedIds.has(t.id),
    );
    if (improvementTemplate) {
      selected.push({
        id: improvementTemplate.id,
        title: improvementTemplate.title,
        body: improvementTemplate.body(ctx),
        category: improvementTemplate.category,
      });
      selectedIds.add(improvementTemplate.id);
    }
  } else {
    // Pick first 'insights' template
    const insightTemplate = candidates.find(
      (t) => t.category === 'insights' && !selectedIds.has(t.id),
    );
    if (insightTemplate) {
      selected.push({
        id: insightTemplate.id,
        title: insightTemplate.title,
        body: insightTemplate.body(ctx),
        category: insightTemplate.category,
      });
      selectedIds.add(insightTemplate.id);
    }
  }

  // Step 2: Pattern-based addition (if selected < 2)
  if (selected.length < 2 && breakdown.patterns.length > 0) {
    const patternTemplate = candidates.find(
      (t) =>
        t.category === 'patterns' &&
        !selectedIds.has(t.id) &&
        (t.id.includes('filler') ||
          t.id.includes('overexplain') ||
          t.id.includes('confidence')),
    );
    if (patternTemplate) {
      selected.push({
        id: patternTemplate.id,
        title: patternTemplate.title,
        body: patternTemplate.body(ctx),
        category: patternTemplate.category,
      });
      selectedIds.add(patternTemplate.id);
    }
  }

  // Step 3: Hook-based addition (if selected < 2)
  if (selected.length < 2 && breakdown.hooks.length > 0) {
    const hookTemplate = candidates.find(
      (t) =>
        t.category === 'strengths' &&
        t.id.includes('hook') &&
        !selectedIds.has(t.id),
    );
    if (hookTemplate) {
      selected.push({
        id: hookTemplate.id,
        title: hookTemplate.title,
        body: hookTemplate.body(ctx),
        category: hookTemplate.category,
      });
      selectedIds.add(hookTemplate.id);
    }
  }

  // Step 4: Fill remaining slots (ensure at least 2, at most 3)
  while (selected.length < 2 && candidates.length > 0) {
    const nextTemplate = candidates.find((t) => !selectedIds.has(t.id));
    if (nextTemplate) {
      selected.push({
        id: nextTemplate.id,
        title: nextTemplate.title,
        body: nextTemplate.body(ctx),
        category: nextTemplate.category,
      });
      selectedIds.add(nextTemplate.id);
    } else {
      break;
    }
  }

  // Limit to max 3 paragraphs
  return selected.slice(0, 3);
}

