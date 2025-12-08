// backend/src/modules/insights/insights.labels.ts
// Phase 1: Label generation logic for Deep Insights

import { ChatMessage } from '@prisma/client';
import { SessionLabels, SessionTraitProfile } from './insights.types';
import { CharismaTraitKey } from '../ai/ai-scoring.types';
import { getUserMessages } from './insights.utils';
import { normalizeTraitData } from '../shared/normalizers/chat-message.normalizer';

/**
 * Label generation thresholds (v1 - can be tuned later)
 */
const THRESHOLDS = {
  HIGH_TRAIT: 70, // Traits >= 70 are considered "strong"
  LOW_TRAIT: 40, // Traits <= 40 are considered "low"
  CONSISTENT_STD_DEV: 10, // Std dev <= 10 is considered "consistent"
  HIGH_CHARISMA: 70, // Charisma index >= 70 is "high"
  LOW_WARMTH: 50, // Emotional warmth <= 50 is "low" for the high_charisma_low_warmth label
} as const;

/**
 * Collect all unique flags from USER messages
 */
function collectAllFlags(messages: ChatMessage[]): string[] {
  const userMessages = getUserMessages(messages);
  const flagsSet = new Set<string>();

  for (const msg of userMessages) {
    const normalized = normalizeTraitData(msg.traitData);
    if (Array.isArray(normalized.flags)) {
      for (const flag of normalized.flags) {
        if (typeof flag === 'string') {
          flagsSet.add(flag.toLowerCase());
        }
      }
    }
  }

  return Array.from(flagsSet);
}

/**
 * Generate session labels from trait profile, flags, and messages
 */
export function generateSessionLabels(
  traitProfile: SessionTraitProfile,
  flags: string[],
  messages: ChatMessage[],
  charismaIndex: number | null,
): SessionLabels {
  const labels: SessionLabels = {
    primaryLabels: [],
    secondaryLabels: [],
    strengths: [],
    weaknesses: [],
  };

  const allFlags = collectAllFlags(messages);

  // Primary labels based on patterns
  // "too_needy" - flags include neediness-related terms
  if (
    allFlags.some(
      (f) =>
        f.includes('need') ||
        f.includes('desperate') ||
        f.includes('validation') ||
        f.includes('approval'),
    )
  ) {
    labels.primaryLabels.push('too_needy');
  }

  // "high_charisma_low_warmth" - high charisma but low emotional warmth
  if (
    charismaIndex !== null &&
    charismaIndex >= THRESHOLDS.HIGH_CHARISMA &&
    traitProfile.emotionalWarmth <= THRESHOLDS.LOW_WARMTH
  ) {
    labels.primaryLabels.push('high_charisma_low_warmth');
  }

  // "consistent_clarity" - low std dev in clarity
  if (
    traitProfile.clarityStdDev !== undefined &&
    traitProfile.clarityStdDev <= THRESHOLDS.CONSISTENT_STD_DEV
  ) {
    labels.primaryLabels.push('consistent_clarity');
  }

  // "inconsistent_performance" - high std dev in confidence
  if (
    traitProfile.confidenceStdDev !== undefined &&
    traitProfile.confidenceStdDev > THRESHOLDS.CONSISTENT_STD_DEV * 2
  ) {
    labels.primaryLabels.push('inconsistent_performance');
  }

  // Secondary labels
  // "improving_towards_end" - will be set by caller if improvement trend detected
  // "started_weak" - will be set by caller if first messages were low-scoring

  // Strengths and weaknesses based on trait thresholds
  const traitKeys: CharismaTraitKey[] = [
    'confidence',
    'clarity',
    'humor',
    'tensionControl',
    'emotionalWarmth',
    'dominance',
  ];

  for (const trait of traitKeys) {
    const value = traitProfile[trait];
    if (value >= THRESHOLDS.HIGH_TRAIT) {
      labels.strengths.push(`strong_${trait}`);
    } else if (value <= THRESHOLDS.LOW_TRAIT) {
      labels.weaknesses.push(`low_${trait}`);
    }
  }

  // Special strength labels
  if (charismaIndex !== null && charismaIndex >= THRESHOLDS.HIGH_CHARISMA) {
    labels.strengths.push('excellent_charisma');
  }

  return labels;
}

