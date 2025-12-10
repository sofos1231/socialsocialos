// backend/src/modules/shared/types/session-end-read-model.types.ts
// Step 5.13: Unified Session End Read Model types

/**
 * Step 5.13: Trait Snapshot (reused from traits.service.ts)
 */
export interface TraitSnapshot {
  confidence: number; // 0-100
  clarity: number; // 0-100
  humor: number; // 0-100
  tensionControl: number; // 0-100
  emotionalWarmth: number; // 0-100
  dominance: number; // 0-100
}

/**
 * Step 5.13: Mission Outcome (nested in SessionEndReadModel)
 */
export interface MissionOutcome {
  status: 'SUCCESS' | 'FAIL' | 'ABORTED';
  isSuccess: boolean; // true if SUCCESS, false if FAIL/ABORTED
  endReasonCode: string | null; // Normalized MissionEndReasonCode or null
  endReasonMeta: Record<string, any>; // Always object (never null, empty {} if no meta)
  successThreshold: number | null; // Policy successScore threshold (if available)
  failThreshold: number | null; // Policy failScore threshold (if available)
}

/**
 * Step 5.13: Message Highlight (reused from MissionEndTypes.ts)
 */
export interface MessageHighlight {
  turnIndex: number;
  content: string;
  score: number; // 0-100 (never null for highlighted messages)
  rarity: 'C' | 'B' | 'A' | 'S' | 'S+' | null;
  traits: Record<string, number>; // Trait values for this message
  hooks: string[]; // Positive hooks hit
  patterns: string[]; // Patterns detected
}

/**
 * Step 5.13: Unified Session End Read Model
 * Single source of truth for completed session/mission data
 * All fields have safe defaults (no nulls unless semantically meaningful)
 */
export interface SessionEndReadModel {
  // Core identifiers
  sessionId: string;
  userId: string;

  // Timestamps
  createdAt: string; // ISO string
  endedAt: string; // ISO string (never null for finalized sessions)

  // Mission context
  templateId: string | null;
  personaId: string | null;
  personaKey: string | null; // Step 5.14: AiPersona.code
  missionDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'ELITE' | null;
  missionCategory: string | null; // GoalType or category key
  categoryKey: string | null; // Step 5.14: MissionCategory.code
  aiMode: 'MISSION' | 'FREEPLAY';

  // Step 5.14: Category summary
  categorySummary: {
    categoryKey: string | null;
    categoryName: string | null;
    isCompleted: boolean;
    totalSessions: number;
    averageScore: number | null;
    discoveredTraits: string[];
  };

  // Step 5.14: Persona memory
  personaMemory: {
    memorySnapshot: Record<string, any> | null;
    memoryWritesDuringSession: Array<{
      memoryKey: string;
      memoryValue: any;
      writtenAt: string;
    }>;
  };

  // Step 5.14: Mission metadata
  missionMetadata: {
    style: string | null;
    objectiveKey: string | null;
    objectiveType: string | null;
    dynamicType: string | null;
    locationTag: string | null;
  };

  // Final scores
  finalScore: number; // 0-100, normalized
  averageMessageScore: number; // 0-100, average of USER messages
  messageCount: number; // Number of USER messages

  // Score breakdown (Option B metrics)
  scoreBreakdown: {
    charismaIndex: number | null; // 0-100
    confidenceScore: number | null;
    clarityScore: number | null;
    humorScore: number | null;
    tensionScore: number | null;
    emotionalWarmth: number | null;
    dominanceScore: number | null;
    fillerWordsCount: number | null;
    totalWords: number | null;
  };

  // Rewards
  rewards: {
    xpGained: number; // Always ≥0
    coinsGained: number; // Always ≥0
    gemsGained: number; // Always ≥0
    rarityCounts: Record<string, number>; // e.g. { 'S': 2, 'A': 1 }
  };

  // Mission outcome
  outcome: MissionOutcome;

  // Gate results
  gateResults: Array<{
    gateKey: string; // 'GATE_MIN_MESSAGES' | 'GATE_SUCCESS_THRESHOLD' | etc.
    passed: boolean;
    reasonCode: string | null;
    context: Record<string, any>; // Always object (never null)
  }>;

  // Trait summary
  traitSummary: {
    snapshot: TraitSnapshot; // Current session averages (all 6 traits, 0-100)
    deltas: TraitSnapshot; // Delta vs previous long-term scores (can be negative)
    longTermScores: TraitSnapshot; // Updated long-term EMA scores
  };

  // Mood summary
  moodSummary: {
    current: {
      moodState: 'COLD' | 'NEUTRAL' | 'WARM' | 'TENSE' | 'FLOW';
      moodPercent: number; // 0-100
    };
    baseline: {
      moodState: 'COLD' | 'NEUTRAL' | 'WARM' | 'TENSE' | 'FLOW';
      moodPercent: number; // 0-100 (first message)
    };
    delta: number; // current.moodPercent - baseline.moodPercent (can be negative)
    snapshots: Array<{
      turnIndex: number;
      rawScore: number;
      smoothedMoodScore: number;
      moodState: string;
      tension: number;
      warmth: number;
      vibe: number;
      flow: number;
    }>; // Empty array if no mood data
  };

  // Key messages
  keyMessages: {
    top: MessageHighlight[]; // Top 3 USER messages (by score)
    bottom: MessageHighlight[]; // Bottom 3 USER messages (by score)
    rare: MessageHighlight[]; // Messages with rarity S or S+
  };

  // Insights pointers (for Step 6)
  insights: {
    deepInsightsId: string | null; // MissionDeepInsights.id
    moodTimelineId: string | null; // MissionMoodTimeline.id
    rotationPackAvailable: boolean; // Whether rotation pack exists
    traitHistoryId: string | null; // UserTraitHistory.id
  };

  // Completion metadata
  completionPercentage: number; // 0-100 (progressPct from missionState)
  durationSeconds: number; // Session duration (if available)
}

