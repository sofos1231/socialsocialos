// FILE: backend/src/modules/ai-engine/registries/response-architecture-profiles.registry.ts
// Step 6.4: Centralized Response Architecture Profiles Registry

import { MissionConfigV1ResponseArchitecture } from '../../missions-admin/mission-config-v1.schema';

export type ResponseArchitectureProfileKey =
  | 'REFLECTIVE'
  | 'VALIDATING'
  | 'EMOTIONAL'
  | 'PUSHPULL'
  | 'RISKY'
  | 'CLEAR'
  | 'DEEP'
  | 'CONSISTENT'
  | 'BALANCED';

export interface ResponseArchitectureProfile {
  key: ResponseArchitectureProfileKey;
  name: string;
  description: string;
  architecture: Partial<MissionConfigV1ResponseArchitecture> & {
    reflection?: number;
    validation?: number;
    emotionalMirroring?: number;
    pushPullFactor?: number;
    riskTaking?: number;
    clarity?: number;
    reasoningDepth?: number;
    personaConsistency?: number;
  };
}

/**
 * Centralized registry of response architecture profiles.
 * These profiles define how the AI processes user input and generates responses.
 */
export const RESPONSE_ARCHITECTURE_PROFILES: Record<
  ResponseArchitectureProfileKey,
  ResponseArchitectureProfile
> = {
  REFLECTIVE: {
    key: 'REFLECTIVE',
    name: 'Reflective',
    description: 'High reflection, deep thinking before responding',
    architecture: {
      reflection: 0.9,
      validation: 0.6,
      emotionalMirroring: 0.5,
      pushPullFactor: 0.3,
      riskTaking: 0.2,
      clarity: 0.7,
      reasoningDepth: 0.9,
      personaConsistency: 0.8,
    },
  },

  VALIDATING: {
    key: 'VALIDATING',
    name: 'Validating',
    description: 'High validation, supportive and affirming',
    architecture: {
      reflection: 0.5,
      validation: 0.9,
      emotionalMirroring: 0.8,
      pushPullFactor: 0.2,
      riskTaking: 0.1,
      clarity: 0.8,
      reasoningDepth: 0.5,
      personaConsistency: 0.7,
    },
  },

  EMOTIONAL: {
    key: 'EMOTIONAL',
    name: 'Emotional',
    description: 'High emotional mirroring, emotionally responsive',
    architecture: {
      reflection: 0.6,
      validation: 0.7,
      emotionalMirroring: 0.9,
      pushPullFactor: 0.4,
      riskTaking: 0.5,
      clarity: 0.6,
      reasoningDepth: 0.5,
      personaConsistency: 0.7,
    },
  },

  PUSHPULL: {
    key: 'PUSHPULL',
    name: 'Push-Pull',
    description: 'High push-pull factor, creates tension and interest',
    architecture: {
      reflection: 0.5,
      validation: 0.4,
      emotionalMirroring: 0.5,
      pushPullFactor: 0.9,
      riskTaking: 0.6,
      clarity: 0.5,
      reasoningDepth: 0.4,
      personaConsistency: 0.8,
    },
  },

  RISKY: {
    key: 'RISKY',
    name: 'Risky',
    description: 'High risk-taking, bold and unpredictable',
    architecture: {
      reflection: 0.3,
      validation: 0.3,
      emotionalMirroring: 0.4,
      pushPullFactor: 0.7,
      riskTaking: 0.9,
      clarity: 0.4,
      reasoningDepth: 0.3,
      personaConsistency: 0.6,
    },
  },

  CLEAR: {
    key: 'CLEAR',
    name: 'Clear',
    description: 'High clarity, direct and unambiguous',
    architecture: {
      reflection: 0.6,
      validation: 0.5,
      emotionalMirroring: 0.4,
      pushPullFactor: 0.3,
      riskTaking: 0.2,
      clarity: 0.9,
      reasoningDepth: 0.6,
      personaConsistency: 0.8,
    },
  },

  DEEP: {
    key: 'DEEP',
    name: 'Deep',
    description: 'High reasoning depth, thoughtful and analytical',
    architecture: {
      reflection: 0.8,
      validation: 0.6,
      emotionalMirroring: 0.5,
      pushPullFactor: 0.3,
      riskTaking: 0.3,
      clarity: 0.7,
      reasoningDepth: 0.9,
      personaConsistency: 0.7,
    },
  },

  CONSISTENT: {
    key: 'CONSISTENT',
    name: 'Consistent',
    description: 'High persona consistency, maintains character',
    architecture: {
      reflection: 0.6,
      validation: 0.5,
      emotionalMirroring: 0.5,
      pushPullFactor: 0.4,
      riskTaking: 0.3,
      clarity: 0.7,
      reasoningDepth: 0.6,
      personaConsistency: 0.95,
    },
  },

  BALANCED: {
    key: 'BALANCED',
    name: 'Balanced',
    description: 'Balanced across all dimensions',
    architecture: {
      reflection: 0.6,
      validation: 0.6,
      emotionalMirroring: 0.6,
      pushPullFactor: 0.5,
      riskTaking: 0.4,
      clarity: 0.7,
      reasoningDepth: 0.6,
      personaConsistency: 0.8,
    },
  },
};

/**
 * Get a response architecture profile by key
 */
export function getResponseArchitectureProfile(
  key: ResponseArchitectureProfileKey,
): ResponseArchitectureProfile {
  return RESPONSE_ARCHITECTURE_PROFILES[key];
}

/**
 * Get all response architecture profile keys
 */
export function getAllResponseArchitectureProfileKeys(): ResponseArchitectureProfileKey[] {
  return Object.keys(
    RESPONSE_ARCHITECTURE_PROFILES,
  ) as ResponseArchitectureProfileKey[];
}

/**
 * Check if a response architecture profile key is valid
 */
export function isValidResponseArchitectureProfileKey(
  key: string,
): key is ResponseArchitectureProfileKey {
  return key in RESPONSE_ARCHITECTURE_PROFILES;
}

