// backend/src/modules/scoring/five-layer.types.ts
// Phase 0: Five-Layer Scoring contract types

import { MessageRarityTier } from '../insights/insights.types';
import { CharismaTraitKey } from '../ai/ai-scoring.types';

/**
 * Five logical layers for message evaluation
 * L1-L5 are generic names; mapping to semantic meanings will be configurable
 */
export interface FiveLayerScore {
  L1: number; // Layer 1 (0-100) - e.g. "Clarity/Fundamentals"
  L2: number; // Layer 2 (0-100) - e.g. "Emotional Intelligence"
  L3: number; // Layer 3 (0-100) - e.g. "Social Dynamics"
  L4: number; // Layer 4 (0-100) - e.g. "Charisma/Confidence"
  L5: number; // Layer 5 (0-100) - e.g. "Advanced Techniques"
}

/**
 * Per-message five-layer score snapshot
 */
export interface FiveLayerScoreSnapshot {
  // Identifiers
  messageId: string;
  sessionId: string;
  userId: string;
  messageIndex: number; // user message index (0-based, only counting USER messages)
  turnIndex: number; // full transcript turn index (includes AI)
  createdAt: string; // ISO 8601 timestamp

  // Five-layer scores
  layers: FiveLayerScore;

  // Overall composite score (weighted average of L1-L5, or custom formula)
  overallScore: number; // 0-100

  // Overall rare tier (computed from overallScore or highest layer)
  rareTier: MessageRarityTier;

  // Traits derived from layers at this moment (may differ from raw traits)
  derivedTraits: Record<CharismaTraitKey, number>; // 0-100 per trait

  // Optional: layer-specific metadata
  layerMetadata?: {
    L1?: { reason?: string; flags?: string[] };
    L2?: { reason?: string; flags?: string[] };
    L3?: { reason?: string; flags?: string[] };
    L4?: { reason?: string; flags?: string[] };
    L5?: { reason?: string; flags?: string[] };
  };

  // Version for future compatibility
  version: string; // e.g. "v1"
}

/**
 * Extended traitData shape that includes fiveLayer (for ChatMessage.traitData JSON)
 */
export interface TraitDataWithFiveLayer {
  traits: Record<string, any>;
  flags: string[];
  label: string | null;
  fiveLayer?: {
    L1: number;
    L2: number;
    L3: number;
    L4: number;
    L5: number;
    overallScore: number;
    rareTier: MessageRarityTier;
    version: string;
  };
}

