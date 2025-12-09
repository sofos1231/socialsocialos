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
 */
const EMA_ALPHA = 0.35;

/**
 * Step 5.10: Deterministic mood state classification
 * Based on smoothedMoodScore, tension, warmth, and flow
 */
function classifyMoodState(
  smoothedMoodScore: number,
  tension: number,
  warmth: number,
  flow: number,
): MoodState {
  // FLOW: High score, high flow, low tension
  if (smoothedMoodScore >= 80 && flow > 70 && tension < 40) {
    return 'FLOW';
  }

  // TENSE: High tension OR (low score AND moderate tension)
  if (tension > 70 || (smoothedMoodScore < 50 && tension > 50)) {
    return 'TENSE';
  }

  // WARM: Moderate-high score with good warmth
  if (smoothedMoodScore >= 60 && smoothedMoodScore < 80 && warmth > 50) {
    return 'WARM';
  }

  // COLD: Low score AND low warmth
  if (smoothedMoodScore < 30 && warmth < 40) {
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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Step 5.10: Build mood timeline for a session
   * Computes raw scores, EMA smoothing, tension/warmth/vibe/flow, and mood states
   */
  async buildTimelineForSession(sessionId: string): Promise<MoodTimelinePayload> {
    const snapshot = await loadSessionAnalyticsSnapshot(this.prisma, sessionId);

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

      // Compute EMA smoothing
      const smoothedMoodScore =
        previousSmoothed === null
          ? rawScore
          : Math.round(EMA_ALPHA * rawScore + (1 - EMA_ALPHA) * previousSmoothed);

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

      // Classify mood state
      const moodState = classifyMoodState(smoothedMoodScore, tension, warmth, flow);

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

    return {
      version: 1,
      snapshots,
      current,
    };
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
