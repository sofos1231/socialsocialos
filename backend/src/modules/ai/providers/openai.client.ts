// FILE: backend/src/modules/ai/providers/openai.client.ts
// Step 6.9: Upgraded with structured results, error classification, retry logic, and token extraction

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiCallResult,
  AiCallDebug,
  AiErrorCode,
  AiProviderConfig,
} from './ai-provider.types';

type ChatRole = 'system' | 'user' | 'assistant';

export type OpenAiChatMessage = {
  role: ChatRole;
  content: string;
};

type ResponseFormatMode = 'json_object';

@Injectable()
export class OpenAiClient {
  private readonly logger = new Logger(OpenAiClient.name);

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string | null {
    return (
      this.config.get<string>('OPENAI_API_KEY') ||
      process.env.OPENAI_API_KEY ||
      null
    );
  }

  private get defaultModel(): string {
    return (
      this.config.get<string>('OPENAI_MODEL') ||
      process.env.OPENAI_MODEL ||
      'gpt-4o-mini'
    );
  }

  private get defaultTimeoutMs(): number {
    const raw =
      this.config.get<string>('AI_TIMEOUT_MS') ||
      process.env.AI_TIMEOUT_MS ||
      '15000';
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 15000;
  }

  /**
   * Step 6.9: Classify error from response status or exception
   */
  private classifyError(status: number | null, err: any): AiErrorCode {
    if (err?.name === 'AbortError') {
      return 'TRANSIENT_TIMEOUT';
    }

    if (status === null) {
      return 'UNKNOWN';
    }

    if (status === 429) {
      return 'TRANSIENT_RATE_LIMIT';
    }

    if (status >= 500 && status < 600) {
      return 'TRANSIENT_5XX';
    }

    if (status === 400) {
      return 'PERMANENT_BAD_REQUEST';
    }

    if (status === 401 || status === 403) {
      return 'PERMANENT_UNAUTHORIZED';
    }

    return 'UNKNOWN';
  }

  /**
   * Step 6.9: Single attempt to call OpenAI API
   */
  private async attemptCall(params: {
    messages: OpenAiChatMessage[];
    config: AiProviderConfig;
    responseFormat?: ResponseFormatMode;
    attempt: number;
  }): Promise<AiCallResult> {
    const key = this.apiKey;
    if (!key) {
      return {
        ok: false,
        errorCode: 'PERMANENT_CONFIG',
        errorMessage: 'AI provider not configured (missing OPENAI_API_KEY)',
        debug: {
          model: params.config.model ?? this.defaultModel,
          ms: 0,
          attempt: params.attempt,
        },
      };
    }

    const model = params.config.model ?? this.defaultModel;
    const timeoutMs = params.config.timeoutMs ?? this.defaultTimeoutMs;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      const body: any = {
        model,
        messages: params.messages,
        temperature: params.config.temperature ?? 0.7,
        max_tokens: params.config.maxTokens ?? 220,
      };

      if (params.config.topP !== undefined) {
        body.top_p = params.config.topP;
      }
      if (params.config.presencePenalty !== undefined) {
        body.presence_penalty = params.config.presencePenalty;
      }
      if (params.config.frequencyPenalty !== undefined) {
        body.frequency_penalty = params.config.frequencyPenalty;
      }

      if (params.responseFormat === 'json_object') {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const ms = Date.now() - startedAt;

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        const errorCode = this.classifyError(res.status, null);
        this.logger.warn(
          `OpenAI error ${res.status} ${res.statusText} (${errorCode}) body=${txt.slice(0, 600)}`,
        );

        // Extract token usage if available in error response
        let tokens: AiCallDebug['tokens'] | undefined;
        try {
          const errorJson = JSON.parse(txt);
          if (errorJson?.usage) {
            tokens = {
              promptTokens: errorJson.usage.prompt_tokens,
              completionTokens: errorJson.usage.completion_tokens,
              totalTokens: errorJson.usage.total_tokens,
            };
          }
        } catch {
          // Ignore parse errors
        }

        return {
          ok: false,
          errorCode,
          errorMessage: `OpenAI API error: ${res.status} ${res.statusText}`,
          debug: {
            model,
            ms,
            tokens,
            attempt: params.attempt,
          },
        };
      }

      const json: any = await res.json();

      // Step 6.9: Extract token usage from response
      const tokens: AiCallDebug['tokens'] | undefined = json?.usage
        ? {
            promptTokens: json.usage.prompt_tokens,
            completionTokens: json.usage.completion_tokens,
            totalTokens: json.usage.total_tokens,
          }
        : undefined;

      const text =
        json?.choices?.[0]?.message?.content ??
        json?.choices?.[0]?.text ??
        '';

      const cleaned =
        typeof text === 'string' && text.trim().length > 0
          ? text.trim()
          : "Sorry — I couldn't generate a reply right now.";

      return {
        ok: true,
        text: cleaned,
        debug: {
          model,
          ms,
          tokens,
          attempt: params.attempt,
        },
      };
    } catch (err: any) {
      const ms = Date.now() - startedAt;
      const errorCode = this.classifyError(null, err);
      if (errorCode === 'TRANSIENT_TIMEOUT') {
        this.logger.warn(`OpenAI timeout after ${ms}ms (attempt ${params.attempt})`);
      } else {
        this.logger.error(
          `OpenAI call failed (attempt ${params.attempt}): ${err?.message || err}`,
        );
      }

      return {
        ok: false,
        errorCode,
        errorMessage: err?.message || 'Unknown error during OpenAI API call',
        debug: {
          model: params.config.model ?? this.defaultModel,
          ms,
          attempt: params.attempt,
        },
      };
    } finally {
      clearTimeout(t);
    }
  }

  /**
   * Step 6.9: Main entry point with retry logic
   */
  async createChatCompletion(params: {
    messages: OpenAiChatMessage[];
    temperature?: number;
    maxTokens?: number;
    responseFormat?: ResponseFormatMode;
    config?: AiProviderConfig; // Step 6.9: Optional provider config
  }): Promise<AiCallResult> {
    // Step 6.9: Build config from params (backward compatible) or use provided config
    const config: AiProviderConfig = params.config ?? {
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    };

    const retryConfig = config.retryConfig ?? {
      maxAttempts: 3,
      backoffMs: [200, 500, 1000],
    };

    const maxAttempts = retryConfig.maxAttempts ?? 3;
    const backoffMs = retryConfig.backoffMs ?? [200, 500, 1000];

    let lastResult: AiCallResult | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      lastResult = await this.attemptCall({
        messages: params.messages,
        config,
        responseFormat: params.responseFormat,
        attempt,
      });

      // If successful, return immediately
      if (lastResult.ok) {
        return lastResult;
      }

      // If permanent error, don't retry
      // TypeScript narrowing: lastResult.ok is false, so lastResult is the error variant
      const errorResult = lastResult as Extract<typeof lastResult, { ok: false }>;
      if (
        errorResult.errorCode === 'PERMANENT_BAD_REQUEST' ||
        errorResult.errorCode === 'PERMANENT_UNAUTHORIZED' ||
        errorResult.errorCode === 'PERMANENT_CONFIG'
      ) {
        return lastResult;
      }

      // If transient error and not last attempt, wait and retry
      if (attempt < maxAttempts) {
        const backoff = backoffMs[attempt - 1] ?? backoffMs[backoffMs.length - 1];
        this.logger.debug(
          `Retrying OpenAI call after ${backoff}ms (attempt ${attempt}/${maxAttempts})`,
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }

    // All retries exhausted
    return lastResult!;
  }
}
