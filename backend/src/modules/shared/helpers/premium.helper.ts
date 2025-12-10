// backend/src/modules/shared/helpers/premium.helper.ts
// Step 5.12: Centralized premium tier helper

import { AccountTier } from '@prisma/client';

/**
 * Step 5.12: Check if an account tier is premium
 * Centralized helper to avoid duplication and ensure consistency
 * 
 * @param tier - Account tier (can be null/undefined)
 * @returns true if tier is PREMIUM, false otherwise
 */
export function isPremiumTier(tier: AccountTier | null | undefined): boolean {
  return tier === 'PREMIUM';
}

