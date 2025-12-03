// FILE: backend/src/modules/ai/providers/openai.client.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  private get model(): string {
    return (
      this.config.get<string>('OPENAI_MODEL') ||
      process.env.OPENAI_MODEL ||
      'gpt-4o-mini'
    );
  }

  private get timeoutMs(): number {
    const raw =
      this.config.get<string>('AI_TIMEOUT_MS') ||
      process.env.AI_TIMEOUT_MS ||
      '15000';
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 15000;
  }

  async createChatCompletion(params: {
    messages: OpenAiChatMessage[];
    temperature?: number;
    maxTokens?: number;
    responseFormat?: ResponseFormatMode;
  }): Promise<{ text: string; debug: { model: string; ms: number } }> {
    const key = this.apiKey;
    if (!key) {
      return {
        text: 'AI provider not configured (missing OPENAI_API_KEY).',
        debug: { model: 'none', ms: 0 },
      };
    }

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = Date.now();

    try {
      const body: any = {
        model: this.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 220,
      };

      if (params.responseFormat === 'json_object') {
        // Chat Completions JSON mode
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
        this.logger.warn(
          `OpenAI error ${res.status} ${res.statusText} body=${txt.slice(0, 600)}`,
        );
        return {
          text: "Sorry — I couldn't generate a reply right now.",
          debug: { model: this.model, ms },
        };
      }

      const json: any = await res.json();

      const text =
        json?.choices?.[0]?.message?.content ??
        json?.choices?.[0]?.text ??
        '';

      const cleaned =
        typeof text === 'string' && text.trim().length > 0
          ? text.trim()
          : "Sorry — I couldn't generate a reply right now.";

      return { text: cleaned, debug: { model: this.model, ms } };
    } catch (err: any) {
      const ms = Date.now() - startedAt;
      const aborted = err?.name === 'AbortError';
      if (aborted) this.logger.warn(`OpenAI timeout after ${ms}ms`);
      else this.logger.error(`OpenAI call failed: ${err?.message || err}`);
      return {
        text: "Sorry — I couldn't generate a reply right now.",
        debug: { model: this.model, ms },
      };
    } finally {
      clearTimeout(t);
    }
  }
}
