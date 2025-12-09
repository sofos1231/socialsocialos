// backend/src/modules/mood/mood.insights.registry.ts
// Step 5.10: Mood insights registry with stable IDs and deterministic rules

import { MoodTimelinePayload, MoodSnapshot, MoodState } from './mood.types';

/**
 * Step 5.10: Mood insight candidate (for selection and exposure)
 */
export interface MoodInsightCandidate {
  id: string; // Stable ID (e.g., "MOOD_WARMUP_SUCCESS_V1")
  title: string;
  body: string;
  categoryKey?: string;
  evidence: string; // What triggered this insight
  priorityScore: number; // 0-100, for sorting
}

/**
 * Step 5.10: Mood insight rule function
 * Takes timeline payload and returns insight candidates if conditions are met
 */
type MoodInsightRule = (payload: MoodTimelinePayload) => MoodInsightCandidate[];

/**
 * Step 5.10: Mood insights registry
 * All rules are deterministic - same timeline always produces same insights
 */
class MoodInsightsRegistry {
  private rules: MoodInsightRule[] = [];

  constructor() {
    this.initializeRules();
  }

  /**
   * Evaluate all rules and return all matching insights
   */
  evaluateAll(payload: MoodTimelinePayload): MoodInsightCandidate[] {
    const insights: MoodInsightCandidate[] = [];
    
    for (const rule of this.rules) {
      try {
        const candidates = rule(payload);
        insights.push(...candidates);
      } catch (error) {
        // Log but continue - don't fail entire evaluation
        console.warn('[MoodInsightsRegistry] Rule evaluation failed:', error);
      }
    }

    return insights;
  }

  /**
   * Initialize all mood insight rules
   */
  private initializeRules(): void {
    // Rule 1: Warmup success (starts cold/neutral, ends warm/flow)
    this.rules.push((payload) => {
      if (payload.snapshots.length < 2) return [];
      
      const first = payload.snapshots[0];
      const last = payload.snapshots[payload.snapshots.length - 1];
      
      const startedLow = first.moodState === 'COLD' || first.moodState === 'NEUTRAL';
      const endedHigh = last.moodState === 'WARM' || last.moodState === 'FLOW';
      const improved = last.smoothedMoodScore > first.smoothedMoodScore + 15;
      
      if (startedLow && endedHigh && improved) {
        return [{
          id: 'MOOD_WARMUP_SUCCESS_V1',
          title: 'You Found Your Groove',
          body: `You started ${first.moodState.toLowerCase()} but finished ${last.moodState.toLowerCase()}. Your mood improved by ${Math.round(last.smoothedMoodScore - first.smoothedMoodScore)} points, showing you can adapt and build momentum.`,
          categoryKey: 'improvement',
          evidence: `Mood transition: ${first.moodState} → ${last.moodState} (+${Math.round(last.smoothedMoodScore - first.smoothedMoodScore)} points)`,
          priorityScore: 85,
        }];
      }
      
      return [];
    });

    // Rule 2: Consistent flow state
    this.rules.push((payload) => {
      if (payload.snapshots.length < 3) return [];
      
      const flowCount = payload.snapshots.filter(s => s.moodState === 'FLOW').length;
      const flowRatio = flowCount / payload.snapshots.length;
      
      if (flowRatio >= 0.5) {
        return [{
          id: 'MOOD_CONSISTENT_FLOW_V1',
          title: 'You Were in the Zone',
          body: `You maintained a flow state for ${Math.round(flowRatio * 100)}% of your messages. This shows strong consistency and engagement.`,
          categoryKey: 'strength',
          evidence: `${flowCount}/${payload.snapshots.length} snapshots in FLOW state`,
          priorityScore: 80,
        }];
      }
      
      return [];
    });

    // Rule 3: Tension spike recovery
    this.rules.push((payload) => {
      if (payload.snapshots.length < 3) return [];
      
      // Find highest tension point
      let maxTension = 0;
      let maxTensionIndex = -1;
      for (let i = 0; i < payload.snapshots.length; i++) {
        if (payload.snapshots[i].tension > maxTension) {
          maxTension = payload.snapshots[i].tension;
          maxTensionIndex = i;
        }
      }
      
      // Check if tension dropped significantly after peak
      if (maxTensionIndex >= 0 && maxTensionIndex < payload.snapshots.length - 1) {
        const afterTension = payload.snapshots[maxTensionIndex + 1].tension;
        const tensionDrop = maxTension - afterTension;
        
        if (tensionDrop > 20 && maxTension > 60) {
          return [{
            id: 'MOOD_TENSION_RECOVERY_V1',
            title: 'You Managed Tension Well',
            body: `You experienced high tension (${Math.round(maxTension)}) but quickly recovered, dropping ${Math.round(tensionDrop)} points. This shows resilience.`,
            categoryKey: 'recovery',
            evidence: `Tension peak: ${Math.round(maxTension)}, recovery: ${Math.round(tensionDrop)} point drop`,
            priorityScore: 75,
          }];
        }
      }
      
      return [];
    });

    // Rule 4: Warmth consistency
    this.rules.push((payload) => {
      if (payload.snapshots.length < 2) return [];
      
      const avgWarmth = payload.snapshots.reduce((sum, s) => sum + s.warmth, 0) / payload.snapshots.length;
      
      if (avgWarmth > 70) {
        return [{
          id: 'MOOD_HIGH_WARMTH_V1',
          title: 'You Showed Consistent Warmth',
          body: `Your average emotional warmth was ${Math.round(avgWarmth)}, showing you consistently create positive connections.`,
          categoryKey: 'strength',
          evidence: `Average warmth: ${Math.round(avgWarmth)}/100`,
          priorityScore: 70,
        }];
      }
      
      return [];
    });

    // Rule 5: Mood decline warning
    this.rules.push((payload) => {
      if (payload.snapshots.length < 3) return [];
      
      const first = payload.snapshots[0];
      const last = payload.snapshots[payload.snapshots.length - 1];
      const decline = first.smoothedMoodScore - last.smoothedMoodScore;
      
      if (decline > 20 && last.moodState === 'COLD' || last.moodState === 'TENSE') {
        return [{
          id: 'MOOD_DECLINE_WARNING_V1',
          title: 'Mood Shifted Downward',
          body: `Your mood declined by ${Math.round(decline)} points, ending in ${last.moodState.toLowerCase()}. Consider focusing on building confidence and reducing tension.`,
          categoryKey: 'improvement',
          evidence: `Mood decline: ${Math.round(decline)} points (${first.moodState} → ${last.moodState})`,
          priorityScore: 65,
        }];
      }
      
      return [];
    });
  }
}

// Export singleton instance
export const moodInsightsRegistry = new MoodInsightsRegistry();

