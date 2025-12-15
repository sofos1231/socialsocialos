// backend/src/modules/ai-engine/micro-dynamics.service.ts
// Step 6.6: Micro-Dynamics Engine Service

import { Injectable, Inject, forwardRef, Optional } from '@nestjs/common';
import {
  MicroDynamicsState,
  MicroDynamicsContext,
  MicroGatesResult,
} from './micro-dynamics.types';
import { EngineConfigService } from '../engine-config/engine-config.service';

@Injectable()
export class MicroDynamicsService {
  private microDynamicsConfig: any = null;
  // Patch A: Track last seen revision for cache refresh
  private lastRevision = -1;

  constructor(
    @Optional()
    @Inject(forwardRef(() => EngineConfigService))
    private readonly engineConfigService?: EngineConfigService,
  ) {
    // Load micro dynamics config on startup
    this.loadMicroDynamicsConfig();
    
    // Patch A: Register for config update notifications
    if (this.engineConfigService) {
      this.engineConfigService.onConfigUpdated(() => this.refreshFromEngineConfig());
    }
  }

  /**
   * Load micro dynamics config from EngineConfig
   */
  private async loadMicroDynamicsConfig() {
    try {
      if (this.engineConfigService) {
        this.microDynamicsConfig = await this.engineConfigService.getMicroDynamicsConfig();
        // Patch A: Update revision tracking
        this.lastRevision = this.engineConfigService.getRevision();
      }
    } catch (e) {
      // Fallback to defaults (will use hard-coded values)
      this.microDynamicsConfig = null;
    }
  }

  /**
   * Patch A: Refresh micro dynamics config from EngineConfig (for cache invalidation)
   */
  async refreshFromEngineConfig(): Promise<void> {
    this.microDynamicsConfig = null;
    await this.loadMicroDynamicsConfig();
  }

  /**
   * Patch A: Ensure cache is fresh before use (self-healing guarantee)
   */
  private async ensureFresh(): Promise<void> {
    if (!this.engineConfigService) return;
    const currentRevision = this.engineConfigService.getRevision();
    if (currentRevision !== this.lastRevision) {
      await this.refreshFromEngineConfig();
    }
  }
  /**
   * Step 6.6: Compute micro-dynamics state from context
   * Deterministic formulas based on scores, tension, mood, difficulty
   */
  async computeMicroDynamics(context: MicroDynamicsContext): Promise<MicroDynamicsState> {
    // Patch A: Ensure cache is fresh before use
    await this.ensureFresh();
    
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

    // Get config or use defaults
    const riskConfig = this.microDynamicsConfig?.risk || {
      baseRiskFromScore: { min: 20, max: 80 },
      tensionPenalty: { threshold: 0.3, maxPenalty: 35 },
      difficultyAdjustments: { HARD: -15, MEDIUM: -5, EASY: 0 },
      progressAdjustments: { early: -10, late: 10 },
    };

    // Base risk from score: higher scores allow more risk
    const baseRiskMin = riskConfig.baseRiskFromScore.min;
    const baseRiskMax = riskConfig.baseRiskFromScore.max;
    let risk = baseRiskMin + (currentScore / 100) * (baseRiskMax - baseRiskMin);

    // Tension adjustment: high tension reduces risk tolerance
    const tensionThreshold = riskConfig.tensionPenalty.threshold;
    const maxTensionPenalty = riskConfig.tensionPenalty.maxPenalty;
    if (tensionLevel > tensionThreshold) {
      const tensionPenalty = ((tensionLevel - tensionThreshold) / (1.0 - tensionThreshold)) * maxTensionPenalty;
      risk -= tensionPenalty;
    }

    // Difficulty adjustment: harder difficulty = lower risk tolerance
    const difficultyAdjustments = riskConfig.difficultyAdjustments;
    if (difficultyLevel && difficultyAdjustments[difficultyLevel] !== undefined) {
      risk += difficultyAdjustments[difficultyLevel];
    }

    // Progress adjustment: early in mission = lower risk, late = higher risk
    const progressAdjustments = riskConfig.progressAdjustments;
    if (progressPct < 30) {
      risk += progressAdjustments.early;
    } else if (progressPct > 70) {
      risk += progressAdjustments.late;
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

    // Get config or use defaults
    const momentumConfig = this.microDynamicsConfig?.momentum || {
      scoreDeltaMultiplier: 0.5,
      gateProgressMultiplier: 0.3,
      moodBonuses: { positive: 10, negative: -10 },
      trendMultiplier: 0.3,
    };

    // Calculate score trend (last 2-3 messages)
    const lastScore = recentScores[recentScores.length - 1];
    const previousScore = recentScores[recentScores.length - 2];
    const scoreDelta = lastScore - previousScore;

    // Base momentum from score improvement
    // Positive delta = positive momentum, negative = negative momentum
    let momentum = 50 + scoreDelta * momentumConfig.scoreDeltaMultiplier;

    // Gate progress bonus: meeting gates increases momentum
    if (gateProgress) {
      const metCount = gateProgress.metGates.length;
      const totalCount = metCount + gateProgress.unmetGates.length;
      if (totalCount > 0) {
        const gateProgressPct = (metCount / totalCount) * 100;
        momentum += (gateProgressPct - 50) * momentumConfig.gateProgressMultiplier;
      }
    }

    // Mood state adjustment: positive moods boost momentum
    const positiveMoods = ['warm', 'excited', 'interested'];
    const negativeMoods = ['cold', 'annoyed', 'bored'];
    if (positiveMoods.includes(moodState)) {
      momentum += momentumConfig.moodBonuses.positive;
    } else if (negativeMoods.includes(moodState)) {
      momentum += momentumConfig.moodBonuses.negative;
    }

    // Smooth momentum: if we have 3+ scores, consider trend
    if (recentScores.length >= 3) {
      const firstScore = recentScores[0];
      const trend = (lastScore - firstScore) / recentScores.length;
      momentum += trend * momentumConfig.trendMultiplier;
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

    // Get config or use defaults
    const flowConfig = this.microDynamicsConfig?.flow || {
      varianceToFlowMultiplier: 2.0,
    };

    // Compute variance of recent scores
    const mean = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
    const variance =
      recentScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) /
      recentScores.length;
    const stdDev = Math.sqrt(variance);

    // Convert variance to flow: lower variance = higher flow
    // Standard deviation of 0 = perfect flow (100)
    // Standard deviation of 20+ = low flow (20-40)
    const flow = Math.max(0, 100 - stdDev * flowConfig.varianceToFlowMultiplier);

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

