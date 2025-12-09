// socialsocial/src/types/MissionEndTypes.ts
// Step 5.3: Types for MissionEndScreen selectedPack

import { InsightCard, DeepParagraphDTO } from './InsightsDTO';

/**
 * Top/Bottom message card (computed from session messages)
 */
export interface MessageHighlight {
  turnIndex: number;
  content: string;
  score: number;
  rarity: string | null;
}

/**
 * End reason banner data (normalized)
 */
export interface EndReasonBanner {
  code: string | null;
  title: string;
  subtitle: string;
  tone: 'success' | 'fail' | 'warning' | 'danger' | 'neutral';
  disqualifyNote?: string;
}

/**
 * Mood teaser (computed locally)
 */
export interface MoodTeaser {
  averageScore: number;
  timeline?: any; // Optional: backend timeline if exists in future
}

/**
 * Step 5.3: Single source of truth for MissionEndScreen UI
 * All components must use this pack, not fetch their own data
 */
export interface MissionEndSelectedPack {
  // Session metadata (minimal normalized)
  session: {
    id: string;
    status: 'SUCCESS' | 'FAIL';
    endedAt: string | null; // ISO string (if available)
    createdAt: string; // ISO string
    templateId: string | null;
    personaId: string | null;
  };

  // Rewards (safe defaults: all zeros if missing)
  rewards: {
    score: number;
    xpGained: number;
    coinsGained: number;
    gemsGained: number;
    rarityCounts: Record<string, number>; // e.g. { 'S': 2, 'A': 1 }
  };

  // End reason (normalized)
  endReason: EndReasonBanner;

  // Top 3 + Bottom 3 USER messages (computed from server messages)
  topMessages: MessageHighlight[];
  bottomMessages: MessageHighlight[];
  // Messages referenced by insights but not in top/bottom (ensures scroll-to-message works)
  referencedMessages: MessageHighlight[];

  // Insights v2 (grouped, safe defaults: empty arrays)
  insightsV2: {
    gateInsights: InsightCard[];
    positiveInsights: InsightCard[];
    negativeInsights: InsightCard[];
  };

  // Trait deltas (safe default: empty object)
  traitDeltas: Record<string, number>;

  // Step 5.9: Analyzer paragraphs (safe default: empty array)
  analyzerParagraphs: DeepParagraphDTO[];

  // Mood teaser (safe default: computed locally)
  moodTeaser: MoodTeaser | null;

  // Synergy teaser (locked placeholder)
  synergyTeaserLocked: boolean; // Always true for Step 5.3

  // Reserved badge slot (Step 5.4 glue)
  reservedBadgeSlotData: {
    status: 'placeholder';
  } | null;
}

