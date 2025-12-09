// socialsocial/src/types/RewardsDTO.ts
// Step 5.3: Shared DTO types for rewards (allowlisted fields for 5.3 + 5.4)

import { RarityTier } from '../navigation/types';

/**
 * Per-message reward breakdown
 */
export interface RewardMessageBreakdown {
  index: number;
  score: number;
  rarity: RarityTier;
  xp: number;
  coins: number;
  gems: number;
}

/**
 * Session rewards summary
 */
export interface RewardsDTO {
  score: number;
  messageScore: number;
  isSuccess: boolean;
  xpGained: number;
  coinsGained: number;
  gemsGained: number;
  rarityCounts: Record<string, number>;
  messages: RewardMessageBreakdown[];
}

