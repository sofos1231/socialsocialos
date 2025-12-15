// FILE: backend/src/modules/queue/jobs/message-analysis.job.ts
// Phase 1: Message Analysis Job Payload Type

/**
 * Phase 1: Message Analysis Job Payload
 * Enqueued from Lane A after each AI reply is generated
 */
export interface MessageAnalysisJobPayload {
  sessionId: string;
  messageIndex: number; // AI message index we're analyzing
  userId?: string | null;
}

