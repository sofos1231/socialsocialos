// FILE: backend/src/modules/mission-state/mood-state-machine.service.ts
// Step 8: FastPath - Incremental Mood State Machine
// Extracted from mission-state.service.ts for FastPath use

import { Injectable } from '@nestjs/common';
import { MissionMoodStateV1 } from '../ai-engine/mission-state-v1.schema';
import {
  applyFlagToMood,
  applyScoreToMood,
  calculateTensionFromScore,
} from '../ai-engine/registries/mission-mood-mappings.registry';

/**
 * Step 8: Incremental mood state machine for FastPath
 * Updates mood based on deltas and flags from AI response
 */
@Injectable()
export class MoodStateMachineService {
  /**
   * Update mood state incrementally based on deltas and flags
   * This is a simplified, deterministic version for FastPath
   */
  updateMood(
    currentMood: MissionMoodStateV1,
    deltas: {
      moodDelta: 'up' | 'down' | 'stable';
      tensionDelta: 'up' | 'down' | 'stable';
      comfortDelta: 'up' | 'down' | 'stable';
    },
    microFlags: string[],
    localScore?: number,
    failThreshold?: number,
    successThreshold?: number,
  ): MissionMoodStateV1 {
    let updatedMood = { ...currentMood };

    // Step 1: Apply score-based mood changes if score provided
    if (localScore !== undefined) {
      const scoreResult = applyScoreToMood(updatedMood, localScore);
      if (scoreResult.changed) {
        updatedMood = scoreResult.mood;
      }

      // Update tension from score if thresholds provided
      if (failThreshold !== undefined && successThreshold !== undefined) {
        updatedMood.tensionLevel = calculateTensionFromScore(
          localScore,
          failThreshold,
          successThreshold,
          updatedMood.tensionLevel,
        );
      }
    }

    // Step 2: Apply flag-based mood changes
    if (microFlags && microFlags.length > 0) {
      const flagResult = applyFlagToMood(updatedMood, microFlags);
      if (flagResult.changed) {
        updatedMood = flagResult.mood;
      }
    }

    // Step 3: Apply deltas (simplified adjustments)
    if (deltas.moodDelta === 'up') {
      // Increase positivity
      updatedMood.positivityPct = Math.min(100, updatedMood.positivityPct + 5);
    } else if (deltas.moodDelta === 'down') {
      // Decrease positivity
      updatedMood.positivityPct = Math.max(0, updatedMood.positivityPct - 5);
    }

    if (deltas.tensionDelta === 'up') {
      updatedMood.tensionLevel = Math.min(1.0, updatedMood.tensionLevel + 0.1);
    } else if (deltas.tensionDelta === 'down') {
      updatedMood.tensionLevel = Math.max(0.1, updatedMood.tensionLevel - 0.1);
    }

    // Comfort delta affects positivity (comfort = high positivity, low tension)
    if (deltas.comfortDelta === 'up') {
      updatedMood.positivityPct = Math.min(100, updatedMood.positivityPct + 3);
      updatedMood.tensionLevel = Math.max(0.1, updatedMood.tensionLevel - 0.05);
    } else if (deltas.comfortDelta === 'down') {
      updatedMood.positivityPct = Math.max(0, updatedMood.positivityPct - 3);
      updatedMood.tensionLevel = Math.min(1.0, updatedMood.tensionLevel + 0.05);
    }

    // Step 4: Update stability (mood changed if any delta is not stable)
    const hasChanges =
      deltas.moodDelta !== 'stable' ||
      deltas.tensionDelta !== 'stable' ||
      deltas.comfortDelta !== 'stable' ||
      (microFlags && microFlags.length > 0);

    updatedMood.isStable = !hasChanges;
    if (hasChanges) {
      updatedMood.lastChangedAt = new Date().toISOString();
    }

    return updatedMood;
  }
}

