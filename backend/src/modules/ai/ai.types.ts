// NOTE: This file currently uses Option A (rarity/xp-based) scoring/rewards. It will be migrated to Option B AiCore metrics later.

// backend/src/modules/ai/ai.types.ts

export type AiMode = 'FREE' | 'PREMIUM';

// Roles inside the simulated chat
export type PracticeMessageRole = 'user' | 'assistant';

export interface PracticeMessageInput {
  index: number;
  role: PracticeMessageRole;
  content: string;
}

// Gamification rarity levels
export type MessageRarity = 'C' | 'B' | 'A' | 'S' | 'S+';

// Base scoring for every message — returned in FREE + PREMIUM modes
export interface AiMessageScoreBase {
  index: number;              // index in conversation
  score: number;              // 0–100
  rarity: MessageRarity;      // C–S+
  microFeedback: string;      // 1–2 sentence feedback
  tags: string[];             // ['confident', 'playful', ...]
  xpMultiplier: number;
  coinsMultiplier: number;
  safetyFlag?: 'OK' | 'RISKY' | 'BLOCK';
}

// Emotion profile for PREMIUM sessions
export interface EmotionProfile {
  tension: number;
  warmth: number;
  dominance: number;
  flirtEnergy: number;
}

// Deep insights for top/bottom messages (PREMIUM only)
export interface AiMessageDeepInsight {
  index: number;
  userText: string;
  score: number;
  rarity: MessageRarity;
  strengths: string[];
  weaknesses: string[];
  advice: string;
}

// Full deep session analysis (PREMIUM)
export interface AiSessionAnalysisPremium {
  conversationScore: number;
  conversationStyle: string;

  emotionProfile: EmotionProfile;

  topMessages: AiMessageDeepInsight[];
  bottomMessages: AiMessageDeepInsight[];

  overallStrengths: string[];
  overallWeaknesses: string[];
  overallAdvice: string[];
}

// Final result returned from AiService
export interface AiScoringResult {
  mode: AiMode;

  // always returned
  perMessage: AiMessageScoreBase[];

  // only returned if PREMIUM
  premiumSessionAnalysis?: AiSessionAnalysisPremium;
}
