// backend/src/modules/analyzer/templates/deepParagraph.registry.ts
// Step 5.7: Deep paragraph template registry (deterministic)

import type { DeepParagraphDTO } from '../analyzer.types';

/**
 * Step 5.7: Deep paragraph template
 * Stable IDs for cooldown tracking (glue for 5.8)
 */
export interface DeepParagraphTemplate {
  id: string; // Stable ID for cooldown (glue for 5.8)
  category: string;
  title: string;
  body: (ctx: {
    score: number;
    traits: Record<string, number>;
    hooks: string[];
    patterns: string[];
  }) => string;
}

/**
 * Step 5.7: Deep paragraph templates registry
 * Deterministic selection based on message signals
 */
export const DEEP_PARAGRAPH_TEMPLATES: DeepParagraphTemplate[] = [
  // High score paragraphs
  {
    id: 'deep_high_score_confidence',
    category: 'strengths',
    title: 'Strong Confidence',
    body: (ctx) =>
      `Your message scored ${ctx.score} points, with confidence at ${ctx.traits.confidence || 0}%. This demonstrates assertive communication that commands attention and respect.`,
  },
  {
    id: 'deep_high_score_clarity',
    category: 'strengths',
    title: 'Clear Communication',
    body: (ctx) =>
      `Your clarity score of ${ctx.traits.clarity || 0}% shows you communicate effectively. Clear messages reduce misunderstandings and build stronger connections.`,
  },
  {
    id: 'deep_high_score_emotional_warmth',
    category: 'strengths',
    title: 'Emotional Connection',
    body: (ctx) =>
      `Your emotional warmth (${ctx.traits.emotionalWarmth || 0}%) creates genuine connections. People feel understood and valued when you communicate this way.`,
  },

  // Medium score paragraphs
  {
    id: 'deep_medium_improve_clarity',
    category: 'improvement',
    title: 'Enhance Clarity',
    body: (ctx) =>
      `Your message shows potential, but clarity could be improved. Try being more direct and specific about your intent. Current clarity: ${ctx.traits.clarity || 0}%.`,
  },
  {
    id: 'deep_medium_confidence_growth',
    category: 'improvement',
    title: 'Building Confidence',
    body: (ctx) =>
      `Your confidence is at ${ctx.traits.confidence || 0}%. Practice asserting your boundaries and expressing your opinions directly to build stronger presence.`,
  },

  // Low score paragraphs
  {
    id: 'deep_low_score_general',
    category: 'improvement',
    title: 'Learning Opportunity',
    body: (ctx) =>
      `This message (score: ${ctx.score}) provides a valuable learning opportunity. Focus on clarity and directness. Break down complex thoughts into simpler statements.`,
  },
  {
    id: 'deep_low_confidence',
    category: 'improvement',
    title: 'Confidence Building',
    body: (ctx) =>
      `Your confidence level (${ctx.traits.confidence || 0}%) suggests hesitation. Practice stating your opinions clearly without apologizing. Confidence grows with practice.`,
  },

  // Pattern-based paragraphs
  {
    id: 'deep_pattern_filler_words',
    category: 'patterns',
    title: 'Filler Words Impact',
    body: (ctx) =>
      `Your message contains filler words that reduce clarity. Eliminating "um," "like," and "you know" makes your communication more authoritative and clear.`,
  },
  {
    id: 'deep_pattern_overexplaining',
    category: 'patterns',
    title: 'Over-Explanation',
    body: (ctx) =>
      `You're providing more detail than necessary. Concise communication is often more powerful. Try to get to the point faster while maintaining essential context.`,
  },
  {
    id: 'deep_pattern_emotional_distance',
    category: 'patterns',
    title: 'Emotional Engagement',
    body: (ctx) =>
      `Your message maintains emotional distance. Adding personal touches, acknowledging feelings, or showing empathy can deepen your connections.`,
  },

  // Hook-based paragraphs
  {
    id: 'deep_hook_questions',
    category: 'strengths',
    title: 'Engaging Questions',
    body: (ctx) =>
      `Your use of questions shows active engagement. Asking thoughtful questions demonstrates interest and encourages deeper conversation.`,
  },
  {
    id: 'deep_hook_stories',
    category: 'strengths',
    title: 'Storytelling Impact',
    body: (ctx) =>
      `Your storytelling approach makes your message memorable. Stories create emotional connections and help others relate to your experiences.`,
  },

  // Trait combination paragraphs
  {
    id: 'deep_trait_balance',
    category: 'insights',
    title: 'Trait Balance',
    body: (ctx) => {
      const highTraits = Object.entries(ctx.traits)
        .filter(([_, value]) => value >= 75)
        .map(([key]) => key);
      const lowTraits = Object.entries(ctx.traits)
        .filter(([_, value]) => value < 50)
        .map(([key]) => key);

      if (highTraits.length > 0 && lowTraits.length > 0) {
        return `You excel at ${highTraits.slice(0, 2).join(' and ')}, while ${lowTraits.slice(0, 2).join(' and ')} offer growth opportunities. Balancing these traits creates well-rounded communication.`;
      }
      return 'Your communication traits show a balanced profile. Continue developing all areas for consistent growth.';
    },
  },
];

/**
 * Step 5.7: Select deep paragraphs deterministically
 * Applies cooldown to avoid repeating recent paragraphs (glue for 5.8)
 */
export function selectDeepParagraphs(
  breakdown: {
    score: number;
    traits: Record<string, number>;
    hooks: string[];
    patterns: string[];
  },
  excludedIds: string[] = [], // Paragraph IDs from recent history (glue for 5.8)
): DeepParagraphDTO[] {
  // Filter out templates that are in cooldown
  const availableTemplates = DEEP_PARAGRAPH_TEMPLATES.filter(
    (template) => !excludedIds.includes(template.id),
  );

  // If all templates are in cooldown, allow repeats (fallback)
  const candidates = availableTemplates.length > 0 ? availableTemplates : DEEP_PARAGRAPH_TEMPLATES;

  // Deterministic selection based on message signals
  const selected: DeepParagraphDTO[] = [];

  // 1. Select based on score range
  if (breakdown.score >= 80) {
    // High score: prefer strength paragraphs
    const strengthTemplates = candidates.filter((t) => t.category === 'strengths');
    if (strengthTemplates.length > 0) {
      const template = strengthTemplates[0]; // Deterministic: first match
      selected.push({
        id: template.id,
        title: template.title,
        body: template.body(breakdown),
        category: template.category,
      });
    }
  } else if (breakdown.score < 60) {
    // Low score: prefer improvement paragraphs
    const improvementTemplates = candidates.filter((t) => t.category === 'improvement');
    if (improvementTemplates.length > 0) {
      const template = improvementTemplates[0];
      selected.push({
        id: template.id,
        title: template.title,
        body: template.body(breakdown),
        category: template.category,
      });
    }
  } else {
    // Medium score: balanced approach
    const insightTemplates = candidates.filter((t) => t.category === 'insights');
    if (insightTemplates.length > 0) {
      const template = insightTemplates[0];
      selected.push({
        id: template.id,
        title: template.title,
        body: template.body(breakdown),
        category: template.category,
      });
    }
  }

  // 2. Select based on patterns
  if (breakdown.patterns.length > 0 && selected.length < 2) {
    const patternTemplates = candidates.filter(
      (t) => t.category === 'patterns' && !selected.find((s) => s.id === t.id),
    );
    if (patternTemplates.length > 0) {
      const template = patternTemplates[0];
      selected.push({
        id: template.id,
        title: template.title,
        body: template.body(breakdown),
        category: template.category,
      });
    }
  }

  // 3. Select based on hooks (if positive signals)
  if (breakdown.hooks.length > 0 && selected.length < 2) {
    const hookTemplates = candidates.filter(
      (t) => t.category === 'strengths' && !selected.find((s) => s.id === t.id),
    );
    if (hookTemplates.length > 0) {
      const template = hookTemplates[0];
      selected.push({
        id: template.id,
        title: template.title,
        body: template.body(breakdown),
        category: template.category,
      });
    }
  }

  // Ensure we return at least 2 paragraphs (if templates are available)
  while (selected.length < 2 && selected.length < candidates.length) {
    const remaining = candidates.filter((t) => !selected.find((s) => s.id === t.id));
    if (remaining.length === 0) break;

    const template = remaining[0];
    selected.push({
      id: template.id,
      title: template.title,
      body: template.body(breakdown),
      category: template.category,
    });
  }

  return selected.slice(0, 3); // Max 3 paragraphs per analysis
}


