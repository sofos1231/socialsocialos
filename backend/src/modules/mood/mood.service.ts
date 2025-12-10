// backend/src/modules/mood/mood.service.ts
// Step 5.10: Mood timeline service with EMA smoothing and deterministic insights

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { loadSessionAnalyticsSnapshot } from '../shared/helpers/session-snapshot.helper';
import {
  MoodState,
  MoodSnapshot,
  MoodTimelinePayload,
  MoodInsight,
  NamedArc,
} from './mood.types';
import { moodInsightsRegistry, MoodInsightCandidate } from './mood.insights.registry';
import {
  CandidateInsight,
  InsightKind,
  InsightSource,
  RotationSurface,
} from '../insights/insights.types';

const logger = new Logger('MoodService');

/**
 * EMA smoothing constant (α = 0.35)
 * Step 7.2: This is now loaded from EngineConfig, but kept as fallback default
 */
const EMA_ALPHA_DEFAULT = 0.35;

/**
 * Step 5.10: Deterministic mood state classification
 * Based on smoothedMoodScore, tension, warmth, and flow
 */
/**
 * Classify mood state (now uses config thresholds if available)
 */
function classifyMoodState(
  smoothedMoodScore: number,
  tension: number,
  warmth: number,
  flow: number,
  moodConfig?: any,
): MoodState {
  const thresholds = moodConfig?.moodStateThresholds;

  // FLOW: High score, high flow, low tension
  const flowThresholds = thresholds?.flow || { minScore: 80, minFlow: 70, maxTension: 40 };
  if (
    smoothedMoodScore >= flowThresholds.minScore &&
    flow > flowThresholds.minFlow &&
    tension < flowThresholds.maxTension
  ) {
    return 'FLOW';
  }

  // TENSE: High tension OR (low score AND moderate tension)
  const tenseThresholds = thresholds?.tense || {
    minTension: 70,
    orLowScore: { maxScore: 50, minTension: 50 },
  };
  if (
    tension > tenseThresholds.minTension ||
    (smoothedMoodScore < tenseThresholds.orLowScore.maxScore &&
      tension > tenseThresholds.orLowScore.minTension)
  ) {
    return 'TENSE';
  }

  // WARM: Moderate-high score with good warmth
  const warmThresholds = thresholds?.warm || { minScore: 60, maxScore: 80, minWarmth: 50 };
  if (
    smoothedMoodScore >= warmThresholds.minScore &&
    smoothedMoodScore < warmThresholds.maxScore &&
    warmth > warmThresholds.minWarmth
  ) {
    return 'WARM';
  }

  // COLD: Low score AND low warmth
  const coldThresholds = thresholds?.cold || { maxScore: 30, maxWarmth: 40 };
  if (smoothedMoodScore < coldThresholds.maxScore && warmth < coldThresholds.maxWarmth) {
    return 'COLD';
  }

  // NEUTRAL: Default fallback
  return 'NEUTRAL';
}

/**
 * Compute tension from tensionControl trait and negative patterns
 */
function computeTension(
  tensionControl: number,
  patterns: string[],
): number {
  // Invert tensionControl (high control = low tension)
  let tension = 100 - tensionControl;

  // Add penalty for negative patterns
  const negativePatternCount = patterns.filter((p) =>
    p.toLowerCase().includes('negative') || p.toLowerCase().includes('tension'),
  ).length;
  tension += negativePatternCount * 5;

  return Math.max(0, Math.min(100, Math.round(tension)));
}

/**
 * Compute warmth from emotionalWarmth trait and positive hooks
 */
function computeWarmth(
  emotionalWarmth: number,
  hooks: string[],
): number {
  let warmth = emotionalWarmth;

  // Add bonus for positive hooks
  const positiveHookCount = hooks.filter((h) =>
    h.toLowerCase().includes('positive') || h.toLowerCase().includes('warm'),
  ).length;
  warmth += positiveHookCount * 3;

  return Math.max(0, Math.min(100, Math.round(warmth)));
}

/**
 * Compute vibe from humor and confidence traits
 */
function computeVibe(humor: number, confidence: number): number {
  // Average of humor and confidence
  return Math.round((humor + confidence) / 2);
}

/**
 * Compute flow as EMA of score stability (inverse variance)
 * Higher stability = higher flow
 */
function computeFlow(scores: number[], index: number, previousFlow: number | null): number {
  if (scores.length === 0) return 50;

  // Get window of recent scores (last 3)
  const windowStart = Math.max(0, index - 2);
  const windowScores = scores.slice(windowStart, index + 1);

  if (windowScores.length < 2) {
    return previousFlow ?? 50;
  }

  // Compute variance
  const mean = windowScores.reduce((sum, s) => sum + s, 0) / windowScores.length;
  const variance =
    windowScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / windowScores.length;

  // Convert variance to stability (inverse, normalized to 0-100)
  // Lower variance = higher stability = higher flow
  const stability = Math.max(0, 100 - Math.sqrt(variance) * 2);

  // EMA smoothing
  if (previousFlow === null) {
    return Math.round(stability);
  }

  return Math.round(EMA_ALPHA * stability + (1 - EMA_ALPHA) * previousFlow);
}

@Injectable()
export class MoodService {
  private moodConfig: any = null; // Cached mood config
  private emaAlpha: number = EMA_ALPHA_DEFAULT;

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(forwardRef(() => EngineConfigService))
    private readonly engineConfigService?: EngineConfigService,
  ) {
    // Load mood config on startup
    this.loadMoodConfig();
  }

  /**
   * Load mood config from EngineConfig
   */
  private async loadMoodConfig() {
    try {
      if (this.engineConfigService) {
        const config = await this.engineConfigService.getGlobalConfig();
        this.moodConfig = config.mood;
        this.emaAlpha = config.mood?.emaAlpha ?? EMA_ALPHA_DEFAULT;
      }
    } catch (e) {
      // Fallback to defaults
      this.emaAlpha = EMA_ALPHA_DEFAULT;
    }
  }

  /**
   * Step 5.10: Build mood timeline for a session
   * Computes raw scores, EMA smoothing, tension/warmth/vibe/flow, and mood states
   * Step 6.10: Checks enableArcDetection feature toggle
   */
  async buildTimelineForSession(sessionId: string): Promise<MoodTimelinePayload> {
    const snapshot = await loadSessionAnalyticsSnapshot(this.prisma, sessionId);

    // Step 6.10: Check enableArcDetection feature toggle from session payload
    let enableArcDetection = true; // Default to true for backward compatibility
    try {
      const session = await this.prisma.practiceSession.findUnique({
        where: { id: sessionId },
        select: { payload: true },
      });
      if (session?.payload && typeof session.payload === 'object') {
        const payload = session.payload as any;
        const normalizedConfig = payload?.normalizedMissionConfigV1;
        if (normalizedConfig?.statePolicy?.enableArcDetection === false) {
          enableArcDetection = false;
        }
      }
    } catch (err) {
      // If we can't load the session or payload, default to enabled
      logger.debug(`Could not check enableArcDetection for session ${sessionId}, defaulting to enabled`);
    }

    const userMessages = snapshot.messages.filter((m) => m.role === 'USER');

    if (userMessages.length === 0) {
      throw new Error(`Session ${sessionId} has no USER messages`);
    }

    const snapshots: MoodSnapshot[] = [];
    let previousSmoothed: number | null = null;
    let previousFlow: number | null = null;
    const scores: number[] = [];

    // Process each USER message
    for (const msg of userMessages) {
      // Extract score (default to 50 if missing)
      const rawScore = msg.score ?? 50;
      scores.push(rawScore);

      // Compute EMA smoothing (using config value)
      const smoothedMoodScore =
        previousSmoothed === null
          ? rawScore
          : Math.round(this.emaAlpha * rawScore + (1 - this.emaAlpha) * previousSmoothed);

      // Extract traits
      const traits = msg.traitData.traits || {};
      const tensionControl = typeof traits.tensionControl === 'number' ? traits.tensionControl : 50;
      const emotionalWarmth =
        typeof traits.emotionalWarmth === 'number' ? traits.emotionalWarmth : 50;
      const humor = typeof traits.humor === 'number' ? traits.humor : 50;
      const confidence = typeof traits.confidence === 'number' ? traits.confidence : 50;

      // Compute derived metrics
      const tension = computeTension(tensionControl, msg.traitData.patterns || []);
      const warmth = computeWarmth(emotionalWarmth, msg.traitData.hooks || []);
      const vibe = computeVibe(humor, confidence);
      const flow = computeFlow(scores, scores.length - 1, previousFlow);

      // Classify mood state (pass mood config for thresholds)
      const moodState = classifyMoodState(
        smoothedMoodScore,
        tension,
        warmth,
        flow,
        this.moodConfig,
      );

      snapshots.push({
        turnIndex: msg.turnIndex,
        rawScore,
        smoothedMoodScore,
        moodState,
        tension,
        warmth,
        vibe,
        flow,
      });

      previousSmoothed = smoothedMoodScore;
      previousFlow = flow;
    }

    // Get current mood (last snapshot)
    const currentSnapshot = snapshots[snapshots.length - 1];
    const current = {
      moodState: currentSnapshot?.moodState ?? 'NEUTRAL',
      moodPercent: currentSnapshot?.smoothedMoodScore ?? 50,
    };

    // Step 6.7: Detect named arcs (Step 6.10: Feature toggle check)
    const arcs = enableArcDetection ? this.detectMoodArcs(snapshots) : [];

    return {
      version: 1,
      snapshots,
      current,
      arcs,
    };
  }

  /**
   * Step 6.7: Detect named arcs in mood timeline
   * Analyzes snapshots to identify emotional curve patterns
   */
  private detectMoodArcs(snapshots: MoodSnapshot[]): NamedArc[] {
    if (snapshots.length < 2) {
      return [];
    }

    const arcs: NamedArc[] = [];
    let currentArcStart = 0;
    let currentArcType: NamedArc['type'] | null = null;

    for (let i = 1; i < snapshots.length; i++) {
      const prev = snapshots[i - 1];
      const curr = snapshots[i];
      const scoreDelta = curr.smoothedMoodScore - prev.smoothedMoodScore;
      const tensionDelta = curr.tension - prev.tension;
      const warmthDelta = curr.warmth - prev.warmth;

      // Detect arc type for current transition
      let detectedType: NamedArc['type'] | null = null;

      // RISING_WARMTH: Consistent upward trend in mood score and warmth
      if (scoreDelta > 5 && warmthDelta > 3 && curr.smoothedMoodScore > 60) {
        detectedType = 'RISING_WARMTH';
      }
      // COOL_DOWN: Consistent downward trend in mood score and warmth
      else if (scoreDelta < -5 && warmthDelta < -3 && curr.smoothedMoodScore < 50) {
        detectedType = 'COOL_DOWN';
      }
      // TESTING_SPIKE: Sudden tension increase with mood drop
      else if (tensionDelta > 20 && scoreDelta < -10) {
        detectedType = 'TESTING_SPIKE';
      }
      // RECOVERY_ARC: Recovering from low mood (was low, now improving)
      else if (
        prev.smoothedMoodScore < 40 &&
        curr.smoothedMoodScore > prev.smoothedMoodScore + 10 &&
        scoreDelta > 8
      ) {
        detectedType = 'RECOVERY_ARC';
      }
      // TENSION_BUILD: Gradual tension increase over multiple messages
      else if (tensionDelta > 5 && curr.tension > 60) {
        detectedType = 'TENSION_BUILD';
      }
      // STABLE_ARC: Consistent mood with low variance
      else if (
        Math.abs(scoreDelta) < 5 &&
        Math.abs(tensionDelta) < 5 &&
        curr.smoothedMoodScore >= 50 &&
        curr.smoothedMoodScore <= 70
      ) {
        detectedType = 'STABLE_ARC';
      }

      // If arc type changed, end previous arc and start new one
      if (detectedType !== currentArcType) {
        // End previous arc if exists
        if (currentArcType !== null && currentArcStart < i - 1) {
          const startSnapshot = snapshots[currentArcStart];
          const endSnapshot = snapshots[i - 1];
          arcs.push({
            type: currentArcType,
            startTurnIndex: startSnapshot.turnIndex,
            endTurnIndex: endSnapshot.turnIndex,
            summary: this.generateArcSummary(currentArcType, startSnapshot, endSnapshot),
          });
        }

        // Start new arc
        if (detectedType !== null) {
          currentArcStart = i - 1;
          currentArcType = detectedType;
        } else {
          currentArcType = null;
        }
      }
    }

    // Close last arc if still open
    if (currentArcType !== null && currentArcStart < snapshots.length - 1) {
      const startSnapshot = snapshots[currentArcStart];
      const endSnapshot = snapshots[snapshots.length - 1];
      arcs.push({
        type: currentArcType,
        startTurnIndex: startSnapshot.turnIndex,
        endTurnIndex: endSnapshot.turnIndex,
        summary: this.generateArcSummary(currentArcType, startSnapshot, endSnapshot),
      });
    }

    return arcs;
  }

  /**
   * Step 6.7: Generate human-readable summary for an arc
   */
  private generateArcSummary(
    type: NamedArc['type'],
    start: MoodSnapshot,
    end: MoodSnapshot,
  ): string {
    const scoreChange = end.smoothedMoodScore - start.smoothedMoodScore;
    const tensionChange = end.tension - start.tension;

    switch (type) {
      case 'RISING_WARMTH':
        return `Mood improved from ${start.smoothedMoodScore} to ${end.smoothedMoodScore} (+${scoreChange.toFixed(0)}), warmth increased`;
      case 'COOL_DOWN':
        return `Mood cooled from ${start.smoothedMoodScore} to ${end.smoothedMoodScore} (${scoreChange.toFixed(0)}), tension increased`;
      case 'TESTING_SPIKE':
        return `Tension spike: tension rose to ${end.tension}, mood dropped to ${end.smoothedMoodScore}`;
      case 'RECOVERY_ARC':
        return `Recovery: mood recovered from ${start.smoothedMoodScore} to ${end.smoothedMoodScore} (+${scoreChange.toFixed(0)})`;
      case 'TENSION_BUILD':
        return `Tension building: increased from ${start.tension} to ${end.tension} (+${tensionChange.toFixed(0)})`;
      case 'STABLE_ARC':
        return `Stable period: mood around ${end.smoothedMoodScore}, consistent performance`;
      default:
        return `Arc from turn ${start.turnIndex} to ${end.turnIndex}`;
    }
  }

  /**
   * Step 5.10: Persist timeline to database
   */
  async persistTimeline(sessionId: string, payload: MoodTimelinePayload): Promise<void> {
    const snapshot = await loadSessionAnalyticsSnapshot(this.prisma, sessionId);

    await this.prisma.missionMoodTimeline.upsert({
      where: { sessionId },
      create: {
        sessionId,
        userId: snapshot.userId,
        missionId: snapshot.templateId ?? 'unknown',
        timelineJson: payload as any,
        currentMoodState: payload.current.moodState,
        currentMoodPercent: payload.current.moodPercent,
        version: 'v1',
      },
      update: {
        timelineJson: payload as any,
        currentMoodState: payload.current.moodState,
        currentMoodPercent: payload.current.moodPercent,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Step 5.10: Load mood insight history (last 5 sessions)
   * Returns array of pickedIds to exclude from selection
   */
  async loadMoodInsightHistory(userId: string, sessionId: string): Promise<string[]> {
    // Get current session's anchor timestamp
    const currentSession = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      select: {
        createdAt: true,
        endedAt: true,
      },
    });

    if (!currentSession) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const anchorTimestamp = currentSession.endedAt || currentSession.createdAt;

    // Query last 5 prior sessions
    const rows = await this.prisma.missionMoodTimeline.findMany({
      where: {
        userId,
        session: {
          createdAt: {
            lt: anchorTimestamp,
          },
          id: {
            not: sessionId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      select: {
        timelineJson: true,
      },
    });

    // Extract pickedIds from timelineJson
    const pickedIds: string[] = [];
    for (const row of rows) {
      const json = row.timelineJson as any;
      if (json?.moodInsights?.pickedIds && Array.isArray(json.moodInsights.pickedIds)) {
        pickedIds.push(...json.moodInsights.pickedIds);
      }
    }

    return Array.from(new Set(pickedIds));
  }

  /**
   * Step 5.10: Select mood insights with cooldown
   */
  async selectMoodInsights(
    userId: string,
    sessionId: string,
    timelinePayload: MoodTimelinePayload,
  ): Promise<MoodInsight[]> {
    // Load history (excluded IDs)
    const excludedIds = await this.loadMoodInsightHistory(userId, sessionId);
    const excludedSet = new Set(excludedIds);

    // Evaluate registry rules
    const candidates = moodInsightsRegistry.evaluateAll(timelinePayload);

    // Filter out excluded IDs
    const available = candidates.filter((c) => !excludedSet.has(c.id));

    // Sort by priorityScore (descending)
    available.sort((a, b) => {
      if (a.priorityScore !== b.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }
      // Tie-break by ID for determinism
      return a.id.localeCompare(b.id);
    });

    // Select top 1-3
    const selected = available.slice(0, 3);

    // Map to MoodInsight format
    return selected.map((c) => ({
      id: c.id,
      title: c.title,
      body: c.body,
      categoryKey: c.categoryKey,
      evidence: c.evidence,
      priorityScore: c.priorityScore,
    }));
  }

  /**
   * Step 5.10: Record mood insight exposures
   */
  async recordMoodInsightExposure(
    sessionId: string,
    pickedIds: string[],
    insights: MoodInsight[],
  ): Promise<void> {
    // Load current timeline
    const timeline = await this.prisma.missionMoodTimeline.findUnique({
      where: { sessionId },
      select: { timelineJson: true },
    });

    if (!timeline) {
      throw new Error(`Timeline not found for session ${sessionId}`);
    }

    const payload = timeline.timelineJson as any;

    // Update payload with mood insights
    payload.moodInsights = {
      pickedIds,
      insights,
    };

    // Persist updated timeline
    await this.prisma.missionMoodTimeline.update({
      where: { sessionId },
      data: {
        timelineJson: payload,
      },
    });
  }

  /**
   * Step 5.11: Get mood candidates for rotation engine
   * Returns CandidateInsight[] matching insights.types.ts interface
   * 
   * @param timelinePayload - Mood timeline payload (can be loaded from session)
   * @returns Array of CandidateInsight objects
   */
  async getMoodCandidatesForRotation(
    timelinePayload: MoodTimelinePayload,
  ): Promise<CandidateInsight[]> {
    // Evaluate registry (same logic as selectMoodInsights, but no cooldown filtering)
    const candidates = moodInsightsRegistry.evaluateAll(timelinePayload);

    // Map to CandidateInsight format
    return candidates.map((c) => ({
      id: c.id,
      kind: 'MOOD' as InsightKind,
      source: 'MOOD' as InsightSource,
      category: c.categoryKey || 'mood',
      priority: c.priorityScore,
      weight: c.priorityScore, // Use priorityScore as weight
      evidence: {
        // Evidence string stored in MoodInsightCandidate.evidence
      },
      isPremium: false, // Step 5.11: Can be extended later with premium flag
      surfaces: ['MISSION_END', 'ADVANCED_TAB'] as RotationSurface[],
      title: c.title, // Step 5.11: Preserve title
      body: c.body, // Step 5.11: Preserve body
    }));
  }

  /**
   * Step 5.10: Main entry point - build, persist, select insights, record exposures
   */
  async buildAndPersistForSession(userId: string, sessionId: string): Promise<void> {
    // Build timeline
    const timeline = await this.buildTimelineForSession(sessionId);

    // Persist timeline
    await this.persistTimeline(sessionId, timeline);

    // Select mood insights
    const insights = await this.selectMoodInsights(userId, sessionId, timeline);

    // Record exposures
    if (insights.length > 0) {
      const pickedIds = insights.map((i) => i.id);
      await this.recordMoodInsightExposure(sessionId, pickedIds, insights);
    }

    logger.debug(`Mood timeline computed for session ${sessionId} with ${insights.length} insights`);
  }
}
