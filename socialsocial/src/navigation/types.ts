// NOTE: This file currently uses Option A (rarity/xp-based) scoring/rewards.
// Backend stats now also expose Option B AiCore metrics for dashboard visuals.

// socialsocial/src/navigation/types.ts

// ===== Practice session & rewards =====

export type MessageRarity = 'C' | 'B' | 'A' | 'S' | 'S+';

export interface RewardMessage {
  index: number;
  score: number;
  rarity: MessageRarity;
  xp: number;
  coins: number;
  gems: number;
}

export interface SessionRewards {
  // overall session numbers
  score: number;
  messageScore: number;
  isSuccess: boolean;

  // totals
  xpGained: number;
  coinsGained: number;
  gemsGained: number;

  // rarity breakdown
  rarityCounts: Record<MessageRarity, number>;

  // per-message breakdown
  messages: RewardMessage[];
}

// ===== Dashboard summary =====

export interface WalletSummary {
  xp: number;
  level: number;
  coins: number;
  gems: number;
  lifetimeXp: number;
}

// --- B8: AiCore metrics, insights & social score ---

export interface LatestStats {
  charismaIndex: number | null;
  confidenceScore: number | null;
  clarityScore: number | null;
  humorScore: number | null;
  tensionScore: number | null;
  emotionalWarmth: number | null;
  dominanceScore: number | null;
  fillerWordsCount: number | null;
  totalMessages: number | null;
  totalWords: number | null;
  aiCoreVersion: string | null;
}

export interface AverageStats {
  avgCharismaIndex: number | null;
  avgConfidence: number | null;
  avgClarity: number | null;
  avgHumor: number | null;
  avgTension: number | null;
  avgWarmth: number | null;
  avgDominance: number | null;
  avgFillerWords: number | null;
  avgTotalWords: number | null;
  avgTotalMessages: number | null;
}

export interface StatsInsightTrends {
  improvingTraits: string[];
  decliningTraits: string[];
}

export interface StatsInsights {
  // Backend sends a structured AiSummary object here.
  // For now we keep it loose; can be tightened later.
  latest: any | null;
  trends: StatsInsightTrends;
}

export interface RecentSessionSummary {
  createdAt: string;
  charismaIndex: number | null;
  score: number | null;
}

export interface StatsSummary {
  sessionsCount: number;
  successCount: number;
  failCount: number;
  averageScore: number;
  averageMessageScore: number;
  lastSessionAt: string | null;

  // B5/B6/B8 metrics:
  latest: LatestStats;
  averages: AverageStats;
  insights: StatsInsights;

  // B8.1 social score system:
  socialScore: number | null;
  socialTier: string | null;

  // B8.2 recent sessions history:
  recentSessions: RecentSessionSummary[];
}

export interface DashboardUserInfo {
  id: string;
  email: string;
  createdAt: string;
}

export interface DashboardSummaryResponse {
  ok: boolean;
  user: DashboardUserInfo;
  streak: {
    current: number;
  };
  wallet: WalletSummary;
  stats: StatsSummary;
}

// ===== Practice session contracts =====

export type PracticeMessageRole = 'USER' | 'AI';

export interface PracticeMessageInput {
  role: PracticeMessageRole;
  content: string;
}

export interface PracticeSessionRequest {
  topic: string;
  messages: PracticeMessageInput[];
}

export interface PracticeSessionResponse {
  ok: boolean;
  rewards: SessionRewards;
  dashboard: DashboardSummaryResponse;
  sessionId: string;
}

// ===== Navigation param lists =====

// Root stack – Auth + main app host (Dashboard = tabs)
export type RootStackParamList = {
  Auth: undefined;
  Dashboard: undefined; // hosts the tab navigator
  Practice: undefined; // legacy, can be unused for now
};

// Bottom tabs
export type MainTabParamList = {
  PracticeTab: undefined;
  StatsTab: undefined;
  ProfileTab: undefined;
};

// Practice stack inside Practice tab
export type PracticeStackParamList = {
  PracticeHub: undefined;
  PracticeSession: undefined;
};
