// backend/src/modules/insights/insights.utils.ts
// Phase 1: Helper utilities for Deep Insights computation

import { MessageRole } from '@prisma/client';
import { MessageRarityTier } from './insights.types';
import { TraitSnapshot } from './insights.types';
import { CharismaTraitKey } from '../ai/ai-scoring.types';

/**
 * Extended rarity tier mapping that includes 'D' tier
 * This is for insights only - existing scoreToRarity() in scoring.ts remains unchanged
 */
export function scoreToRarityTier(score: number): MessageRarityTier {
  if (score >= 95) return 'S+';
  if (score >= 85) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 30) return 'C';
  return 'D'; // 0-29
}

/**
 * Get rarity tier value for sorting (higher = better)
 */
export function rarityTierValue(tier: MessageRarityTier): number {
  const map: Record<MessageRarityTier, number> = {
    D: 0,
    C: 1,
    B: 2,
    A: 3,
    S: 4,
    'S+': 5,
  };
  return map[tier] ?? 0;
}

/**
 * Filter ChatMessage array to only USER messages, sorted by turnIndex
 */
export function getUserMessages<T extends { role: MessageRole; turnIndex: number }>(
  messages: T[],
): T[] {
  return messages
    .filter((m) => m.role === MessageRole.USER)
    .sort((a, b) => a.turnIndex - b.turnIndex);
}

/**
 * Compute messageIndex (0-based, USER messages only) from a messageId
 * Returns -1 if message not found or not a USER message
 */
export function computeMessageIndex(
  userMessages: Array<{ id: string }>,
  messageId: string,
): number {
  const index = userMessages.findIndex((m) => m.id === messageId);
  return index;
}

/**
 * Extract TraitSnapshot from ChatMessage.traitData JSON
 * Returns null if traitData is invalid or missing required traits
 */
export function extractTraitsSnapshot(traitData: any): TraitSnapshot | null {
  if (!traitData || typeof traitData !== 'object') {
    return null;
  }

  const traits = traitData.traits;
  if (!traits || typeof traits !== 'object') {
    return null;
  }

  const traitKeys: CharismaTraitKey[] = [
    'confidence',
    'clarity',
    'humor',
    'tensionControl',
    'emotionalWarmth',
    'dominance',
  ];

  const snapshot: Partial<TraitSnapshot> = {};
  let allPresent = true;

  for (const key of traitKeys) {
    const value = traits[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100) {
      snapshot[key] = value;
    } else {
      allPresent = false;
      break;
    }
  }

  if (!allPresent) {
    return null;
  }

  return snapshot as TraitSnapshot;
}

/**
 * Safe number extraction with fallback
 */
export function safeNumber(value: any, fallback: number = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
}

