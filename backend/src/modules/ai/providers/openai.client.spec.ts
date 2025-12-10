// FILE: backend/src/modules/ai/providers/openai.client.spec.ts
// Step 6.9: Tests for OpenAiClient with structured results and error classification

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAiClient } from './openai.client';
import { AiErrorCode } from './ai-provider.types';

describe('OpenAiClient', () => {
  let client: OpenAiClient;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAiClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    client = module.get<OpenAiClient>(OpenAiClient);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('error classification', () => {
    it('should classify timeout as TRANSIENT_TIMEOUT', () => {
      const error = { name: 'AbortError' };
      const result = (client as any).classifyError(null, error);
      expect(result).toBe('TRANSIENT_TIMEOUT');
    });

    it('should classify 429 as TRANSIENT_RATE_LIMIT', () => {
      const result = (client as any).classifyError(429, null);
      expect(result).toBe('TRANSIENT_RATE_LIMIT');
    });

    it('should classify 500 as TRANSIENT_5XX', () => {
      const result = (client as any).classifyError(500, null);
      expect(result).toBe('TRANSIENT_5XX');
    });

    it('should classify 400 as PERMANENT_BAD_REQUEST', () => {
      const result = (client as any).classifyError(400, null);
      expect(result).toBe('PERMANENT_BAD_REQUEST');
    });

    it('should classify 401 as PERMANENT_UNAUTHORIZED', () => {
      const result = (client as any).classifyError(401, null);
      expect(result).toBe('PERMANENT_UNAUTHORIZED');
    });
  });

  describe('createChatCompletion', () => {
    it('should return PERMANENT_CONFIG error when API key is missing', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(null);
      process.env.OPENAI_API_KEY = '';

      const result = await client.createChatCompletion({
        messages: [{ role: 'user', content: 'test' }],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errorCode).toBe('PERMANENT_CONFIG');
      }
    });

    it('should extract tokens from successful OpenAI response', async () => {
      // Mock fetch to return successful response with usage
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Test reply' } }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
        }),
      });

      jest.spyOn(configService, 'get').mockReturnValue('test-key');

      const result = await client.createChatCompletion({
        messages: [{ role: 'user', content: 'test' }],
        config: {
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 200,
        },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.debug.tokens).toBeDefined();
        expect(result.debug.tokens?.promptTokens).toBe(100);
        expect(result.debug.tokens?.completionTokens).toBe(50);
        expect(result.debug.tokens?.totalTokens).toBe(150);
      }

      (global.fetch as jest.Mock).mockRestore();
    });

    it('should retry on transient errors (TRANSIENT_5XX)', async () => {
      let attemptCount = 0;
      global.fetch = jest.fn().mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          return {
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: async () => 'Server error',
          };
        }
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Success after retry' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
        };
      });

      jest.spyOn(configService, 'get').mockReturnValue('test-key');

      const result = await client.createChatCompletion({
        messages: [{ role: 'user', content: 'test' }],
        config: {
          retryConfig: {
            maxAttempts: 3,
            backoffMs: [10, 10, 10], // Short backoff for test
          },
        },
      });

      expect(attemptCount).toBe(3); // Should retry 3 times
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.text).toBe('Success after retry');
        expect(result.debug.attempt).toBe(3);
      }

      (global.fetch as jest.Mock).mockRestore();
    });

    it('should not retry on permanent errors (PERMANENT_BAD_REQUEST)', async () => {
      let attemptCount = 0;
      global.fetch = jest.fn().mockImplementation(async () => {
        attemptCount++;
        return {
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: async () => 'Invalid request',
        };
      });

      jest.spyOn(configService, 'get').mockReturnValue('test-key');

      const result = await client.createChatCompletion({
        messages: [{ role: 'user', content: 'test' }],
        config: {
          retryConfig: {
            maxAttempts: 3,
            backoffMs: [10, 10, 10],
          },
        },
      });

      expect(attemptCount).toBe(1); // Should not retry permanent errors
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errorCode).toBe('PERMANENT_BAD_REQUEST');
      }

      (global.fetch as jest.Mock).mockRestore();
    });
  });
});

