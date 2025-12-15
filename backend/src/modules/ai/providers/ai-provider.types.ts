// FILE: backend/src/modules/ai/providers/ai-provider.types.ts
// Step 6.9: AI Provider types for structured results, error classification, and configuration

export type AiErrorCode =
  | 'TRANSIENT_TIMEOUT'
  | 'TRANSIENT_RATE_LIMIT'
  | 'TRANSIENT_5XX'
  | 'PERMANENT_BAD_REQUEST'
  | 'PERMANENT_UNAUTHORIZED'
  | 'PERMANENT_CONFIG'
  | 'UNKNOWN';

export interface AiProviderConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  timeoutMs?: number;
  responseFormat?: string; // e.g., 'json_object' for OpenAI
  retryConfig?: {
    maxAttempts?: number; // Default: 3
    backoffMs?: number[]; // Default: [200, 500, 1000]
  };
}

export interface AiCallDebug {
  model: string;
  ms: number;
  tokens?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  attempt?: number; // Which retry attempt this was (1 = first attempt)
}

export type AiCallResult<T = string> =
  | {
      ok: true;
      text: T;
      debug: AiCallDebug;
    }
  | {
      ok: false;
      errorCode: AiErrorCode;
      errorMessage: string;
      debug: AiCallDebug;
    };

