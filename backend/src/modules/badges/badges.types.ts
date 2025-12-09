// backend/src/modules/badges/badges.types.ts
// Step 5.4: Badge type definitions

import { CategoryKey } from '../analytics/category-taxonomy';

/**
 * Badge tier levels
 */
export type BadgeTier = 0 | 1 | 2 | 3 | 4; // 0=none, 1=bronze, 2=silver, 3=gold, 4=diamond

/**
 * Badge definition structure
 */
export interface BadgeDefinition {
  badgeKey: string;
  name: string;
  categoryKey: CategoryKey;
  description: string;
  tierThresholds: Record<BadgeTier, number>; // Points needed per tier
  rewardsByTier: Record<BadgeTier, { xp: number; coins: number; gems?: number }>;
  progressRules: {
    hookKeys?: string[]; // Progress from these hooks (from hook-taxonomy.ts)
    patternKeys?: string[]; // Progress from avoiding these patterns
    traitKeys?: string[]; // Progress from these trait improvements
  };
}

/**
 * Badge progress data for API responses
 */
export interface BadgeProgressDTO {
  badgeKey: string;
  name: string;
  categoryKey: string;
  description: string;
  tier: number;
  points: number;
  nextThreshold: number;
  rewards: {
    xp: number;
    coins: number;
    gems?: number;
  };
  nextTierRewards?: {
    xp: number;
    coins: number;
    gems?: number;
  };
}

