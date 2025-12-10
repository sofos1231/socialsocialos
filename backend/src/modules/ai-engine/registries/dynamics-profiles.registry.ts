// FILE: backend/src/modules/ai-engine/registries/dynamics-profiles.registry.ts
// Step 6.0: Centralized Dynamics Profiles Registry

import { MissionConfigV1Dynamics } from '../../missions-admin/mission-config-v1.schema';

export type DynamicsProfileKey =
  | 'FAST_PACED'
  | 'SLOW_BUILD'
  | 'HIGH_FLIRT'
  | 'LOW_FLIRT'
  | 'DRY_HUMOR'
  | 'WARM_VULNERABLE'
  | 'NEUTRAL'
  | 'CHALLENGING'
  | 'PLAYFUL';

export interface DynamicsProfile {
  key: DynamicsProfileKey;
  name: string;
  description: string;
  dynamics: Partial<MissionConfigV1Dynamics> & {
    pace?: number;
    emojiDensity?: number;
    flirtiveness?: number;
    hostility?: number;
    dryness?: number;
    vulnerability?: number;
    escalationSpeed?: number;
    randomness?: number;
  };
}

/**
 * Centralized registry of dynamics profiles.
 * 
 * NOTE: This registry is a DESIGN-TIME CATALOG only.
 * It is NOT used at runtime to derive dynamics configs.
 * 
 * Purpose:
 * - Provides reference examples of dynamics profiles
 * - Can be used by admin UI to suggest or preview dynamics settings
 * - Documents common dynamics configurations
 * 
 * Runtime behavior:
 * - Actual dynamics config comes from MissionConfigV1.dynamics (stored in mission template)
 * - This registry is NOT consulted during mission execution
 * - Dynamics values are passed directly to prompt builder via buildDynamicsBlock()
 * 
 * Future meta-engine integration:
 * - A future meta-engine could enforce dynamics (e.g., manipulate punctuation, sentence structure)
 * - This would plug in AFTER prompt generation, in a post-processing step
 * - See buildDynamicsBlock() in ai-chat.service.ts for where dynamics are currently applied (prompt instructions only)
 */
export const AI_DYNAMICS_PROFILES: Record<DynamicsProfileKey, DynamicsProfile> = {
  FAST_PACED: {
    key: 'FAST_PACED',
    name: 'Fast Paced',
    description: 'Quick responses, high energy, rapid escalation',
    dynamics: {
      pace: 85,
      escalationSpeed: 80,
      emojiDensity: 40,
      flirtiveness: 50,
      hostility: 10,
      dryness: 30,
      vulnerability: 40,
      randomness: 25,
    },
  },

  SLOW_BUILD: {
    key: 'SLOW_BUILD',
    name: 'Slow Build',
    description: 'Gradual progression, measured responses, careful escalation',
    dynamics: {
      pace: 30,
      escalationSpeed: 25,
      emojiDensity: 20,
      flirtiveness: 35,
      hostility: 5,
      dryness: 20,
      vulnerability: 60,
      randomness: 15,
    },
  },

  HIGH_FLIRT: {
    key: 'HIGH_FLIRT',
    name: 'High Flirt',
    description: 'Very flirty, playful, high romantic tension',
    dynamics: {
      pace: 60,
      escalationSpeed: 70,
      emojiDensity: 60,
      flirtiveness: 85,
      hostility: 5,
      dryness: 20,
      vulnerability: 50,
      randomness: 30,
    },
  },

  LOW_FLIRT: {
    key: 'LOW_FLIRT',
    name: 'Low Flirt',
    description: 'Platonic, friendly, minimal romantic tension',
    dynamics: {
      pace: 45,
      escalationSpeed: 30,
      emojiDensity: 25,
      flirtiveness: 15,
      hostility: 5,
      dryness: 30,
      vulnerability: 40,
      randomness: 20,
    },
  },

  DRY_HUMOR: {
    key: 'DRY_HUMOR',
    name: 'Dry Humor',
    description: 'Sarcastic, witty, dry sense of humor',
    dynamics: {
      pace: 50,
      escalationSpeed: 45,
      emojiDensity: 15,
      flirtiveness: 40,
      hostility: 20,
      dryness: 85,
      vulnerability: 25,
      randomness: 40,
    },
  },

  WARM_VULNERABLE: {
    key: 'WARM_VULNERABLE',
    name: 'Warm & Vulnerable',
    description: 'Open, emotionally available, warm and caring',
    dynamics: {
      pace: 40,
      escalationSpeed: 35,
      emojiDensity: 50,
      flirtiveness: 45,
      hostility: 5,
      dryness: 10,
      vulnerability: 90,
      randomness: 20,
    },
  },

  NEUTRAL: {
    key: 'NEUTRAL',
    name: 'Neutral',
    description: 'Balanced, moderate settings across all dynamics',
    dynamics: {
      pace: 50,
      escalationSpeed: 50,
      emojiDensity: 30,
      flirtiveness: 40,
      hostility: 10,
      dryness: 40,
      vulnerability: 50,
      randomness: 25,
    },
  },

  CHALLENGING: {
    key: 'CHALLENGING',
    name: 'Challenging',
    description: 'Pushback, resistance, harder to impress',
    dynamics: {
      pace: 55,
      escalationSpeed: 40,
      emojiDensity: 20,
      flirtiveness: 30,
      hostility: 60,
      dryness: 50,
      vulnerability: 20,
      randomness: 35,
    },
  },

  PLAYFUL: {
    key: 'PLAYFUL',
    name: 'Playful',
    description: 'Fun, lighthearted, energetic, unpredictable',
    dynamics: {
      pace: 65,
      escalationSpeed: 55,
      emojiDensity: 70,
      flirtiveness: 55,
      hostility: 5,
      dryness: 30,
      vulnerability: 45,
      randomness: 60,
    },
  },
};

/**
 * Get a dynamics profile by key
 */
export function getDynamicsProfile(key: DynamicsProfileKey): DynamicsProfile {
  return AI_DYNAMICS_PROFILES[key];
}

/**
 * Get all dynamics profile keys
 */
export function getAllDynamicsProfileKeys(): DynamicsProfileKey[] {
  return Object.keys(AI_DYNAMICS_PROFILES) as DynamicsProfileKey[];
}

/**
 * Check if a dynamics profile key is valid
 */
export function isValidDynamicsProfileKey(key: string): key is DynamicsProfileKey {
  return key in AI_DYNAMICS_PROFILES;
}

