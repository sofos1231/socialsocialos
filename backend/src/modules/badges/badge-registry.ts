// backend/src/modules/badges/badge-registry.ts
// Step 5.4: Badge definitions registry

import { BadgeDefinition, BadgeTier } from './badges.types';
import { CategoryKey } from '../analytics/category-taxonomy';

/**
 * Badge registry singleton
 */
export class BadgeRegistry {
  private badges: Map<string, BadgeDefinition> = new Map();

  constructor() {
    this.initializeRegistry();
  }

  /**
   * Get badge definition by key
   */
  get(badgeKey: string): BadgeDefinition | undefined {
    return this.badges.get(badgeKey);
  }

  /**
   * Get all badge definitions
   */
  getAll(): BadgeDefinition[] {
    return Array.from(this.badges.values());
  }

  /**
   * Get badges by category
   */
  getByCategory(categoryKey: CategoryKey): BadgeDefinition[] {
    return Array.from(this.badges.values()).filter(
      (badge) => badge.categoryKey === categoryKey,
    );
  }

  /**
   * Initialize MVP badge catalog (10+ badges)
   */
  private initializeRegistry(): void {
    // CONFIDENCE category badges
    this.addBadge({
      badgeKey: 'confidence_master',
      name: 'Confidence Master',
      categoryKey: CategoryKey.CONFIDENCE,
      description: 'Demonstrate confident communication consistently',
      tierThresholds: { 0: 0, 1: 5, 2: 15, 3: 30, 4: 60 },
      rewardsByTier: {
        0: { xp: 0, coins: 0 },
        1: { xp: 50, coins: 10 },
        2: { xp: 100, coins: 25, gems: 1 },
        3: { xp: 200, coins: 50, gems: 2 },
        4: { xp: 500, coins: 100, gems: 5 },
      },
      progressRules: {
        hookKeys: ['HOOK_CONFIDENT_TONE', 'HOOK_STRONG_OPENER'],
      },
    });

    this.addBadge({
      badgeKey: 'charisma_master',
      name: 'Charisma Master',
      categoryKey: CategoryKey.CONFIDENCE,
      description: 'Show charisma through high confidence, humor, and warmth',
      tierThresholds: { 0: 0, 1: 5, 2: 15, 3: 30, 4: 60 },
      rewardsByTier: {
        0: { xp: 0, coins: 0 },
        1: { xp: 50, coins: 10 },
        2: { xp: 100, coins: 25, gems: 1 },
        3: { xp: 200, coins: 50, gems: 2 },
        4: { xp: 500, coins: 100, gems: 5 },
      },
      progressRules: {
        hookKeys: ['HOOK_CHARISMATIC'],
      },
    });

    // HUMOR category badges
    this.addBadge({
      badgeKey: 'humor_master',
      name: 'Humor Master',
      categoryKey: CategoryKey.HUMOR,
      description: 'Use humor effectively to engage and connect',
      tierThresholds: { 0: 0, 1: 5, 2: 15, 3: 30, 4: 60 },
      rewardsByTier: {
        0: { xp: 0, coins: 0 },
        1: { xp: 50, coins: 10 },
        2: { xp: 100, coins: 25, gems: 1 },
        3: { xp: 200, coins: 50, gems: 2 },
        4: { xp: 500, coins: 100, gems: 5 },
      },
      progressRules: {
        hookKeys: ['HOOK_HIGH_HUMOR'],
      },
    });

    // EMPATHY category badges
    this.addBadge({
      badgeKey: 'warmth_master',
      name: 'Warmth Master',
      categoryKey: CategoryKey.EMPATHY,
      description: 'Show emotional warmth and empathy in conversations',
      tierThresholds: { 0: 0, 1: 5, 2: 15, 3: 30, 4: 60 },
      rewardsByTier: {
        0: { xp: 0, coins: 0 },
        1: { xp: 50, coins: 10 },
        2: { xp: 100, coins: 25, gems: 1 },
        3: { xp: 200, coins: 50, gems: 2 },
        4: { xp: 500, coins: 100, gems: 5 },
      },
      progressRules: {
        hookKeys: ['HOOK_EMOTIONAL_WARMTH'],
      },
    });

    // CLARITY category badges
    this.addBadge({
      badgeKey: 'clarity_master',
      name: 'Clarity Master',
      categoryKey: CategoryKey.CLARITY,
      description: 'Communicate clearly and effectively',
      tierThresholds: { 0: 0, 1: 5, 2: 15, 3: 30, 4: 60 },
      rewardsByTier: {
        0: { xp: 0, coins: 0 },
        1: { xp: 50, coins: 10 },
        2: { xp: 100, coins: 25, gems: 1 },
        3: { xp: 200, coins: 50, gems: 2 },
        4: { xp: 500, coins: 100, gems: 5 },
      },
      progressRules: {
        hookKeys: ['HOOK_CLEAR_COMMUNICATION'],
        patternKeys: ['PATTERN_FILLER_WORDS', 'PATTERN_UNCLEAR'], // Avoiding these patterns counts
      },
    });

    // TENSION category badges
    this.addBadge({
      badgeKey: 'tension_control_master',
      name: 'Tension Control Master',
      categoryKey: CategoryKey.TENSION,
      description: 'Maintain appropriate tension and control in conversations',
      tierThresholds: { 0: 0, 1: 5, 2: 15, 3: 30, 4: 60 },
      rewardsByTier: {
        0: { xp: 0, coins: 0 },
        1: { xp: 50, coins: 10 },
        2: { xp: 100, coins: 25, gems: 1 },
        3: { xp: 200, coins: 50, gems: 2 },
        4: { xp: 500, coins: 100, gems: 5 },
      },
      progressRules: {
        traitKeys: ['tensionControl'],
      },
    });

    // DOMINANCE category badges
    this.addBadge({
      badgeKey: 'dominance_master',
      name: 'Dominance Master',
      categoryKey: CategoryKey.DOMINANCE,
      description: 'Balance dominance appropriately in interactions',
      tierThresholds: { 0: 0, 1: 5, 2: 15, 3: 30, 4: 60 },
      rewardsByTier: {
        0: { xp: 0, coins: 0 },
        1: { xp: 50, coins: 10 },
        2: { xp: 100, coins: 25, gems: 1 },
        3: { xp: 200, coins: 50, gems: 2 },
        4: { xp: 500, coins: 100, gems: 5 },
      },
      progressRules: {
        traitKeys: ['dominance'],
        patternKeys: ['PATTERN_DOMINANCE_ISSUE'], // Avoiding this pattern counts
      },
    });

    // Cross-category badges
    this.addBadge({
      badgeKey: 'consistency_master',
      name: 'Consistency Master',
      categoryKey: CategoryKey.CONFIDENCE,
      description: 'Maintain consistent high performance across sessions',
      tierThresholds: { 0: 0, 1: 5, 2: 15, 3: 30, 4: 60 },
      rewardsByTier: {
        0: { xp: 0, coins: 0 },
        1: { xp: 50, coins: 10 },
        2: { xp: 100, coins: 25, gems: 1 },
        3: { xp: 200, coins: 50, gems: 2 },
        4: { xp: 500, coins: 100, gems: 5 },
      },
      progressRules: {
        hookKeys: ['HOOK_CONSISTENT_PERFORMANCE'],
      },
    });

    this.addBadge({
      badgeKey: 'recovery_master',
      name: 'Recovery Master',
      categoryKey: CategoryKey.CONFIDENCE,
      description: 'Recover and bounce back from challenging moments',
      tierThresholds: { 0: 0, 1: 5, 2: 15, 3: 30, 4: 60 },
      rewardsByTier: {
        0: { xp: 0, coins: 0 },
        1: { xp: 50, coins: 10 },
        2: { xp: 100, coins: 25, gems: 1 },
        3: { xp: 200, coins: 50, gems: 2 },
        4: { xp: 500, coins: 100, gems: 5 },
      },
      progressRules: {
        hookKeys: ['HOOK_RECOVERY_MOMENT'],
      },
    });

    // Pattern avoidance badges
    this.addBadge({
      badgeKey: 'clear_communicator',
      name: 'Clear Communicator',
      categoryKey: CategoryKey.CLARITY,
      description: 'Avoid filler words and unclear communication',
      tierThresholds: { 0: 0, 1: 5, 2: 15, 3: 30, 4: 60 },
      rewardsByTier: {
        0: { xp: 0, coins: 0 },
        1: { xp: 50, coins: 10 },
        2: { xp: 100, coins: 25, gems: 1 },
        3: { xp: 200, coins: 50, gems: 2 },
        4: { xp: 500, coins: 100, gems: 5 },
      },
      progressRules: {
        patternKeys: ['PATTERN_FILLER_WORDS', 'PATTERN_OVEREXPLAINING', 'PATTERN_UNDEREXPLAINING'], // Avoiding these counts
      },
    });
  }

  /**
   * Add badge definition to registry
   */
  private addBadge(badge: BadgeDefinition): void {
    this.badges.set(badge.badgeKey, badge);
  }
}

// Singleton instance
export const badgeRegistry = new BadgeRegistry();

