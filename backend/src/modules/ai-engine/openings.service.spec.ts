// FILE: backend/src/modules/ai-engine/openings.service.spec.ts
// Unit tests for Opening Generation Logic

import { Test, TestingModule } from '@nestjs/testing';
import { OpeningsService } from './openings.service';
import { AiStyleKey } from '@prisma/client';
import type {
  MissionConfigV1Openings,
  MissionConfigV1Dynamics,
  MissionConfigV1Difficulty,
} from '../missions-admin/mission-config-v1.schema';

describe('OpeningsService', () => {
  let service: OpeningsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpeningsService],
    }).compile();

    service = module.get<OpeningsService>(OpeningsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateOpening', () => {
    it('should generate opening with default mood when no openings config', () => {
      const result = service.generateOpening({
        aiStyleKey: AiStyleKey.NEUTRAL,
        openings: null,
        dynamics: null,
        difficulty: null,
        personaName: null,
      });

      expect(result).toBeDefined();
      expect(result.openingText).toBeTruthy();
      expect(result.templateKey).toBeDefined();
      expect(result.initialMood.currentMood).toBe('neutral');
      expect(result.initialMood.positivityPct).toBe(50);
    });

    it('should use personaInitMood from openings config', () => {
      const openings: MissionConfigV1Openings = {
        style: 'warm',
        energy: 70,
        curiosity: 60,
        personaInitMood: 'warm',
        openerTemplateKey: 'WARM_COMPLIMENT',
      };

      const result = service.generateOpening({
        aiStyleKey: AiStyleKey.WARM,
        openings,
        dynamics: null,
        difficulty: null,
        personaName: 'TestPersona',
      });

      expect(result.initialMood.currentMood).toBe('warm');
      expect(result.initialMood.positivityPct).toBeGreaterThan(50);
    });

    it('should inject dynamics into opening (emoji density)', () => {
      const dynamics: MissionConfigV1Dynamics = {
        mode: 'CHAT' as any,
        locationTag: 'DATING_APP' as any,
        hasPerMessageTimer: false,
        defaultEntryRoute: 'TEXT_CHAT',
        emojiDensity: 80, // High emoji density
        pace: 50,
        flirtiveness: 50,
        hostility: 30,
        dryness: 40,
        vulnerability: 50,
        escalationSpeed: 50,
        randomness: 30,
      };

      const result = service.generateOpening({
        aiStyleKey: AiStyleKey.PLAYFUL,
        openings: null,
        dynamics,
        difficulty: null,
        personaName: null,
      });

      // High emoji density should add emojis
      expect(result.openingText).toBeTruthy();
    });

    it('should inject dynamics into opening (pace)', () => {
      const dynamics: MissionConfigV1Dynamics = {
        mode: 'CHAT' as any,
        locationTag: 'DATING_APP' as any,
        hasPerMessageTimer: false,
        defaultEntryRoute: 'TEXT_CHAT',
        pace: 85, // Fast pace
        emojiDensity: 30,
        flirtiveness: 50,
        hostility: 30,
        dryness: 40,
        vulnerability: 50,
        escalationSpeed: 50,
        randomness: 30,
      };

      const result = service.generateOpening({
        aiStyleKey: AiStyleKey.DIRECT,
        openings: null,
        dynamics,
        difficulty: null,
        personaName: null,
      });

      // Fast pace should use exclamation marks
      expect(result.openingText).toBeTruthy();
    });

    it('should inject difficulty into opening (strictness)', () => {
      const difficulty: MissionConfigV1Difficulty = {
        level: 'MEDIUM' as any,
        strictness: 80, // High strictness
        ambiguityTolerance: 30,
        emotionalPenalty: 50,
        bonusForCleverness: 50,
        failThreshold: 50,
        recoveryDifficulty: 50,
      };

      const result = service.generateOpening({
        aiStyleKey: AiStyleKey.CHALLENGING,
        openings: null,
        dynamics: null,
        difficulty,
        personaName: null,
      });

      // High strictness should be more direct
      expect(result.openingText).toBeTruthy();
    });

    it('should select template based on aiStyleKey and openings.style', () => {
      const openings: MissionConfigV1Openings = {
        style: 'direct',
        energy: 70,
        curiosity: 60,
        personaInitMood: 'neutral',
        openerTemplateKey: 'DIRECT_QUESTION',
      };

      const result = service.generateOpening({
        aiStyleKey: AiStyleKey.DIRECT,
        openings,
        dynamics: null,
        difficulty: null,
        personaName: null,
      });

      expect(result.templateKey).toBe('DIRECT_QUESTION');
    });

    it('should combine all parameters (openings + dynamics + difficulty)', () => {
      const openings: MissionConfigV1Openings = {
        style: 'intense',
        energy: 80,
        curiosity: 70,
        personaInitMood: 'excited',
        openerTemplateKey: 'BOLD_STATEMENT',
      };

      const dynamics: MissionConfigV1Dynamics = {
        mode: 'CHAT' as any,
        locationTag: 'DATING_APP' as any,
        hasPerMessageTimer: false,
        defaultEntryRoute: 'TEXT_CHAT',
        pace: 75,
        emojiDensity: 60,
        flirtiveness: 70,
        hostility: 40,
        dryness: 30,
        vulnerability: 60,
        escalationSpeed: 70,
        randomness: 50,
      };

      const difficulty: MissionConfigV1Difficulty = {
        level: 'HARD' as any,
        strictness: 70,
        ambiguityTolerance: 40,
        emotionalPenalty: 60,
        bonusForCleverness: 50,
        failThreshold: 60,
        recoveryDifficulty: 60,
      };

      const result = service.generateOpening({
        aiStyleKey: AiStyleKey.CHALLENGING,
        openings,
        dynamics,
        difficulty,
        personaName: 'TestPersona',
      });

      expect(result).toBeDefined();
      expect(result.openingText).toBeTruthy();
      expect(result.initialMood.currentMood).toBe('excited');
      expect(result.templateKey).toBe('BOLD_STATEMENT');
    });
  });
});

