// backend/src/modules/insights/insights.service.ts
// Phase 1: Deep Insights Engine v1

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { ChatMessage, MessageRole, MissionStatus } from '@prisma/client';
import {
  MissionDeepInsightsPayload,
  InsightMessageHighlight,
  SessionTraitProfile,
  SessionLabels,
  NarrativeInsights,
} from './insights.types';
import { MessageEvaluation, AiSessionResult } from '../ai/ai-scoring.types';
import {
  getUserMessages,
  computeMessageIndex,
  extractTraitsSnapshot,
  scoreToRarityTier,
  rarityTierValue,
} from './insights.utils';
import {
  computeTraitProfile,
  computeRarityStats,
  computeImprovementTrend,
  computeConsistencyScore,
} from './insights.aggregators';
import { generateSessionLabels } from './insights.labels';
import { generateNarrativeInsights } from './insights.narrative';
import { normalizeTraitData } from '../shared/normalizers/chat-message.normalizer';
import { buildInsightsV2 } from './engine/insights.engine';
import { loadSessionAnalyticsSnapshot } from '../shared/helpers/session-snapshot.helper';
import { MissionDeepInsightsPayload } from './insights.types';

const logger = new Logger('InsightsService');

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * High-level entry point: build and persist Deep Insights for a session
   * Called after session is finalized (SUCCESS/FAIL/ABORTED)
   * 
   * Step 5.2: Now builds both v1 and v2 insights
   */
  async buildAndPersistForSession(sessionId: string): Promise<void> {
    try {
      // Build v1 payload (existing logic)
      const v1Payload = await this.buildPayloadForSession(sessionId);

      // Step 5.2: Build v2 payload (try/catch to ensure v1 still persists if v2 fails)
      let v2Payload = null;
      try {
        // Load snapshot for v2 engine
        const snapshot = await loadSessionAnalyticsSnapshot(this.prisma, sessionId);
        
        // Build v2 insights
        v2Payload = await buildInsightsV2(
          this.prisma,
          snapshot.userId,
          sessionId,
          snapshot,
        );

        logger.debug(`Built insights v2 for session ${sessionId}`);
      } catch (v2Error: any) {
        // Log but don't fail - v1 must still persist
        logger.warn(
          `Failed to build insights v2 for session ${sessionId}: ${v2Error.message}`,
          v2Error.stack,
        );
      }

      // Merge v1 and v2 payloads
      const mergedPayload: MissionDeepInsightsPayload = {
        ...v1Payload,
        insightsV2: v2Payload || undefined, // Only include if v2 was built successfully
      };

      // Persist merged payload
      await this.persistDeepInsights(mergedPayload);
    } catch (error) {
      // Don't throw - log error but don't fail session save
      logger.error(
        `Failed to build/persist Deep Insights for session ${sessionId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Build MissionDeepInsightsPayload from session data
   * Pure computation (no DB writes)
   */
  async buildPayloadForSession(
    sessionId: string,
  ): Promise<MissionDeepInsightsPayload> {
    // Load session with messages
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { turnIndex: 'asc' },
        },
      },
    });

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Check if session is finalized
    const isFinalized =
      session.status === MissionStatus.SUCCESS ||
      session.status === MissionStatus.FAIL ||
      session.status === MissionStatus.ABORTED;

    if (!isFinalized) {
      throw new Error(
        `Session ${sessionId} is not finalized (status: ${session.status})`,
      );
    }

    const messages = session.messages as ChatMessage[];
    const userMessages = getUserMessages(messages);

    if (userMessages.length === 0) {
      throw new Error(`Session ${sessionId} has no USER messages`);
    }

    // Fallback to aiCorePayload if traitData is missing
    let aiCoreResult: AiSessionResult | null = null;
    if (session.aiCorePayload && typeof session.aiCorePayload === 'object') {
      aiCoreResult = session.aiCorePayload as any as AiSessionResult;
    }

    // Ensure messages have traitData (fallback to aiCorePayload if needed)
    const enrichedMessages = this.enrichMessagesWithTraitData(
      messages,
      aiCoreResult,
    );

    // Build best/worst messages
    const bestMessages = this.buildBestMessages(enrichedMessages, userMessages);
    const worstMessages = this.buildWorstMessages(
      enrichedMessages,
      userMessages,
    );

    // Compute trait profile
    const traitProfile = computeTraitProfile(enrichedMessages);

    // Compute rarity stats
    const rarityStats = computeRarityStats(enrichedMessages);

    // Generate labels
    const labels = generateSessionLabels(
      traitProfile,
      [], // flags will be collected inside generateSessionLabels
      enrichedMessages,
      session.charismaIndex ?? null,
    );

    // Add improvement trend to labels if available
    const scores = userMessages
      .map((m) => m.score)
      .filter((s): s is number => typeof s === 'number' && s >= 0 && s <= 100);
    const improvementTrend = computeImprovementTrend(scores);
    if (improvementTrend === 'improving') {
      labels.secondaryLabels.push('improving_towards_end');
    } else if (improvementTrend === 'declining') {
      labels.secondaryLabels.push('declining_towards_end');
    }

    // Check if started weak
    if (scores.length >= 2) {
      const firstTwoAvg =
        scores.slice(0, 2).reduce((sum, s) => sum + s, 0) / 2;
      if (firstTwoAvg < 50) {
        labels.secondaryLabels.push('started_weak');
      }
    }

    // Generate narrative insights
    const narrativeInsights = generateNarrativeInsights(
      traitProfile,
      labels,
      bestMessages.length,
      worstMessages.length,
      improvementTrend,
    );

    // Compute computedFields
    const computedFields: MissionDeepInsightsPayload['computedFields'] = {
      overallCharismaIndex: session.charismaIndex ?? 0,
      improvementTrend,
      consistencyScore: computeConsistencyScore(scores),
    };

    // Build payload
    const createdAt = session.endedAt ?? session.createdAt;
    const payload: MissionDeepInsightsPayload = {
      sessionId: session.id,
      userId: session.userId,
      missionId: session.templateId ?? '', // Empty string for FREEPLAY (null → '')
      createdAt: createdAt.toISOString(),
      version: 'v1',
      bestMessages,
      worstMessages,
      traitProfile,
      labels,
      narrativeInsights,
      metaForHooks: {
        averageRarityTier: rarityStats.averageRarityTier,
        totalMessages: userMessages.length,
        rareTierCounts: rarityStats.rareTierCounts,
        highestStreakTier: rarityStats.highestStreakTier,
        lowestStreakTier: rarityStats.lowestStreakTier,
      },
      computedFields,
    };

    return payload;
  }

  /**
   * Persist Deep Insights payload to database
   */
  private async persistDeepInsights(
    payload: MissionDeepInsightsPayload,
  ): Promise<void> {
    // Extract denormalized fields
    const averageRarityTier = payload.metaForHooks.averageRarityTier;
    const primaryLabels = payload.labels.primaryLabels.slice(0, 5); // Limit to 5 for indexing
    const overallCharismaIndex = payload.computedFields?.overallCharismaIndex ?? null;

    // Upsert MissionDeepInsights record (idempotent)
    // Step 5.2: insightsJson now includes insightsV2 block if v2 was built
    await this.prisma.missionDeepInsights.upsert({
      where: { sessionId: payload.sessionId },
      create: {
        sessionId: payload.sessionId,
        userId: payload.userId,
        missionId: payload.missionId || null, // Empty string → null for FREEPLAY
        insightsJson: payload as any, // Contains both v1 and v2 data
        averageRarityTier,
        primaryLabels,
        overallCharismaIndex,
        version: payload.version, // Keep as "v1" for backward compatibility
      },
      update: {
        insightsJson: payload as any, // Update includes v2 if available
        averageRarityTier,
        primaryLabels,
        overallCharismaIndex,
        version: payload.version,
      },
    });
  }

  /**
   * Enrich messages with traitData, falling back to aiCorePayload if needed
   */
  private enrichMessagesWithTraitData(
    messages: ChatMessage[],
    aiCoreResult: AiSessionResult | null,
  ): ChatMessage[] {
    return messages.map((msg) => {
      // Check if traitData is missing or invalid
      const normalized = normalizeTraitData(msg.traitData);
      const hasValidTraits =
        normalized.traits &&
        typeof normalized.traits === 'object' &&
        Object.keys(normalized.traits).length > 0;

      if (!hasValidTraits && aiCoreResult && msg.role === MessageRole.USER) {
        // Fallback to aiCorePayload
        const userMessageIndex = messages
          .filter((m) => m.role === MessageRole.USER)
          .findIndex((m) => m.turnIndex <= msg.turnIndex);
        if (userMessageIndex >= 0 && aiCoreResult.messages[userMessageIndex]) {
          const aiMsg = aiCoreResult.messages[userMessageIndex];
          return {
            ...msg,
            traitData: {
              traits: aiMsg.traits,
              flags: aiMsg.flags || [],
              label: aiMsg.label || null,
              hooks: [], // Step 5.1: Ensure hooks/patterns arrays exist (fallback path doesn't have derivation)
              patterns: [],
            },
          };
        }
      }

      return msg;
    });
  }

  /**
   * Build top 3 best messages
   */
  private buildBestMessages(
    messages: ChatMessage[],
    userMessages: ChatMessage[],
  ): InsightMessageHighlight[] {
    // Sort by score DESC, then by rarity tier DESC, then by turnIndex ASC
    const sorted = [...userMessages].sort((a, b) => {
      const scoreA = typeof a.score === 'number' ? a.score : 0;
      const scoreB = typeof b.score === 'number' ? b.score : 0;

      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score first
      }

      // Tie-breaker: higher rarity tier first
      const tierA = scoreToRarityTier(scoreA);
      const tierB = scoreToRarityTier(scoreB);
      const tierDiff = rarityTierValue(tierB) - rarityTierValue(tierA);
      if (tierDiff !== 0) {
        return tierDiff;
      }

      // Final tie-breaker: earlier turnIndex first (first best message wins)
      return a.turnIndex - b.turnIndex;
    });

    return sorted.slice(0, 3).map((msg) => this.mapToInsightHighlight(msg, messages));
  }

  /**
   * Build bottom 3 worst messages
   */
  private buildWorstMessages(
    messages: ChatMessage[],
    userMessages: ChatMessage[],
  ): InsightMessageHighlight[] {
    // Sort by score ASC, then by turnIndex ASC (earliest worst message wins)
    const sorted = [...userMessages].sort((a, b) => {
      const scoreA = typeof a.score === 'number' ? a.score : 100;
      const scoreB = typeof b.score === 'number' ? b.score : 100;

      if (scoreA !== scoreB) {
        return scoreA - scoreB; // Lower score first
      }

      // Tie-breaker: earlier turnIndex first
      return a.turnIndex - b.turnIndex;
    });

    return sorted.slice(0, 3).map((msg) => this.mapToInsightHighlight(msg, messages));
  }

  /**
   * Map ChatMessage to InsightMessageHighlight
   */
  private mapToInsightHighlight(
    msg: ChatMessage,
    allMessages: ChatMessage[],
  ): InsightMessageHighlight {
    const userMessages = getUserMessages(allMessages);
    const messageIndex = computeMessageIndex(userMessages, msg.id);
    const score = typeof msg.score === 'number' && msg.score >= 0 && msg.score <= 100
      ? msg.score
      : 0;
    const rareTier = scoreToRarityTier(score);
    const traitsSnapshot = extractTraitsSnapshot(msg.traitData);

    // Default trait snapshot if missing
    const defaultSnapshot = {
      confidence: 0,
      clarity: 0,
      humor: 0,
      tensionControl: 0,
      emotionalWarmth: 0,
      dominance: 0,
    };

    const normalized = normalizeTraitData(msg.traitData);
    const flags = Array.isArray(normalized.flags) ? normalized.flags : [];
    const label = (normalized.label ||
      'neutral') as 'great' | 'good' | 'neutral' | 'weak' | 'cringe';

    return {
      messageId: msg.id,
      messageIndex,
      turnIndex: msg.turnIndex,
      text: typeof msg.content === 'string' ? msg.content : '',
      rareTier,
      score,
      traitsSnapshot: traitsSnapshot ?? defaultSnapshot,
      flags,
      label,
    };
  }

  /**
   * Step 5.2/5.3: Get insights for a session (public API endpoint)
   * Returns raw insightsJson which will be normalized by controller
   * 
   * @param sessionId - Session ID
   * @param userId - User ID (for ownership check)
   * @returns Raw insightsJson from MissionDeepInsights (may include v1 + v2)
   * @throws Error if session not found or ownership mismatch
   */
  async getSessionInsightsPublic(sessionId: string, userId: string): Promise<any> {
    // Load MissionDeepInsights (includes session relation for ownership check)
    const insights = await this.prisma.missionDeepInsights.findUnique({
      where: { sessionId },
      include: {
        session: {
          select: { userId: true },
        },
      },
    });

    if (!insights) {
      throw new Error(`Session ${sessionId} insights not found`);
    }

    // Ownership check
    if (insights.session.userId !== userId) {
      throw new Error(`Session ${sessionId} does not belong to user ${userId}`);
    }

    // Return raw insightsJson (controller will normalize)
    return insights.insightsJson;
  }
}

