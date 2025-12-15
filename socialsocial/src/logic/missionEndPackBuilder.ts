// socialsocial/src/logic/missionEndPackBuilder.ts
// Step 5.3: Build selectedPack from API responses (single source of truth)

import { SessionDTO } from '../types/SessionDTO';
import { InsightsDTO } from '../types/InsightsDTO';
import { MissionEndSelectedPack, MessageHighlight, EndReasonBanner, MoodTeaser } from '../types/MissionEndTypes';
import { getEndReasonCopy } from './missionEndReasons';

/**
 * Phase 3: Compute top 3 and bottom 3 USER messages from session messages
 * 
 * Rules:
 * - Filter to USER role only
 * - Sort by tier first (checklist-driven), then by checklist flag count, then by score (numeric fallback)
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

  // Phase 3: Create lookup maps for tier, rarity, and checklist flags
  // rewardMsg.index is the sequential index in USER-only array (0, 1, 2...)
  const rarityMap = new Map<number, string | null>();
  const tierMap = new Map<number, 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | undefined>();
  
  if (rewardsMessages.length > 0 && userMessages.length > 0) {
    for (const rewardMsg of rewardsMessages) {
      if (
        typeof rewardMsg.index === 'number' &&
        rewardMsg.index >= 0 &&
        rewardMsg.index < userMessages.length
      ) {
        const userMsg = userMessages[rewardMsg.index];
        if (userMsg) {
          // Map rarity
          if (typeof rewardMsg.rarity === 'string' && rewardMsg.rarity.length > 0) {
            rarityMap.set(userMsg.turnIndex, rewardMsg.rarity);
          }
          // Phase 3: Derive tier from rarity (backend may provide tier directly in future)
          if (rewardMsg.rarity) {
            const tier = rewardMsg.rarity === 'S+' ? 'S+' :
                        rewardMsg.rarity === 'S' ? 'S' :
                        rewardMsg.rarity === 'A' ? 'A' :
                        rewardMsg.rarity === 'B' ? 'B' :
                        rewardMsg.rarity === 'C' ? 'C' : 'D' as 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
            tierMap.set(userMsg.turnIndex, tier);
          }
        }
      }
    }
  }

  // Phase 3: Separate scored messages with tier/checklist info
  type ScoredMessage = {
    msg: SessionDTO['messages'][0];
    score: number;
    tier?: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
    checklistFlags?: string[];
  };
  const scored: ScoredMessage[] = [];
  const unscored: SessionDTO['messages'] = [];

  for (const msg of userMessages) {
    if (msg.score !== null && typeof msg.score === 'number' && msg.score >= 0 && msg.score <= 100) {
      const tier = tierMap.get(msg.turnIndex);
      // Phase 3: For now, checklist flags would come from session.checklist.lastMessageFlags
      // But we need per-message flags, which backend may not expose yet. Keep empty for now.
      scored.push({
        msg,
        score: msg.score,
        tier,
        checklistFlags: undefined, // TODO: Extract from session data when available
      });
    } else {
      unscored.push(msg);
    }
  }

  // Phase 3: Sort by tier first, then by flag count, then by score
  const tierOrder: Record<string, number> = { 'S+': 5, 'S': 4, 'A': 3, 'B': 2, 'C': 1, 'D': 0 };
  
  const sortedTop = [...scored].sort((a, b) => {
    // Primary: tier (higher is better)
    const tierA = tierOrder[a.tier || 'D'] ?? 0;
    const tierB = tierOrder[b.tier || 'D'] ?? 0;
    if (tierB !== tierA) return tierB - tierA;
    
    // Secondary: checklist flag count (more flags is better)
    const flagsA = a.checklistFlags?.length ?? 0;
    const flagsB = b.checklistFlags?.length ?? 0;
    if (flagsB !== flagsA) return flagsB - flagsA;
    
    // Tertiary: numeric score (fallback)
    return b.score - a.score;
  });
  
  const sortedBottom = [...scored].sort((a, b) => {
    // Primary: tier (lower is worse)
    const tierA = tierOrder[a.tier || 'D'] ?? 0;
    const tierB = tierOrder[b.tier || 'D'] ?? 0;
    if (tierA !== tierB) return tierA - tierB;
    
    // Secondary: checklist flag count (fewer flags is worse)
    const flagsA = a.checklistFlags?.length ?? 0;
    const flagsB = b.checklistFlags?.length ?? 0;
    if (flagsA !== flagsB) return flagsA - flagsB;
    
    // Tertiary: numeric score (fallback)
    return a.score - b.score;
  });

  // Build highlights with tier and rarity
  const top: MessageHighlight[] = sortedTop.slice(0, 3).map(({ msg, tier }) => {
    const mappedRarity = rarityMap.get(msg.turnIndex);
    return {
      turnIndex: msg.turnIndex,
      content: msg.content,
      score: msg.score!,
      rarity: mappedRarity ?? null,
      tier, // Phase 3: Include tier
      checklistFlags: undefined, // TODO: Populate when available
    };
  });

  const bottom: MessageHighlight[] = sortedBottom.slice(0, 3).map(({ msg, tier }) => {
    const mappedRarity = rarityMap.get(msg.turnIndex);
    return {
      turnIndex: msg.turnIndex,
      content: msg.content,
      score: msg.score!,
      rarity: mappedRarity ?? null,
      tier, // Phase 3: Include tier
      checklistFlags: undefined, // TODO: Populate when available
    };
  });

  return { top, bottom };
}

/**
 * Phase 3: Compute mood teaser from session data (checklist-driven)
 */
function computeMoodTeaser(session: SessionDTO): MoodTeaser | null {
  const avgScore = session.missionState.averageScore; // @deprecated - legacy
  const status = session.missionState.status;
  const checklist = session.checklist;

  // Phase 3: Extract checklist metrics if available
  let positiveHooks: number | undefined;
  let objectiveProgress: number | undefined;
  let boundarySafeRate: number | undefined;
  let momentumMaintainedRate: number | undefined;

  if (checklist) {
    positiveHooks = checklist.positiveHookCount;
    objectiveProgress = checklist.objectiveProgressCount;
    const totalMessages = session.missionState.totalMessages || 1;
    // Compute rates as percentages
    boundarySafeRate = totalMessages > 0 
      ? Math.round((checklist.boundarySafeStreak / totalMessages) * 100)
      : 0;
    momentumMaintainedRate = totalMessages > 0
      ? Math.round((checklist.momentumStreak / totalMessages) * 100)
      : 0;
  }

  return {
    averageScore: avgScore, // @deprecated - kept for backward compatibility
    positiveHooks,
    objectiveProgress,
    boundarySafeRate,
    momentumMaintainedRate,
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

  // Phase 3: Build tier map for referenced messages
  const tierMapForRefs = new Map<number, 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | undefined>();
  if (rewardsMessages.length > 0 && userMessages.length > 0) {
    for (const rewardMsg of rewardsMessages) {
      if (
        typeof rewardMsg.index === 'number' &&
        rewardMsg.index >= 0 &&
        rewardMsg.index < userMessages.length &&
        rewardMsg.rarity
      ) {
        const userMsg = userMessages[rewardMsg.index];
        if (userMsg) {
          const tier = rewardMsg.rarity === 'S+' ? 'S+' :
                      rewardMsg.rarity === 'S' ? 'S' :
                      rewardMsg.rarity === 'A' ? 'A' :
                      rewardMsg.rarity === 'B' ? 'B' :
                      rewardMsg.rarity === 'C' ? 'C' : 'D' as 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
          tierMapForRefs.set(userMsg.turnIndex, tier);
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
          tier: tierMapForRefs.get(userMsg.turnIndex), // Phase 3: Include tier
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

  // Phase 3: Extract checklist aggregates if available
  const checklist = session.checklist;
  let checklistAggregates: MissionEndSelectedPack['checklist'] | undefined = undefined;
  if (checklist) {
    const totalMessages = session.missionState.totalMessages || 1;
    checklistAggregates = {
      positiveHookCount: checklist.positiveHookCount,
      objectiveProgressCount: checklist.objectiveProgressCount,
      boundarySafeStreak: checklist.boundarySafeStreak,
      momentumStreak: checklist.momentumStreak,
      totalMessages,
      boundarySafeRate: totalMessages > 0 
        ? Math.round((checklist.boundarySafeStreak / totalMessages) * 100)
        : 0,
      momentumMaintainedRate: totalMessages > 0
        ? Math.round((checklist.momentumStreak / totalMessages) * 100)
        : 0,
    };
  }

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
      score: session.rewards.score, // @deprecated - legacy
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
    checklist: checklistAggregates, // Phase 3: Add checklist aggregates
    synergyTeaserLocked: true, // Always locked for Step 5.3
    reservedBadgeSlotData: {
      status: 'placeholder',
    },
  };
}

