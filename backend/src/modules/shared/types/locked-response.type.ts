// backend/src/modules/shared/types/locked-response.type.ts
// Step 5.12: Locked response wrapper for premium features

import { FeatureKey } from '../../entitlements/entitlements.service';

/**
 * Step 5.12: Upsell metadata for locked features
 */
export interface UpsellMeta {
  title: string;
  body: string;
  ctaLabel: string;
}

/**
 * Step 5.12: Locked response wrapper
 * Used for premium endpoints to return either preview or full data
 * 
 * @template T - The response type (e.g. AdvancedMetricsResponse)
 */
export interface LockedResponse<T> {
  locked: boolean;
  featureKey?: FeatureKey;
  preview?: T; // Preview or redacted version for free users
  full?: T; // Real payload when unlocked
  upsell?: UpsellMeta; // Upsell copy for locked state
}

