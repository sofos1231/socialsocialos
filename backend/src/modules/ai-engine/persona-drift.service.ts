// backend/src/modules/ai-engine/persona-drift.service.ts
// Step 6.8: Persona Drift Detection & Modifier Service

import { Injectable } from '@nestjs/common';
import {
  PersonaStabilityContext,
  PersonaStabilityResult,
  ModifierEvent,
} from './persona-drift.types';
import { ActiveModifier } from './mission-state-v1.schema';

@Injectable()
export class PersonaDriftService {
  /**
   * Step 6.8: Compute persona stability score
   * Checks consistency between config layers (style, dynamics, difficulty, mood) and actual behavior
   */
  computePersonaStability(context: PersonaStabilityContext): PersonaStabilityResult {
    let stability = 100; // Start at perfect consistency
    let driftReason: string | null = null;

    const { style, dynamics, moodState, recentScores, recentFlags } = context;

    // Check 1: Style vs Mood consistency
    // If style is "FLIRTY" but mood is "cold", there's a drift
    if (style?.aiStyleKey) {
      const styleKey = style.aiStyleKey.toLowerCase();
      const mood = moodState.currentMood.toLowerCase();

      if (styleKey.includes('flirt') && (mood === 'cold' || mood === 'annoyed')) {
        stability -= 20;
        driftReason = `Style (${styleKey}) conflicts with mood (${mood})`;
      } else if (styleKey.includes('warm') && mood === 'cold') {
        stability -= 15;
        if (!driftReason) driftReason = `Style (${styleKey}) conflicts with mood (${mood})`;
      }
    }

    // Check 2: Dynamics vs Mood consistency
    // If dynamics say "high flirtiveness" but mood is cold, there's drift
    if (dynamics) {
      const flirtiveness = dynamics.flirtiveness ?? 50;
      const mood = moodState.currentMood.toLowerCase();

      if (flirtiveness > 70 && (mood === 'cold' || mood === 'annoyed')) {
        stability -= 15;
        if (!driftReason) driftReason = `High flirtiveness (${flirtiveness}) conflicts with mood (${mood})`;
      }

      const vulnerability = dynamics.vulnerability ?? 50;
      if (vulnerability > 70 && mood === 'cold') {
        stability -= 10;
        if (!driftReason) driftReason = `High vulnerability (${vulnerability}) conflicts with mood (${mood})`;
      }
    }

    // Check 3: Score trends vs expected behavior
    // If scores are consistently low but style/dynamics suggest positive engagement, there's drift
    if (recentScores.length >= 2) {
      const avgScore = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
      const mood = moodState.currentMood.toLowerCase();

      // Low scores with warm style/dynamics = drift
      if (avgScore < 40 && (style?.aiStyleKey?.toLowerCase().includes('warm') || mood === 'warm')) {
        stability -= 15;
        if (!driftReason) driftReason = `Low scores (${avgScore.toFixed(0)}) conflict with warm style/mood`;
      }
    }

    // Check 4: Negative flags vs positive style
    // If we're getting negative flags but style is positive, there's drift
    if (recentFlags.length > 0) {
      const allFlags = recentFlags.flat();
      const negativeFlags = allFlags.filter((f) =>
        f.toLowerCase().includes('negative') || f.toLowerCase().includes('low-impact'),
      );

      if (negativeFlags.length > 0 && style?.aiStyleKey?.toLowerCase().includes('warm')) {
        stability -= 10;
        if (!driftReason) driftReason = `Negative flags conflict with positive style`;
      }
    }

    // Clamp stability to 0-100
    stability = Math.max(0, Math.min(100, Math.round(stability)));

    return {
      personaStability: stability,
      lastDriftReason: driftReason,
    };
  }

  /**
   * Step 6.8: Detect events that may trigger modifiers
   */
  detectModifierEvents(context: PersonaStabilityContext): ModifierEvent[] {
    const events: ModifierEvent[] = [];
    const { moodState, recentScores, recentFlags } = context;

    // Event 1: Tension spike
    if (moodState.tensionLevel > 0.7) {
      events.push({
        type: 'tension_spike',
        severity: moodState.tensionLevel,
        context: {
          tensionLevel: moodState.tensionLevel,
          moodState: moodState.currentMood,
        },
      });
    }

    // Event 2: Mood drop
    const negativeMoods = ['cold', 'annoyed', 'bored'];
    if (negativeMoods.includes(moodState.currentMood)) {
      events.push({
        type: 'mood_drop',
        severity: moodState.positivityPct < 30 ? 0.9 : 0.6,
        context: {
          moodState: moodState.currentMood,
        },
      });
    }

    // Event 3: Score collapse (sudden drop)
    if (recentScores.length >= 2) {
      const lastScore = recentScores[recentScores.length - 1];
      const previousScore = recentScores[recentScores.length - 2];
      const drop = previousScore - lastScore;

      if (drop > 30) {
        events.push({
          type: 'score_collapse',
          severity: Math.min(1.0, drop / 50),
          context: {
            currentScore: lastScore,
          },
        });
      }
    }

    // Event 4: Negative flags
    if (recentFlags.length > 0) {
      const allFlags = recentFlags.flat();
      const negativeCount = allFlags.filter((f) =>
        f.toLowerCase().includes('negative') || f.toLowerCase().includes('low-impact'),
      ).length;

      if (negativeCount >= 2) {
        events.push({
          type: 'flag_negative',
          severity: Math.min(1.0, negativeCount / 3),
          context: {
            flags: allFlags,
          },
        });
      }
    }

    return events;
  }

  /**
   * Step 6.8: Update modifiers based on events
   * Adds new modifiers, decays existing ones, removes expired ones
   */
  updateModifiersFromEvents(
    events: ModifierEvent[],
    existingModifiers: ActiveModifier[] = [],
  ): ActiveModifier[] {
    let modifiers = [...existingModifiers];

    // Decay existing modifiers (reduce remainingTurns)
    modifiers = modifiers.map((m) => ({
      ...m,
      remainingTurns: Math.max(0, m.remainingTurns - 1),
    }));

    // Remove expired modifiers
    modifiers = modifiers.filter((m) => m.remainingTurns > 0);

    // Add new modifiers based on events
    for (const event of events) {
      if (event.type === 'tension_spike' && event.severity > 0.7) {
        // High tension → lower risk for next 3 turns
        const existing = modifiers.find((m) => m.key === 'lowerRiskForNext3Turns');
        if (!existing) {
          modifiers.push({
            key: 'lowerRiskForNext3Turns',
            effect: 'reduceRisk',
            remainingTurns: 3,
            appliedAt: new Date().toISOString(),
            reason: `Tension spike (${(event.severity * 100).toFixed(0)}%)`,
          });
        }
      }

      if (event.type === 'mood_drop' && event.severity > 0.7) {
        // Mood drop → lower warmth for next 2 turns
        const existing = modifiers.find((m) => m.key === 'lowerWarmthForNext2Turns');
        if (!existing) {
          modifiers.push({
            key: 'lowerWarmthForNext2Turns',
            effect: 'lowerWarmth',
            remainingTurns: 2,
            appliedAt: new Date().toISOString(),
            reason: `Mood drop (${event.context.moodState})`,
          });
        }
      }

      if (event.type === 'score_collapse' && event.severity > 0.6) {
        // Score collapse → play safer for next 3 turns
        const existing = modifiers.find((m) => m.key === 'playSaferForNext3Turns');
        if (!existing) {
          modifiers.push({
            key: 'playSaferForNext3Turns',
            effect: 'reduceRisk',
            remainingTurns: 3,
            appliedAt: new Date().toISOString(),
            reason: `Score collapse (${event.severity * 100}% severity)`,
          });
        }
      }
    }

    return modifiers;
  }

  /**
   * Step 6.8: Apply modifiers to mission state (returns adjusted hints)
   * This doesn't mutate state directly, but provides hints for prompt adjustments
   */
  applyModifiersToState(
    modifiers: ActiveModifier[],
    currentState: {
      riskIndex?: number | null;
      warmth?: number | null;
    },
  ): {
    adjustedRiskIndex?: number | null;
    adjustedWarmth?: number | null;
    modifierHints: string[];
  } {
    let adjustedRiskIndex = currentState.riskIndex ?? null;
    let adjustedWarmth = currentState.warmth ?? null;
    const modifierHints: string[] = [];

    for (const modifier of modifiers) {
      if (modifier.effect === 'reduceRisk' && adjustedRiskIndex !== null) {
        adjustedRiskIndex = Math.max(0, adjustedRiskIndex - 20);
        modifierHints.push(`Risk reduced due to: ${modifier.reason ?? modifier.key}`);
      }

      if (modifier.effect === 'lowerWarmth' && adjustedWarmth !== null) {
        adjustedWarmth = Math.max(0, adjustedWarmth - 15);
        modifierHints.push(`Warmth reduced due to: ${modifier.reason ?? modifier.key}`);
      }
    }

    return {
      adjustedRiskIndex,
      adjustedWarmth,
      modifierHints,
    };
  }
}

