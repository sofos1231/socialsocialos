// backend/src/modules/insights/engine/insights.engine.ts
// Step 5.2: Insights v2 engine orchestrator

import { PrismaService } from '../../../db/prisma.service';
import { InsightsV2Payload } from '../insights.types';
import { extractInsightSignals } from './insight-signals';
import { loadInsightHistory } from './insight-history';
import { selectInsightsV2 } from './insight-selector';
import { generateInsightsV2Seed } from './insight-prng';
import { computeTraitDeltas } from '../../traits/trait-adjuster.v1';
import { SessionAnalyticsSnapshot } from '../../shared/helpers/session-snapshot.helper';

/**
 * Build insights v2 payload for a session
 * 
 * Orchestrates: signals → history → selector → trait deltas
 * 
 * @param prisma - PrismaService instance
 * @param userId - User ID
 * @param sessionId - Session ID
 * @param snapshot - Session analytics snapshot
 * @returns InsightsV2Payload
 */
export async function buildInsightsV2(
  prisma: PrismaService,
  userId: string,
  sessionId: string,
  snapshot: SessionAnalyticsSnapshot,
): Promise<InsightsV2Payload> {
  // Step 1: Generate deterministic seed
  const seed = generateInsightsV2Seed(userId, sessionId, 'insightsV2');

  // Step 2: Extract signals from session data
  const signals = await extractInsightSignals(prisma, sessionId, snapshot);

  // Step 3: Load history (last 5 missions, excluded IDs)
  const history = await loadInsightHistory(prisma, userId, sessionId);

  // Step 4: Select insights deterministically
  const payload = selectInsightsV2(signals, history, seed);

  // Step 5: Compute trait deltas
  // Load previous scores (if available)
  const previousScoresRow = await prisma.userTraitScores.findUnique({
    where: { userId },
    select: { traitsJson: true },
  });

  const previousScores = previousScoresRow?.traitsJson
    ? (previousScoresRow.traitsJson as Record<string, number>)
    : null;

  const traitDeltas = computeTraitDeltas(signals.traitSnapshot, previousScores, seed);

  // Merge trait deltas into payload
  payload.traitDeltas = traitDeltas;

  return payload;
}

