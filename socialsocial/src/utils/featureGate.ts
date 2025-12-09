// socialsocial/src/utils/featureGate.ts
// Step 5.6: Central FeatureGate helper for feature locking

export type FeatureKey = 'ADVANCED_METRICS' | 'PREMIUM_BADGES' | 'MESSAGE_ANALYZER'; // Add more as needed

/**
 * Check if a feature is locked based on premium status
 * @param featureKey Feature to check
 * @param isPremium User's premium status
 * @returns true if feature is locked (user cannot access), false if unlocked
 */
export function isFeatureLocked(featureKey: FeatureKey, isPremium: boolean): boolean {
  const premiumFeatures: FeatureKey[] = ['ADVANCED_METRICS', 'MESSAGE_ANALYZER'];
  
  if (premiumFeatures.includes(featureKey)) {
    return !isPremium;
  }
  
  // Default: feature is unlocked
  return false;
}

/**
 * Get feature lock message for display
 */
export function getFeatureLockMessage(featureKey: FeatureKey): string {
  const messages: Record<FeatureKey, string> = {
    ADVANCED_METRICS: 'Unlock premium to access detailed performance analytics, persona insights, behavioral patterns, and more.',
    PREMIUM_BADGES: 'Unlock premium to access exclusive badge rewards.',
    MESSAGE_ANALYZER: 'Unlock premium to analyze and improve your messages.',
  };
  
  return messages[featureKey] || 'This feature requires premium access.';
}

