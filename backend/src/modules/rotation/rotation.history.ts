// backend/src/modules/rotation/rotation.history.ts
// Step 5.11: Unified insight history loader (prerequisite layer)
// Aggregates insight IDs from all sources for cooldown exclusion

import { PrismaService } from '../../db/prisma.service';

/**
 * Step 5.11: Unified insight history from all sources
 * Contains all insight IDs that should be excluded from selection
 */
export interface UnifiedInsightHistory {
  insightIds: string[]; // From MissionDeepInsights.insightsV2.meta.pickedIds
  moodIds: string[]; // From MissionMoodTimeline.timelineJson.moodInsights.pickedIds
  paragraphIds: string[]; // From MissionDeepInsights.insightsV2.meta.pickedParagraphIds
  synergyIds: string[]; // From SessionTraitSynergy.synergyJson.synergyInsights.pickedIds (if exists)
}

/**
 * Step 5.11: Load unified insight history from all sources
 * 
 * Loads last 5 prior sessions and aggregates all insight IDs from:
 * - MissionDeepInsights (gate/hook/pattern/tip insights)
 * - MissionMoodTimeline (mood insights)
 * - MissionDeepInsights (analyzer paragraphs)
 * - SessionTraitSynergy (synergy insights, if stored)
 * 
 * ⚠️ NOTE: This function does NOT perform cooldown filtering.
 * It only loads history. Selection and cooldown logic happens in the rotation engine.
 * 
 * @param prisma - PrismaService instance
 * @param userId - User ID
 * @param sessionId - Current session ID (excluded from history)
 * @returns UnifiedInsightHistory with all insight IDs from last 5 sessions
 */
export async function loadUnifiedInsightHistory(
  prisma: PrismaService,
  userId: string,
  sessionId: string,
): Promise<UnifiedInsightHistory> {
  // Step 1: Get current session's anchor timestamp
  const currentSession = await prisma.practiceSession.findUnique({
    where: { id: sessionId },
    select: {
      createdAt: true,
      endedAt: true,
    },
  });

  if (!currentSession) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const anchorTimestamp = currentSession.endedAt || currentSession.createdAt;

  // Step 2: Load last 5 prior sessions from MissionDeepInsights
  const insightsRows = await prisma.missionDeepInsights.findMany({
    where: {
      userId,
      session: {
        createdAt: {
          lt: anchorTimestamp,
        },
        id: {
          not: sessionId,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
    select: {
      insightsJson: true,
    },
  });

  // Step 3: Load last 5 prior sessions from MissionMoodTimeline
  const moodRows = await prisma.missionMoodTimeline.findMany({
    where: {
      userId,
      session: {
        createdAt: {
          lt: anchorTimestamp,
        },
        id: {
          not: sessionId,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
    select: {
      timelineJson: true,
    },
  });

  // Step 4: Load last 5 prior sessions from SessionTraitSynergy
  const synergyRows = await prisma.sessionTraitSynergy.findMany({
    where: {
      userId,
      session: {
        createdAt: {
          lt: anchorTimestamp,
        },
        id: {
          not: sessionId,
        },
      },
    },
    orderBy: {
      computedAt: 'desc',
    },
    take: 5,
    select: {
      synergyJson: true,
    },
  });

  // Step 5: Extract insight IDs from MissionDeepInsights
  const insightIds: string[] = [];
  const paragraphIds: string[] = [];

  for (const row of insightsRows) {
    const json = row.insightsJson as any;
    
    // Extract pickedIds from insightsV2.meta
    if (json?.insightsV2?.meta?.pickedIds && Array.isArray(json.insightsV2.meta.pickedIds)) {
      insightIds.push(...json.insightsV2.meta.pickedIds);
    }
    
    // Extract pickedParagraphIds from insightsV2.meta
    if (
      json?.insightsV2?.meta?.pickedParagraphIds &&
      Array.isArray(json.insightsV2.meta.pickedParagraphIds)
    ) {
      paragraphIds.push(...json.insightsV2.meta.pickedParagraphIds);
    }
  }

  // Step 6: Extract mood insight IDs from MissionMoodTimeline
  const moodIds: string[] = [];

  for (const row of moodRows) {
    const json = row.timelineJson as any;
    if (json?.moodInsights?.pickedIds && Array.isArray(json.moodInsights.pickedIds)) {
      moodIds.push(...json.moodInsights.pickedIds);
    }
  }

  // Step 7: Extract synergy insight IDs from SessionTraitSynergy (if stored)
  const synergyIds: string[] = [];

  for (const row of synergyRows) {
    const json = row.synergyJson as any;
    if (json?.synergyInsights?.pickedIds && Array.isArray(json.synergyInsights.pickedIds)) {
      synergyIds.push(...json.synergyInsights.pickedIds);
    }
  }

  // Step 8: Deduplicate and return
  return {
    insightIds: Array.from(new Set(insightIds)),
    moodIds: Array.from(new Set(moodIds)),
    paragraphIds: Array.from(new Set(paragraphIds)),
    synergyIds: Array.from(new Set(synergyIds)),
  };
}

