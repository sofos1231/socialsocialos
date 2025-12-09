// src/api/statsService.ts
// Step 5.4: Stats API client (shell for 5.4 + 5.5)

import apiClient from './apiClient';
import { CategoryKey } from '../logic/categoryTaxonomy';

export interface StatsUser {
  id: string;
  email: string;
}

/**
 * Return a fake stats user.
 * Signature matches usage: getStatsUser(userId)
 */
export async function getUser(userId?: string): Promise<StatsUser> {
  console.warn(
    '[statsService] getUser() stub called – returning fake stats user. userId:',
    userId ?? 'none',
  );

  return {
    id: userId || 'stub-user',
    email: 'stub@example.com',
  };
}

/**
 * Step 5.4: Badge data structure
 */
export interface BadgeDTO {
  badgeKey: string;
  name: string;
  categoryKey: CategoryKey;
  description: string;
  tier: number; // 0-4
  points: number;
  nextThreshold: number;
  rewards: {
    xp: number;
    coins: number;
    gems?: number;
  };
  nextTierRewards?: {
    xp: number;
    coins: number;
    gems?: number;
  };
}

export interface BadgesResponse {
  badges: BadgeDTO[];
  recentEvents?: Array<{
    badgeKey: string;
    fromTier: number;
    toTier: number;
    createdAt: string;
  }>;
}

/**
 * Step 5.4: Fetch badges for current user
 */
export async function fetchBadges(): Promise<BadgesResponse> {
  const res = await apiClient.get('/stats/badges');
  return res.data;
}

/**
 * Step 5.5: Trait summary types
 */
export interface TraitSummary {
  traitKey: string;
  current: number; // 0-100
  weeklyDelta: number | null;
  weekRange: {
    start: Date;
    end: Date;
    tz: 'Asia/Jerusalem';
    startISO: string;
    endISO: string;
  };
}

export interface TraitImprovement {
  tip: string;
  freePlaySuggestion: string;
  missionRoadTargets: string[];
}

export interface TraitsSummaryResponse {
  traits: TraitSummary[];
  sessionsThisWeek: number;
  avgScoreThisWeek?: number;
  improvements: Record<string, TraitImprovement>;
}

export interface TraitHistoryPoint {
  sessionId: string;
  recordedAtISO: string;
  traits: Record<string, number>; // 0-100 values
}

export interface TraitHistoryResponse {
  points: TraitHistoryPoint[];
}

export interface StatsSummaryResponse {
  sessionsTotal: number;
  sessionsThisWeek: number;
  avgScoreThisWeek?: number;
  lastSessionId?: string;
  isPremium: boolean;
}

/**
 * Step 5.5: Fetch traits summary
 */
export async function fetchTraitsSummary(): Promise<TraitsSummaryResponse> {
  const res = await apiClient.get('/stats/traits/summary');
  return res.data;
}

/**
 * Step 5.5: Fetch trait history
 */
export async function fetchTraitHistory(limit: number = 20): Promise<TraitHistoryResponse> {
  const res = await apiClient.get(`/stats/traits/history?limit=${limit}`);
  return res.data;
}

/**
 * Step 5.5→5.6 glue: Fetch stats summary
 */
export async function fetchStatsSummary(): Promise<StatsSummaryResponse> {
  const res = await apiClient.get('/stats/summary');
  return res.data;
}

/**
 * Step 5.6: Advanced Metrics types (shared between BE and FE)
 * Minimal allowlisted DTO: score, traits, hooks[], patterns[], whyItWorked[], whatToImprove[]
 */
export interface MessageBreakdownDTO {
  score: number;
  traits: Record<string, number>;
  hooks: string[];
  patterns: string[];
  whyItWorked: string[];
  whatToImprove: string[];
}

export interface MessageEvolutionPoint {
  sessionId: string;
  recordedAtISO: string;
  avgMessageScore: number;
}

export interface Radar360Traits {
  current: Record<string, number>;
  deltasVsLast3: Partial<Record<string, number>>;
  microInsights: Array<{
    traitKey: string;
    title: string;
    body: string;
  }>;
}

export interface PersonaSensitivityRow {
  personaKey: string;
  sessions: number;
  avgScore: number;
  deltaPct?: number;
  explanation: string;
}

export interface WeekRangeDTO {
  startISO: string;
  endISO: string;
  tz: 'Asia/Jerusalem';
}

export interface TrendingTraitsHeatmap {
  weeks: Array<{
    weekStartISO: string;
    values: Record<string, number>;
  }>;
}

export interface BehavioralBiasTrackerItem {
  biasKey: string;
  countThisWeek: number;
  deltaVsLastWeek: number | null;
  explanation: string;
}

export interface SignatureStyleCard {
  archetypeKey: string;
  title: string;
  description: string;
  supportingSignals: string[];
}

export interface HallOfFameMessageItem {
  messageId: string;
  sessionId: string;
  recordedAtISO: string;
  turnIndex: number;
  contentSnippet: string;
  score: number;
  breakdown?: MessageBreakdownDTO;
}

export interface AdvancedMetricsResponse {
  isPremium: boolean;
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
 * Step 5.6: Fetch advanced metrics
 */
export async function fetchAdvancedMetrics(): Promise<AdvancedMetricsResponse> {
  const res = await apiClient.get('/stats/advanced');
  return res.data;
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
 * Step 5.9: Fetch trait synergy map
 */
export async function fetchTraitSynergy(): Promise<TraitSynergyResponse> {
  const res = await apiClient.get<TraitSynergyResponse>('/stats/synergy');
  return res.data;
}

/**
 * Step 5.10: Mood timeline types
 */
import { MoodTimelineResponse } from '../types/InsightsDTO';

/**
 * Step 5.10: Fetch mood timeline for a session
 */
export async function fetchMoodTimeline(sessionId: string): Promise<MoodTimelineResponse> {
  const { data } = await apiClient.get<MoodTimelineResponse>(`/v1/stats/mood/session/${sessionId}`);
  return data;
}

/**
 * Step 5.11: Rotation surface types
 */
export type RotationSurface =
  | 'MISSION_END'
  | 'ADVANCED_TAB'
  | 'ANALYZER'
  | 'SYNERGY_MAP'
  | 'MOOD_TIMELINE';

/**
 * Step 5.11: Rotation pack response types
 */
export interface RotationPackResponse {
  sessionId: string;
  surface: RotationSurface;
  selectedInsights: Array<{
    id: string;
    kind: string;
    category: string;
    title: string;
    body: string;
    isPremium?: boolean;
  }>;
  selectedParagraphs?: Array<{
    id: string;
    category: string;
    title: string;
    body: string;
  }>;
  meta: {
    seed: string;
    excludedIds: string[];
    pickedIds: string[];
    quotas: {
      gate: number;
      hook: number;
      pattern: number;
      tip: number;
      mood?: number;
      synergy?: number;
      analyzer?: number;
    };
    version: 'v1';
  };
}

/**
 * Step 5.11: Fetch rotation pack for a session and surface
 */
export async function fetchRotationPack(
  sessionId: string,
  surface: RotationSurface = 'MISSION_END',
): Promise<RotationPackResponse> {
  const { data } = await apiClient.get<RotationPackResponse>(
    `/v1/insights/rotation/${sessionId}?surface=${surface}`,
  );
  return data;
}