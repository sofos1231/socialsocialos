// backend/src/modules/insights/engine/insight-signals.ts
// Step 5.2: Signal extraction from session data (graceful degradation)

import { InsightSignals } from '../insights.types';
import { SessionAnalyticsSnapshot } from '../../shared/helpers/session-snapshot.helper';
import { PrismaService } from '../../../db/prisma.service';

/**
 * Extract insight signals from session data
 * 
 * Graceful degradation: Works even if GateOutcome/PromptHookTrigger are missing
 * (falls back to ChatMessage.traitData.hooks/patterns)
 * 
 * @param prisma - PrismaService instance
 * @param sessionId - Session ID
 * @param snapshot - Session analytics snapshot (messages, traits, etc.)
 * @returns InsightSignals with gate fails, hooks, patterns, traits
 */
export async function extractInsightSignals(
  prisma: PrismaService,
  sessionId: string,
  snapshot: SessionAnalyticsSnapshot,
): Promise<InsightSignals> {
  // Extract gate fails from GateOutcome (if available)
  const gateOutcomes = await prisma.gateOutcome.findMany({
    where: { sessionId },
  });

  const gateFails = gateOutcomes
    .filter((g) => !g.passed)
    .map((g) => ({
      gateKey: g.gateKey,
      reasonCode: g.reasonCode ?? undefined,
    }));

  // Extract prompt hook triggers (if available)
  const hookTriggers = await prisma.promptHookTrigger.findMany({
    where: { sessionId },
    include: { hook: true },
  });

  // Build positive hooks from triggers (with hook.category or hook.type)
  const positiveHooks = hookTriggers
    .filter((t) => t.hook.type === 'POSITIVE' || t.hook.type === 'NEUTRAL')
    .map((t) => ({
      hookKey: t.hook.id, // Use hook ID as key
      strength: 1.0, // Default strength (could be enhanced with context analysis)
    }));

  // If no hook triggers found, fallback to ChatMessage.traitData.hooks
  if (positiveHooks.length === 0) {
    const userMessages = snapshot.messages.filter((m) => m.role === 'USER');
    const hookCounts: Record<string, { count: number; turnIndex?: number }> = {};
    
    for (const msg of userMessages) {
      const hooks = msg.traitData.hooks || [];
      for (const hookKey of hooks) {
        if (!hookCounts[hookKey]) {
          hookCounts[hookKey] = { count: 0, turnIndex: msg.turnIndex };
        }
        hookCounts[hookKey].count++;
      }
    }

    // Convert to positive hooks array
    Object.entries(hookCounts).forEach(([hookKey, data]) => {
      positiveHooks.push({
        hookKey,
        strength: Math.min(1.0, data.count / 3), // Normalize strength
        turnIndex: data.turnIndex,
      });
    });
  }

  // Extract negative patterns from ChatMessage.traitData.patterns
  const userMessages = snapshot.messages.filter((m) => m.role === 'USER');
  const patternCounts: Record<string, { count: number; turnIndex?: number }> = {};

  for (const msg of userMessages) {
    const patterns = msg.traitData.patterns || [];
    for (const patternKey of patterns) {
      if (!patternCounts[patternKey]) {
        patternCounts[patternKey] = { count: 0, turnIndex: msg.turnIndex };
      }
      patternCounts[patternKey].count++;
    }
  }

  const negativePatterns = Object.entries(patternCounts).map(([patternKey, data]) => ({
    patternKey,
    severity: Math.min(1.0, data.count / 2), // Normalize severity
    turnIndex: data.turnIndex,
  }));

  // Extract trait snapshot (aggregate from user messages)
  const traitSnapshot: Record<string, number> = {};
  const traitKeys = ['confidence', 'clarity', 'humor', 'tensionControl', 'emotionalWarmth', 'dominance'];
  
  for (const key of traitKeys) {
    const values = userMessages
      .map((m) => m.traitData.traits[key])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100);
    
    if (values.length > 0) {
      traitSnapshot[key] = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
    } else {
      traitSnapshot[key] = 0;
    }
  }

  // Extract top/bottom messages by score
  const scoredMessages = userMessages
    .filter((m) => m.score !== null)
    .map((m) => ({
      turnIndex: m.turnIndex,
      score: m.score!,
    }))
    .sort((a, b) => b.score - a.score); // Descending

  const topMessages = scoredMessages.slice(0, 3);
  const bottomMessages = scoredMessages.slice(-3).reverse(); // Lowest first

  return {
    gateFails,
    positiveHooks,
    negativePatterns,
    traitSnapshot,
    topMessages,
    bottomMessages,
  };
}

