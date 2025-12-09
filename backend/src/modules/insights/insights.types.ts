// backend/src/modules/insights/insights.types.ts
// Phase 0: Deep Insights contract types

import { CharismaTraitKey } from '../ai/ai-scoring.types';

/**
 * MessageRarity tier (extends existing 'C' | 'B' | 'A' | 'S' | 'S+' to include 'D')
 */
export type MessageRarityTier = 'D' | 'C' | 'B' | 'A' | 'S' | 'S+';

/**
 * Trait snapshot at a specific message moment
 */
export interface TraitSnapshot {
  confidence: number;
  clarity: number;
  humor: number;
  tensionControl: number;
  emotionalWarmth: number;
  dominance: number;
  // Future: additional traits can be added here
}

/**
 * Best/Worst message entry in Deep Insights
 */
export interface InsightMessageHighlight {
  messageId: string;
  messageIndex: number; // user message index (0-based, only counting USER messages)
  turnIndex: number; // full transcript turn index (includes AI)
  text: string; // full message text (or truncated for worst)
  rareTier: MessageRarityTier;
  score: number; // 0-100
  traitsSnapshot: TraitSnapshot;
  flags: string[]; // e.g. ['neediness', 'overexplaining']
  label: 'great' | 'good' | 'neutral' | 'weak' | 'cringe';
}

/**
 * Aggregated trait profile for entire session
 */
export interface SessionTraitProfile {
  confidence: number; // 0-100, average across all user messages
  clarity: number;
  humor: number;
  tensionControl: number;
  emotionalWarmth: number;
  dominance: number;
  // Standard deviation (optional, for variance analysis)
  confidenceStdDev?: number;
  clarityStdDev?: number;
  // ... other std devs if needed
}

/**
 * High-level session labels (computed from trait profile + patterns)
 */
export interface SessionLabels {
  primaryLabels: string[]; // e.g. ['too_needy', 'high_charisma_low_warmth', 'consistent_clarity']
  secondaryLabels: string[]; // additional context labels
  strengths: string[]; // e.g. ['strong_humor', 'excellent_confidence']
  weaknesses: string[]; // e.g. ['low_warmth', 'excessive_tension']
}

/**
 * Narrative insight fields (templated text)
 */
export interface NarrativeInsights {
  primaryInsight: string; // Main takeaway (2-3 sentences)
  secondaryInsight?: string; // Supporting context (optional)
  actionableAdvice?: string; // What to improve next time (optional)
}

/**
 * Deep Insights contract for a completed mission session
 * This is what will be stored in MissionDeepInsights.insightsJson
 */
export interface MissionDeepInsightsPayload {
  // Identifiers
  sessionId: string;
  userId: string;
  missionId: string; // templateId
  createdAt: string; // ISO 8601 timestamp
  version: string; // e.g. "v1"

  // Message highlights
  bestMessages: InsightMessageHighlight[]; // Top 3
  worstMessages: InsightMessageHighlight[]; // Top 3

  // Aggregated traits
  traitProfile: SessionTraitProfile;

  // High-level labels
  labels: SessionLabels;

  // Narrative insights
  narrativeInsights: NarrativeInsights;

  // Metadata for Prompt/Hook system consumption
  metaForHooks: {
    averageRarityTier: MessageRarityTier; // computed from all messages
    totalMessages: number;
    rareTierCounts: Record<MessageRarityTier, number>; // e.g. { 'S': 2, 'A': 1, 'C': 3 }
    highestStreakTier: MessageRarityTier; // best consecutive tier streak
    lowestStreakTier: MessageRarityTier; // worst consecutive tier streak
  };

  // Optional: computed fields for dashboard
  computedFields?: {
    overallCharismaIndex: number; // from CoreMetrics
    improvementTrend?: 'improving' | 'declining' | 'stable'; // comparing first vs last half
    consistencyScore?: number; // 0-100, how consistent were message scores
  };

  // Step 5.2: Insights v2 payload (optional, merged into insightsJson)
  insightsV2?: InsightsV2Payload;
}

/**
 * Step 5.2: Insight kinds for v2 engine
 */
export type InsightKind = 'GATE_FAIL' | 'POSITIVE_HOOK' | 'NEGATIVE_PATTERN' | 'GENERAL_TIP';

/**
 * Step 5.2: Insight card shown to user (lightweight output)
 */
export interface InsightCard {
  id: string; // Stable unique ID (e.g. 'gate_min_messages_too_short')
  kind: InsightKind;
  category: string; // e.g. 'empathy', 'humor', 'clarity', 'tension', 'confidence'
  title: string;
  body: string;
  relatedTurnIndex?: number; // Optional: which message this relates to
}

/**
 * Step 5.2: Insights v2 payload structure
 */
export interface InsightsV2Payload {
  gateInsights: InsightCard[];
  positiveInsights: InsightCard[];
  negativeInsights: InsightCard[];
  traitDeltas: Record<string, number>; // e.g. { confidence: 0.5, clarity: -0.2 }
  meta: {
    seed: string; // Deterministic seed used for selection
    excludedIds: string[]; // Insight IDs excluded from last 5 missions
    pickedIds: string[]; // Insight IDs selected for this mission
    version: 'v2';
  };
}

/**
 * Step 5.2: Deep Insights API response (for FE/BE contract)
 */
export interface DeepInsightsResponse {
  insightsV2: InsightsV2Payload;
  // v1 extras can be added here if needed for FE
}

/**
 * Step 5.2: Internal types for engine
 */

/**
 * Insight template (registry entry)
 */
export interface InsightTemplate {
  id: string; // Stable unique ID
  kind: InsightKind;
  category: string;
  weight: number; // For weighted selection
  cooldownMissions: number; // 3-5 typical
  title: string;
  body: string;
  requires?: {
    gateKey?: string;
    hookKey?: string;
    patternKey?: string;
  };
}

/**
 * Candidate insight (before selection)
 */
export interface CandidateInsight {
  id: string;
  kind: InsightKind;
  category: string;
  priority: number; // Gate=100, Hook=80, Pattern=60, Tip=40
  weight: number;
  evidence?: {
    gateKey?: string;
    hookKey?: string;
    patternKey?: string;
    turnIndex?: number;
    strength?: number;
    severity?: number;
  };
}

/**
 * Insight signals extracted from session data
 */
export interface InsightSignals {
  gateFails: Array<{
    gateKey: string;
    reasonCode?: string;
  }>;
  positiveHooks: Array<{
    hookKey: string;
    strength: number;
    turnIndex?: number;
  }>;
  negativePatterns: Array<{
    patternKey: string;
    severity: number;
    turnIndex?: number;
  }>;
  traitSnapshot: Record<string, number>;
  topMessages: Array<{
    turnIndex: number;
    score: number;
  }>;
  bottomMessages: Array<{
    turnIndex: number;
    score: number;
  }>;
}

