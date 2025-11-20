// src/api/types.ts

// ===== Rarity & Rewards =====

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

export interface StatsSummary {
  sessionsCount: number;
  successCount: number;
  failCount: number;
  averageScore: number;
  averageMessageScore: number;
  lastSessionAt: string | null;
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
export type RootStackParamList = {
  Auth: undefined;
  Dashboard: undefined;
  Practice: undefined;
};