// FILE: backend/src/modules/practice/practice.service.qa.spec.ts
// Step 6.6-6.10: QA integration tests for practice service with toggles and trace snapshots

import { Test, TestingModule } from '@nestjs/testing';
import { PracticeService } from './practice.service';
import { PrismaService } from '../../db/prisma.service';
import { AiScoringService } from '../ai/ai-scoring.service';
import { AiCoreScoringService } from '../ai/ai-core-scoring.service';
import { AiChatService } from '../ai/providers/ai-chat.service';
import { SessionsService } from '../sessions/sessions.service';
import { OpeningsService } from '../ai-engine/openings.service';
import { MissionStateService } from '../ai-engine/mission-state.service';
import { GatesService } from '../gates/gates.service';
import { RewardReleaseService } from '../ai-engine/reward-release.service';
import { MicroDynamicsService } from '../ai-engine/micro-dynamics.service';
import { PersonaDriftService } from '../ai-engine/persona-drift.service';
import { normalizeMissionConfigV1 } from './mission-config-runtime';
import { MissionDifficulty } from '@prisma/client';

describe('PracticeService - Step 6.6-6.10 QA Integration', () => {
  let service: PracticeService;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockAiChat: jest.Mocked<AiChatService>;

  beforeEach(async () => {
    mockPrisma = {
      practiceSession: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      practiceMissionTemplate: {
        findUnique: jest.fn(),
      },
      aiPersona: {
        findUnique: jest.fn(),
      },
    } as any;

    mockAiChat = {
      generateReply: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PracticeService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: AiScoringService,
          useValue: {
            scoreConversation: jest.fn().mockResolvedValue({
              perMessage: [
                { score: 70, tags: [] },
                { score: 75, tags: [] },
              ],
            }),
          },
        },
        {
          provide: AiCoreScoringService,
          useValue: {
            scoreSession: jest.fn(),
          },
        },
        { provide: AiChatService, useValue: mockAiChat },
        {
          provide: SessionsService,
          useValue: {
            saveOrUpdateScoredSession: jest.fn().mockResolvedValue({
              summary: { finalScore: 72 },
              sessionId: 'test-session',
              didFinalize: false,
              didGrant: false,
              isSuccess: null,
              messages: [],
            }),
          },
        },
        {
          provide: OpeningsService,
          useValue: {
            generateOpening: jest.fn(),
          },
        },
        {
          provide: MissionStateService,
          useValue: {
            createInitialMissionState: jest.fn(),
            updateMissionState: jest.fn().mockImplementation((state) => state),
          },
        },
        {
          provide: GatesService,
          useValue: {
            evaluateGatesForActiveSession: jest.fn().mockReturnValue([
              { gateKey: 'GATE_MIN_MESSAGES', passed: true },
            ]),
          },
        },
        {
          provide: RewardReleaseService,
          useValue: {
            getRewardPermissionsForState: jest.fn(),
          },
        },
        {
          provide: MicroDynamicsService,
          useValue: {
            computeMicroDynamics: jest.fn().mockReturnValue({
              riskIndex: 60,
              momentumIndex: 70,
              flowIndex: 65,
              computedAt: new Date().toISOString(),
            }),
          },
        },
        {
          provide: PersonaDriftService,
          useValue: {
            computePersonaStability: jest.fn().mockReturnValue({
              personaStability: 85,
              lastDriftReason: null,
            }),
            detectModifierEvents: jest.fn().mockReturnValue([]),
            updateModifiersFromEvents: jest.fn().mockReturnValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<PracticeService>(PracticeService);
  });

  describe('Feature toggles - enableMicroDynamics', () => {
    it('should compute micro-dynamics when enableMicroDynamics is true', async () => {
      const config = normalizeMissionConfigV1({
        missionConfigV1: {
          version: 1,
          dynamics: { mode: 'CHAT' as any, locationTag: 'DATING_APP' as any, hasPerMessageTimer: false },
          objective: { kind: 'GET_NUMBER' as any, userTitle: 'Test', userDescription: 'Test' },
          difficulty: { level: MissionDifficulty.MEDIUM, recommendedMaxMessages: 5 },
          style: { aiStyleKey: 'NEUTRAL' as any },
          statePolicy: {
            maxMessages: 10,
            maxStrikes: 3,
            allowTimerExtension: true,
            successScoreThreshold: 70,
            failScoreThreshold: 30,
            enableGateSequence: true,
            enableMoodCollapse: false,
            enableObjectiveAutoSuccess: false,
            allowedEndReasons: ['SUCCESS' as any],
            enableMicroDynamics: true, // Enabled
          },
        },
      });

      if (!config.ok) throw new Error('Config normalization failed');

      mockPrisma.practiceSession.findUnique.mockResolvedValue({
        id: 'test-session',
        userId: 'test-user',
        topic: 'Test',
        templateId: 'test-template',
        personaId: null,
        status: 'IN_PROGRESS' as any,
        endedAt: null,
        payload: {
          normalizedMissionConfigV1: config.value,
          missionStateV1: {
            mood: { currentMood: 'neutral', positivityPct: 50, tensionLevel: 0.3, isStable: true, lastChangeReason: '' },
            progressPct: 50,
            successLikelihood: 70,
            stabilityScore: 80,
            messageCount: 2,
            averageScore: 72,
            lastScore: 75,
            lastFlags: [],
          },
        },
      } as any);

      mockAiChat.generateReply.mockResolvedValue({
        aiReply: 'Test reply',
        aiDebug: { provider: 'openai', model: 'gpt-4o-mini', latencyMs: 500 },
      });

      const microDynamicsSpy = jest.spyOn(service['microDynamicsService'], 'computeMicroDynamics');

      await service.runPracticeSession('test-user', {
        messages: [{ role: 'USER' as any, content: 'Hello' }],
        topic: 'Test',
        templateId: 'test-template',
        sessionId: 'test-session',
      });

      expect(microDynamicsSpy).toHaveBeenCalled();
    });

    it('should skip micro-dynamics when enableMicroDynamics is false', async () => {
      const config = normalizeMissionConfigV1({
        missionConfigV1: {
          version: 1,
          dynamics: { mode: 'CHAT' as any, locationTag: 'DATING_APP' as any, hasPerMessageTimer: false },
          objective: { kind: 'GET_NUMBER' as any, userTitle: 'Test', userDescription: 'Test' },
          difficulty: { level: MissionDifficulty.MEDIUM, recommendedMaxMessages: 5 },
          style: { aiStyleKey: 'NEUTRAL' as any },
          statePolicy: {
            maxMessages: 10,
            maxStrikes: 3,
            allowTimerExtension: true,
            successScoreThreshold: 70,
            failScoreThreshold: 30,
            enableGateSequence: true,
            enableMoodCollapse: false,
            enableObjectiveAutoSuccess: false,
            allowedEndReasons: ['SUCCESS' as any],
            enableMicroDynamics: false, // Disabled
          },
        },
      });

      if (!config.ok) throw new Error('Config normalization failed');

      mockPrisma.practiceSession.findUnique.mockResolvedValue({
        id: 'test-session',
        userId: 'test-user',
        topic: 'Test',
        templateId: 'test-template',
        personaId: null,
        status: 'IN_PROGRESS' as any,
        endedAt: null,
        payload: {
          normalizedMissionConfigV1: config.value,
          missionStateV1: {
            mood: { currentMood: 'neutral', positivityPct: 50, tensionLevel: 0.3, isStable: true, lastChangeReason: '' },
            progressPct: 50,
            successLikelihood: 70,
            stabilityScore: 80,
            messageCount: 2,
            averageScore: 72,
            lastScore: 75,
            lastFlags: [],
          },
        },
      } as any);

      mockAiChat.generateReply.mockResolvedValue({
        aiReply: 'Test reply',
        aiDebug: { provider: 'openai', model: 'gpt-4o-mini', latencyMs: 500 },
      });

      const microDynamicsSpy = jest.spyOn(service['microDynamicsService'], 'computeMicroDynamics');

      await service.runPracticeSession('test-user', {
        messages: [{ role: 'USER' as any, content: 'Hello' }],
        topic: 'Test',
        templateId: 'test-template',
        sessionId: 'test-session',
      });

      expect(microDynamicsSpy).not.toHaveBeenCalled();
    });
  });

  describe('Feature toggles - enableModifiers and enablePersonaDriftDetection', () => {
    it('should compute persona stability and modifiers when both toggles are true', async () => {
      const config = normalizeMissionConfigV1({
        missionConfigV1: {
          version: 1,
          dynamics: { mode: 'CHAT' as any, locationTag: 'DATING_APP' as any, hasPerMessageTimer: false },
          objective: { kind: 'GET_NUMBER' as any, userTitle: 'Test', userDescription: 'Test' },
          difficulty: { level: MissionDifficulty.MEDIUM, recommendedMaxMessages: 5 },
          style: { aiStyleKey: 'NEUTRAL' as any },
          statePolicy: {
            maxMessages: 10,
            maxStrikes: 3,
            allowTimerExtension: true,
            successScoreThreshold: 70,
            failScoreThreshold: 30,
            enableGateSequence: true,
            enableMoodCollapse: false,
            enableObjectiveAutoSuccess: false,
            allowedEndReasons: ['SUCCESS' as any],
            enablePersonaDriftDetection: true,
            enableModifiers: true,
          },
        },
      });

      if (!config.ok) throw new Error('Config normalization failed');

      mockPrisma.practiceSession.findUnique.mockResolvedValue({
        id: 'test-session',
        userId: 'test-user',
        topic: 'Test',
        templateId: 'test-template',
        personaId: null,
        status: 'IN_PROGRESS' as any,
        endedAt: null,
        payload: {
          normalizedMissionConfigV1: config.value,
          missionStateV1: {
            mood: { currentMood: 'neutral', positivityPct: 50, tensionLevel: 0.3, isStable: true, lastChangeReason: '' },
            progressPct: 50,
            successLikelihood: 70,
            stabilityScore: 80,
            messageCount: 2,
            averageScore: 72,
            lastScore: 75,
            lastFlags: [],
          },
        },
      } as any);

      mockAiChat.generateReply.mockResolvedValue({
        aiReply: 'Test reply',
        aiDebug: { provider: 'openai', model: 'gpt-4o-mini', latencyMs: 500 },
      });

      const personaStabilitySpy = jest.spyOn(service['personaDriftService'], 'computePersonaStability');
      const detectEventsSpy = jest.spyOn(service['personaDriftService'], 'detectModifierEvents');

      await service.runPracticeSession('test-user', {
        messages: [{ role: 'USER' as any, content: 'Hello' }],
        topic: 'Test',
        templateId: 'test-template',
        sessionId: 'test-session',
      });

      expect(personaStabilitySpy).toHaveBeenCalled();
      expect(detectEventsSpy).toHaveBeenCalled();
    });

    it('should skip modifiers when enableModifiers is false', async () => {
      const config = normalizeMissionConfigV1({
        missionConfigV1: {
          version: 1,
          dynamics: { mode: 'CHAT' as any, locationTag: 'DATING_APP' as any, hasPerMessageTimer: false },
          objective: { kind: 'GET_NUMBER' as any, userTitle: 'Test', userDescription: 'Test' },
          difficulty: { level: MissionDifficulty.MEDIUM, recommendedMaxMessages: 5 },
          style: { aiStyleKey: 'NEUTRAL' as any },
          statePolicy: {
            maxMessages: 10,
            maxStrikes: 3,
            allowTimerExtension: true,
            successScoreThreshold: 70,
            failScoreThreshold: 30,
            enableGateSequence: true,
            enableMoodCollapse: false,
            enableObjectiveAutoSuccess: false,
            allowedEndReasons: ['SUCCESS' as any],
            enablePersonaDriftDetection: true,
            enableModifiers: false, // Disabled
          },
        },
      });

      if (!config.ok) throw new Error('Config normalization failed');

      mockPrisma.practiceSession.findUnique.mockResolvedValue({
        id: 'test-session',
        userId: 'test-user',
        topic: 'Test',
        templateId: 'test-template',
        personaId: null,
        status: 'IN_PROGRESS' as any,
        endedAt: null,
        payload: {
          normalizedMissionConfigV1: config.value,
          missionStateV1: {
            mood: { currentMood: 'neutral', positivityPct: 50, tensionLevel: 0.3, isStable: true, lastChangeReason: '' },
            progressPct: 50,
            successLikelihood: 70,
            stabilityScore: 80,
            messageCount: 2,
            averageScore: 72,
            lastScore: 75,
            lastFlags: [],
          },
        },
      } as any);

      mockAiChat.generateReply.mockResolvedValue({
        aiReply: 'Test reply',
        aiDebug: { provider: 'openai', model: 'gpt-4o-mini', latencyMs: 500 },
      });

      const detectEventsSpy = jest.spyOn(service['personaDriftService'], 'detectModifierEvents');

      await service.runPracticeSession('test-user', {
        messages: [{ role: 'USER' as any, content: 'Hello' }],
        topic: 'Test',
        templateId: 'test-template',
        sessionId: 'test-session',
      });

      expect(detectEventsSpy).not.toHaveBeenCalled();
    });
  });

  describe('Trace snapshots', () => {
    it('should build AiCallTraceSnapshot with all required fields', async () => {
      const config = normalizeMissionConfigV1({
        missionConfigV1: {
          version: 1,
          dynamics: { mode: 'CHAT' as any, locationTag: 'DATING_APP' as any, hasPerMessageTimer: false },
          objective: { kind: 'GET_NUMBER' as any, userTitle: 'Test', userDescription: 'Test' },
          difficulty: { level: MissionDifficulty.MEDIUM, recommendedMaxMessages: 5 },
          style: { aiStyleKey: 'NEUTRAL' as any },
          statePolicy: {
            maxMessages: 10,
            maxStrikes: 3,
            allowTimerExtension: true,
            successScoreThreshold: 70,
            failScoreThreshold: 30,
            enableGateSequence: true,
            enableMoodCollapse: false,
            enableObjectiveAutoSuccess: false,
            allowedEndReasons: ['SUCCESS' as any],
          },
          aiRuntimeProfile: {
            model: 'gpt-4',
            temperature: 0.8,
            maxTokens: 300,
          },
        },
      });

      if (!config.ok) throw new Error('Config normalization failed');

      mockPrisma.practiceSession.findUnique.mockResolvedValue({
        id: 'test-session',
        userId: 'test-user',
        topic: 'Test',
        templateId: 'test-template',
        personaId: null,
        status: 'IN_PROGRESS' as any,
        endedAt: null,
        payload: {
          normalizedMissionConfigV1: config.value,
          missionStateV1: {
            mood: { currentMood: 'neutral', positivityPct: 50, tensionLevel: 0.3, isStable: true, lastChangeReason: '' },
            progressPct: 50,
            successLikelihood: 70,
            stabilityScore: 80,
            messageCount: 2,
            averageScore: 72,
            lastScore: 75,
            lastFlags: [],
            microDynamics: { riskIndex: 60, momentumIndex: 70, flowIndex: 65, computedAt: new Date().toISOString() },
            personaStability: 85,
            activeModifiers: [],
          },
        },
      } as any);

      mockAiChat.generateReply.mockResolvedValue({
        aiReply: 'Test reply',
        aiDebug: {
          provider: 'openai',
          model: 'gpt-4',
          latencyMs: 500,
          tokens: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
          },
        },
      });

      const saveSessionSpy = jest.spyOn(service['sessions'], 'saveOrUpdateScoredSession');

      await service.runPracticeSession('test-user', {
        messages: [{ role: 'USER' as any, content: 'Hello' }],
        topic: 'Test',
        templateId: 'test-template',
        sessionId: 'test-session',
      });

      expect(saveSessionSpy).toHaveBeenCalled();
      const callArgs = saveSessionSpy.mock.calls[0][0];
      const trace = callArgs.extraPayload?.trace;
      
      expect(trace).toBeDefined();
      expect(trace.aiCallSnapshots).toBeDefined();
      expect(trace.aiCallSnapshots.length).toBeGreaterThan(0);
      
      const snapshot = trace.aiCallSnapshots[0];
      expect(snapshot.missionId).toBe('test-template');
      expect(snapshot.sessionId).toBe('test-session');
      expect(snapshot.userId).toBe('test-user');
      expect(snapshot.aiProfile?.model).toBe('gpt-4');
      expect(snapshot.aiProfile?.temperature).toBe(0.8);
      expect(snapshot.aiProfile?.maxTokens).toBe(300);
      expect(snapshot.dynamics).toBeDefined();
      expect(snapshot.difficulty).toBeDefined();
      expect(snapshot.moodState).toBeDefined();
      expect(snapshot.microDynamics).toBeDefined();
      expect(snapshot.personaStability).toBe(85);
      expect(snapshot.activeModifiers).toBeDefined();
      expect(snapshot.provider).toBe('openai');
      expect(snapshot.model).toBe('gpt-4');
      expect(snapshot.latencyMs).toBe(500);
      expect(snapshot.tokenUsage?.promptTokens).toBe(100);
      expect(snapshot.tokenUsage?.completionTokens).toBe(50);
      expect(snapshot.tokenUsage?.totalTokens).toBe(150);
      expect(snapshot.timestamp).toBeDefined();
    });
  });
});

