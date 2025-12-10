// backend/src/modules/sessions/session-end-read-model.normalizer.ts
// Step 5.13: Normalizer helpers for SessionEndReadModel

import {
  TraitSnapshot,
  SessionEndReadModel,
  MessageHighlight,
} from '../shared/types/session-end-read-model.types';
import {
  ChatMessage,
  GateOutcome,
  MissionMoodTimeline,
  UserTraitHistory,
  UserTraitScores,
  Prisma,
} from '@prisma/client';
import { MoodTimelinePayload, MoodState } from '../mood/mood.types';

/**
 * Step 5.13: Normalize trait snapshot from JSON or null
 * Returns zero'd snapshot if input is invalid
 */
export function normalizeTraitSnapshot(input: any | null | undefined): TraitSnapshot {
  const defaultSnapshot: TraitSnapshot = {
    confidence: 0,
    clarity: 0,
    humor: 0,
    tensionControl: 0,
    emotionalWarmth: 0,
    dominance: 0,
  };

  if (!input || typeof input !== 'object') {
    return defaultSnapshot;
  }

  // Clamp each field to 0-100 range
  const clamp = (value: any): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(value)));
  };

  return {
    confidence: clamp(input.confidence),
    clarity: clamp(input.clarity),
    humor: clamp(input.humor),
    tensionControl: clamp(input.tensionControl),
    emotionalWarmth: clamp(input.emotionalWarmth),
    dominance: clamp(input.dominance),
  };
}

/**
 * Step 5.13: Normalize mood summary from MissionMoodTimeline or null
 * Returns safe defaults if timeline is missing
 */
export function normalizeMoodSummary(
  timeline: MissionMoodTimeline | null,
): SessionEndReadModel['moodSummary'] {
  const defaultMoodState: MoodState = 'NEUTRAL';
  const defaultMoodPercent = 50;

  const defaultSummary: SessionEndReadModel['moodSummary'] = {
    current: {
      moodState: defaultMoodState,
      moodPercent: defaultMoodPercent,
    },
    baseline: {
      moodState: defaultMoodState,
      moodPercent: defaultMoodPercent,
    },
    delta: 0,
    snapshots: [],
  };

  if (!timeline) {
    return defaultSummary;
  }

  // Parse timelineJson
  let payload: MoodTimelinePayload | null = null;
  try {
    if (timeline.timelineJson && typeof timeline.timelineJson === 'object') {
      payload = timeline.timelineJson as any as MoodTimelinePayload;
    }
  } catch (err) {
    console.warn('[normalizeMoodSummary] Failed to parse timelineJson:', err);
    return defaultSummary;
  }

  if (!payload || !payload.snapshots || !Array.isArray(payload.snapshots)) {
    // Use denormalized fields if JSON is invalid
    return {
      current: {
        moodState: (timeline.currentMoodState as MoodState) || defaultMoodState,
        moodPercent: timeline.currentMoodPercent || defaultMoodPercent,
      },
      baseline: {
        moodState: (timeline.currentMoodState as MoodState) || defaultMoodState,
        moodPercent: timeline.currentMoodPercent || defaultMoodPercent,
      },
      delta: 0,
      snapshots: [],
    };
  }

  const snapshots = payload.snapshots;
  const current = payload.current || {
    moodState: defaultMoodState,
    moodPercent: defaultMoodPercent,
  };

  // Baseline is first snapshot, or current if no snapshots
  const baseline =
    snapshots.length > 0
      ? {
          moodState: (snapshots[0].moodState as MoodState) || defaultMoodState,
          moodPercent: snapshots[0].smoothedMoodScore || defaultMoodPercent,
        }
      : {
          moodState: current.moodState || defaultMoodState,
          moodPercent: current.moodPercent || defaultMoodPercent,
        };

  const delta = current.moodPercent - baseline.moodPercent;

  // Map snapshots to expected format
  const normalizedSnapshots = snapshots.map((s) => ({
    turnIndex: s.turnIndex || 0,
    rawScore: s.rawScore || 50,
    smoothedMoodScore: s.smoothedMoodScore || 50,
    moodState: s.moodState || 'NEUTRAL',
    tension: s.tension || 50,
    warmth: s.warmth || 50,
    vibe: s.vibe || 50,
    flow: s.flow || 50,
  }));

  return {
    current: {
      moodState: (current.moodState as MoodState) || defaultMoodState,
      moodPercent: current.moodPercent || defaultMoodPercent,
    },
    baseline,
    delta,
    snapshots: normalizedSnapshots,
  };
}

/**
 * Step 5.13: Normalize gate results from GateOutcome[]
 * Ensures context is always an object (never null)
 */
export function normalizeGateResults(
  outcomes: GateOutcome[],
): SessionEndReadModel['gateResults'] {
  if (!Array.isArray(outcomes)) {
    return [];
  }

  return outcomes.map((outcome) => {
    // Parse contextJson, default to empty object
    let context: Record<string, any> = {};
    try {
      if (
        outcome.contextJson &&
        typeof outcome.contextJson === 'object' &&
        !Array.isArray(outcome.contextJson) &&
        outcome.contextJson !== null &&
        outcome.contextJson.constructor === Object
      ) {
        context = outcome.contextJson as Record<string, any>;
      }
    } catch (err) {
      console.warn('[normalizeGateResults] Failed to parse contextJson:', err);
      context = {};
    }

    return {
      gateKey: outcome.gateKey || '',
      passed: outcome.passed || false,
      reasonCode: outcome.reasonCode || null,
      context,
    };
  });
}

/**
 * Step 5.13: Build key messages (top, bottom, rare) from ChatMessage[]
 * Uses traitData and meta for hooks/patterns/rarity
 */
export function buildKeyMessages(
  messages: ChatMessage[],
  payload: any | null,
): SessionEndReadModel['keyMessages'] {
  // Filter to USER messages only
  const userMessages = messages.filter((m) => m.role === 'USER');

  if (userMessages.length === 0) {
    return {
      top: [],
      bottom: [],
      rare: [],
    };
  }

  // Build rarity map from payload.rewards.messages if available
  const rarityMap = new Map<number, 'C' | 'B' | 'A' | 'S' | 'S+' | null>();
  if (payload && typeof payload === 'object') {
    const rewardsMessages = payload.rewards?.messages || payload.messageScores || [];
    if (Array.isArray(rewardsMessages)) {
      rewardsMessages.forEach((msg: any, index: number) => {
        if (typeof msg === 'object' && msg !== null) {
          const rarity = msg.rarity || msg.meta?.rarity || null;
          if (rarity && ['C', 'B', 'A', 'S', 'S+'].includes(rarity)) {
            rarityMap.set(index, rarity as 'C' | 'B' | 'A' | 'S' | 'S+');
          }
        }
      });
    }
  }

  // Helper to extract traits/hooks/patterns from traitData
  const extractTraitData = (msg: ChatMessage) => {
    let traits: Record<string, number> = {};
    let hooks: string[] = [];
    let patterns: string[] = [];

    try {
      if (msg.traitData && typeof msg.traitData === 'object') {
        const td = msg.traitData as any;
        if (td.traits && typeof td.traits === 'object') {
          traits = td.traits;
        }
        if (Array.isArray(td.hooks)) {
          hooks = td.hooks;
        }
        if (Array.isArray(td.patterns)) {
          patterns = td.patterns;
        }
      }
    } catch (err) {
      // Ignore parsing errors, use defaults
    }

    return { traits, hooks, patterns };
  };

  // Helper to build MessageHighlight from ChatMessage
  const buildHighlight = (msg: ChatMessage, userIndex: number): MessageHighlight => {
    const score = typeof msg.score === 'number' ? msg.score : 0;
    const rarity = rarityMap.get(userIndex) || null;
    const { traits, hooks, patterns } = extractTraitData(msg);

    return {
      turnIndex: msg.turnIndex || 0,
      content: msg.content || '',
      score,
      rarity,
      traits,
      hooks,
      patterns,
    };
  };

  // Sort by score for top/bottom
  const sortedByScore = [...userMessages].sort((a, b) => {
    const scoreA = typeof a.score === 'number' ? a.score : 0;
    const scoreB = typeof b.score === 'number' ? b.score : 0;
    return scoreB - scoreA; // DESC for top
  });

  // Top 3
  const top = sortedByScore
    .slice(0, 3)
    .map((msg, idx) => {
      const userIndex = userMessages.findIndex((m) => m.id === msg.id);
      return buildHighlight(msg, userIndex >= 0 ? userIndex : idx);
    });

  // Bottom 3 (reverse sort)
  const bottom = sortedByScore
    .slice()
    .reverse()
    .slice(0, 3)
    .map((msg, idx) => {
      const userIndex = userMessages.findIndex((m) => m.id === msg.id);
      return buildHighlight(msg, userIndex >= 0 ? userIndex : idx);
    });

  // Rare messages (S or S+)
  const rare = userMessages
    .map((msg, idx) => {
      const rarity = rarityMap.get(idx);
      if (rarity === 'S' || rarity === 'S+') {
        return buildHighlight(msg, idx);
      }
      return null;
    })
    .filter((h): h is MessageHighlight => h !== null);

  return {
    top,
    bottom,
    rare,
  };
}

