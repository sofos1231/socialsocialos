// FILE: backend/src/modules/ai/score-accumulator.service.ts
// Step 8: FastPath - Incremental Score Accumulator
// Tracks running score snapshot for FastPath

import { Injectable } from '@nestjs/common';
import { MessageChecklistFlag } from '../sessions/scoring';

/**
 * Score snapshot for FastPath
 * Tracks cumulative score state without full re-computation
 */
export interface ScoreSnapshot {
  cumulativeNumeric: number; // Sum of all scores
  messageCount: number; // Number of messages
  averageScore: number; // Average score (cumulativeNumeric / messageCount)
  lastScoreTier: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
  lastChecklistFlags?: MessageChecklistFlag[]; // Optional: retained for trace/debug
  checklistCounts: Record<MessageChecklistFlag, number>;
  momentumStreak: number; // consecutive turns with MOMENTUM_MAINTAINED
  boundarySafeStreak: number; // consecutive turns with NO_BOUNDARY_ISSUES
  positiveHookCount: number;
  objectiveProgressCount: number;
  tierCounts: {
    'S+': number;
    S: number;
    A: number;
    B: number;
    C: number;
    D: number;
  };
}

/**
 * Step 8: Incremental score accumulator for FastPath
 * Updates running score snapshot based on new message score
 */
@Injectable()
export class ScoreAccumulatorService {
  /**
   * Update running score snapshot with new message score
   * This maintains consistency with existing scoring logic
   */
  updateRunningScore(
    currentSnapshot: ScoreSnapshot | null,
    localScore: number,
    tier: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D',
    checklistFlags?: MessageChecklistFlag[],
  ): ScoreSnapshot {
    const normalizedFlags = Array.isArray(checklistFlags)
      ? (checklistFlags.filter((f): f is MessageChecklistFlag =>
          Object.values(MessageChecklistFlag).includes(f),
        ))
      : [];

    const updateCounts = (
      prev: Record<MessageChecklistFlag, number> | null,
      flags: MessageChecklistFlag[],
    ): Record<MessageChecklistFlag, number> => {
      const base: Record<MessageChecklistFlag, number> = prev ? { ...prev } : Object.values(MessageChecklistFlag).reduce(
        (acc, flag) => {
          acc[flag] = 0;
          return acc;
        },
        {} as Record<MessageChecklistFlag, number>,
      );
      for (const flag of flags) {
        base[flag] = (base[flag] ?? 0) + 1;
      }
      return base;
    };

    // Initialize snapshot if null
    if (!currentSnapshot) {
      const checklistCounts = updateCounts(null, normalizedFlags);
      const boundaryHit = normalizedFlags.includes(MessageChecklistFlag.NO_BOUNDARY_ISSUES);
      const momentumHit = normalizedFlags.includes(MessageChecklistFlag.MOMENTUM_MAINTAINED);
      const positiveHit = normalizedFlags.includes(MessageChecklistFlag.POSITIVE_HOOK_HIT);
      const objectiveHit = normalizedFlags.includes(MessageChecklistFlag.OBJECTIVE_PROGRESS);

      return {
        cumulativeNumeric: localScore,
        messageCount: 1,
        averageScore: localScore,
        lastScoreTier: tier,
        lastChecklistFlags: normalizedFlags,
        checklistCounts,
        momentumStreak: momentumHit ? 1 : 0,
        boundarySafeStreak: boundaryHit ? 1 : 0,
        positiveHookCount: positiveHit ? 1 : 0,
        objectiveProgressCount: objectiveHit ? 1 : 0,
        tierCounts: {
          'S+': tier === 'S+' ? 1 : 0,
          S: tier === 'S' ? 1 : 0,
          A: tier === 'A' ? 1 : 0,
          B: tier === 'B' ? 1 : 0,
          C: tier === 'C' ? 1 : 0,
          D: tier === 'D' ? 1 : 0,
        },
      };
    }

    // Update cumulative and counts
    const newCumulative = currentSnapshot.cumulativeNumeric + localScore;
    const newMessageCount = currentSnapshot.messageCount + 1;
    const newAverage = Math.round(newCumulative / newMessageCount);
    const newChecklistCounts = updateCounts(currentSnapshot.checklistCounts, normalizedFlags);

    const boundaryHit = normalizedFlags.includes(MessageChecklistFlag.NO_BOUNDARY_ISSUES);
    const momentumHit = normalizedFlags.includes(MessageChecklistFlag.MOMENTUM_MAINTAINED);
    const positiveHit = normalizedFlags.includes(MessageChecklistFlag.POSITIVE_HOOK_HIT);
    const objectiveHit = normalizedFlags.includes(MessageChecklistFlag.OBJECTIVE_PROGRESS);

    // Update tier counts
    const newTierCounts = { ...currentSnapshot.tierCounts };
    newTierCounts[tier] = (newTierCounts[tier] || 0) + 1;

    return {
      cumulativeNumeric: newCumulative,
      messageCount: newMessageCount,
      averageScore: newAverage,
      lastScoreTier: tier,
      lastChecklistFlags: normalizedFlags.length ? normalizedFlags : currentSnapshot.lastChecklistFlags,
      checklistCounts: newChecklistCounts,
      momentumStreak: momentumHit ? currentSnapshot.momentumStreak + 1 : 0,
      boundarySafeStreak: boundaryHit ? currentSnapshot.boundarySafeStreak + 1 : 0,
      positiveHookCount: currentSnapshot.positiveHookCount + (positiveHit ? 1 : 0),
      objectiveProgressCount: currentSnapshot.objectiveProgressCount + (objectiveHit ? 1 : 0),
      tierCounts: newTierCounts,
    };
  }

  /**
   * Convert numeric score to tier
   * Matches existing scoring logic
   */
  scoreToTier(score: number): 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' {
    if (score >= 95) return 'S+';
    if (score >= 85) return 'S';
    if (score >= 70) return 'A';
    if (score >= 50) return 'B';
    if (score >= 30) return 'C';
    return 'D';
  }
}

