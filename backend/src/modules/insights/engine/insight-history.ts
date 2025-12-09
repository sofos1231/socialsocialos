// backend/src/modules/insights/engine/insight-history.ts
// Step 5.2: History loader for variety enforcement (idempotency-guaranteed)

import { PrismaService } from '../../../db/prisma.service';

/**
 * Insight history loaded from prior missions
 */
export interface InsightHistory {
  pickedIds: string[]; // All insight IDs from last 5 missions
}

/**
 * Load insight history for a user (last 5 prior sessions)
 * 
 * Idempotency guarantee:
 * - Anchors by PracticeSession.createdAt < anchorTimestamp (immutable)
 * - Excludes current sessionId explicitly
 * - Same sessionId always returns same history (even if user completes more sessions later)
 * 
 * @param prisma - PrismaService instance
 * @param userId - User ID
 * @param currentSessionId - Current session ID (excluded from history)
 * @returns InsightHistory with pickedIds from last 5 prior missions
 */
export async function loadInsightHistory(
  prisma: PrismaService,
  userId: string,
  currentSessionId: string,
): Promise<InsightHistory> {
  // Step 1: Get current session's anchor timestamp
  const currentSession = await prisma.practiceSession.findUnique({
    where: { id: currentSessionId },
    select: {
      createdAt: true,
      endedAt: true, // Use endedAt if finalized (canonical "mission happened" time)
    },
  });

  if (!currentSession) {
    throw new Error(`Session ${currentSessionId} not found`);
  }

  // Step 2: Anchor timestamp - prefer endedAt (finalized), fallback to createdAt
  // This ensures stability: same sessionId always anchors to same timestamp
  const anchorTimestamp = currentSession.endedAt || currentSession.createdAt;

  // Step 3: Query last 5 prior sessions using relation to PracticeSession
  // Anchor by PracticeSession.createdAt < anchorTimestamp (most stable)
  const rows = await prisma.missionDeepInsights.findMany({
    where: {
      userId,
      session: {
        createdAt: {
          lt: anchorTimestamp, // ✅ Anchor: sessions that started BEFORE current session ended/started
        },
        id: {
          not: currentSessionId, // ✅ Explicit exclusion of current session
        },
      },
    },
    orderBy: {
      createdAt: 'desc', // Most recent first
    },
    take: 5, // ✅ Last 5 prior sessions
    select: {
      insightsJson: true,
    },
  });

  // Step 4: Extract pickedIds from insightsJson
  const pickedIds: string[] = [];
  for (const row of rows) {
    const json = row.insightsJson as any;
    if (json?.insightsV2?.meta?.pickedIds && Array.isArray(json.insightsV2.meta.pickedIds)) {
      pickedIds.push(...json.insightsV2.meta.pickedIds);
    }
  }

  // Deduplicate and return
  return {
    pickedIds: Array.from(new Set(pickedIds)),
  };
}

