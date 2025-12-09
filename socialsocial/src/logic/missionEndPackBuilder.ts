// socialsocial/src/logic/missionEndPackBuilder.ts
// Step 5.3: Build selectedPack from API responses (single source of truth)

import { SessionDTO } from '../types/SessionDTO';
import { InsightsDTO } from '../types/InsightsDTO';
import { MissionEndSelectedPack, MessageHighlight, EndReasonBanner, MoodTeaser } from '../types/MissionEndTypes';
import { getEndReasonCopy } from './missionEndReasons';

/**
 * Compute top 3 and bottom 3 USER messages from session messages
 * 
 * Rules:
 * - Filter to USER role only
 * - Sort by score (numeric, descending for top, ascending for bottom)
 * - Exclude messages without valid scores from ranking
 * - Return up to 3 for each
 */
function computeTopBottomMessages(
  messages: SessionDTO['messages'],
  rewardsMessages: SessionDTO['rewards']['messages'],
): { top: MessageHighlight[]; bottom: MessageHighlight[] } {
  // Filter to USER messages only and sort by turnIndex (stable order)
  const userMessages = messages
    .filter(m => m.role === 'USER')
    .sort((a, b) => a.turnIndex - b.turnIndex);

  // Create lookup map for rarity: rewardMsg.index is the sequential index in USER-only array (0, 1, 2...)
  // Backend builds rewards.messages from messageScores array which is USER messages in turnIndex order
  // So rewards.messages[index] corresponds to the (index)th USER message by turnIndex
  const rarityMap = new Map<number, string | null>();
  if (rewardsMessages.length > 0 && userMessages.length > 0) {
    // Map rewardsMessages[].index (sequential USER message index 0,1,2...) to userMessages array
    // userMessages is already sorted by turnIndex, so userMessages[index] is the (index)th USER message
    // Only attach rarity if we can safely match: index < userMessages.length and valid rarity
    for (const rewardMsg of rewardsMessages) {
      if (
        typeof rewardMsg.index === 'number' &&
        rewardMsg.index >= 0 &&
        rewardMsg.index < userMessages.length &&
        typeof rewardMsg.rarity === 'string' &&
        rewardMsg.rarity.length > 0
      ) {
        const userMsg = userMessages[rewardMsg.index];
        if (userMsg) {
          // Map by turnIndex (the stable identifier across sessions)
          rarityMap.set(userMsg.turnIndex, rewardMsg.rarity);
        }
      }
      // If index is out of bounds, invalid, or rarity missing, skip (rarity remains null)
    }
  }

  // Separate scored vs unscored
  const scored: Array<{ msg: SessionDTO['messages'][0]; score: number }> = [];
  const unscored: SessionDTO['messages'] = [];

  for (const msg of userMessages) {
    if (msg.score !== null && typeof msg.score === 'number' && msg.score >= 0 && msg.score <= 100) {
      scored.push({ msg, score: msg.score });
    } else {
      unscored.push(msg);
    }
  }

  // Sort scored messages
  const sortedTop = [...scored].sort((a, b) => b.score - a.score);
  const sortedBottom = [...scored].sort((a, b) => a.score - b.score);

  // Build highlights with safe rarity mapping
  // Only attach rarity if it was successfully mapped (not null in map means it was found and set)
  const top: MessageHighlight[] = sortedTop.slice(0, 3).map(({ msg }) => {
    const mappedRarity = rarityMap.get(msg.turnIndex);
    return {
      turnIndex: msg.turnIndex,
      content: msg.content,
      score: msg.score!,
      rarity: mappedRarity ?? null, // Explicit null if not found (safer than undefined)
    };
  });

  const bottom: MessageHighlight[] = sortedBottom.slice(0, 3).map(({ msg }) => {
    const mappedRarity = rarityMap.get(msg.turnIndex);
    return {
      turnIndex: msg.turnIndex,
      content: msg.content,
      score: msg.score!,
      rarity: mappedRarity ?? null, // Explicit null if not found
    };
  });

  return { top, bottom };
}

/**
 * Compute mood teaser from session data (local computation, no backend call)
 */
function computeMoodTeaser(session: SessionDTO): MoodTeaser | null {
  const avgScore = session.missionState.averageScore;
  const status = session.missionState.status;

  // Simple mood computation based on status and average score
  // This is a placeholder - Step 5.4 may enhance with backend timeline data
  return {
    averageScore: avgScore,
    // timeline: undefined for now (Step 5.4 may add)
  };
}

/**
 * Build MissionEndSelectedPack from session and insights data
 * 
 * Rules:
 * - All fields must have safe defaults
 * - Insights may be null (old sessions without v2)
 * - Top/bottom messages computed from session.messages (USER role only)
 * - End reason copy derived from missionState
 */
export function buildMissionEndSelectedPack(
  session: SessionDTO,
  insights: InsightsDTO | null,
): MissionEndSelectedPack {
  // Compute top/bottom messages
  const { top, bottom } = computeTopBottomMessages(session.messages, session.rewards.messages);

  // Collect all referenced turnIndices from insights (to ensure they're in the message list)
  const referencedTurnIndices = new Set<number>();
  if (insights?.insightsV2) {
    [
      ...insights.insightsV2.gateInsights,
      ...insights.insightsV2.positiveInsights,
      ...insights.insightsV2.negativeInsights,
    ].forEach(insight => {
      if (insight.relatedTurnIndex !== undefined) {
        referencedTurnIndices.add(insight.relatedTurnIndex);
      }
    });
  }

  // Add referenced messages that aren't already in top/bottom
  const existingTurnIndices = new Set([...top.map(m => m.turnIndex), ...bottom.map(m => m.turnIndex)]);
  const additionalMessages: MessageHighlight[] = [];
  
  // Filter to USER messages and create lookup
  const userMessages = session.messages
    .filter(m => m.role === 'USER')
    .sort((a, b) => a.turnIndex - b.turnIndex);
  
  // Build rarity map (same logic as computeTopBottomMessages)
  const rewardsMessages = session.rewards.messages;
  const rarityMap = new Map<number, string | null>();
  if (rewardsMessages.length > 0 && userMessages.length > 0) {
    for (const rewardMsg of rewardsMessages) {
      if (
        typeof rewardMsg.index === 'number' &&
        rewardMsg.index >= 0 &&
        rewardMsg.index < userMessages.length &&
        typeof rewardMsg.rarity === 'string' &&
        rewardMsg.rarity.length > 0
      ) {
        const userMsg = userMessages[rewardMsg.index];
        if (userMsg) {
          rarityMap.set(userMsg.turnIndex, rewardMsg.rarity);
        }
      }
    }
  }

  // Add referenced messages that aren't in top/bottom
  for (const turnIndex of referencedTurnIndices) {
    if (!existingTurnIndices.has(turnIndex)) {
      const userMsg = userMessages.find(m => m.turnIndex === turnIndex);
      if (userMsg && userMsg.score !== null && typeof userMsg.score === 'number' && userMsg.score >= 0 && userMsg.score <= 100) {
        additionalMessages.push({
          turnIndex: userMsg.turnIndex,
          content: userMsg.content,
          score: userMsg.score,
          rarity: rarityMap.get(userMsg.turnIndex) ?? null,
        });
      }
    }
  }

  // Sort additional messages by turnIndex to maintain order
  additionalMessages.sort((a, b) => a.turnIndex - b.turnIndex);

  // Derive end reason copy
  const endReasonCopy = getEndReasonCopy({
    status: session.missionState.status,
    endReasonCode: session.missionState.endReasonCode,
    endReasonMeta: session.missionState.endReasonMeta,
  });

  const endReason: EndReasonBanner = {
    code: endReasonCopy.code,
    title: endReasonCopy.title,
    subtitle: endReasonCopy.subtitle,
    tone: endReasonCopy.tone,
    disqualifyNote: endReasonCopy.disqualifyNote,
  };

  // Extract insights (safe defaults if null)
  const insightsV2 = insights?.insightsV2;
  const gateInsights = insightsV2?.gateInsights ?? [];
  const positiveInsights = insightsV2?.positiveInsights ?? [];
  const negativeInsights = insightsV2?.negativeInsights ?? [];
  const traitDeltas = insightsV2?.traitDeltas ?? {};
  
  // Step 5.9: Extract analyzer paragraphs (safe default: empty array)
  const analyzerParagraphs = insights?.analyzerParagraphs ?? [];

  // Compute mood teaser
  const moodTeaser = computeMoodTeaser(session);

  return {
    session: {
      id: session.sessionId,
      status: session.missionState.status,
      endedAt: null, // TODO: Add to SessionDTO if needed
      createdAt: new Date().toISOString(), // TODO: Add to SessionDTO if available
      templateId: session.templateId,
      personaId: session.personaId,
    },
    rewards: {
      score: session.rewards.score,
      xpGained: session.rewards.xpGained,
      coinsGained: session.rewards.coinsGained,
      gemsGained: session.rewards.gemsGained,
      rarityCounts: session.rewards.rarityCounts,
    },
    endReason,
    topMessages: top,
    bottomMessages: bottom,
    referencedMessages: additionalMessages, // Messages referenced by insights but not in top/bottom
    insightsV2: {
      gateInsights,
      positiveInsights,
      negativeInsights,
    },
    traitDeltas,
    analyzerParagraphs,
    moodTeaser,
    synergyTeaserLocked: true, // Always locked for Step 5.3
    reservedBadgeSlotData: {
      status: 'placeholder',
    },
  };
}

