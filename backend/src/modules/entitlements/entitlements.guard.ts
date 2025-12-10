// backend/src/modules/entitlements/entitlements.guard.ts
// Step 5.12: Feature access guard helpers

import { Entitlements, FeatureKey } from './entitlements.service';

/**
 * Step 5.12: Custom error for locked features
 */
export class FeatureLockedError extends Error {
  constructor(
    public readonly featureKey: FeatureKey,
    message?: string,
  ) {
    super(message || `Feature ${featureKey} is locked`);
    this.name = 'FeatureLockedError';
  }
}

/**
 * Step 5.12: Require a feature to be unlocked
 * Throws FeatureLockedError if feature is locked
 * 
 * @param entitlements - User entitlements
 * @param feature - Feature key to check
 * @throws FeatureLockedError if feature is locked
 */
export function requireFeature(entitlements: Entitlements, feature: FeatureKey): void {
  if (!entitlements.features[feature]) {
    throw new FeatureLockedError(feature);
  }
}

