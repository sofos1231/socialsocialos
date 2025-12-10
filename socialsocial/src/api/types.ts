// socialsocial/src/api/types.ts
// Step 5.12: Shared API types including LockedResponse

/**
 * Step 5.12: Feature keys for entitlement gating
 */
export type FeatureKey =
  | 'ADVANCED_METRICS'
  | 'ANALYZER_FULL'
  | 'DEEP_PARAGRAPHS'
  | 'SYNERGY_MAP'
  | 'MOOD_TIMELINE_FULL'
  | 'HALL_OF_FAME_FULL';

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

