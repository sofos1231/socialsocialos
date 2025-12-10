// FILE: backend/src/modules/ai-engine/mission-state.service.ts
// Step 6.5: Mission State Service - Scoring ↔ Mission State Glue

import { Injectable } from '@nestjs/common';
import {
  MissionMoodStateV1,
  MissionStateV1,
  createDefaultMissionState,
} from './mission-state-v1.schema';
import {
  applyFlagToMood,
  applyScoreToMood,
  applyTraitTrendToMood,
  calculateTensionFromScore,
} from './registries/mission-mood-mappings.registry';
import { MissionConfigV1Difficulty } from '../missions-admin/mission-config-v1.schema';
import type { AiMessageScoreBase } from '../ai/ai.types';

export interface ScoreUpdateParams {
  score: number;
  flags?: string[];
  traits?: Record<string, number>;
  previousTraits?: Record<string, number> | null;
  difficulty?: MissionConfigV1Difficulty | null;
  failThreshold?: number;
  successThreshold?: number;
}

@Injectable()
export class MissionStateService {
  /**
   * Step 6.5: Transform scoring results into mood state changes
   */
  updateMoodFromScoring(
    currentMood: MissionMoodStateV1,
    params: ScoreUpdateParams,
  ): MissionMoodStateV1 {
    let updatedMood = { ...currentMood };

    // Step 1: Apply score-based mood changes
    const scoreResult = applyScoreToMood(updatedMood, params.score);
    if (scoreResult.changed) {
      updatedMood = scoreResult.mood;
    }

    // Step 2: Apply flag-based mood changes
    if (params.flags && params.flags.length > 0) {
      const flagResult = applyFlagToMood(updatedMood, params.flags);
      if (flagResult.changed) {
        updatedMood = flagResult.mood;
      }
    }

    // Step 3: Apply trait trend-based mood changes
    if (params.traits && params.previousTraits) {
      for (const [traitKey, traitValue] of Object.entries(params.traits)) {
        const previousValue = params.previousTraits[traitKey] ?? null;
        if (previousValue !== null) {
          const traitResult = applyTraitTrendToMood(
            updatedMood,
            traitKey,
            traitValue,
            previousValue,
          );
          if (traitResult.changed) {
            updatedMood = traitResult.mood;
            break; // Apply first significant trait change
          }
        }
      }
    }

    // Step 4: Calculate tension from score and thresholds
    if (params.failThreshold !== undefined && params.successThreshold !== undefined) {
      updatedMood.tensionLevel = calculateTensionFromScore(
        params.score,
        params.failThreshold,
        params.successThreshold,
        updatedMood.tensionLevel,
      );
    }

    // Step 5: Update positivity percentage based on score
    updatedMood.positivityPct = this.calculatePositivityFromScore(
      params.score,
      updatedMood.positivityPct,
    );

    // Step 6: Determine stability
    updatedMood.isStable = this.determineStability(updatedMood, currentMood);

    return updatedMood;
  }

  /**
   * Update full mission state from scoring results
   */
  updateMissionState(
    currentState: MissionStateV1,
    messageScores: number[],
    lastScore: number,
    lastFlags: string[] | null,
    lastTraits: Record<string, number> | null,
    previousTraits: Record<string, number> | null,
    difficulty?: MissionConfigV1Difficulty | null,
    failThreshold?: number,
    successThreshold?: number,
    maxMessages?: number,
  ): MissionStateV1 {
    const messageCount = messageScores.length;
    const averageScore =
      messageScores.length > 0
        ? Math.round(
            messageScores.reduce((a, b) => a + b, 0) / messageScores.length,
          )
        : 0;

    // Update mood state
    const updatedMood = this.updateMoodFromScoring(currentState.mood, {
      score: lastScore,
      flags: lastFlags ?? undefined,
      traits: lastTraits ?? null,
      previousTraits: previousTraits,
      difficulty: difficulty ?? null,
      failThreshold: failThreshold,
      successThreshold: successThreshold,
    });

    // Calculate progress
    const progressPct = maxMessages
      ? Math.min(100, Math.round((messageCount / maxMessages) * 100))
      : Math.min(100, messageCount * 10);

    // Calculate success likelihood based on average score and progress
    const successLikelihood = this.calculateSuccessLikelihood(
      averageScore,
      progressPct,
      successThreshold ?? 70,
    );

    // Calculate stability score
    const stabilityScore = this.calculateStabilityScore(
      messageScores,
      updatedMood.isStable,
    );

    return {
      mood: updatedMood,
      progressPct,
      successLikelihood,
      stabilityScore,
      messageCount,
      averageScore,
      lastScore,
      lastFlags: lastFlags ?? null,
    };
  }

  /**
   * Create initial mission state from openings config
   * Step 6.4: Now accepts required gates for gate state initialization
   */
  createInitialMissionState(
    personaInitMood?: 'warm' | 'neutral' | 'cold' | 'mysterious' | null,
    requiredGates?: string[] | null,
  ): MissionStateV1 {
    return createDefaultMissionState(personaInitMood, requiredGates ?? null);
  }

  /**
   * Calculate positivity percentage from score
   */
  private calculatePositivityFromScore(
    score: number,
    currentPositivity: number,
  ): number {
    // Smooth transition: 70% current, 30% new
    const targetPositivity = score; // Score is 0-100, positivity is 0-100
    return Math.round(currentPositivity * 0.7 + targetPositivity * 0.3);
  }

  /**
   * Determine if mood is stable
   */
  private determineStability(
    newMood: MissionMoodStateV1,
    oldMood: MissionMoodStateV1,
  ): boolean {
    // Mood is stable if it hasn't changed significantly
    const moodChanged = newMood.currentMood !== oldMood.currentMood;
    const positivityChanged =
      Math.abs(newMood.positivityPct - oldMood.positivityPct) > 15;
    const tensionChanged =
      Math.abs(newMood.tensionLevel - oldMood.tensionLevel) > 0.3;

    return !moodChanged && !positivityChanged && !tensionChanged;
  }

  /**
   * Calculate success likelihood based on average score and progress
   */
  private calculateSuccessLikelihood(
    averageScore: number,
    progressPct: number,
    successThreshold: number,
  ): number {
    // Base likelihood on score
    let likelihood = averageScore;

    // Adjust based on progress
    if (progressPct < 50) {
      // Early in mission - more uncertainty
      likelihood = likelihood * 0.8;
    } else if (progressPct > 80) {
      // Late in mission - more certainty
      likelihood = likelihood * 1.1;
    }

    // Adjust based on threshold
    if (averageScore >= successThreshold) {
      likelihood = Math.min(100, likelihood + 10);
    } else if (averageScore < successThreshold - 20) {
      likelihood = Math.max(0, likelihood - 20);
    }

    return Math.max(0, Math.min(100, Math.round(likelihood)));
  }

  /**
   * Calculate stability score based on message scores and mood stability
   */
  private calculateStabilityScore(
    messageScores: number[],
    moodStable: boolean,
  ): number {
    if (messageScores.length === 0) return 80; // Default stable

    // Calculate score variance
    const avg = messageScores.reduce((a, b) => a + b, 0) / messageScores.length;
    const variance =
      messageScores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) /
      messageScores.length;
    const stdDev = Math.sqrt(variance);

    // Lower variance = higher stability
    const scoreStability = Math.max(0, 100 - stdDev * 2);

    // Combine with mood stability
    const moodStabilityBonus = moodStable ? 10 : -10;

    return Math.max(0, Math.min(100, Math.round(scoreStability + moodStabilityBonus)));
  }
}

