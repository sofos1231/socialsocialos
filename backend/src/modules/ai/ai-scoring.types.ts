// backend/src/modules/ai/ai-scoring.types.ts

export type CharismaTraitKey =
  | 'confidence'
  | 'clarity'
  | 'humor'
  | 'tensionControl'
  | 'emotionalWarmth'
  | 'dominance';

export interface MessageEvaluation {
  text: string;
  sentBy: 'user' | 'ai';
  traits: Record<CharismaTraitKey, number>; // 0–100 per trait
  label: 'great' | 'good' | 'neutral' | 'weak' | 'cringe';
  flags: string[]; // e.g. ['neediness', 'overexplaining']
}

export interface CoreMetrics {
  charismaIndex: number;
  overallScore: number;

  confidence: number;
  clarity: number;
  humor: number;
  tensionControl: number;
  emotionalWarmth: number;
  dominance: number;

  fillerWordsCount: number;
  totalMessages: number;
  totalWords: number;
}

export interface AiSessionResult {
  metrics: CoreMetrics;
  messages: MessageEvaluation[];
  version: string; // e.g. "v1"
}

export interface TranscriptMessage {
  sentBy: 'user' | 'ai';
  text: string;
  timestamp?: string;
}
