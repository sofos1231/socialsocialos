// FILE: backend/src/modules/ai/model-tier.service.ts
// Step 8: Model Tier Routing Service

import { Injectable } from '@nestjs/common';

/**
 * Step 8: Model tier routing service
 * Defines which AI model to use for different tiers (mini, heavy, hero)
 */
@Injectable()
export class ModelTierService {
  /**
   * Get mini model (fast, cheap) for FastPath
   */
  getMiniModel(): string {
    return process.env.AI_MODEL_MINI || 'gpt-4o-mini';
  }

  /**
   * Get heavy model (slower, more capable) for Deep Analyzer
   */
  getHeavyModel(): string {
    return process.env.AI_MODEL_HEAVY || 'gpt-4o';
  }

  /**
   * Get hero model (future tier for S/S+ moments)
   */
  getHeroModel(): string | null {
    return process.env.AI_MODEL_HERO || null;
  }

  /**
   * Get model for specified tier
   */
  getModelForTier(tier: 'mini' | 'heavy' | 'hero'): string {
    switch (tier) {
      case 'mini':
        return this.getMiniModel();
      case 'heavy':
        return this.getHeavyModel();
      case 'hero':
        return this.getHeroModel() ?? this.getHeavyModel(); // Fallback to heavy if hero not configured
    }
  }
}

