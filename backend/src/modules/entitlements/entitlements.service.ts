// backend/src/modules/entitlements/entitlements.service.ts
// Step 5.12: Server-authoritative entitlement enforcement

import { Injectable } from '@nestjs/common';
import { User, AccountTier } from '@prisma/client';
import { isPremiumTier } from '../shared/helpers/premium.helper';

/**
 * Step 5.12: Feature keys for entitlement gating
 */
export enum FeatureKey {
  ADVANCED_METRICS = 'ADVANCED_METRICS',
  ANALYZER_FULL = 'ANALYZER_FULL',
  DEEP_PARAGRAPHS = 'DEEP_PARAGRAPHS',
  SYNERGY_MAP = 'SYNERGY_MAP',
  MOOD_TIMELINE_FULL = 'MOOD_TIMELINE_FULL',
  HALL_OF_FAME_FULL = 'HALL_OF_FAME_FULL',
}

/**
 * Step 5.12: User entitlements
 */
export interface Entitlements {
  isPremium: boolean;
  features: Record<FeatureKey, boolean>;
}

@Injectable()
export class EntitlementsService {
  /**
   * Step 5.12: Get entitlements for a user
   * Single source of truth for premium status and feature access
   * 
   * @param user - User entity (must have tier field)
   * @returns Entitlements object
   */
  getEntitlements(user: Pick<User, 'tier'>): Entitlements {
    const isPremium = isPremiumTier(user.tier);

    // For now, all features are gated by premium status
    // This can evolve later to support per-feature flags
    const features: Record<FeatureKey, boolean> = {
      [FeatureKey.ADVANCED_METRICS]: isPremium,
      [FeatureKey.ANALYZER_FULL]: isPremium,
      [FeatureKey.DEEP_PARAGRAPHS]: isPremium,
      [FeatureKey.SYNERGY_MAP]: isPremium,
      [FeatureKey.MOOD_TIMELINE_FULL]: isPremium,
      [FeatureKey.HALL_OF_FAME_FULL]: isPremium,
    };

    return {
      isPremium,
      features,
    };
  }
}

