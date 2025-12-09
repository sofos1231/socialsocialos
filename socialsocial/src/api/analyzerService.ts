// socialsocial/src/api/analyzerService.ts
// Step 5.7: Analyzer API client

import apiClient from './apiClient';

/**
 * Step 5.7: Message list item DTO
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
 * Step 5.7: Fetch analyzer lists (positive and negative messages)
 */
export async function fetchAnalyzerLists(): Promise<AnalyzerListsResponse> {
  const res = await apiClient.get<AnalyzerListsResponse>('/analyzer/lists');
  return res.data;
}

/**
 * Step 5.7: Analyze a specific message
 */
export async function analyzeMessage(messageId: string): Promise<AnalyzeMessageResponse> {
  const res = await apiClient.post<AnalyzeMessageResponse>('/analyzer/analyze', { messageId });
  return res.data;
}

/**
 * Step 5.7: Burn a message (exclude from all lists)
 */
export async function burnMessage(messageId: string): Promise<void> {
  await apiClient.post('/analyzer/burn', { messageId });
  // 204 No Content - no data to return
}

