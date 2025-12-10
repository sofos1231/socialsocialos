// backend/src/modules/ai-engine/micro-dynamics.service.ts
// Step 6.6: Micro-Dynamics Engine Service

import { Injectable } from '@nestjs/common';
import {
  MicroDynamicsState,
  MicroDynamicsContext,
  MicroGatesResult,
} from './micro-dynamics.types';

@Injectable()
export class MicroDynamicsService {
  /**
   * Step 6.6: Compute micro-dynamics state from context
   * Deterministic formulas based on scores, tension, mood, difficulty
   */
  computeMicroDynamics(context: MicroDynamicsContext): MicroDynamicsState {
    const riskIndex = this.computeRiskIndex(context);
    const momentumIndex = this.computeMomentumIndex(context);
    const flowIndex = this.computeFlowIndex(context);

    return {
      riskIndex,
      momentumIndex,
      flowIndex,
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Step 6.6: Compute risk index (0-100)
   * Higher risk = more adventurous/risky replies should be allowed
   * Based on: current score, tension, difficulty, progress
   */
  private computeRiskIndex(context: MicroDynamicsContext): number {
    const { currentScore, tensionLevel, difficultyLevel, progressPct } = context;

    // Base risk from score: higher scores allow more risk
    // Score 0-50: low risk (20-40)
    // Score 50-70: moderate risk (40-60)
    // Score 70-100: high risk (60-80)
    let risk = 20 + (currentScore / 100) * 60;

    // Tension adjustment: high tension reduces risk tolerance
    // Tension 0-0.3: no penalty
    // Tension 0.3-0.7: moderate penalty (-10 to -20)
    // Tension 0.7-1.0: high penalty (-20 to -30)
    if (tensionLevel > 0.3) {
      const tensionPenalty = (tensionLevel - 0.3) * 50; // 0-35 point penalty
      risk -= tensionPenalty;
    }

    // Difficulty adjustment: harder difficulty = lower risk tolerance
    if (difficultyLevel === 'HARD') {
      risk -= 15;
    } else if (difficultyLevel === 'MEDIUM') {
      risk -= 5;
    }

    // Progress adjustment: early in mission = lower risk, late = higher risk
    if (progressPct < 30) {
      risk -= 10; // Early: be cautious
    } else if (progressPct > 70) {
      risk += 10; // Late: can take more risks
    }

    return Math.max(0, Math.min(100, Math.round(risk)));
  }

  /**
   * Step 6.6: Compute momentum index (0-100)
   * Higher momentum = user is "on a roll" (improving scores, meeting gates)
   * Based on: recent score delta, gate progress, mood trends
   */
  private computeMomentumIndex(context: MicroDynamicsContext): number {
    const { recentScores, gateProgress, moodState } = context;

    if (recentScores.length < 2) {
      return 50; // Neutral if not enough data
    }

    // Calculate score trend (last 2-3 messages)
    const lastScore = recentScores[recentScores.length - 1];
    const previousScore = recentScores[recentScores.length - 2];
    const scoreDelta = lastScore - previousScore;

    // Base momentum from score improvement
    // Positive delta = positive momentum, negative = negative momentum
    let momentum = 50 + scoreDelta * 0.5; // Scale delta to momentum

    // Gate progress bonus: meeting gates increases momentum
    if (gateProgress) {
      const metCount = gateProgress.metGates.length;
      const totalCount = metCount + gateProgress.unmetGates.length;
      if (totalCount > 0) {
        const gateProgressPct = (metCount / totalCount) * 100;
        momentum += (gateProgressPct - 50) * 0.3; // Bonus for gate progress
      }
    }

    // Mood state adjustment: positive moods boost momentum
    const positiveMoods = ['warm', 'excited', 'interested'];
    const negativeMoods = ['cold', 'annoyed', 'bored'];
    if (positiveMoods.includes(moodState)) {
      momentum += 10;
    } else if (negativeMoods.includes(moodState)) {
      momentum -= 10;
    }

    // Smooth momentum: if we have 3+ scores, consider trend
    if (recentScores.length >= 3) {
      const firstScore = recentScores[0];
      const trend = (lastScore - firstScore) / recentScores.length;
      momentum += trend * 0.3;
    }

    return Math.max(0, Math.min(100, Math.round(momentum)));
  }

  /**
   * Step 6.6: Compute flow index (0-100)
   * Higher flow = smooth, consistent performance
   * Based on: score stability (variance), similar to mood service flow but per-message
   */
  private computeFlowIndex(context: MicroDynamicsContext): number {
    const { recentScores } = context;

    if (recentScores.length < 2) {
      return 50; // Neutral if not enough data
    }

    // Compute variance of recent scores
    const mean = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
    const variance =
      recentScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) /
      recentScores.length;
    const stdDev = Math.sqrt(variance);

    // Convert variance to flow: lower variance = higher flow
    // Standard deviation of 0 = perfect flow (100)
    // Standard deviation of 20+ = low flow (20-40)
    const flow = Math.max(0, 100 - stdDev * 2);

    return Math.max(0, Math.min(100, Math.round(flow)));
  }

  /**
   * Step 6.6: Evaluate micro-gates (stub for future implementation)
   * This is a placeholder for future micro-gates logic
   * Currently returns empty result
   */
  evaluateMicroGates(
    microDynamics: MicroDynamicsState,
    context: MicroDynamicsContext,
  ): MicroGatesResult {
    // TODO Step 6.6+: Implement micro-gates logic
    // Example: if riskIndex > 80 and momentumIndex < 30, block risky moves
    // Example: if flowIndex < 40 for 3+ messages, trigger recovery gate
    return {
      passed: true,
      blockedReasons: [],
    };
  }
}

