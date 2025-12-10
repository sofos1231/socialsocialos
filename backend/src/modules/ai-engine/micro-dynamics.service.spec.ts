// backend/src/modules/ai-engine/micro-dynamics.service.spec.ts
// Step 6.6: Tests for Micro-Dynamics Service

import { Test, TestingModule } from '@nestjs/testing';
import { MicroDynamicsService } from './micro-dynamics.service';
import { MicroDynamicsContext } from './micro-dynamics.types';

describe('MicroDynamicsService - Step 6.6', () => {
  let service: MicroDynamicsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MicroDynamicsService],
    }).compile();

    service = module.get<MicroDynamicsService>(MicroDynamicsService);
  });

  describe('computeMicroDynamics', () => {
    it('should compute risk index based on score, tension, difficulty', () => {
      const context: MicroDynamicsContext = {
        currentScore: 80,
        recentScores: [70, 75, 80],
        tensionLevel: 0.2,
        moodState: 'warm',
        difficultyLevel: 'EASY',
        progressPct: 50,
        gateProgress: null,
      };

      const result = service.computeMicroDynamics(context);

      expect(result.riskIndex).toBeGreaterThan(50); // High score = higher risk allowed
      expect(result.riskIndex).toBeLessThanOrEqual(100);
    });

    it('should reduce risk index with high tension', () => {
      const lowTensionContext: MicroDynamicsContext = {
        currentScore: 70,
        recentScores: [70, 70, 70],
        tensionLevel: 0.2,
        moodState: 'neutral',
        difficultyLevel: 'MEDIUM',
        progressPct: 50,
        gateProgress: null,
      };

      const highTensionContext: MicroDynamicsContext = {
        ...lowTensionContext,
        tensionLevel: 0.8,
      };

      const lowTensionResult = service.computeMicroDynamics(lowTensionContext);
      const highTensionResult = service.computeMicroDynamics(highTensionContext);

      expect(highTensionResult.riskIndex).toBeLessThan(lowTensionResult.riskIndex);
    });

    it('should compute momentum index based on score trends', () => {
      const improvingContext: MicroDynamicsContext = {
        currentScore: 80,
        recentScores: [50, 65, 80], // Improving trend
        tensionLevel: 0.3,
        moodState: 'warm',
        difficultyLevel: 'MEDIUM',
        progressPct: 50,
        gateProgress: {
          metGates: ['GATE_MIN_MESSAGES'],
          unmetGates: [],
        },
      };

      const decliningContext: MicroDynamicsContext = {
        ...improvingContext,
        recentScores: [80, 65, 50], // Declining trend
      };

      const improvingResult = service.computeMicroDynamics(improvingContext);
      const decliningResult = service.computeMicroDynamics(decliningContext);

      expect(improvingResult.momentumIndex).toBeGreaterThan(decliningResult.momentumIndex);
    });

    it('should compute flow index based on score stability', () => {
      const stableContext: MicroDynamicsContext = {
        currentScore: 70,
        recentScores: [70, 70, 70], // Very stable
        tensionLevel: 0.3,
        moodState: 'neutral',
        difficultyLevel: 'MEDIUM',
        progressPct: 50,
        gateProgress: null,
      };

      const unstableContext: MicroDynamicsContext = {
        ...stableContext,
        recentScores: [30, 90, 50], // High variance
      };

      const stableResult = service.computeMicroDynamics(stableContext);
      const unstableResult = service.computeMicroDynamics(unstableContext);

      expect(stableResult.flowIndex).toBeGreaterThan(unstableResult.flowIndex);
    });

    it('should handle high score with low tension (allows higher risk)', () => {
      const context: MicroDynamicsContext = {
        currentScore: 85,
        recentScores: [80, 82, 85],
        tensionLevel: 0.1, // Low tension
        moodState: 'warm',
        difficultyLevel: 'EASY',
        progressPct: 70,
        gateProgress: {
          metGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD'],
          unmetGates: [],
        },
      };

      const result = service.computeMicroDynamics(context);

      expect(result.riskIndex).toBeGreaterThan(60); // High score + low tension = higher risk allowed
      expect(result.momentumIndex).toBeGreaterThan(50); // Progress + met gates = good momentum
      expect(result.flowIndex).toBeGreaterThan(50); // Stable scores = good flow
    });

    it('should handle low score with high tension (reduces risk)', () => {
      const context: MicroDynamicsContext = {
        currentScore: 30,
        recentScores: [40, 35, 30],
        tensionLevel: 0.9, // High tension
        moodState: 'cold',
        difficultyLevel: 'HARD',
        progressPct: 30,
        gateProgress: {
          metGates: [],
          unmetGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD'],
        },
      };

      const result = service.computeMicroDynamics(context);

      expect(result.riskIndex).toBeLessThan(40); // Low score + high tension = lower risk
      expect(result.momentumIndex).toBeLessThan(40); // Declining scores = low momentum
    });

    it('should increase momentum with improving progress', () => {
      const lowProgress: MicroDynamicsContext = {
        currentScore: 70,
        recentScores: [70, 70, 70],
        tensionLevel: 0.3,
        moodState: 'neutral',
        difficultyLevel: 'MEDIUM',
        progressPct: 20,
        gateProgress: null,
      };

      const highProgress: MicroDynamicsContext = {
        ...lowProgress,
        progressPct: 80,
        gateProgress: {
          metGates: ['GATE_MIN_MESSAGES'],
          unmetGates: [],
        },
      };

      const lowResult = service.computeMicroDynamics(lowProgress);
      const highResult = service.computeMicroDynamics(highProgress);

      expect(highResult.momentumIndex).toBeGreaterThan(lowResult.momentumIndex);
    });
  });

  describe('evaluateMicroGates (stub)', () => {
    it('should return passed=true (stub implementation)', () => {
      const microDynamics = {
        riskIndex: 80,
        momentumIndex: 50,
        flowIndex: 60,
        computedAt: new Date().toISOString(),
      };

      const context: MicroDynamicsContext = {
        currentScore: 70,
        recentScores: [70, 70, 70],
        tensionLevel: 0.3,
        moodState: 'neutral',
        difficultyLevel: 'MEDIUM',
        progressPct: 50,
        gateProgress: null,
      };

      const result = service.evaluateMicroGates(microDynamics, context);

      expect(result.passed).toBe(true);
      expect(result.blockedReasons).toEqual([]);
    });
  });
});

