// backend/src/modules/gates/gates.service.ts
// Step 5.1: Gate evaluation service for session-level gate ledger

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { loadSessionAnalyticsSnapshot } from '../shared/helpers/session-snapshot.helper';

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
 */
const GATE_THRESHOLDS = {
  MIN_MESSAGES: 3, // Minimum USER messages required
  SUCCESS_THRESHOLD: 70, // Average score >= 70 → passed
  FAIL_FLOOR: 40, // Average score <= 40 → failed
} as const;

@Injectable()
export class GatesService {
  constructor(private readonly prisma: PrismaService) {}

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
    const minMessagesPassed = userMessages.length >= GATE_THRESHOLDS.MIN_MESSAGES;
    outcomes.push({
      gateKey: 'GATE_MIN_MESSAGES',
      passed: minMessagesPassed,
      reasonCode: minMessagesPassed
        ? 'SUFFICIENT_MESSAGES'
        : 'INSUFFICIENT_MESSAGES',
      contextJson: {
        messageCount: userMessages.length,
        required: GATE_THRESHOLDS.MIN_MESSAGES,
      },
    });

    // GATE_SUCCESS_THRESHOLD: Average score >= threshold
    if (avgScore !== null) {
      const successThresholdPassed = avgScore >= GATE_THRESHOLDS.SUCCESS_THRESHOLD;
      outcomes.push({
        gateKey: 'GATE_SUCCESS_THRESHOLD',
        passed: successThresholdPassed,
        reasonCode: successThresholdPassed ? 'ABOVE_THRESHOLD' : 'BELOW_THRESHOLD',
        contextJson: {
          avgScore,
          threshold: GATE_THRESHOLDS.SUCCESS_THRESHOLD,
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
      const failFloorPassed = avgScore > GATE_THRESHOLDS.FAIL_FLOOR;
      outcomes.push({
        gateKey: 'GATE_FAIL_FLOOR',
        passed: failFloorPassed,
        reasonCode: failFloorPassed ? 'ABOVE_FLOOR' : 'AT_OR_BELOW_FLOOR',
        contextJson: {
          avgScore,
          floor: GATE_THRESHOLDS.FAIL_FLOOR,
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

