// backend/src/modules/ai/ai-output.schema.ts

export interface AiMessageAnalysis {
    text: string;
    score: number; // raw 0–100
    sentiment: number; // -100 to +100
    fillers: string[]; // list of detected filler words
    confidence: number; // 0–1
    clarity: number; // 0–1
    humor: number; // 0–1
    tension: number; // 0–1
    rarityTag: string; // e.g. "BRILLIANT", "WEAK", "AVERAGE"
    notes: string[]; // insights about THIS message
  }
  
  export interface AiSessionSummary {
    overallCharisma: number; // 0–100
    overallFillerCount: number;
    topStrengths: string[]; // human readable insights
    topWeaknesses: string[];
    recommendedFocus: string[]; // 3 tips for next session
  }
  
  export interface AiOutput {
    messages: AiMessageAnalysis[];
    summary: AiSessionSummary;
  
    // raw metrics for future stats expansions
    raw: {
      totalMessages: number;
      totalTokens: number;
      emotionalVariability: number; // 0–1
      avgConfidence: number; // 0–1
      avgClarity: number; // 0–1
      avgHumor: number; // 0–1
      avgTension: number; // 0–1
    };
  }
  