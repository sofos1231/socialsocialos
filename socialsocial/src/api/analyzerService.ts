// socialsocial/src/api/analyzerService.ts
// Step 5.7: Analyzer API client

import apiClient from './apiClient';
import { LockedResponse } from './types';

/**
 * Step 5.7: Message list item DTO
 */
export interface MessageListItemDTO {
  messageId: string;
  sessionId: string;
  recordedAtISO: string;
  turnIndex: number;
  contentSnippet: string;
  /** @deprecated - legacy numeric score, kept for cosmetic display only */
  score: number;
  breakdown?: MessageBreakdownDTO;
  // Phase 3: Checklist-native fields
  tier?: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
  checklistFlags?: string[]; // MessageChecklistFlag[]
}

/**
 * Step 5.7: Message breakdown DTO (shared with stats)
 */
export interface MessageBreakdownDTO {
  score: number;
  traits: Record<string, number>;
  hooks: string[];
  patterns: string[];
  whyItWorked: string[];
  whatToImprove: string[];
}

/**
 * Step 5.7: Deep paragraph DTO
 */
export interface DeepParagraphDTO {
  id: string;
  title: string;
  body: string;
  category?: string;
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
 * Step 5.12: Fetch analyzer lists (positive and negative messages)
 * Returns LockedResponse wrapper for premium gating
 */
export async function fetchAnalyzerLists(): Promise<LockedResponse<AnalyzerListsResponse>> {
  const res = await apiClient.get<LockedResponse<AnalyzerListsResponse>>('/analyzer/lists');
  return res.data;
}

/**
 * Step 5.12: Analyze a specific message
 * Returns LockedResponse wrapper for premium gating
 */
export async function analyzeMessage(messageId: string): Promise<LockedResponse<AnalyzeMessageResponse>> {
  const res = await apiClient.post<LockedResponse<AnalyzeMessageResponse>>('/analyzer/analyze', { messageId });
  return res.data;
}

/**
 * Step 5.7: Burn a message (exclude from all lists)
 */
export async function burnMessage(messageId: string): Promise<void> {
  await apiClient.post('/analyzer/burn', { messageId });
  // 204 No Content - no data to return
}

