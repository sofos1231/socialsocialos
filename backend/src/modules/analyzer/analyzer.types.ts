// backend/src/modules/analyzer/analyzer.types.ts
// Step 5.7: Analyzer module types

import { MessageBreakdownDTO } from '../stats/stats.types';

/**
 * Step 5.7: Message list item DTO (for analyzer lists)
 */
export interface MessageListItemDTO {
  messageId: string;
  sessionId: string;
  recordedAtISO: string;
  turnIndex: number;
  contentSnippet: string;
  score: number;
  breakdown?: MessageBreakdownDTO;
}

/**
 * Step 5.7: Deep paragraph DTO (for analysis results)
 */
export interface DeepParagraphDTO {
  id: string; // stable ID for cooldown tracking (glue for 5.8)
  title: string;
  body: string;
  category?: string; // optional grouping label
}

/**
 * Step 5.7: Analyzer lists response
 */
export interface AnalyzerListsResponse {
  positive: MessageListItemDTO[];
  negative: MessageListItemDTO[];
}

/**
 * Step 5.7: Analyze message response
 */
export interface AnalyzeMessageResponse {
  message: MessageListItemDTO;
  breakdown: MessageBreakdownDTO;
  paragraphs: DeepParagraphDTO[];
}

/**
 * Step 5.7: Burn message request
 */
export interface BurnMessageRequest {
  messageId: string;
}

