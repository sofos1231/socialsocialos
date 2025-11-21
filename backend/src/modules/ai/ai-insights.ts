// backend/src/modules/ai/ai-insights.ts
//
// Small helper to turn a single AiSessionResult into a compact JSON summary
// that we can store in PracticeSession.aiSummary and surface on the dashboard.

import { AiSessionResult, CharismaTraitKey, MessageEvaluation } from './ai-scoring.types';

export interface AiInsightSummary {
  version: string;
  charismaIndex: number;

  // Top/worst messages (indices + short text)
  topMessages: {
    index: number;
    label: string;
    text: string;
  }[];

  worstMessages: {
    index: number;
    label: string;
    text: string;
  }[];

  // Strongest / weakest traits in this session
  strongestTraits: { trait: CharismaTraitKey; score: number }[];
  weakestTraits: { trait: CharismaTraitKey; score: number }[];

  // Simple flags extracted from messages
  flagsSample: string[];
}

const TRAIT_KEYS: CharismaTraitKey[] = [
  'confidence',
  'clarity',
  'humor',
  'tensionControl',
  'emotionalWarmth',
  'dominance',
];

export function buildAiInsightSummary(result: AiSessionResult): AiInsightSummary {
  const { metrics, messages, version } = result;

  // ---- strongest / weakest traits ----
  const traitEntries = TRAIT_KEYS.map((key) => ({
    trait: key,
    score: (metrics as any)[key] as number,
  })).filter((t) => typeof t.score === 'number');

  const strongestTraits = [...traitEntries]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const weakestTraits = [...traitEntries]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  // ---- top and worst messages by label ----
  const userMessages: { msg: MessageEvaluation; index: number }[] = messages
    .map((m, index) => ({ msg: m, index }))
    .filter((m) => m.msg.sentBy === 'user');

  const topMessages = userMessages
    .filter((m) => m.msg.label === 'great' || m.msg.label === 'good')
    .slice(0, 3)
    .map(({ msg, index }) => ({
      index,
      label: msg.label,
      text: shorten(msg.text, 120),
    }));

  const worstMessages = userMessages
    .filter((m) => m.msg.label === 'weak' || m.msg.label === 'cringe')
    .slice(0, 3)
    .map(({ msg, index }) => ({
      index,
      label: msg.label,
      text: shorten(msg.text, 120),
    }));

  // ---- collect a small sample of flags ----
  const flagsSet = new Set<string>();
  for (const m of userMessages) {
    for (const f of m.msg.flags ?? []) {
      if (!flagsSet.has(f)) {
        flagsSet.add(f);
      }
      if (flagsSet.size >= 8) break;
    }
    if (flagsSet.size >= 8) break;
  }

  return {
    version,
    charismaIndex: metrics.charismaIndex,
    topMessages,
    worstMessages,
    strongestTraits,
    weakestTraits,
    flagsSample: Array.from(flagsSet),
  };
}

function shorten(text: string, max: number): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '…';
}
