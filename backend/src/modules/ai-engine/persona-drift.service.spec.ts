// backend/src/modules/ai-engine/persona-drift.service.spec.ts
// Step 6.8: Tests for Persona Drift Service

import { Test, TestingModule } from '@nestjs/testing';
import { PersonaDriftService } from './persona-drift.service';
import { PersonaStabilityContext } from './persona-drift.types';
import { createDefaultMoodState } from './mission-state-v1.schema';

describe('PersonaDriftService - Step 6.8', () => {
  let service: PersonaDriftService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PersonaDriftService],
    }).compile();

    service = module.get<PersonaDriftService>(PersonaDriftService);
  });

  describe('computePersonaStability', () => {
    it('should detect drift when style conflicts with mood', () => {
      const context: PersonaStabilityContext = {
        style: {
          aiStyleKey: 'FLIRTY',
          intensity: 'HIGH',
        },
        dynamics: null,
        difficulty: null,
        moodState: createDefaultMoodState('cold'),
        recentScores: [70, 70, 70],
        recentFlags: [],
        recentTraits: [],
      };

      const result = service.computePersonaStability(context);

      expect(result.personaStability).toBeLessThan(100);
      expect(result.lastDriftReason).toContain('conflicts');
    });

    it('should maintain high stability when style and mood align', () => {
      const context: PersonaStabilityContext = {
        style: {
          aiStyleKey: 'WARM',
          intensity: 'MEDIUM',
        },
        dynamics: null,
        difficulty: null,
        moodState: createDefaultMoodState('warm'),
        recentScores: [75, 75, 75],
        recentFlags: [],
        recentTraits: [],
      };

      const result = service.computePersonaStability(context);

      expect(result.personaStability).toBeGreaterThan(80);
    });
  });

  describe('computePersonaStability - edge cases', () => {
    it('should return stability in [0, 100] range', () => {
      const stableContext: PersonaStabilityContext = {
        style: { aiStyleKey: 'WARM' },
        dynamics: null,
        difficulty: null,
        moodState: createDefaultMoodState('warm'),
        recentScores: [75, 75, 75],
        recentFlags: [],
        recentTraits: [],
      };

      const chaoticContext: PersonaStabilityContext = {
        style: { aiStyleKey: 'FLIRTY' },
        dynamics: { mode: 'CHAT' as any, locationTag: 'DATING_APP' as any, hasPerMessageTimer: false, flirtiveness: 80 },
        difficulty: null,
        moodState: createDefaultMoodState('cold'),
        recentScores: [30, 20, 25],
        recentFlags: [['NEGATIVE_FLAG']],
        recentTraits: [],
      };

      const stableResult = service.computePersonaStability(stableContext);
      const chaoticResult = service.computePersonaStability(chaoticContext);

      expect(stableResult.personaStability).toBeGreaterThanOrEqual(0);
      expect(stableResult.personaStability).toBeLessThanOrEqual(100);
      expect(chaoticResult.personaStability).toBeGreaterThanOrEqual(0);
      expect(chaoticResult.personaStability).toBeLessThanOrEqual(100);
      expect(chaoticResult.personaStability).toBeLessThan(stableResult.personaStability);
    });

    it('should populate lastDriftReason when drift detected', () => {
      const context: PersonaStabilityContext = {
        style: { aiStyleKey: 'FLIRTY' },
        dynamics: { mode: 'CHAT' as any, locationTag: 'DATING_APP' as any, hasPerMessageTimer: false, flirtiveness: 80 },
        difficulty: null,
        moodState: createDefaultMoodState('cold'),
        recentScores: [40, 35, 30],
        recentFlags: [],
        recentTraits: [],
      };

      const result = service.computePersonaStability(context);

      expect(result.lastDriftReason).not.toBeNull();
      expect(result.lastDriftReason).toContain('conflicts');
    });
  });

  describe('detectModifierEvents', () => {
    it('should detect tension spike event', () => {
      const moodState = createDefaultMoodState('neutral');
      moodState.tensionLevel = 0.8; // High tension
      
      const context: PersonaStabilityContext = {
        style: { aiStyleKey: 'NEUTRAL' },
        dynamics: null,
        difficulty: null,
        moodState,
        recentScores: [70, 70, 70],
        recentFlags: [],
        recentTraits: [],
      };

      const events = service.detectModifierEvents(context);

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'tension_spike')).toBe(true);
    });

    it('should detect mood drop event', () => {
      const moodState = createDefaultMoodState('cold');
      moodState.positivityPct = 25; // Low positivity
      
      const context: PersonaStabilityContext = {
        style: { aiStyleKey: 'WARM' },
        dynamics: null,
        difficulty: null,
        moodState,
        recentScores: [50, 45, 40],
        recentFlags: [],
        recentTraits: [],
      };

      const events = service.detectModifierEvents(context);

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'mood_drop')).toBe(true);
    });

    it('should detect score collapse event', () => {
      const context: PersonaStabilityContext = {
        style: { aiStyleKey: 'NEUTRAL' },
        dynamics: null,
        difficulty: null,
        moodState: createDefaultMoodState('neutral'),
        recentScores: [80, 40], // Big drop (40 points)
        recentFlags: [],
        recentTraits: [],
      };

      const events = service.detectModifierEvents(context);

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'score_collapse')).toBe(true);
    });
  });

  describe('updateModifiersFromEvents', () => {
    it('should add modifier on tension spike event', () => {
      const events = [
        {
          type: 'tension_spike' as const,
          severity: 0.8,
          context: {
            tensionLevel: 0.8,
            moodState: 'cold',
          },
        },
      ];

      const modifiers = service.updateModifiersFromEvents(events, []);

      expect(modifiers.length).toBeGreaterThan(0);
      expect(modifiers[0].key).toBe('lowerRiskForNext3Turns');
      expect(modifiers[0].effect).toBe('reduceRisk');
      expect(modifiers[0].remainingTurns).toBe(3);
    });

    it('should decay existing modifiers', () => {
      const existingModifiers = [
        {
          key: 'lowerRiskForNext3Turns',
          effect: 'reduceRisk' as const,
          remainingTurns: 3,
          appliedAt: new Date().toISOString(),
          reason: 'Test',
        },
      ];

      const modifiers = service.updateModifiersFromEvents([], existingModifiers);

      expect(modifiers[0].remainingTurns).toBe(2);
    });

    it('should remove expired modifiers', () => {
      const existingModifiers = [
        {
          key: 'lowerRiskForNext3Turns',
          effect: 'reduceRisk' as const,
          remainingTurns: 1,
          appliedAt: new Date().toISOString(),
          reason: 'Test',
        },
      ];

      const modifiers = service.updateModifiersFromEvents([], existingModifiers);

      expect(modifiers.length).toBe(0);
    });

    it('should not add duplicate modifiers', () => {
      const events = [
        {
          type: 'tension_spike' as const,
          severity: 0.8,
          context: {
            tensionLevel: 0.8,
            moodState: 'cold',
          },
        },
      ];

      const existingModifiers = [
        {
          key: 'lowerRiskForNext3Turns',
          effect: 'reduceRisk' as const,
          remainingTurns: 2,
          appliedAt: new Date().toISOString(),
          reason: 'Existing',
        },
      ];

      const modifiers = service.updateModifiersFromEvents(events, existingModifiers);

      // Should only have one modifier (the existing one, decayed)
      const lowerRiskModifiers = modifiers.filter(m => m.key === 'lowerRiskForNext3Turns');
      expect(lowerRiskModifiers.length).toBe(1);
      expect(lowerRiskModifiers[0].remainingTurns).toBe(1); // Decayed from 2
    });

    it('should handle multiple concurrent modifiers (no explicit cap)', () => {
      const events = [
        {
          type: 'tension_spike' as const,
          severity: 0.8,
          context: { tensionLevel: 0.8, moodState: 'cold' },
        },
        {
          type: 'mood_drop' as const,
          severity: 0.9,
          context: { moodState: 'cold' },
        },
        {
          type: 'score_collapse' as const,
          severity: 0.7,
          context: { currentScore: 20 },
        },
      ];

      const modifiers = service.updateModifiersFromEvents(events, []);

      // Should have multiple modifiers (no cap enforced)
      expect(modifiers.length).toBeGreaterThanOrEqual(2);
      // Verify different modifier types exist
      const modifierKeys = modifiers.map(m => m.key);
      expect(modifierKeys).toContain('lowerRiskForNext3Turns');
    });
  });
});

