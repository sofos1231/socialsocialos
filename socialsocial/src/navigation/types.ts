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

// --- 6A/B8: AiCore metrics, insights & social score ---

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
  // backend currently returns AiInsightSummary for "latest"
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

  latest: LatestStats;
  averages: AverageStats;
  insights: StatsInsights;

  socialScore: number | null;
  socialTier: string | null;

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

// ===== Practice session contracts (text mission) =====

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

  // 6A: backend already returns these, keep them loosely typed for now
  ai?: any;
  aiCore?: any;
}

// ===== Voice mission contracts =====

export interface VoicePracticeRequest {
  topic: string;
  transcript: string;
}

export type VoicePracticeResponse = PracticeSessionResponse & {
  mode?: string;
  transcript?: string;
};

// ===== A/B mission contracts =====

export interface AbOptionDetails {
  index?: number;
  score?: number;
  rarity?: MessageRarity;
  microFeedback?: string;
  tags?: string[];
  xpMultiplier?: number;
  coinsMultiplier?: number;
  safetyFlag?: string;
}

export interface AbOption {
  text: string;
  score: number;
  details?: AbOptionDetails;
}

export interface AbResult {
  prompt: string | null;
  optionA: AbOption;
  optionB: AbOption;
  winner: 'A' | 'B' | null;
}

export interface ABPracticeRequest {
  topic: string;
  optionA: string;
  optionB: string;
}

export type ABPracticeResponse = PracticeSessionResponse & {
  mode?: string;
  ab?: AbResult;
};

// ===== Navigation param lists =====

export type RootStackParamList = {
  Auth: undefined;
  Dashboard: undefined;
  Practice: undefined;
};

export type MainTabParamList = {
  PracticeTab: undefined;
  StatsTab: undefined;
  ProfileTab: undefined;
};

export type PracticeStackParamList = {
  PracticeHub: undefined;
  PracticeSession: undefined;
  VoicePracticeSession: undefined;
  ABPracticeSession: undefined;
};
