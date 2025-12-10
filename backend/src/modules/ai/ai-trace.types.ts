// FILE: backend/src/modules/ai/ai-trace.types.ts
// Step 6.10: AI call trace snapshot types for observability

import { AiErrorCode } from './providers/ai-provider.types';
import type { MissionConfigV1Dynamics, MissionConfigV1Difficulty } from '../missions-admin/mission-config-v1.schema';
import type { MissionStateV1 } from '../ai-engine/mission-state-v1.schema';

export interface AiCallTraceSnapshot {
  missionId: string;
  sessionId?: string;
  userId?: string;
  aiProfile?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  dynamics?: MissionConfigV1Dynamics | null;
  difficulty?: MissionConfigV1Difficulty | null;
  moodState?: MissionStateV1['mood'] | null;
  microDynamics?: MissionStateV1['microDynamics'] | null;
  personaStability?: number | null;
  activeModifiers?: MissionStateV1['activeModifiers'] | null;
  provider: string;
  model: string;
  latencyMs: number;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  errorCode?: AiErrorCode;
  syntheticReply?: boolean;
  timestamp: string;
}

