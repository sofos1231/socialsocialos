// FILE: backend/src/modules/queue/jobs/insights.job.ts
// Phase 1: Insights Job Payload Type

/**
 * Phase 1: Insights Job Payload
 * Enqueued when mission ends (SUCCESS/FAIL/ABORTED)
 */
export interface InsightsJobPayload {
  sessionId: string;
  userId?: string | null;
}

