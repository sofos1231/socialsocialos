// FILE: backend/src/modules/queue/jobs/deep-analysis.job.ts
// Step 8: Deep Analysis Job Payload Type

/**
 * Step 8: Deep Analysis Job Payload
 * Enqueued from FastPath after AI reply is generated
 */
export interface DeepAnalysisJobPayload {
  traceId: string; // AI call trace ID
  missionId: string | null; // templateId or 'freeplay'
  sessionId: string;
  userId: string;
  lastMessageIndex: number; // Last message index in trace
  fastTags: {
    localScoreTier: string;
    moodDelta: string;
    tensionDelta: string;
    comfortDelta: string;
    boundaryRisk: string;
    microFlags: string[];
  };
  timestamp: string; // ISO timestamp
}

