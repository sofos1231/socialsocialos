// backend/src/modules/stats/stats.types.ts
// Step 5.5: Trait stats DTOs

import { CharismaTraitKey } from '../ai/ai-scoring.types';
import { MoodState, MoodTimelinePayload, MoodInsight } from '../mood/mood.types';

/**
 * Phase 4: UserStats checklist aggregates type (stored in DB JSON field)
 */
export interface UserStatsChecklistAggregates {
  totalPositiveHooks: number;
  totalObjectiveProgress: number;
  boundarySafeCount: number;
  momentumMaintainedCount: number;
  totalMessages: number;
}

/**
 * Phase 4: CategoryStats checklist aggregates type (stored in DB JSON field)
 */
export interface CategoryChecklistAggregates {
  totalPositiveHooks: number;
  totalObjectiveProgress: number;
  boundaryViolations: number;
  momentumBreaks: number;
  totalMessages: number;
}

/**
 * Phase 4: PracticeSession checklist aggregates type (stored in DB JSON field)
 */
export interface PracticeSessionChecklistAggregates {
  positiveHookCount: number;
  objectiveProgressCount: number;
  boundarySafeStreak: number;
  momentumStreak: number;
  totalMessages: number;
}

/**
 * Trait key type (reused from ai-scoring.types)
 */
export type TraitKey = CharismaTraitKey;

/**
 * Week range with timezone information
 */
export interface WeekRange {
  start: Date;
  end: Date;
  tz: 'Asia/Jerusalem';
  startISO: string; // For FE display/debugging
  endISO: string; // For FE display/debugging
}

/**
 * Single trait summary with current score, weekly delta, and week range
 */
export interface TraitSummary {
  traitKey: TraitKey;
  current: number; // 0-100
  weeklyDelta: number | null; // currentWeekAvg - previousWeekAvg, null if no previous week
  weekRange: WeekRange;
}

/**
 * Trait improvement suggestions (deterministic)
 */
export interface TraitImprovement {
  tip: string;
  freePlaySuggestion: string;
  missionRoadTargets: string[]; // Category keys for filtering
}

/**
 * Traits summary response
 */
export interface TraitsSummaryResponse {
  traits: TraitSummary[];
  sessionsThisWeek: number;
  avgScoreThisWeek?: number;
  improvements: Record<TraitKey, TraitImprovement>;
  checklist?: {
    positiveHooksThisWeek: number;
    objectiveProgressThisWeek: number;
    boundarySafeRateThisWeek: number;
    momentumMaintainedRateThisWeek: number;
  };
}

/**
 * Single history point (trait values at a session)
 */
export interface TraitHistoryPoint {
  sessionId: string;
  recordedAtISO: string;
  traits: Record<TraitKey, number>; // 0-100 values
}

/**
 * Trait history response
 */
export interface TraitHistoryResponse {
  points: TraitHistoryPoint[];
}

/**
 * Stats summary response (5.5→5.6 glue)
 */
export interface StatsSummaryResponse {
  sessionsTotal: number;
  sessionsThisWeek: number;
  /** @deprecated - legacy compatibility only, use checklist instead */
  avgScoreThisWeek?: number;
  lastSessionId?: string;
  isPremium: boolean;
  // Phase 3: Checklist-native weekly metrics
  checklist?: {
    positiveHooksThisWeek: number;
    objectiveProgressThisWeek: number;
    boundarySafeRateThisWeek: number;
    momentumMaintainedRateThisWeek: number;
  };
}

/**
 * Week range DTO (for frontend consumption)
 */
export interface WeekRangeDTO {
  startISO: string;
  endISO: string;
  tz: 'Asia/Jerusalem';
}

/**
 * Step 5.7 glue: Message breakdown DTO (shared between BE and FE)
 * Minimal allowlisted DTO: score, traits, hooks[], patterns[], whyItWorked[], whatToImprove[]
 */
export interface MessageBreakdownDTO {
  score: number; // 0-100
  traits: Record<TraitKey, number>; // 0-100 per trait
  hooks: string[];
  patterns: string[];
  whyItWorked: string[]; // Deterministic explanations
  whatToImprove: string[]; // Deterministic suggestions
}

/**
 * Step 5.6: Message evolution timeline point (per-session avgMessageScore)
 */
export interface MessageEvolutionPoint {
  sessionId: string;
  recordedAtISO: string; // ISO string
  avgMessageScore: number; // Average score of USER messages in this session
}

/**
 * Step 5.6: Radar 360 traits (current + deltas vs last 3)
 */
export interface Radar360Traits {
  current: Record<TraitKey, number>; // 0-100
  deltasVsLast3: Partial<Record<TraitKey, number>>; // Can be null if < 3 sessions
  microInsights: Array<{
    traitKey: TraitKey;
    title: string;
    body: string;
  }>; // Deterministic insights from templates
}

/**
 * Step 5.6: Persona sensitivity row
 */
export interface PersonaSensitivityRow {
  personaKey: string; // AiPersona.code (e.g., "MAYA_FLIRTY")
  sessions: number; // Session count
  avgScore: number;
  deltaPct?: number; // Optional: percentage change vs overall average
  explanation: string; // Deterministic explanation
}

/**
 * Step 5.6: Trending traits heatmap (weekly values)
 */
export interface TrendingTraitsHeatmap {
  weeks: Array<{
    weekStartISO: string; // ISO string for week start (Monday in Asia/Jerusalem)
    values: Record<TraitKey, number>; // Weekly average trait values
  }>;
}

/**
 * Step 5.6: Behavioral bias tracker item
 */
export interface BehavioralBiasTrackerItem {
  biasKey: string; // e.g., "PATTERN_FILLER_WORDS"
  countThisWeek: number; // Count of occurrences this week
  deltaVsLastWeek: number | null; // Change vs last week (can be null)
  explanation: string; // Deterministic explanation
}

/**
 * Step 5.6: Signature style card
 */
export interface SignatureStyleCard {
  archetypeKey: string; // Deterministic archetype based on dominant trait + patterns
  title: string; // Display title for the archetype
  description: string; // Deterministic description from templates
  supportingSignals: string[]; // Top hooks/patterns that support this archetype
}

/**
 * Step 5.6: Hall of Fame message (with optional breakdown DTO for 5.7)
 */
export interface HallOfFameMessageItem {
  messageId: string;
  sessionId: string;
  recordedAtISO: string; // ISO string from message.createdAt
  turnIndex: number;
  contentSnippet: string; // Truncated content for preview
  score: number;
  breakdown?: MessageBreakdownDTO; // 5.7 glue - minimal allowlisted DTO
  // Phase 3: Checklist-native fields
  tier?: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
  checklistFlags?: string[]; // MessageChecklistFlag[]
}

/**
 * Step 5.6: Advanced metrics response
 */
export interface AdvancedMetricsResponse {
  isPremium: boolean; // Server source
  messageEvolution: {
    points: MessageEvolutionPoint[];
  };
  radar360: Radar360Traits;
  personaSensitivity: {
    rows: PersonaSensitivityRow[];
  };
  trendingTraitsHeatmap: TrendingTraitsHeatmap;
  behavioralBiasTracker: {
    items: BehavioralBiasTrackerItem[];
  };
  signatureStyleCard: SignatureStyleCard;
  hallOfFame: {
    messages: HallOfFameMessageItem[];
  };
}

/**
 * Step 5.9: Trait Synergy Map types
 */
export interface TraitSynergyNode {
  id: string;      // TraitKey
  label: string;   // Human-readable label
  x: number;       // Deterministic layout coordinate
  y: number;
}

export interface TraitSynergyEdge {
  source: string;  // TraitKey
  target: string;  // TraitKey
  weight: number;  // -1 to 1 correlation coefficient
}

export interface TraitSynergyResponse {
  nodes: TraitSynergyNode[];
  edges: TraitSynergyEdge[];
  correlationMatrix: Record<string, Record<string, number>>;
}

/**
 * Step 5.10: Mood timeline API response
 */
export interface MoodTimelineResponse {
  sessionId: string;
  payload: MoodTimelinePayload;
  current: {
    moodState: MoodState;
    moodPercent: number;
  };
  insights: MoodInsight[];
}

