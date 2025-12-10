// backend/src/modules/gates/gates.service.ts
// Step 5.1: Gate evaluation service for session-level gate ledger

import { Injectable, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { loadSessionAnalyticsSnapshot } from '../shared/helpers/session-snapshot.helper';
import { EngineConfigService } from '../engine-config/engine-config.service';

/**
 * Gate keys - universal gates evaluated for every session
 */
export type GateKey =
  | 'GATE_MIN_MESSAGES'
  | 'GATE_SUCCESS_THRESHOLD'
  | 'GATE_FAIL_FLOOR'
  | 'GATE_DISQUALIFIED'
  | 'GATE_OBJECTIVE_PROGRESS';

/**
 * Gate evaluation thresholds (v1 minimal but stable)
 * Step 7.2: These are now loaded from EngineConfig, but kept as fallback defaults
 */
const GATE_THRESHOLDS_DEFAULT = {
  MIN_MESSAGES: 3, // Minimum USER messages required
  SUCCESS_THRESHOLD: 70, // Average score >= 70 → passed
  FAIL_FLOOR: 40, // Average score <= 40 → failed
} as const;

export interface GateEvaluationContext {
  userMessageCount: number;
  averageScore: number | null;
  messageScores: number[];
  progressPct?: number | null;
  isDisqualified?: boolean;
  endReasonCode?: string | null;
}

export interface GateEvaluationResult {
  gateKey: GateKey;
  passed: boolean;
  reasonCode?: string | null;
  contextJson?: any;
}

@Injectable()
export class GatesService {
  private gateConfigs: Map<string, any> = new Map(); // Cached gate configs

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(forwardRef(() => EngineConfigService))
    private readonly engineConfigService?: EngineConfigService,
  ) {
    // Load gate configs on startup
    this.loadGateConfigs();
  }

  /**
   * Load gate configs from EngineConfig
   */
  private async loadGateConfigs() {
    try {
      if (this.engineConfigService) {
        const config = await this.engineConfigService.getGlobalConfig();
        for (const gate of config.gates) {
          if (gate.active) {
            this.gateConfigs.set(gate.key, gate);
          }
        }
      }
    } catch (e) {
      // Fallback to defaults
    }
  }

  /**
   * Get gate threshold (from config or default)
   */
  private getGateThreshold(key: string, defaultValue: number): number {
    const gate = this.gateConfigs.get(key);
    if (gate?.minMessages !== undefined && key === 'GATE_MIN_MESSAGES') {
      return gate.minMessages;
    }
    if (gate?.successThreshold !== undefined && key === 'GATE_SUCCESS_THRESHOLD') {
      return gate.successThreshold;
    }
    if (gate?.failFloor !== undefined && key === 'GATE_FAIL_FLOOR') {
      return gate.failFloor;
    }
    return defaultValue;
  }

  /**
   * Step 6.4: Evaluate gates for an active session (during mission, not just at end)
   * This is used during the mission to track gate state in real-time
   * 
   * @param context - Current session context (message count, scores, etc.)
   * @param requiredGates - List of gate keys that are required for this mission
   * @returns Array of gate evaluation results
   */
  evaluateGatesForActiveSession(
    context: GateEvaluationContext,
    requiredGates: GateKey[] = [],
  ): GateEvaluationResult[] {
    const outcomes: GateEvaluationResult[] = [];

    // Only evaluate gates that are in the required list (or all if no list provided)
    const gatesToEvaluate: GateKey[] = requiredGates.length > 0
      ? requiredGates
      : ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD', 'GATE_FAIL_FLOOR', 'GATE_DISQUALIFIED', 'GATE_OBJECTIVE_PROGRESS'];

    for (const gateKey of gatesToEvaluate) {
      let passed = false;
      let reasonCode: string | null = null;
      let contextJson: any = {};

      switch (gateKey) {
        case 'GATE_MIN_MESSAGES':
          const minMessages = this.getGateThreshold(
            'GATE_MIN_MESSAGES',
            GATE_THRESHOLDS_DEFAULT.MIN_MESSAGES,
          );
          passed = context.userMessageCount >= minMessages;
          reasonCode = passed ? 'SUFFICIENT_MESSAGES' : 'INSUFFICIENT_MESSAGES';
          contextJson = {
            messageCount: context.userMessageCount,
            required: this.getGateThreshold(
              'GATE_MIN_MESSAGES',
              GATE_THRESHOLDS_DEFAULT.MIN_MESSAGES,
            ),
          };
          break;

        case 'GATE_SUCCESS_THRESHOLD':
          if (context.averageScore !== null) {
            const threshold = this.getGateThreshold(
              'GATE_SUCCESS_THRESHOLD',
              GATE_THRESHOLDS_DEFAULT.SUCCESS_THRESHOLD,
            );
            passed = context.averageScore >= threshold;
            reasonCode = passed ? 'ABOVE_THRESHOLD' : 'BELOW_THRESHOLD';
            contextJson = {
              avgScore: context.averageScore,
              threshold: this.getGateThreshold(
                'GATE_SUCCESS_THRESHOLD',
                GATE_THRESHOLDS_DEFAULT.SUCCESS_THRESHOLD,
              ),
            };
          } else {
            passed = false;
            reasonCode = 'NO_SCORES_AVAILABLE';
            contextJson = { avgScore: null };
          }
          break;

        case 'GATE_FAIL_FLOOR':
          if (context.averageScore !== null) {
            const floor = this.getGateThreshold(
              'GATE_FAIL_FLOOR',
              GATE_THRESHOLDS_DEFAULT.FAIL_FLOOR,
            );
            passed = context.averageScore > floor;
            reasonCode = passed ? 'ABOVE_FLOOR' : 'AT_OR_BELOW_FLOOR';
            contextJson = {
              avgScore: context.averageScore,
              floor: this.getGateThreshold(
                'GATE_FAIL_FLOOR',
                GATE_THRESHOLDS_DEFAULT.FAIL_FLOOR,
              ),
            };
          } else {
            passed = false;
            reasonCode = 'NO_SCORES_AVAILABLE';
            contextJson = { avgScore: null };
          }
          break;

        case 'GATE_DISQUALIFIED':
          passed = !(context.isDisqualified ?? false);
          reasonCode = context.isDisqualified ? 'DISQUALIFIED' : 'NOT_DISQUALIFIED';
          contextJson = {
            endReasonCode: context.endReasonCode ?? null,
          };
          break;

        case 'GATE_OBJECTIVE_PROGRESS':
          if (context.progressPct !== null && context.progressPct !== undefined) {
            passed = context.progressPct >= 50; // 50% progress threshold
            reasonCode = passed ? 'PROGRESS_ABOVE_THRESHOLD' : 'PROGRESS_BELOW_THRESHOLD';
            contextJson = {
              progressPct: context.progressPct,
            };
          } else {
            passed = false;
            reasonCode = 'NO_PROGRESS_DATA';
            contextJson = { progressPct: null };
          }
          break;
      }

      outcomes.push({
        gateKey,
        passed,
        reasonCode,
        contextJson,
      });
    }

    return outcomes;
  }

  /**
   * Evaluates all gates for a session and persists outcomes
   * Idempotent: upserts by (sessionId, gateKey) to prevent duplicates
   * 
   * @param sessionId - Session ID to evaluate gates for
   */
  async evaluateAndPersist(sessionId: string): Promise<void> {
    // Load session snapshot (validates finalized status)
    const snapshot = await loadSessionAnalyticsSnapshot(this.prisma, sessionId);

    const userId = snapshot.userId;
    const userMessages = snapshot.messages.filter((m) => m.role === 'USER');

    // Compute average score from USER messages
    const scores = userMessages
      .map((m) => m.score)
      .filter((s): s is number => typeof s === 'number' && s >= 0 && s <= 100);
    const avgScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : null;

    // Evaluate each gate
    const outcomes: Array<{
      gateKey: GateKey;
      passed: boolean;
      reasonCode?: string;
      contextJson?: any;
    }> = [];

    // GATE_MIN_MESSAGES: Check if session has minimum required messages
    const minMessages = this.getGateThreshold(
      'GATE_MIN_MESSAGES',
      GATE_THRESHOLDS_DEFAULT.MIN_MESSAGES,
    );
    const minMessagesPassed = userMessages.length >= minMessages;
    outcomes.push({
      gateKey: 'GATE_MIN_MESSAGES',
      passed: minMessagesPassed,
      reasonCode: minMessagesPassed
        ? 'SUFFICIENT_MESSAGES'
        : 'INSUFFICIENT_MESSAGES',
      contextJson: {
        messageCount: userMessages.length,
        required: minMessages,
      },
    });

    // GATE_SUCCESS_THRESHOLD: Average score >= threshold
    if (avgScore !== null) {
      const successThreshold = this.getGateThreshold(
        'GATE_SUCCESS_THRESHOLD',
        GATE_THRESHOLDS_DEFAULT.SUCCESS_THRESHOLD,
      );
      const successThresholdPassed = avgScore >= successThreshold;
      outcomes.push({
        gateKey: 'GATE_SUCCESS_THRESHOLD',
        passed: successThresholdPassed,
        reasonCode: successThresholdPassed ? 'ABOVE_THRESHOLD' : 'BELOW_THRESHOLD',
        contextJson: {
          avgScore,
          threshold: successThreshold,
        },
      });
    } else {
      // No scores available
      outcomes.push({
        gateKey: 'GATE_SUCCESS_THRESHOLD',
        passed: false,
        reasonCode: 'NO_SCORES_AVAILABLE',
        contextJson: { avgScore: null },
      });
    }

    // GATE_FAIL_FLOOR: Average score <= floor threshold
    if (avgScore !== null) {
      const failFloor = this.getGateThreshold(
        'GATE_FAIL_FLOOR',
        GATE_THRESHOLDS_DEFAULT.FAIL_FLOOR,
      );
      const failFloorPassed = avgScore > failFloor;
      outcomes.push({
        gateKey: 'GATE_FAIL_FLOOR',
        passed: failFloorPassed,
        reasonCode: failFloorPassed ? 'ABOVE_FLOOR' : 'AT_OR_BELOW_FLOOR',
        contextJson: {
          avgScore,
          floor: failFloor,
        },
      });
    } else {
      outcomes.push({
        gateKey: 'GATE_FAIL_FLOOR',
        passed: false,
        reasonCode: 'NO_SCORES_AVAILABLE',
        contextJson: { avgScore: null },
      });
    }

    // GATE_DISQUALIFIED: Check endReasonCode for disqualification
    const isDisqualified =
      snapshot.endReasonCode === 'DISQUALIFIED' ||
      snapshot.endReasonCode === 'VIOLATION' ||
      snapshot.endReasonCode === 'ABUSE';
    outcomes.push({
      gateKey: 'GATE_DISQUALIFIED',
      passed: !isDisqualified,
      reasonCode: isDisqualified ? 'DISQUALIFIED' : 'NOT_DISQUALIFIED',
      contextJson: {
        endReasonCode: snapshot.endReasonCode,
        endReasonMeta: snapshot.endReasonMeta,
      },
    });

    // GATE_OBJECTIVE_PROGRESS: Check if mission progress exists in payload
    // This is optional - safely skip if payload doesn't have progress data
    let objectiveProgressPassed = false;
    let objectiveProgressReason = 'NO_PROGRESS_DATA';
    if (snapshot.session.payload && typeof snapshot.session.payload === 'object') {
      const payload = snapshot.session.payload as any;
      const progressPct = payload.progressPct ?? payload.progressPercent ?? null;
      if (typeof progressPct === 'number' && progressPct >= 0 && progressPct <= 100) {
        objectiveProgressPassed = progressPct >= 50; // 50% progress threshold
        objectiveProgressReason = objectiveProgressPassed ? 'PROGRESS_ABOVE_THRESHOLD' : 'PROGRESS_BELOW_THRESHOLD';
      }
    }
    outcomes.push({
      gateKey: 'GATE_OBJECTIVE_PROGRESS',
      passed: objectiveProgressPassed,
      reasonCode: objectiveProgressReason,
      contextJson: {
        hasProgressData: objectiveProgressReason !== 'NO_PROGRESS_DATA',
        progressPct: snapshot.session.payload?.progressPct ?? null,
      },
    });

    // Upsert each outcome (idempotent by unique constraint)
    for (const outcome of outcomes) {
      await this.prisma.gateOutcome.upsert({
        where: {
          sessionId_gateKey: {
            sessionId,
            gateKey: outcome.gateKey,
          },
        },
        create: {
          sessionId,
          userId,
          gateKey: outcome.gateKey,
          passed: outcome.passed,
          reasonCode: outcome.reasonCode,
          contextJson: outcome.contextJson ?? {},
        },
        update: {
          passed: outcome.passed,
          reasonCode: outcome.reasonCode,
          contextJson: outcome.contextJson ?? {},
          evaluatedAt: new Date(),
        },
      });
    }
  }
}

