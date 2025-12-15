// backend/src/modules/ai-engine/persona-drift.service.ts
// Step 6.8: Persona Drift Detection & Modifier Service

import { Injectable, Inject, forwardRef, Optional } from '@nestjs/common';
import {
  PersonaStabilityContext,
  PersonaStabilityResult,
  ModifierEvent,
} from './persona-drift.types';
import { ActiveModifier } from './mission-state-v1.schema';
import { EngineConfigService } from '../engine-config/engine-config.service';

@Injectable()
export class PersonaDriftService {
  private personaConfig: any = null;
  // Wave 4.1: Track last seen revision for self-healing
  private lastRevision = -1;

  constructor(
    @Optional()
    @Inject(forwardRef(() => EngineConfigService))
    private readonly engineConfigService?: EngineConfigService,
  ) {
    // Load persona config on startup
    this.loadPersonaConfig();
    
    // Wave 4: Register for config update notifications
    if (this.engineConfigService) {
      this.engineConfigService.onConfigUpdated(() => this.refreshFromEngineConfig());
    }
  }

  /**
   * Load persona config from EngineConfig
   */
  private async loadPersonaConfig() {
    try {
      if (this.engineConfigService) {
        this.personaConfig = await this.engineConfigService.getPersonaConfig();
      }
    } catch (e) {
      // Fallback to defaults (will use hard-coded values)
      this.personaConfig = null;
    }
  }

  /**
   * Wave 4: Refresh persona config from EngineConfig (for cache invalidation)
   */
  async refreshFromEngineConfig(): Promise<void> {
    this.personaConfig = null;
    await this.loadPersonaConfig();
    // Wave 4.1: Update revision tracking
    if (this.engineConfigService) {
      this.lastRevision = this.engineConfigService.getRevision();
    }
  }

  /**
   * Wave 4.1: Ensure cache is fresh before use (self-healing guarantee)
   */
  private async ensureFresh(): Promise<void> {
    if (!this.engineConfigService) return;
    const currentRevision = this.engineConfigService.getRevision();
    if (currentRevision !== this.lastRevision) {
      await this.refreshFromEngineConfig();
    }
  }
  /**
   * Step 6.8: Compute persona stability score
   * Checks consistency between config layers (style, dynamics, difficulty, mood) and actual behavior
   */
  async computePersonaStability(context: PersonaStabilityContext): Promise<PersonaStabilityResult> {
    // Wave 4.1: Ensure cache is fresh before use
    await this.ensureFresh();
    
    let stability = 100; // Start at perfect consistency
    let driftReason: string | null = null;

    const { style, dynamics, moodState, recentScores, recentFlags } = context;

    // Get config or use defaults
    const driftPenalties = this.personaConfig?.driftPenalties || {
      styleMoodConflict: -20,
      styleMoodConflictMinor: -15,
      dynamicsMoodConflict: -15,
      vulnerabilityMoodConflict: -10,
      scoreStyleConflict: -15,
      negativeFlagsConflict: -10,
    };

    // Check 1: Style vs Mood consistency
    // If style is "FLIRTY" but mood is "cold", there's a drift
    if (style?.aiStyleKey) {
      const styleKey = style.aiStyleKey.toLowerCase();
      const mood = moodState.currentMood.toLowerCase();

      if (styleKey.includes('flirt') && (mood === 'cold' || mood === 'annoyed')) {
        stability += driftPenalties.styleMoodConflict;
        driftReason = `Style (${styleKey}) conflicts with mood (${mood})`;
      } else if (styleKey.includes('warm') && mood === 'cold') {
        stability += driftPenalties.styleMoodConflictMinor;
        if (!driftReason) driftReason = `Style (${styleKey}) conflicts with mood (${mood})`;
      }
    }

    // Check 2: Dynamics vs Mood consistency
    // If dynamics say "high flirtiveness" but mood is cold, there's drift
    if (dynamics) {
      const flirtiveness = dynamics.flirtiveness ?? 50;
      const mood = moodState.currentMood.toLowerCase();

      if (flirtiveness > 70 && (mood === 'cold' || mood === 'annoyed')) {
        stability += driftPenalties.dynamicsMoodConflict;
        if (!driftReason) driftReason = `High flirtiveness (${flirtiveness}) conflicts with mood (${mood})`;
      }

      const vulnerability = dynamics.vulnerability ?? 50;
      if (vulnerability > 70 && mood === 'cold') {
        stability += driftPenalties.vulnerabilityMoodConflict;
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
        stability += driftPenalties.scoreStyleConflict;
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
        stability += driftPenalties.negativeFlagsConflict;
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

    // Get config or use defaults
    const modifierEvents = this.personaConfig?.modifierEvents || {
      tensionSpikeThreshold: 0.7,
      moodDropSeverity: { low: 0.6, high: 0.9 },
      scoreCollapseThreshold: 30,
      scoreCollapseSeverityDivisor: 50,
      negativeFlagsThreshold: 2,
      negativeFlagsSeverityDivisor: 3,
    };

    // Event 1: Tension spike
    if (moodState.tensionLevel > modifierEvents.tensionSpikeThreshold) {
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
      const severity = moodState.positivityPct < 30 
        ? modifierEvents.moodDropSeverity.high 
        : modifierEvents.moodDropSeverity.low;
      events.push({
        type: 'mood_drop',
        severity,
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

      if (drop > modifierEvents.scoreCollapseThreshold) {
        events.push({
          type: 'score_collapse',
          severity: Math.min(1.0, drop / modifierEvents.scoreCollapseSeverityDivisor),
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

      if (negativeCount >= modifierEvents.negativeFlagsThreshold) {
        events.push({
          type: 'flag_negative',
          severity: Math.min(1.0, negativeCount / modifierEvents.negativeFlagsSeverityDivisor),
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

    // Get config or use defaults
    const modifierEffects = this.personaConfig?.modifierEffects || {
      reduceRiskAmount: -20,
      lowerWarmthAmount: -15,
    };
    const modifierEvents = this.personaConfig?.modifierEvents || {
      tensionSpikeThreshold: 0.7,
      moodDropSeverity: { low: 0.6, high: 0.9 },
      scoreCollapseThreshold: 30,
      scoreCollapseSeverityDivisor: 50,
      negativeFlagsThreshold: 2,
      negativeFlagsSeverityDivisor: 3,
    };

    // Add new modifiers based on events
    for (const event of events) {
      if (event.type === 'tension_spike' && event.severity > modifierEvents.tensionSpikeThreshold) {
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

      if (event.type === 'mood_drop' && event.severity > modifierEvents.moodDropSeverity.low) {
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

    // Get config or use defaults
    const modifierEffects = this.personaConfig?.modifierEffects || {
      reduceRiskAmount: -20,
      lowerWarmthAmount: -15,
    };

    for (const modifier of modifiers) {
      if (modifier.effect === 'reduceRisk' && adjustedRiskIndex !== null) {
        adjustedRiskIndex = Math.max(0, adjustedRiskIndex + modifierEffects.reduceRiskAmount);
        modifierHints.push(`Risk reduced due to: ${modifier.reason ?? modifier.key}`);
      }

      if (modifier.effect === 'lowerWarmth' && adjustedWarmth !== null) {
        adjustedWarmth = Math.max(0, adjustedWarmth + modifierEffects.lowerWarmthAmount);
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

