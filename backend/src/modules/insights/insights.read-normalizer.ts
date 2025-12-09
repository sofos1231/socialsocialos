// backend/src/modules/insights/insights.read-normalizer.ts
// Step 5.2: Read normalization for safe defaults (no 500s for old sessions)

import { DeepInsightsResponse, InsightsV2Payload } from './insights.types';
import { DeepParagraphDTO } from '../analyzer/analyzer.types';

/**
 * Normalize insights response with safe defaults
 * Ensures old sessions without v2 data return empty arrays instead of causing errors
 * 
 * @param rawJson - Raw insightsJson from MissionDeepInsights
 * @returns Normalized DeepInsightsResponse
 */
export function normalizeInsightsResponse(rawJson: any): DeepInsightsResponse {
  const v2Payload = rawJson?.insightsV2;

  // Safe defaults if v2 is missing or malformed
  const defaultV2: InsightsV2Payload = {
    gateInsights: [],
    positiveInsights: [],
    negativeInsights: [],
    traitDeltas: {},
    meta: {
      seed: '',
      excludedIds: [],
      pickedIds: [],
      version: 'v2',
    },
  };

  // Validate and normalize v2 payload
  if (!v2Payload || typeof v2Payload !== 'object') {
    return { insightsV2: defaultV2 };
  }

  // Ensure arrays exist and are arrays
  const normalized: InsightsV2Payload = {
    gateInsights: Array.isArray(v2Payload.gateInsights) ? v2Payload.gateInsights : [],
    positiveInsights: Array.isArray(v2Payload.positiveInsights)
      ? v2Payload.positiveInsights
      : [],
    negativeInsights: Array.isArray(v2Payload.negativeInsights)
      ? v2Payload.negativeInsights
      : [],
    traitDeltas: v2Payload.traitDeltas && typeof v2Payload.traitDeltas === 'object'
      ? v2Payload.traitDeltas
      : {},
    meta: {
      seed: typeof v2Payload.meta?.seed === 'string' ? v2Payload.meta.seed : '',
      excludedIds: Array.isArray(v2Payload.meta?.excludedIds)
        ? v2Payload.meta.excludedIds
        : [],
      pickedIds: Array.isArray(v2Payload.meta?.pickedIds) ? v2Payload.meta.pickedIds : [],
      pickedParagraphIds: Array.isArray(v2Payload.meta?.pickedParagraphIds)
        ? v2Payload.meta.pickedParagraphIds
        : [],
      version: 'v2',
    },
  };

  // Step 5.9: Include analyzer paragraphs if present
  const analyzerParagraphs: DeepParagraphDTO[] | undefined = rawJson?.analyzerParagraphs;

  return {
    insightsV2: normalized,
    ...(analyzerParagraphs && Array.isArray(analyzerParagraphs) && analyzerParagraphs.length > 0
      ? { analyzerParagraphs }
      : {}),
  };
}

