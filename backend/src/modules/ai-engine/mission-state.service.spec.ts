// FILE: backend/src/modules/ai-engine/mission-state.service.spec.ts
// Unit tests for Mood and Tension-Based Adjustments

import { Test, TestingModule } from '@nestjs/testing';
import { MissionStateService } from './mission-state.service';
import {
  createDefaultMissionState,
  type MissionStateV1,
} from './mission-state-v1.schema';
import type { MissionConfigV1Difficulty } from '../missions-admin/mission-config-v1.schema';

describe('MissionStateService', () => {
  let service: MissionStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MissionStateService],
    }).compile();

    service = module.get<MissionStateService>(MissionStateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateMoodFromScoring', () => {
    it('should update mood from low score to colder mood', () => {
      const currentMood = createDefaultMissionState('neutral');
      const result = service.updateMoodFromScoring(currentMood.mood, {
        score: 25, // Low score
        flags: [],
        difficulty: null,
      });

      expect(result.currentMood).toBe('cold');
      expect(result.positivityPct).toBeLessThan(50);
      expect(result.tensionLevel).toBeGreaterThan(0.5);
    });

    it('should update mood from high score to warmer mood', () => {
      const currentMood = createDefaultMissionState('neutral');
      const result = service.updateMoodFromScoring(currentMood.mood, {
        score: 90, // High score
        flags: [],
        difficulty: null,
      });

      expect(result.currentMood).toBe('excited');
      expect(result.positivityPct).toBeGreaterThan(70);
      expect(result.tensionLevel).toBeLessThan(0.4);
    });

    it('should apply flag-based mood changes (negative flag)', () => {
      const currentMood = createDefaultMissionState('warm');
      const result = service.updateMoodFromScoring(currentMood.mood, {
        score: 60,
        flags: ['tooDirect'],
        difficulty: null,
      });

      expect(result.currentMood).toBe('testing');
      expect(result.tensionLevel).toBeGreaterThan(0.5);
      expect(result.lastChangeReason).toBe('negative_flag');
    });

    it('should apply flag-based mood changes (positive flag)', () => {
      const currentMood = createDefaultMissionState('neutral');
      const result = service.updateMoodFromScoring(currentMood.mood, {
        score: 65,
        flags: ['flirt', 'playful'],
        difficulty: null,
      });

      expect(result.currentMood).toBe('warm');
      expect(result.positivityPct).toBeGreaterThan(60);
      expect(result.lastChangeReason).toBe('positive_flag');
    });

    it('should calculate tension from score and thresholds', () => {
      const currentMood = createDefaultMissionState('neutral');
      const difficulty: MissionConfigV1Difficulty = {
        level: 'MEDIUM' as any,
        failThreshold: 50,
        recommendedSuccessScore: 70,
        strictness: 50,
        ambiguityTolerance: 50,
        emotionalPenalty: 50,
        bonusForCleverness: 50,
        recoveryDifficulty: 50,
      };

      // Low score below fail threshold should increase tension
      const lowScoreResult = service.updateMoodFromScoring(currentMood.mood, {
        score: 40,
        flags: [],
        difficulty,
        failThreshold: 50,
        successThreshold: 70,
      });

      expect(lowScoreResult.tensionLevel).toBeGreaterThan(currentMood.mood.tensionLevel);

      // High score above success threshold should decrease tension
      const highScoreResult = service.updateMoodFromScoring(currentMood.mood, {
        score: 80,
        flags: [],
        difficulty,
        failThreshold: 50,
        successThreshold: 70,
      });

      expect(highScoreResult.tensionLevel).toBeLessThan(currentMood.mood.tensionLevel);
    });

    it('should determine stability correctly', () => {
      const currentMood = createDefaultMissionState('neutral');
      
      // Small score change should maintain stability
      const stableResult = service.updateMoodFromScoring(currentMood.mood, {
        score: 55, // Similar to default
        flags: [],
        difficulty: null,
      });

      // Large score change should make mood unstable
      const unstableResult = service.updateMoodFromScoring(currentMood.mood, {
        score: 20, // Very different
        flags: ['tooDirect'],
        difficulty: null,
      });

      expect(stableResult.isStable).toBe(true);
      expect(unstableResult.isStable).toBe(false);
    });
  });

  describe('updateMissionState', () => {
    it('should update full mission state with progress and success likelihood', () => {
      const currentState = createDefaultMissionState('neutral');
      const messageScores = [60, 70, 80, 75, 85];
      const difficulty: MissionConfigV1Difficulty = {
        level: 'MEDIUM' as any,
        failThreshold: 50,
        recommendedSuccessScore: 70,
        strictness: 50,
        ambiguityTolerance: 50,
        emotionalPenalty: 50,
        bonusForCleverness: 50,
        recoveryDifficulty: 50,
      };

      const result = service.updateMissionState(
        currentState,
        messageScores,
        85,
        ['flirt'],
        null,
        null,
        difficulty,
        50,
        70,
        10,
      );

      expect(result.progressPct).toBeGreaterThan(0);
      expect(result.successLikelihood).toBeGreaterThan(50);
      expect(result.messageCount).toBe(5);
      expect(result.averageScore).toBeGreaterThan(70);
      expect(result.mood.currentMood).toBe('excited');
    });

    it('should calculate progress percentage correctly', () => {
      const currentState = createDefaultMissionState('neutral');
      const messageScores = [60, 70, 80];
      
      const result = service.updateMissionState(
        currentState,
        messageScores,
        80,
        [],
        null,
        null,
        null,
        50,
        70,
        10, // maxMessages
      );

      expect(result.progressPct).toBe(30); // 3/10 = 30%
    });

    it('should calculate stability score based on score variance', () => {
      const currentState = createDefaultMissionState('neutral');
      
      // Low variance scores (stable)
      const stableScores = [70, 72, 71, 73, 70];
      const stableResult = service.updateMissionState(
        currentState,
        stableScores,
        70,
        [],
        null,
        null,
        null,
        50,
        70,
        10,
      );

      // High variance scores (unstable)
      const unstableScores = [30, 90, 40, 85, 35];
      const unstableResult = service.updateMissionState(
        currentState,
        unstableScores,
        35,
        [],
        null,
        null,
        null,
        50,
        70,
        10,
      );

      expect(stableResult.stabilityScore).toBeGreaterThan(unstableResult.stabilityScore);
    });
  });

  describe('createInitialMissionState', () => {
    it('should create initial state with warm mood', () => {
      const result = service.createInitialMissionState('warm');
      expect(result.mood.currentMood).toBe('warm');
      expect(result.mood.positivityPct).toBe(70);
      expect(result.progressPct).toBe(0);
    });

    it('should create initial state with cold mood', () => {
      const result = service.createInitialMissionState('cold');
      expect(result.mood.currentMood).toBe('cold');
      expect(result.mood.positivityPct).toBe(30);
    });

    it('should create initial state with neutral mood when null', () => {
      const result = service.createInitialMissionState(null);
      expect(result.mood.currentMood).toBe('neutral');
      expect(result.mood.positivityPct).toBe(50);
    });
  });
});

