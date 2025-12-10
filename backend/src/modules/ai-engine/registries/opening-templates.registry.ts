// FILE: backend/src/modules/ai-engine/registries/opening-templates.registry.ts
// Step 6.3: Centralized Opening Templates Registry

import { AiStyleKey } from '@prisma/client';

export type OpeningTemplateKey =
  | 'CASUAL_GREETING'
  | 'PLAYFUL_HOOK'
  | 'DIRECT_QUESTION'
  | 'MYSTERIOUS_TEASE'
  | 'WARM_COMPLIMENT'
  | 'CURIOUS_OBSERVATION'
  | 'BOLD_STATEMENT'
  | 'SHY_APPROACH';

export interface OpeningTemplate {
  key: OpeningTemplateKey;
  name: string;
  description: string;
  compatibleStyles: AiStyleKey[];
  template: string; // Template with variables like ${aiStyleKey}, ${dynamics.emojiDensity}, ${difficulty.strictness}
  variables: string[]; // List of variable names used in template (e.g., ['greeting', 'hook', 'question'])
  defaultEnergy: number; // 0-1
  defaultCuriosity: number; // 0-1
}

/**
 * Centralized registry of opening templates.
 * Templates are selected based on aiStyleKey and openings.style.
 */
export const OPENING_TEMPLATES: Record<OpeningTemplateKey, OpeningTemplate> = {
  CASUAL_GREETING: {
    key: 'CASUAL_GREETING',
    name: 'Casual Greeting',
    description: 'Friendly, approachable opening',
    compatibleStyles: [
      AiStyleKey.NEUTRAL,
      AiStyleKey.WARM,
      AiStyleKey.PLAYFUL,
    ],
    template: 'Hey! {{greeting}}',
    variables: ['greeting'],
    defaultEnergy: 0.6,
    defaultCuriosity: 0.5,
  },

  PLAYFUL_HOOK: {
    key: 'PLAYFUL_HOOK',
    name: 'Playful Hook',
    description: 'Engaging, fun opening with a hook',
    compatibleStyles: [AiStyleKey.PLAYFUL, AiStyleKey.FLIRTY, AiStyleKey.CHAOTIC],
    template: '{{hook}} 😊',
    variables: ['hook'],
    defaultEnergy: 0.8,
    defaultCuriosity: 0.7,
  },

  DIRECT_QUESTION: {
    key: 'DIRECT_QUESTION',
    name: 'Direct Question',
    description: 'Straightforward, confident opening question',
    compatibleStyles: [AiStyleKey.DIRECT, AiStyleKey.CHALLENGING],
    template: '{{question}}',
    variables: ['question'],
    defaultEnergy: 0.7,
    defaultCuriosity: 0.8,
  },

  MYSTERIOUS_TEASE: {
    key: 'MYSTERIOUS_TEASE',
    name: 'Mysterious Tease',
    description: 'Intriguing, slightly mysterious opening',
    compatibleStyles: [AiStyleKey.CHALLENGING, AiStyleKey.CHAOTIC],
    template: '{{tease}}...',
    variables: ['tease'],
    defaultEnergy: 0.5,
    defaultCuriosity: 0.6,
  },

  WARM_COMPLIMENT: {
    key: 'WARM_COMPLIMENT',
    name: 'Warm Compliment',
    description: 'Friendly, warm opening with a compliment',
    compatibleStyles: [AiStyleKey.WARM, AiStyleKey.FLIRTY, AiStyleKey.NEUTRAL],
    template: '{{compliment}}! {{followup}}',
    variables: ['compliment', 'followup'],
    defaultEnergy: 0.6,
    defaultCuriosity: 0.5,
  },

  CURIOUS_OBSERVATION: {
    key: 'CURIOUS_OBSERVATION',
    name: 'Curious Observation',
    description: 'Observant, curious opening',
    compatibleStyles: [AiStyleKey.NEUTRAL, AiStyleKey.WARM, AiStyleKey.SHY],
    template: '{{observation}} — {{question}}',
    variables: ['observation', 'question'],
    defaultEnergy: 0.5,
    defaultCuriosity: 0.9,
  },

  BOLD_STATEMENT: {
    key: 'BOLD_STATEMENT',
    name: 'Bold Statement',
    description: 'Confident, bold opening statement',
    compatibleStyles: [AiStyleKey.DIRECT, AiStyleKey.CHALLENGING],
    template: '{{statement}}',
    variables: ['statement'],
    defaultEnergy: 0.9,
    defaultCuriosity: 0.4,
  },

  SHY_APPROACH: {
    key: 'SHY_APPROACH',
    name: 'Shy Approach',
    description: 'Gentle, shy opening',
    compatibleStyles: [AiStyleKey.SHY, AiStyleKey.NEUTRAL],
    template: '{{greeting}}... {{question}}',
    variables: ['greeting', 'question'],
    defaultEnergy: 0.3,
    defaultCuriosity: 0.6,
  },
};

/**
 * Get opening template by key
 */
export function getOpeningTemplate(key: OpeningTemplateKey): OpeningTemplate {
  return OPENING_TEMPLATES[key];
}

/**
 * Get opening template compatible with a given style
 */
export function getOpeningTemplateForStyle(
  styleKey: AiStyleKey,
  openingsStyle?: 'soft' | 'neutral' | 'direct' | 'intense' | null,
): OpeningTemplate {
  // Filter templates by compatible styles
  const compatible = Object.values(OPENING_TEMPLATES).filter((t) =>
    t.compatibleStyles.includes(styleKey),
  );

  if (compatible.length === 0) {
    // Fallback to CASUAL_GREETING if no match
    return OPENING_TEMPLATES.CASUAL_GREETING;
  }

  // If openingsStyle is specified, prefer templates that match the intensity
  if (openingsStyle) {
    const styleMap: Record<string, OpeningTemplateKey[]> = {
      soft: ['SHY_APPROACH', 'WARM_COMPLIMENT', 'CURIOUS_OBSERVATION'],
      neutral: ['CASUAL_GREETING', 'CURIOUS_OBSERVATION'],
      direct: ['DIRECT_QUESTION', 'BOLD_STATEMENT'],
      intense: ['BOLD_STATEMENT', 'PLAYFUL_HOOK', 'MYSTERIOUS_TEASE'],
    };

    const preferred = styleMap[openingsStyle] || [];
    const preferredTemplate = compatible.find((t) => preferred.includes(t.key));
    if (preferredTemplate) return preferredTemplate;
  }

  // Return first compatible template
  return compatible[0];
}

/**
 * Get all opening template keys
 */
export function getAllOpeningTemplateKeys(): OpeningTemplateKey[] {
  return Object.keys(OPENING_TEMPLATES) as OpeningTemplateKey[];
}

/**
 * Check if an opening template key is valid
 */
export function isValidOpeningTemplateKey(
  key: string,
): key is OpeningTemplateKey {
  return key in OPENING_TEMPLATES;
}

