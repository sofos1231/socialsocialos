// backend/src/modules/analyzer/helpers/paragraph-history.ts
// Step 5.7: Paragraph history loader for cooldown (glue for 5.8)

import { PrismaService } from '../../../db/prisma.service';

/**
 * Step 5.7: Paragraph history loaded from prior missions
 * Glue for 5.8: Tracks which paragraph IDs were shown recently
 */
export interface ParagraphHistory {
  usedParagraphIds: string[]; // Paragraph IDs from last 5 missions
}

/**
 * Step 5.7: Load paragraph history for a user (last 5 prior sessions)
 * Reuses MissionDeepInsights table pattern (glue for 5.8)
 * 
 * Strategy: Parse insightsJson payloads to extract paragraph IDs
 * If no paragraph tracking exists yet, returns empty array (backward compatible)
 * 
 * @param prisma - PrismaService instance
 * @param userId - User ID
 * @returns ParagraphHistory with usedParagraphIds from last 5 prior sessions
 */
export async function loadParagraphHistory(
  prisma: PrismaService,
  userId: string,
): Promise<ParagraphHistory> {
  // Query last 5 prior sessions with insights
  const rows = await prisma.missionDeepInsights.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc', // Most recent first
    },
    take: 5, // Last 5 prior sessions
    select: {
      insightsJson: true,
    },
  });

  // Extract paragraph IDs from insightsJson
  // Step 5.7: For now, check for any paragraph tracking in payload
  // Step 5.8 glue: Will extend this to explicitly track paragraph IDs
  const usedParagraphIds: string[] = [];
  
  for (const row of rows) {
    const json = row.insightsJson as any;
    
    // Check for paragraph IDs in various possible locations (backward compatible)
    if (json?.analyzerParagraphs && Array.isArray(json.analyzerParagraphs)) {
      // If Step 5.8 adds explicit tracking
      usedParagraphIds.push(...json.analyzerParagraphs.map((p: any) => p.id || p));
    } else if (json?.insightsV2?.meta?.pickedParagraphIds && Array.isArray(json.insightsV2.meta.pickedParagraphIds)) {
      // Alternative location for paragraph tracking
      usedParagraphIds.push(...json.insightsV2.meta.pickedParagraphIds);
    }
    // If no paragraph tracking exists, usedParagraphIds remains empty (all paragraphs available)
  }

  // Deduplicate and return
  return {
    usedParagraphIds: Array.from(new Set(usedParagraphIds)),
  };
}

