// backend/src/modules/insights/insights.aggregators.ts
// Phase 1: Aggregation functions for Deep Insights

import { ChatMessage, MessageRole } from '@prisma/client';
import { SessionTraitProfile, MessageRarityTier } from './insights.types';
import { CharismaTraitKey } from '../ai/ai-scoring.types';
import { extractTraitsSnapshot, scoreToRarityTier, rarityTierValue } from './insights.utils';
import { getUserMessages } from './insights.utils';

/**
 * Compute standard deviation for a set of numbers
 */
function computeStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Aggregate trait profile from all USER messages
 */
export function computeTraitProfile(messages: ChatMessage[]): SessionTraitProfile {
  const userMessages = getUserMessages(messages);
  const traitKeys: CharismaTraitKey[] = [
    'confidence',
    'clarity',
    'humor',
    'tensionControl',
    'emotionalWarmth',
    'dominance',
  ];

  const profile: SessionTraitProfile = {
    confidence: 0,
    clarity: 0,
    humor: 0,
    tensionControl: 0,
    emotionalWarmth: 0,
    dominance: 0,
  };

  if (userMessages.length === 0) {
    return profile;
  }

  // Collect all trait values
  const traitValues: Record<CharismaTraitKey, number[]> = {
    confidence: [],
    clarity: [],
    humor: [],
    tensionControl: [],
    emotionalWarmth: [],
    dominance: [],
  };

  for (const msg of userMessages) {
    const snapshot = extractTraitsSnapshot(msg.traitData);
    if (snapshot) {
      for (const key of traitKeys) {
        traitValues[key].push(snapshot[key]);
      }
    }
  }

  // Compute averages
  for (const key of traitKeys) {
    const values = traitValues[key];
    if (values.length > 0) {
      profile[key] = Math.round(
        values.reduce((sum, v) => sum + v, 0) / values.length,
      );
    }
  }

  // Compute standard deviations (optional, but useful for consistency analysis)
  if (traitValues.confidence.length > 0) {
    profile.confidenceStdDev = Math.round(computeStdDev(traitValues.confidence) * 10) / 10;
  }
  if (traitValues.clarity.length > 0) {
    profile.clarityStdDev = Math.round(computeStdDev(traitValues.clarity) * 10) / 10;
  }

  return profile;
}

/**
 * Rarity statistics for a session
 */
export interface RarityStats {
  averageRarityTier: MessageRarityTier;
  rareTierCounts: Record<MessageRarityTier, number>;
  highestStreakTier: MessageRarityTier;
  lowestStreakTier: MessageRarityTier;
}

/**
 * Compute rarity statistics from USER messages
 */
export function computeRarityStats(messages: ChatMessage[]): RarityStats {
  const userMessages = getUserMessages(messages);

  const tierCounts: Record<MessageRarityTier, number> = {
    D: 0,
    C: 0,
    B: 0,
    A: 0,
    S: 0,
    'S+': 0,
  };

  const scores: number[] = [];
  const tiers: MessageRarityTier[] = [];

  for (const msg of userMessages) {
    if (typeof msg.score === 'number' && msg.score >= 0 && msg.score <= 100) {
      scores.push(msg.score);
      const tier = scoreToRarityTier(msg.score);
      tiers.push(tier);
      tierCounts[tier] += 1;
    }
  }

  // Compute average rarity tier (weighted by tier value)
  let averageRarityTier: MessageRarityTier = 'C';
  if (tiers.length > 0) {
    const avgTierValue =
      tiers.reduce((sum, t) => sum + rarityTierValue(t), 0) / tiers.length;
    // Round to nearest tier
    const roundedValue = Math.round(avgTierValue);
    if (roundedValue <= 0) averageRarityTier = 'D';
    else if (roundedValue === 1) averageRarityTier = 'C';
    else if (roundedValue === 2) averageRarityTier = 'B';
    else if (roundedValue === 3) averageRarityTier = 'A';
    else if (roundedValue === 4) averageRarityTier = 'S';
    else averageRarityTier = 'S+';
  }

  // Find highest streak tier (longest consecutive sequence of highest tier)
  let highestStreakTier: MessageRarityTier = 'C';
  let longestStreak = 0;
  let currentStreak = 0;
  let currentTier: MessageRarityTier | null = null;

  for (const tier of tiers) {
    if (tier === currentTier) {
      currentStreak += 1;
    } else {
      if (currentTier && currentStreak > longestStreak) {
        longestStreak = currentStreak;
        highestStreakTier = currentTier;
      }
      currentTier = tier;
      currentStreak = 1;
    }
  }
  if (currentTier && currentStreak > longestStreak) {
    highestStreakTier = currentTier;
  }

  // Find lowest streak tier (longest consecutive sequence of lowest tier)
  let lowestStreakTier: MessageRarityTier = 'C';
  longestStreak = 0;
  currentStreak = 0;
  currentTier = null;

  for (const tier of tiers) {
    if (tier === currentTier) {
      currentStreak += 1;
    } else {
      if (currentTier && currentStreak > longestStreak) {
        longestStreak = currentStreak;
        lowestStreakTier = currentTier;
      }
      currentTier = tier;
      currentStreak = 1;
    }
  }
  if (currentTier && currentStreak > longestStreak) {
    lowestStreakTier = currentTier;
  }

  // Fallback: if no messages, use defaults
  if (tiers.length === 0) {
    highestStreakTier = 'C';
    lowestStreakTier = 'C';
  }

  return {
    averageRarityTier,
    rareTierCounts: tierCounts,
    highestStreakTier,
    lowestStreakTier,
  };
}

/**
 * Compute improvement trend by comparing first half vs last half of scores
 */
export function computeImprovementTrend(scores: number[]): 'improving' | 'declining' | 'stable' {
  if (scores.length < 2) {
    return 'stable';
  }

  const mid = Math.floor(scores.length / 2);
  const firstHalf = scores.slice(0, mid);
  const lastHalf = scores.slice(mid);

  const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
  const lastAvg = lastHalf.reduce((sum, s) => sum + s, 0) / lastHalf.length;

  const diff = lastAvg - firstAvg;
  const threshold = 5; // Consider it "improving" or "declining" if difference is >= 5 points

  if (diff >= threshold) {
    return 'improving';
  } else if (diff <= -threshold) {
    return 'declining';
  }
  return 'stable';
}

/**
 * Compute consistency score (0-100) based on score standard deviation
 * Higher score = more consistent (lower std dev)
 */
export function computeConsistencyScore(scores: number[]): number {
  if (scores.length === 0) {
    return 0;
  }
  if (scores.length === 1) {
    return 100; // Perfectly consistent (only one data point)
  }

  const stdDev = computeStdDev(scores);
  // Normalize: std dev of 0 = 100, std dev of 50 (max reasonable) = 0
  // Use exponential decay: score = 100 * e^(-stdDev / 20)
  const normalized = 100 * Math.exp(-stdDev / 20);
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

