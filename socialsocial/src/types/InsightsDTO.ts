// socialsocial/src/types/InsightsDTO.ts
// Step 5.3: Shared DTO types for insights data (allowlisted fields for 5.3 + 5.4)

/**
 * Insight kind types
 */
export type InsightKind = 'GATE_FAIL' | 'POSITIVE_HOOK' | 'NEGATIVE_PATTERN' | 'GENERAL_TIP';

/**
 * Insight card (allowlisted output shape)
 */
export interface InsightCard {
  id: string;
  kind: InsightKind;
  category: string;
  title: string;
  body: string;
  relatedTurnIndex?: number; // Optional: which message this relates to
}

/**
 * Insights v2 payload structure
 */
export interface InsightsV2Payload {
  gateInsights: InsightCard[];
  positiveInsights: InsightCard[];
  negativeInsights: InsightCard[];
  traitDeltas: Record<string, number>; // e.g. { confidence: 0.5, clarity: -0.2 }
  meta: {
    seed: string;
    excludedIds: string[];
    pickedIds: string[];
    pickedParagraphIds?: string[]; // Step 5.8: Analyzer paragraph IDs selected for this mission
    version: 'v2';
  };
}

/**
 * Deep paragraph DTO (from analyzer)
 */
export interface DeepParagraphDTO {
  id: string;
  title: string;
  body: string;
  category?: string;
}

/**
 * Step 5.10: Mood state enum
 */
export type MoodState = 'COLD' | 'NEUTRAL' | 'WARM' | 'TENSE' | 'FLOW';

/**
 * Step 5.10: Mood snapshot (simplified for frontend)
 */
export interface MoodSnapshot {
  turnIndex: number;
  smoothedMoodScore: number;
  moodState: MoodState;
}

/**
 * Step 5.10: Mood timeline API response
 */
export interface MoodTimelineResponse {
  sessionId: string;
  payload: {
    version: number;
    snapshots: MoodSnapshot[];
    current: {
      moodState: MoodState;
      moodPercent: number;
    };
    moodInsights?: {
      pickedIds: string[];
      insights: Array<{
        id: string;
        title: string;
        body: string;
      }>;
    };
  };
  current: {
    moodState: MoodState;
    moodPercent: number;
  };
  insights: Array<{
    id: string;
    title: string;
    body: string;
  }>;
}

/**
 * Deep Insights API response (matches backend contract)
 * Step 5.9: Extended to include analyzer paragraphs
 */
export interface DeepInsightsResponse {
  insightsV2: InsightsV2Payload;
  analyzerParagraphs?: DeepParagraphDTO[]; // Step 5.9: Analyzer paragraphs for this session
}

// Alias for consistency
export type InsightsDTO = DeepInsightsResponse;

