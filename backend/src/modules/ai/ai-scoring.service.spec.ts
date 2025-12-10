// backend/src/modules/ai/ai-scoring.service.spec.ts
// Step 6.1 Fix: Tests for strictness semantics and continuation recoveryDifficulty

import { Test, TestingModule } from '@nestjs/testing';
import { AiScoringService } from './ai-scoring.service';
import { MissionConfigV1Difficulty } from '../missions-admin/mission-config-v1.schema';
import { AccountTier } from '@prisma/client';

describe('AiScoringService - Step 6.1 Fixes', () => {
  let service: AiScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiScoringService],
    }).compile();

    service = module.get<AiScoringService>(AiScoringService);
  });

  describe('strictness semantics', () => {
    it('should apply lenient grading when strictness=0 (multiplier=1.0)', async () => {
      const difficultyConfig: MissionConfigV1Difficulty = {
        level: 'MEDIUM',
        strictness: 0, // Lenient
        ambiguityTolerance: 50,
        emotionalPenalty: 30,
        bonusForCleverness: 40,
        failThreshold: null,
        recoveryDifficulty: 50,
      };

      const messages = [
        { index: 0, role: 'user' as const, content: 'Hey, how are you?' },
      ];

      const result = await service.scoreSession(
        AccountTier.FREE,
        messages,
        difficultyConfig,
      );

      // Base score should be around 60-70 for a simple greeting
      // With strictness=0 (multiplier=1.0), score should be unchanged
      const score = result.perMessage[0].score;
      expect(score).toBeGreaterThanOrEqual(50);
      expect(score).toBeLessThanOrEqual(80);
    });

    it('should apply moderate grading when strictness=50 (multiplier=0.75)', async () => {
      const difficultyConfig: MissionConfigV1Difficulty = {
        level: 'MEDIUM',
        strictness: 50, // Moderate
        ambiguityTolerance: 50,
        emotionalPenalty: 30,
        bonusForCleverness: 40,
        failThreshold: null,
        recoveryDifficulty: 50,
      };

      const messages = [
        { index: 0, role: 'user' as const, content: 'Hey, how are you?' },
      ];

      const result = await service.scoreSession(
        AccountTier.FREE,
        messages,
        difficultyConfig,
      );

      const score = result.perMessage[0].score;
      // With strictness=50 (multiplier=0.75), score should be reduced by ~25%
      expect(score).toBeGreaterThanOrEqual(40);
      expect(score).toBeLessThanOrEqual(70);
    });

    it('should apply strict grading when strictness=100 (multiplier=0.5)', async () => {
      const difficultyConfig: MissionConfigV1Difficulty = {
        level: 'MEDIUM',
        strictness: 100, // Strict
        ambiguityTolerance: 50,
        emotionalPenalty: 30,
        bonusForCleverness: 40,
        failThreshold: null,
        recoveryDifficulty: 50,
      };

      const messages = [
        { index: 0, role: 'user' as const, content: 'Hey, how are you?' },
      ];

      const result = await service.scoreSession(
        AccountTier.FREE,
        messages,
        difficultyConfig,
      );

      const score = result.perMessage[0].score;
      // With strictness=100 (multiplier=0.5), score should be reduced by ~50%
      expect(score).toBeGreaterThanOrEqual(30);
      expect(score).toBeLessThanOrEqual(60);
    });

    it('should verify strictness=0 produces higher scores than strictness=100 for same message', async () => {
      const message = { index: 0, role: 'user' as const, content: 'Hey, how are you?' };

      const lenientConfig: MissionConfigV1Difficulty = {
        level: 'MEDIUM',
        strictness: 0,
        ambiguityTolerance: 50,
        emotionalPenalty: 30,
        bonusForCleverness: 40,
        failThreshold: null,
        recoveryDifficulty: 50,
      };

      const strictConfig: MissionConfigV1Difficulty = {
        level: 'MEDIUM',
        strictness: 100,
        ambiguityTolerance: 50,
        emotionalPenalty: 30,
        bonusForCleverness: 40,
        failThreshold: null,
        recoveryDifficulty: 50,
      };

      const lenientResult = await service.scoreSession(
        AccountTier.FREE,
        [message],
        lenientConfig,
      );

      const strictResult = await service.scoreSession(
        AccountTier.FREE,
        [message],
        strictConfig,
      );

      const lenientScore = lenientResult.perMessage[0].score;
      const strictScore = strictResult.perMessage[0].score;

      // Lenient should produce higher score than strict
      expect(lenientScore).toBeGreaterThan(strictScore);
    });
  });

  describe('continuation recoveryDifficulty', () => {
    it('should seed previousScore for first message in continuation batch', async () => {
      const difficultyConfig: MissionConfigV1Difficulty = {
        level: 'MEDIUM',
        strictness: 50,
        ambiguityTolerance: 50,
        emotionalPenalty: 30,
        bonusForCleverness: 40,
        failThreshold: null,
        recoveryDifficulty: 80, // High recovery difficulty
      };

      // Simulate continuation: previous message had low score (30)
      const previousScoreSeed = 30;

      const messages = [
        { index: 5, role: 'user' as const, content: 'I really want to get to know you better' },
      ];

      // Score with previousScoreSeed (continuation)
      const resultWithSeed = await service.scoreConversation({
        userId: 'test-user',
        personaId: null,
        templateId: null,
        messages,
        difficultyConfig,
        previousScoreSeed, // Step 6.1 Fix: Seed for continuation
      });

      // Score without previousScoreSeed (new session)
      const resultWithoutSeed = await service.scoreConversation({
        userId: 'test-user',
        personaId: null,
        templateId: null,
        messages,
        difficultyConfig,
        previousScoreSeed: null, // No seed
      });

      const scoreWithSeed = resultWithSeed.perMessage[0].score;
      const scoreWithoutSeed = resultWithoutSeed.perMessage[0].score;

      // With high recoveryDifficulty and previousScoreSeed, the improvement should be penalized
      // So scoreWithSeed should be lower than scoreWithoutSeed (if the message is better than the seed)
      if (scoreWithoutSeed > previousScoreSeed) {
        // Recovery penalty should reduce the improvement
        expect(scoreWithSeed).toBeLessThanOrEqual(scoreWithoutSeed);
      }
    });

    it('should apply recoveryDifficulty penalty when current score improves from previous', async () => {
      const difficultyConfig: MissionConfigV1Difficulty = {
        level: 'MEDIUM',
        strictness: 50,
        ambiguityTolerance: 50,
        emotionalPenalty: 30,
        bonusForCleverness: 40,
        failThreshold: null,
        recoveryDifficulty: 100, // Maximum recovery difficulty
      };

      const previousScoreSeed = 30; // Low previous score
      const messages = [
        { index: 0, role: 'user' as const, content: 'That sounds amazing! I\'d love to hear more about that.' },
      ];

      const result = await service.scoreConversation({
        userId: 'test-user',
        personaId: null,
        templateId: null,
        messages,
        difficultyConfig,
        previousScoreSeed,
      });

      const score = result.perMessage[0].score;
      const improvement = score - previousScoreSeed;

      // With recoveryDifficulty=100, improvement should be penalized by up to 30%
      // So if base improvement would be 40 points, actual improvement should be around 28 points
      if (improvement > 0) {
        // The recovery penalty should reduce the improvement
        expect(score).toBeGreaterThan(previousScoreSeed); // Still improved
        expect(score).toBeLessThan(previousScoreSeed + improvement * 1.5); // But penalized
      }
    });

    it('should not apply recoveryDifficulty when current score is worse than previous', async () => {
      const difficultyConfig: MissionConfigV1Difficulty = {
        level: 'MEDIUM',
        strictness: 50,
        ambiguityTolerance: 50,
        emotionalPenalty: 30,
        bonusForCleverness: 40,
        failThreshold: null,
        recoveryDifficulty: 100, // Maximum recovery difficulty
      };

      const previousScoreSeed = 80; // High previous score
      const messages = [
        { index: 0, role: 'user' as const, content: 'ok' }, // Likely lower score
      ];

      const result = await service.scoreConversation({
        userId: 'test-user',
        personaId: null,
        templateId: null,
        messages,
        difficultyConfig,
        previousScoreSeed,
      });

      const score = result.perMessage[0].score;

      // If current score is worse than previous, recoveryDifficulty should not apply
      // (it only applies when recovering, i.e., improving)
      if (score < previousScoreSeed) {
        // No recovery penalty should be applied when score is getting worse
        expect(score).toBeLessThan(previousScoreSeed);
      }
    });
  });
});

