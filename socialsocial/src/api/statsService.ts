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
