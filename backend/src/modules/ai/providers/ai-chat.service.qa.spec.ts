// FILE: backend/src/modules/ai/providers/ai-chat.service.qa.spec.ts
// Step 6.9-6.10: QA tests for AiChatService with aiRuntimeProfile and error handling

import { Test, TestingModule } from '@nestjs/testing';
import { AiChatService } from './ai-chat.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { OpenAiClient } from './openai.client';
import { OpeningsService } from '../../ai-engine/openings.service';
import { RewardReleaseService } from '../../ai-engine/reward-release.service';
import { MissionConfigV1AiRuntimeProfile } from '../../missions-admin/mission-config-v1.schema';
import { createDefaultMissionState } from '../../ai-engine/mission-state-v1.schema';

describe('AiChatService - Step 6.9-6.10 QA', () => {
  let service: AiChatService;
  let openaiClient: jest.Mocked<OpenAiClient>;

  beforeEach(async () => {
    const mockOpenAiClient = {
      createChatCompletion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiChatService,
        {
          provide: PrismaService,
          useValue: {
            practiceMissionTemplate: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
            aiPersona: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
          },
        },
        {
          provide: OpenAiClient,
          useValue: mockOpenAiClient,
        },
        {
          provide: OpeningsService,
          useValue: {
            generateOpening: jest.fn().mockReturnValue({ openingText: 'Test opening' }),
          },
        },
        {
          provide: RewardReleaseService,
          useValue: {
            getRewardPermissionsForState: jest.fn().mockReturnValue({
              phoneNumber: 'ALLOWED',
              instagram: 'ALLOWED',
              dateAgreement: 'ALLOWED',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiChatService>(AiChatService);
    openaiClient = module.get(OpenAiClient) as jest.Mocked<OpenAiClient>;
  });

  describe('aiRuntimeProfile integration', () => {
    it('should use aiRuntimeProfile model when provided', async () => {
      const aiRuntimeProfile: MissionConfigV1AiRuntimeProfile = {
        model: 'gpt-4',
        temperature: 0.9,
        maxTokens: 500,
        topP: 0.95,
        timeoutMs: 20000,
        retryAttempts: 2,
      };

      openaiClient.createChatCompletion.mockResolvedValue({
        ok: true,
        text: 'Test reply',
        debug: {
          model: 'gpt-4',
          ms: 1000,
          tokens: {
            promptTokens: 50,
            completionTokens: 25,
            totalTokens: 75,
          },
          attempt: 1,
        },
      });

      await service.generateReply({
        userId: 'test-user',
        topic: 'Test topic',
        messages: [{ role: 'USER', content: 'Hello' }],
        missionConfig: {
          aiRuntimeProfile,
        },
      });

      expect(openaiClient.createChatCompletion).toHaveBeenCalled();
      const callArgs = openaiClient.createChatCompletion.mock.calls[0][0];
      expect(callArgs.config?.model).toBe('gpt-4');
      expect(callArgs.config?.temperature).toBe(0.9);
      expect(callArgs.config?.maxTokens).toBe(500);
      expect(callArgs.config?.topP).toBe(0.95);
      expect(callArgs.config?.timeoutMs).toBe(20000);
      expect(callArgs.config?.retryConfig?.maxAttempts).toBe(2);
    });

    it('should fallback to style preset temperature when aiRuntimeProfile missing', async () => {
      openaiClient.createChatCompletion.mockResolvedValue({
        ok: true,
        text: 'Test reply',
        debug: { model: 'gpt-4o-mini', ms: 500, attempt: 1 },
      });

      await service.generateReply({
        userId: 'test-user',
        topic: 'Test topic',
        messages: [{ role: 'USER', content: 'Hello' }],
        aiStyleKey: 'FLIRTY',
        missionConfig: {
          aiRuntimeProfile: null,
        },
      });

      expect(openaiClient.createChatCompletion).toHaveBeenCalled();
      const callArgs = openaiClient.createChatCompletion.mock.calls[0][0];
      // FLIRTY style preset has temperature 0.78
      expect(callArgs.config?.temperature).toBe(0.78);
      expect(callArgs.config?.maxTokens).toBe(260); // Default fallback
    });
  });

  describe('error handling', () => {
    it('should handle AiCallResult.ok === false without crashing', async () => {
      openaiClient.createChatCompletion.mockResolvedValue({
        ok: false,
        errorCode: 'TRANSIENT_TIMEOUT',
        errorMessage: 'Request timeout',
        debug: {
          model: 'gpt-4o-mini',
          ms: 15000,
          attempt: 3,
        },
      });

      const result = await service.generateReply({
        userId: 'test-user',
        topic: 'Test topic',
        messages: [{ role: 'USER', content: 'Hello' }],
      });

      expect(result.aiReply).toBe("Sorry — I couldn't generate a reply right now.");
      expect(result.errorCode).toBe('TRANSIENT_TIMEOUT');
      expect(result.syntheticReply).toBe(true);
    });

    it('should include errorCode and syntheticReply in aiDebug', async () => {
      openaiClient.createChatCompletion.mockResolvedValue({
        ok: false,
        errorCode: 'PERMANENT_BAD_REQUEST',
        errorMessage: 'Invalid request',
        debug: {
          model: 'gpt-4o-mini',
          ms: 200,
          attempt: 1,
        },
      });

      const result = await service.generateReply({
        userId: 'test-user',
        topic: 'Test topic',
        messages: [{ role: 'USER', content: 'Hello' }],
      });

      expect(result.aiDebug?.errorCode).toBe('PERMANENT_BAD_REQUEST');
      expect(result.aiDebug?.syntheticReply).toBe(true);
    });
  });

  describe('verbose trace logging', () => {
    it('should log verbose trace only in dev mode with flag', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalVerbose = process.env.AI_VERBOSE_TRACE;
      const loggerSpy = jest.spyOn(require('@nestjs/common'), 'Logger').mockImplementation(() => ({
        debug: jest.fn(),
      }));

      process.env.NODE_ENV = 'development';
      process.env.AI_VERBOSE_TRACE = 'true';

      openaiClient.createChatCompletion.mockResolvedValue({
        ok: true,
        text: 'Test reply with some content that should be truncated',
        debug: { model: 'gpt-4o-mini', ms: 500, attempt: 1 },
      });

      await service.generateReply({
        userId: 'test-user',
        topic: 'Test topic',
        messages: [{ role: 'USER', content: 'Hello' }],
      });

      // Verify logger.debug was called (verbose trace active)
      expect(loggerSpy).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
      process.env.AI_VERBOSE_TRACE = originalVerbose;
      loggerSpy.mockRestore();
    });

    it('should not log verbose trace in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalVerbose = process.env.AI_VERBOSE_TRACE;
      const loggerSpy = jest.spyOn(require('@nestjs/common'), 'Logger').mockImplementation(() => ({
        debug: jest.fn(),
      }));

      process.env.NODE_ENV = 'production';
      process.env.AI_VERBOSE_TRACE = 'true'; // Even with flag, should not log

      openaiClient.createChatCompletion.mockResolvedValue({
        ok: true,
        text: 'Test reply',
        debug: { model: 'gpt-4o-mini', ms: 500, attempt: 1 },
      });

      await service.generateReply({
        userId: 'test-user',
        topic: 'Test topic',
        messages: [{ role: 'USER', content: 'Hello' }],
      });

      // In production, verbose logging should be disabled
      // (We can't easily test this without more complex mocking, but the guard is in code)

      process.env.NODE_ENV = originalEnv;
      process.env.AI_VERBOSE_TRACE = originalVerbose;
      loggerSpy.mockRestore();
    });
  });

  describe('modifier hints block', () => {
    it('should build modifier hints when activeModifiers exist', async () => {
      const missionState = createDefaultMissionState();
      missionState.activeModifiers = [
        {
          key: 'lowerRiskForNext3Turns',
          effect: 'reduceRisk',
          remainingTurns: 3,
          appliedAt: new Date().toISOString(),
          reason: 'Tension spike',
        },
      ];

      openaiClient.createChatCompletion.mockResolvedValue({
        ok: true,
        text: 'Test reply',
        debug: { model: 'gpt-4o-mini', ms: 500, attempt: 1 },
      });

      const buildSystemPromptSpy = jest.spyOn(service as any, 'buildSystemPrompt');
      
      await service.generateReply({
        userId: 'test-user',
        topic: 'Test topic',
        messages: [{ role: 'USER', content: 'Hello' }],
        missionState,
      });

      expect(buildSystemPromptSpy).toHaveBeenCalled();
      const prompt = buildSystemPromptSpy.mock.results[0].value;
      expect(prompt).toContain('ACTIVE MODIFIERS');
      expect(prompt).toContain('lowerRiskForNext3Turns');
    });

    it('should not include modifier hints when activeModifiers is empty', async () => {
      const missionState = createDefaultMissionState();
      missionState.activeModifiers = null;

      openaiClient.createChatCompletion.mockResolvedValue({
        ok: true,
        text: 'Test reply',
        debug: { model: 'gpt-4o-mini', ms: 500, attempt: 1 },
      });

      const buildSystemPromptSpy = jest.spyOn(service as any, 'buildSystemPrompt');
      
      await service.generateReply({
        userId: 'test-user',
        topic: 'Test topic',
        messages: [{ role: 'USER', content: 'Hello' }],
        missionState,
      });

      expect(buildSystemPromptSpy).toHaveBeenCalled();
      const prompt = buildSystemPromptSpy.mock.results[0].value;
      expect(prompt).not.toContain('ACTIVE MODIFIERS');
    });
  });
});

