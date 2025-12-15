// NOTE: This file currently uses Option A (rarity/xp-based) scoring/rewards. It will be migrated to Option B AiCore metrics later.

// src/modules/sessions/scoring.ts

export type MessageRarity = 'C' | 'B' | 'A' | 'S' | 'S+';

export interface MessageEvaluationInput {
  /**
   * Message score from 0–100 (later from the AI).
   */
  score: number;
}

export interface MessageEvaluationResult extends MessageEvaluationInput {
  rarity: MessageRarity;
  xp: number;
  coins: number;
  gems: number;
}

export interface SessionRewardsSummary {
  messages: MessageEvaluationResult[];
  rarityCounts: Record<MessageRarity, number>;
  totalXp: number;
  totalCoins: number;
  totalGems: number;
  /**
   * Final session score, currently simple average of message scores.
   */
  finalScore: number;
}

/**
 * Checklist-based scoring (Step 7 Thin Lane)
 * The AI now returns checklist flags; we deterministically map them to a numeric score.
 */
export enum MessageChecklistFlag {
  // high-value “wins”
  POSITIVE_HOOK_HIT = 'POSITIVE_HOOK_HIT',
  MULTIPLE_HOOKS_HIT = 'MULTIPLE_HOOKS_HIT',
  OBJECTIVE_PROGRESS = 'OBJECTIVE_PROGRESS',
  MOOD_STRONG_UP = 'MOOD_STRONG_UP',
  MOMENTUM_MAINTAINED = 'MOMENTUM_MAINTAINED',

  // safety / calibration
  NO_BOUNDARY_ISSUES = 'NO_BOUNDARY_ISSUES',
  GOOD_CALIBRATION = 'GOOD_CALIBRATION',

  // optional “soft” checks
  CLARITY_GOOD = 'CLARITY_GOOD',
  WARMTH_GOOD = 'WARMTH_GOOD',
}

export interface MessageChecklistSnapshot {
  flags: MessageChecklistFlag[];
  notes?: string[];
}

export interface ChecklistScoreResult {
  numericScore: number;
  tier: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
  rarity: MessageRarity;
  flags: MessageChecklistFlag[];
}

/**
 * Map a numeric score to a rarity tier.
 *
 * 0–59  => C
 * 60–74 => B
 * 75–84 => A
 * 85–94 => S
 * 95–100 => S+
 */
export function scoreToRarity(score: number): MessageRarity {
  if (score >= 95) return 'S+';
  if (score >= 85) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  return 'C';
}

/**
 * Map numeric score to the tier scale used by FastPath/accumulator.
 */
export function scoreToTier(score: number): ChecklistScoreResult['tier'] {
  if (score >= 95) return 'S+';
  if (score >= 85) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

function tierToRarity(tier: ChecklistScoreResult['tier']): MessageRarity {
  switch (tier) {
    case 'S+':
      return 'S+';
    case 'S':
      return 'S';
    case 'A':
      return 'A';
    case 'B':
      return 'B';
    case 'C':
    case 'D':
    default:
      return 'C';
  }
}

/**
 * Deterministically convert checklist flags into numeric score + tier/rarity.
 * This is the new single source for per-message numeric scores (AI no longer invents numbers).
 */
export function scoreFromChecklist(snapshot: MessageChecklistSnapshot): ChecklistScoreResult {
  const flags = Array.isArray(snapshot?.flags) ? snapshot.flags : [];

  // Start low to make missing checklist information safe by default.
  // A bare message with no flags scores as a low "D/C" until safety is proven.
  let score = 35;

  // Big wins
  if (flags.includes(MessageChecklistFlag.POSITIVE_HOOK_HIT)) score += 18;
  if (flags.includes(MessageChecklistFlag.OBJECTIVE_PROGRESS)) score += 18;
  if (flags.includes(MessageChecklistFlag.MOOD_STRONG_UP)) score += 12;

  // Momentum/quality
  if (flags.includes(MessageChecklistFlag.MULTIPLE_HOOKS_HIT)) score += 10;
  if (flags.includes(MessageChecklistFlag.MOMENTUM_MAINTAINED)) score += 6;
  if (flags.includes(MessageChecklistFlag.GOOD_CALIBRATION)) score += 6;

  // Soft quality nudges
  if (flags.includes(MessageChecklistFlag.CLARITY_GOOD)) score += 3;
  if (flags.includes(MessageChecklistFlag.WARMTH_GOOD)) score += 3;

  // Safety: without NO_BOUNDARY_ISSUES we hard-cap the score to keep it in a low band.
  const hasBoundarySafety = flags.includes(MessageChecklistFlag.NO_BOUNDARY_ISSUES);
  if (!hasBoundarySafety) {
    score = Math.min(score, 45);
  }

  // Clamp
  score = Math.max(0, Math.min(100, Math.round(score)));

  const tier = scoreToTier(score);
  const rarity = tierToRarity(tier);

  return {
    numericScore: score,
    tier,
    rarity,
    flags,
  };
}

/**
 * Rewards per single message by rarity.
 * Numbers chosen to be meaningful but not insane.
 */
const RARITY_REWARDS: Record<
  MessageRarity,
  { xp: number; coins: number; gems: number }
> = {
  C: { xp: 4, coins: 1, gems: 0 },
  B: { xp: 8, coins: 3, gems: 0 },
  A: { xp: 14, coins: 5, gems: 0 },
  S: { xp: 20, coins: 7, gems: 0 },
  'S+': { xp: 28, coins: 9, gems: 0 }, // gem logic handled at session level
};

// Hard caps per session to prevent farming abuse.
const MAX_XP_PER_SESSION = 120;
const MAX_COINS_PER_SESSION = 40;
const MAX_GEMS_PER_SESSION = 1;

/**
 * Given the list of message scores for a session, compute:
 * - rarity per message
 * - XP / coins / gems per message
 * - totals with caps
 * - rarity counts
 * - final session score (average)
 */
export function computeSessionRewards(
  inputs: MessageEvaluationInput[],
): SessionRewardsSummary {
  if (!inputs.length) {
    return {
      messages: [],
      rarityCounts: { C: 0, B: 0, A: 0, S: 0, 'S+': 0 },
      totalXp: 0,
      totalCoins: 0,
      totalGems: 0,
      finalScore: 0,
    };
  }

  const rarityCounts: Record<MessageRarity, number> = {
    C: 0,
    B: 0,
    A: 0,
    S: 0,
    'S+': 0,
  };

  let totalXp = 0;
  let totalCoins = 0;
  let totalGems = 0;
  let scoreSum = 0;

  const messages: MessageEvaluationResult[] = [];

  for (const input of inputs) {
    const clampedScore = clamp(input.score, 0, 100);
    const rarity = scoreToRarity(clampedScore);
    const base = RARITY_REWARDS[rarity];

    rarityCounts[rarity] += 1;
    scoreSum += clampedScore;

    let xp = base.xp;
    let coins = base.coins;
    let gems = base.gems;

    // Session-level caps: stop gaining once reaching the cap.
    if (totalXp + xp > MAX_XP_PER_SESSION) {
      xp = Math.max(0, MAX_XP_PER_SESSION - totalXp);
    }
    if (totalCoins + coins > MAX_COINS_PER_SESSION) {
      coins = Math.max(0, MAX_COINS_PER_SESSION - totalCoins);
    }

    totalXp += xp;
    totalCoins += coins;

    messages.push({
      score: clampedScore,
      rarity,
      xp,
      coins,
      gems,
    });
  }

  // Gem logic: if the user achieved at least one S+ message in the session,
  // award 1 gem (once), respecting the max gems cap.
  if (rarityCounts['S+'] > 0 && totalGems < MAX_GEMS_PER_SESSION) {
    totalGems = 1;
  }

  const finalScore = scoreSum / inputs.length;

  return {
    messages,
    rarityCounts,
    totalXp,
    totalCoins,
    totalGems,
    finalScore,
  };
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
