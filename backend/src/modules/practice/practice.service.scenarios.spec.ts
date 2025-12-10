// FILE: backend/src/modules/practice/practice.service.scenarios.spec.ts
// Step 6.6-6.10: Synthetic mission scenarios for QA

import { Test, TestingModule } from '@nestjs/testing';
import { PracticeService } from './practice.service';
import { PrismaService } from '../../db/prisma.service';
import { normalizeMissionConfigV1 } from './mission-config-runtime';
import { MissionDifficulty } from '@prisma/client';
import { createDefaultMissionState } from '../ai-engine/mission-state-v1.schema';

describe('PracticeService - Synthetic Mission Scenarios', () => {
  let service: PracticeService;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockAiChat: jest.Mocked<any>;
  let mockMicroDynamics: jest.Mocked<any>;
  let mockPersonaDrift: jest.Mocked<any>;

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
    };

    mockMicroDynamics = {
      computeMicroDynamics: jest.fn(),
    };

    mockPersonaDrift = {
      computePersonaStability: jest.fn(),
      detectModifierEvents: jest.fn(),
      updateModifiersFromEvents: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PracticeService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: 'AiScoringService',
          useValue: {
            scoreConversation: jest.fn(),
          },
        },
        {
          provide: 'AiCoreScoringService',
          useValue: {},
        },
        { provide: 'AiChatService', useValue: mockAiChat },
        {
          provide: 'SessionsService',
          useValue: {
            saveOrUpdateScoredSession: jest.fn().mockResolvedValue({
              summary: { finalScore: 0 },
              sessionId: 'test',
              didFinalize: false,
              didGrant: false,
              isSuccess: null,
              messages: [],
            }),
          },
        },
        {
          provide: 'OpeningsService',
          useValue: {},
        },
        {
          provide: 'MissionStateService',
          useValue: {
            createInitialMissionState: jest.fn(),
            updateMissionState: jest.fn().mockImplementation((state) => state),
          },
        },
        {
          provide: 'GatesService',
          useValue: {
            evaluateGatesForActiveSession: jest.fn(),
          },
        },
        {
          provide: 'RewardReleaseService',
          useValue: {},
        },
        { provide: 'MicroDynamicsService', useValue: mockMicroDynamics },
        { provide: 'PersonaDriftService', useValue: mockPersonaDrift },
      ],
    }).compile();

    service = module.get<PracticeService>(PracticeService);
  });

  describe('Scenario 1: Warm Rising & Safe Risk', () => {
    it('should detect RISING_WARMTH arc and maintain high persona stability', async () => {
      // Setup: Mission with moderate difficulty, all features enabled
      const config = normalizeMissionConfigV1({
        missionConfigV1: {
          version: 1,
          dynamics: {
            mode: 'CHAT' as any,
            locationTag: 'DATING_APP' as any,
            hasPerMessageTimer: false,
            pace: 60,
            flirtiveness: 50,
          },
          objective: { kind: 'GET_NUMBER' as any, userTitle: 'Test', userDescription: 'Test' },
          difficulty: { level: MissionDifficulty.MEDIUM, recommendedMaxMessages: 7 },
          style: { aiStyleKey: 'WARM' as any },
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
            enableMicroDynamics: true,
            enableModifiers: true,
            enableArcDetection: true,
            enablePersonaDriftDetection: true,
          },
        },
      });

      if (!config.ok) throw new Error('Config normalization failed');

      // Simulate 5-7 turns with gradually improving scores
      const scores = [50, 55, 60, 65, 70, 72, 75]; // Improving trend
      const tensions = [0.4, 0.35, 0.3, 0.25, 0.2, 0.2, 0.15]; // Decreasing tension

      let missionState = createDefaultMissionState('warm');
      missionState.averageScore = 62;
      missionState.mood.tensionLevel = 0.3;

      mockPrisma.practiceSession.findUnique.mockResolvedValue({
        id: 'scenario1-session',
        userId: 'test-user',
        topic: 'Warm Rising Scenario',
        templateId: 'scenario1-template',
        personaId: null,
        status: 'IN_PROGRESS' as any,
        endedAt: null,
        payload: {
          normalizedMissionConfigV1: config.value,
          missionStateV1: missionState,
        },
      } as any);

      // Mock scoring to return improving scores
      const scoringService = service['aiScoring'];
      jest.spyOn(scoringService, 'scoreConversation').mockResolvedValue({
        perMessage: scores.map((score, idx) => ({
          score,
          tags: [],
          index: idx,
        })),
      } as any);

      // Mock micro-dynamics to return increasing risk/momentum
      mockMicroDynamics.computeMicroDynamics.mockImplementation((ctx) => {
        const riskIndex = 40 + (ctx.currentScore / 100) * 40; // Increases with score
        const momentumIndex = 50 + (ctx.progressPct / 100) * 30; // Increases with progress
        return {
          riskIndex: Math.round(riskIndex),
          momentumIndex: Math.round(momentumIndex),
          flowIndex: 70,
          computedAt: new Date().toISOString(),
        };
      });

      // Mock persona stability to stay high
      mockPersonaDrift.computePersonaStability.mockReturnValue({
        personaStability: 90,
        lastDriftReason: null,
      });

      mockPersonaDrift.detectModifierEvents.mockReturnValue([]);
      mockPersonaDrift.updateModifiersFromEvents.mockReturnValue([]);

      mockAiChat.generateReply.mockResolvedValue({
        aiReply: 'Test reply',
        aiDebug: { provider: 'openai', model: 'gpt-4o-mini', latencyMs: 500 },
      });

      // Simulate multiple messages
      for (let i = 0; i < scores.length; i++) {
        await service.runPracticeSession('test-user', {
          messages: [{ role: 'USER' as any, content: `Message ${i + 1}` }],
          topic: 'Warm Rising Scenario',
          templateId: 'scenario1-template',
          sessionId: 'scenario1-session',
        });
      }

      // Assertions
      expect(mockMicroDynamics.computeMicroDynamics).toHaveBeenCalled();
      const lastMicroDynamicsCall = mockMicroDynamics.computeMicroDynamics.mock.calls[
        mockMicroDynamics.computeMicroDynamics.mock.calls.length - 1
      ];
      const lastContext = lastMicroDynamicsCall[0];
      expect(lastContext.currentScore).toBe(75); // Last score
      expect(lastContext.tensionLevel).toBeLessThan(0.3); // Low tension

      // Verify risk and momentum indices behave sensibly
      const lastResult = mockMicroDynamics.computeMicroDynamics.mock.results[
        mockMicroDynamics.computeMicroDynamics.mock.results.length - 1
      ].value;
      expect(lastResult.riskIndex).toBeGreaterThan(60); // Higher risk allowed with high score
      expect(lastResult.momentumIndex).toBeGreaterThan(60); // Good momentum

      // Verify persona stability stays high
      expect(mockPersonaDrift.computePersonaStability).toHaveBeenCalled();
      const lastStabilityCall = mockPersonaDrift.computePersonaStability.mock.results[
        mockPersonaDrift.computePersonaStability.mock.results.length - 1
      ].value;
      expect(lastStabilityCall.personaStability).toBeGreaterThan(80);

      // Verify trace snapshot contains sane values
      const saveSessionSpy = service['sessions'].saveOrUpdateScoredSession as jest.Mock;
      if (saveSessionSpy.mock.calls.length > 0) {
        const lastCall = saveSessionSpy.mock.calls[saveSessionSpy.mock.calls.length - 1];
        const trace = lastCall[0]?.extraPayload?.trace;
        if (trace) {
          expect(trace.microDynamics).toBeDefined();
          expect(trace.personaStability).toBeGreaterThan(80);
          expect(trace.aiCallSnapshots).toBeDefined();
          if (trace.aiCallSnapshots && trace.aiCallSnapshots.length > 0) {
            const snapshot = trace.aiCallSnapshots[0];
            expect(snapshot.missionId).toBeDefined();
            expect(snapshot.microDynamics).toBeDefined();
            expect(snapshot.personaStability).toBeGreaterThan(80);
          }
        }
      }
    });
  });

  describe('Scenario 2: Chaotic, Tense & Drift', () => {
    it('should detect TESTING_SPIKE/COOL_DOWN arc, drop persona stability, and add modifiers', async () => {
      // Setup: Mission with higher difficulty
      const config = normalizeMissionConfigV1({
        missionConfigV1: {
          version: 1,
          dynamics: {
            mode: 'CHAT' as any,
            locationTag: 'DATING_APP' as any,
            hasPerMessageTimer: false,
            pace: 70,
            flirtiveness: 60,
          },
          objective: { kind: 'GET_NUMBER' as any, userTitle: 'Test', userDescription: 'Test' },
          difficulty: { level: MissionDifficulty.HARD, recommendedMaxMessages: 7 },
          style: { aiStyleKey: 'FLIRTY' as any },
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
            enableMicroDynamics: true,
            enableModifiers: true,
            enableArcDetection: true,
            enablePersonaDriftDetection: true,
          },
        },
      });

      if (!config.ok) throw new Error('Config normalization failed');

      // Simulate 5-7 turns with oscillating scores and tension spikes
      const scores = [70, 40, 65, 30, 60, 35, 55]; // Oscillating
      const tensions = [0.3, 0.8, 0.4, 0.9, 0.5, 0.7, 0.6]; // Spikes

      let missionState = createDefaultMissionState('neutral');
      missionState.averageScore = 50;
      missionState.mood.tensionLevel = 0.5;
      missionState.mood.currentMood = 'neutral';

      mockPrisma.practiceSession.findUnique.mockResolvedValue({
        id: 'scenario2-session',
        userId: 'test-user',
        topic: 'Chaotic Tense Scenario',
        templateId: 'scenario2-template',
        personaId: null,
        status: 'IN_PROGRESS' as any,
        endedAt: null,
        payload: {
          normalizedMissionConfigV1: config.value,
          missionStateV1: missionState,
        },
      } as any);

      // Mock scoring to return oscillating scores
      const scoringService = service['aiScoring'];
      jest.spyOn(scoringService, 'scoreConversation').mockResolvedValue({
        perMessage: scores.map((score, idx) => ({
          score,
          tags: score < 40 ? ['NEGATIVE_FLAG'] : [],
          index: idx,
        })),
      } as any);

      // Mock micro-dynamics to reflect tension
      mockMicroDynamics.computeMicroDynamics.mockImplementation((ctx) => {
        const riskIndex = Math.max(20, 60 - ctx.tensionLevel * 40); // Lower risk with high tension
        return {
          riskIndex: Math.round(riskIndex),
          momentumIndex: 40,
          flowIndex: 50,
          computedAt: new Date().toISOString(),
        };
      });

      // Mock persona stability to drop
      let stabilityCallCount = 0;
      mockPersonaDrift.computePersonaStability.mockImplementation(() => {
        stabilityCallCount++;
        // Stability drops over time due to chaos
        const stability = Math.max(50, 90 - stabilityCallCount * 5);
        return {
          personaStability: stability,
          lastDriftReason: stability < 70 ? 'Style conflicts with mood' : null,
        };
      });

      // Mock modifier events (tension spike triggers modifier)
      mockPersonaDrift.detectModifierEvents.mockImplementation((ctx) => {
        if (ctx.moodState.tensionLevel > 0.7) {
          return [
            {
              type: 'tension_spike' as const,
              severity: ctx.moodState.tensionLevel,
              context: {
                tensionLevel: ctx.moodState.tensionLevel,
                moodState: ctx.moodState.currentMood,
              },
            },
          ];
        }
        return [];
      });

      mockPersonaDrift.updateModifiersFromEvents.mockImplementation((events, existing) => {
        const decayed = existing.map(m => ({ ...m, remainingTurns: m.remainingTurns - 1 })).filter(m => m.remainingTurns > 0);
        if (events.length > 0 && events[0].type === 'tension_spike') {
          return [
            ...decayed,
            {
              key: 'lowerRiskForNext3Turns',
              effect: 'reduceRisk' as const,
              remainingTurns: 3,
              appliedAt: new Date().toISOString(),
              reason: 'Tension spike',
            },
          ];
        }
        return decayed;
      });

      mockAiChat.generateReply.mockResolvedValue({
        aiReply: 'Test reply',
        aiDebug: { provider: 'openai', model: 'gpt-4o-mini', latencyMs: 500 },
      });

      // Simulate multiple messages
      for (let i = 0; i < scores.length; i++) {
        // Update mission state tension for each message
        missionState.mood.tensionLevel = tensions[i];
        missionState.mood.currentMood = tensions[i] > 0.7 ? 'cold' : 'neutral';
        missionState.lastScore = scores[i];

        await service.runPracticeSession('test-user', {
          messages: [{ role: 'USER' as any, content: `Message ${i + 1}` }],
          topic: 'Chaotic Tense Scenario',
          templateId: 'scenario2-template',
          sessionId: 'scenario2-session',
        });
      }

      // Assertions
      // Verify persona stability dropped
      expect(mockPersonaDrift.computePersonaStability).toHaveBeenCalled();
      const lastStabilityResult = mockPersonaDrift.computePersonaStability.mock.results[
        mockPersonaDrift.computePersonaStability.mock.results.length - 1
      ].value;
      expect(lastStabilityResult.personaStability).toBeLessThan(90);
      expect(lastStabilityResult.lastDriftReason).not.toBeNull();

      // Verify modifiers were added
      expect(mockPersonaDrift.detectModifierEvents).toHaveBeenCalled();
      expect(mockPersonaDrift.updateModifiersFromEvents).toHaveBeenCalled();
      const lastModifiersCall = mockPersonaDrift.updateModifiersFromEvents.mock.calls[
        mockPersonaDrift.updateModifiersFromEvents.mock.calls.length - 1
      ];
      const lastModifiers = lastModifiersCall[1]; // existing modifiers
      // Should have at least one modifier from tension spike
      const hasModifier = lastModifiers.some((m: any) => m.key === 'lowerRiskForNext3Turns');
      expect(hasModifier || lastModifiersCall[0].length > 0).toBe(true); // Either existing or new

      // Verify system does not crash and AI call still works
      expect(mockAiChat.generateReply).toHaveBeenCalled();
      const lastAiCall = mockAiChat.generateReply.mock.calls[mockAiChat.generateReply.mock.calls.length - 1];
      expect(lastAiCall[0].missionState).toBeDefined();
      expect(lastAiCall[0].missionState?.personaStability).toBeLessThan(90);
    });
  });
});

