// backend/src/modules/rotation/rotation.service.ts
// Step 5.11: Rotation engine service - unified insight selection with cooldowns, quotas, and persistence

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { InsightsService } from '../insights/insights.service';
import { MoodService } from '../mood/mood.service';
import { SynergyService } from '../synergy/synergy.service';
import { AnalyzerService } from '../analyzer/analyzer.service';
import { StatsService } from '../stats/stats.service';
import {
  CandidateInsight,
  InsightCard,
  InsightKind,
  InsightSource,
} from '../insights/insights.types';
import { DeepParagraphDTO } from '../analyzer/analyzer.types';
import { loadUnifiedInsightHistory, UnifiedInsightHistory } from './rotation.history';
import { RotationSurface, RotationQuotas, RotationPackResponse } from './rotation.types';
import { getQuotasForSurface } from './rotation.policy';
import { generateInsightsV2Seed } from '../insights/engine/insight-prng';
import { loadSessionAnalyticsSnapshot } from '../shared/helpers/session-snapshot.helper';
import { isPremiumTier } from '../shared/helpers/premium.helper';

const logger = new Logger('RotationService');

@Injectable()
export class RotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insightsService: InsightsService,
    private readonly moodService: MoodService,
    private readonly synergyService: SynergyService,
    private readonly analyzerService: AnalyzerService,
    private readonly statsService: StatsService,
  ) {}

  /**
   * Step 5.11: Collect all candidates from all insight sources
   * 
   * @param userId - User ID
   * @param sessionId - Session ID
   * @returns Flat array of all CandidateInsight objects
   */
  async collectAllCandidates(
    userId: string,
    sessionId: string,
  ): Promise<CandidateInsight[]> {
    const candidates: CandidateInsight[] = [];

    try {
      // 1. Load insights candidates (gates, hooks, patterns, tips)
      const deepInsights = await this.insightsService.getCandidatesForRotation(sessionId);
      candidates.push(...deepInsights);
    } catch (err: any) {
      logger.warn(`Failed to load insights candidates for ${sessionId}: ${err.message}`);
    }

    try {
      // 2. Load mood timeline and candidates
      const moodTimeline = await this.moodService.buildTimelineForSession(sessionId);
      const moodCandidates = await this.moodService.getMoodCandidatesForRotation(moodTimeline);
      candidates.push(...moodCandidates);
    } catch (err: any) {
      logger.warn(`Failed to load mood candidates for ${sessionId}: ${err.message}`);
    }

    try {
      // 3. Load synergy candidates
      const synergyRow = await this.prisma.sessionTraitSynergy.findUnique({
        where: { sessionId },
        select: { synergyJson: true },
      });
      if (synergyRow) {
        const synergyCandidates = await this.synergyService.getSynergyCandidatesForRotation(
          synergyRow.synergyJson as any,
        );
        candidates.push(...synergyCandidates);
      }
    } catch (err: any) {
      logger.warn(`Failed to load synergy candidates for ${sessionId}: ${err.message}`);
    }

    try {
      // 4. Load analyzer paragraph candidates
      const hallOfFameMessage = await this.prisma.hallOfFameMessage.findFirst({
        where: { sessionId },
        include: {
          message: true,
        },
      });
      if (hallOfFameMessage && hallOfFameMessage.message) {
        const breakdown = this.statsService.buildMessageBreakdown(hallOfFameMessage.message);
        const analyzerCandidates = await this.analyzerService.getParagraphCandidatesForRotation(
          breakdown,
        );
        candidates.push(...analyzerCandidates);
      }
    } catch (err: any) {
      logger.warn(`Failed to load analyzer candidates for ${sessionId}: ${err.message}`);
    }

    return candidates;
  }

  /**
   * Step 5.11: Load unified insight history
   * 
   * @param userId - User ID
   * @param sessionId - Session ID
   * @returns UnifiedInsightHistory
   */
  async loadHistory(
    userId: string,
    sessionId: string,
  ): Promise<UnifiedInsightHistory> {
    return loadUnifiedInsightHistory(this.prisma, userId, sessionId);
  }

  /**
   * Step 5.11: Apply cooldown filtering
   * Excludes candidates whose IDs appear in history
   * 
   * @param candidates - Candidate insights
   * @param history - Unified insight history
   * @returns Filtered candidates
   */
  applyCooldown(
    candidates: CandidateInsight[],
    history: UnifiedInsightHistory,
  ): CandidateInsight[] {
    // Build exclusion set from all history sources
    const excludedIds = new Set<string>([
      ...history.insightIds,
      ...history.moodIds,
      ...history.paragraphIds,
      ...history.synergyIds,
    ]);

    // Filter out excluded candidates
    return candidates.filter((candidate) => {
      // Allow override if cooldown is explicitly 0 (future feature)
      // For now, exclude if ID is in history
      return !excludedIds.has(candidate.id);
    });
  }

  /**
   * Step 5.11: Filter candidates by surface
   * 
   * @param candidates - Candidate insights
   * @param surface - Target surface
   * @returns Filtered candidates
   */
  filterBySurface(
    candidates: CandidateInsight[],
    surface: RotationSurface,
  ): CandidateInsight[] {
    return candidates.filter((candidate) => {
      // If surfaces is undefined or empty, allow all surfaces
      if (!candidate.surfaces || candidate.surfaces.length === 0) {
        return true;
      }
      return candidate.surfaces.includes(surface);
    });
  }

  /**
   * Step 5.11: Filter premium candidates based on user tier
   * 
   * @param candidates - Candidate insights
   * @param isPremium - Whether user has premium access
   * @returns Filtered candidates
   */
  filterPremium(candidates: CandidateInsight[], isPremium: boolean): CandidateInsight[] {
    if (isPremium) {
      return candidates; // Premium users see all insights
    }
    // Free users: exclude premium insights
    return candidates.filter((candidate) => !candidate.isPremium);
  }

  /**
   * Step 5.11: Apply quotas per surface
   * Groups by source, sorts by priority/weight/id, and enforces quotas
   * 
   * @param candidates - Candidate insights
   * @param surface - Target surface
   * @returns Selected candidates within quotas
   */
  applyQuotas(
    candidates: CandidateInsight[],
    surface: RotationSurface,
  ): CandidateInsight[] {
    const quotas = getQuotasForSurface(surface);

    // Group candidates by source
    const bySource: Record<InsightSource, CandidateInsight[]> = {
      GATES: [],
      HOOKS: [],
      PATTERNS: [],
      GENERAL: [],
      MOOD: [],
      SYNERGY: [],
      ANALYZER: [],
    };

    for (const candidate of candidates) {
      bySource[candidate.source]?.push(candidate);
    }

    // Sort each group: priority DESC → weight DESC → id ASC (deterministic)
    for (const source in bySource) {
      bySource[source as InsightSource].sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        if (a.weight !== b.weight) return b.weight - a.weight;
        return a.id.localeCompare(b.id);
      });
    }

    // Select candidates within quotas
    const selected: CandidateInsight[] = [];
    const selectedIds = new Set<string>();

    // Map source to quota field
    const sourceToQuota: Record<InsightSource, keyof RotationQuotas> = {
      GATES: 'gate',
      HOOKS: 'hook',
      PATTERNS: 'pattern',
      GENERAL: 'tip',
      MOOD: 'mood',
      SYNERGY: 'synergy',
      ANALYZER: 'analyzer',
    };

    // Select from each source group
    for (const source in bySource) {
      const sourceKey = source as InsightSource;
      const quotaKey = sourceToQuota[sourceKey];
      const quota = quotas[quotaKey] ?? 0;
      const group = bySource[sourceKey];

      // Take top N candidates from this group
      for (let i = 0; i < Math.min(quota, group.length); i++) {
        const candidate = group[i];
        if (!selectedIds.has(candidate.id)) {
          selected.push(candidate);
          selectedIds.add(candidate.id);
        }
      }
    }

    return selected;
  }

  /**
   * Step 5.12: Select base rotation pack (without premium filtering)
   * This is the "unfiltered" pack that gets persisted to DB
   * 
   * @param candidates - All candidate insights
   * @param history - Unified insight history
   * @param surface - Target surface
   * @param seed - Deterministic seed
   * @returns RotationPackResponse (base pack, includes premium insights)
   */
  selectBaseRotationPack(
    candidates: CandidateInsight[],
    history: UnifiedInsightHistory,
    surface: RotationSurface,
    seed: string,
  ): RotationPackResponse {
    // Step 1: Apply cooldown
    let filtered = this.applyCooldown(candidates, history);

    // Step 2: Filter by surface
    filtered = this.filterBySurface(filtered, surface);

    // Step 3: NO premium filtering - this is the base pack

    // Step 4: Sort deterministically: priority DESC → weight DESC → id ASC
    filtered.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      if (a.weight !== b.weight) return b.weight - a.weight;
      return a.id.localeCompare(b.id);
    });

    // Step 5: Apply quotas
    const selected = this.applyQuotas(filtered, surface);

    // Step 6: Convert to InsightCard format
    const selectedInsights: InsightCard[] = selected
      .filter((c) => c.kind !== 'ANALYZER_PARAGRAPH')
      .map((c) => ({
        id: c.id,
        kind: c.kind,
        category: c.category,
        title: c.title || this.getTitleForCandidate(c),
        body: c.body || this.getBodyForCandidate(c),
        relatedTurnIndex: c.relatedTurnIndex,
        isPremium: c.isPremium,
      }));

    // Step 7: Extract analyzer paragraphs separately (if ANALYZER surface)
    let selectedParagraphs: DeepParagraphDTO[] | undefined = undefined;
    if (surface === 'ANALYZER') {
      // For analyzer paragraphs, we need to reconstruct them from candidates
      // This is a simplified version - in practice, you'd load the actual paragraphs
      selectedParagraphs = [];
    }

    // Step 8: Build excluded IDs list
    const excludedIds = [
      ...history.insightIds,
      ...history.moodIds,
      ...history.paragraphIds,
      ...history.synergyIds,
    ];

    // Step 9: Build picked IDs (all selected insights, including premium)
    const pickedIds = selected.map((c) => c.id);

    // Step 10: Get quotas
    const quotas = getQuotasForSurface(surface);

    // Step 11: Calculate premium metadata for base pack
    const premiumInsightIds = selected.filter((c) => c.isPremium).map((c) => c.id);

    return {
      sessionId: '', // Will be set by caller
      surface,
      selectedInsights,
      selectedParagraphs,
      meta: {
        seed,
        excludedIds,
        pickedIds, // Base pack: all selected insights (premium + free)
        quotas,
        version: 'v1',
        totalAvailable: selectedInsights.length,
        filteredBecausePremium: 0, // Base pack has no filtering
        isPremiumUser: false, // Will be set on read
        premiumInsightIds,
      },
    };
  }

  /**
   * Step 5.11: Select rotation pack for a surface (with premium filtering)
   * Applies all filters including premium, returns formatted pack
   * 
   * @param candidates - All candidate insights
   * @param history - Unified insight history
   * @param surface - Target surface
   * @param seed - Deterministic seed
   * @param isPremium - Whether user has premium access
   * @returns RotationPackResponse
   */
  selectRotationPack(
    candidates: CandidateInsight[],
    history: UnifiedInsightHistory,
    surface: RotationSurface,
    seed: string,
    isPremium: boolean,
  ): RotationPackResponse {
    // Step 1: Apply cooldown
    let filtered = this.applyCooldown(candidates, history);

    // Step 2: Filter by surface
    filtered = this.filterBySurface(filtered, surface);

    // Step 3: Filter premium
    filtered = this.filterPremium(filtered, isPremium);

    // Step 4: Sort deterministically: priority DESC → weight DESC → id ASC
    filtered.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      if (a.weight !== b.weight) return b.weight - a.weight;
      return a.id.localeCompare(b.id);
    });

    // Step 5: Apply quotas
    const selected = this.applyQuotas(filtered, surface);

    // Step 6: Convert to InsightCard format
    const selectedInsights: InsightCard[] = selected
      .filter((c) => c.kind !== 'ANALYZER_PARAGRAPH')
      .map((c) => ({
        id: c.id,
        kind: c.kind,
        category: c.category,
        title: c.title || this.getTitleForCandidate(c), // Use stored title or generate
        body: c.body || this.getBodyForCandidate(c), // Use stored body or generate
        relatedTurnIndex: c.relatedTurnIndex,
        isPremium: c.isPremium,
      }));

    // Step 7: Extract analyzer paragraphs separately (if ANALYZER surface)
    let selectedParagraphs: DeepParagraphDTO[] | undefined = undefined;
    if (surface === 'ANALYZER') {
      // For analyzer paragraphs, we need to reconstruct them from candidates
      // This is a simplified version - in practice, you'd load the actual paragraphs
      selectedParagraphs = [];
    }

    // Step 8: Build excluded IDs list
    const excludedIds = [
      ...history.insightIds,
      ...history.moodIds,
      ...history.paragraphIds,
      ...history.synergyIds,
    ];

    // Step 9: Build picked IDs
    const pickedIds = selected.map((c) => c.id);

    // Step 10: Get quotas
    const quotas = getQuotasForSurface(surface);

    return {
      sessionId: '', // Will be set by caller
      surface,
      selectedInsights,
      selectedParagraphs,
      meta: {
        seed,
        excludedIds,
        pickedIds,
        quotas,
        version: 'v1',
      },
    };
  }

  /**
   * Helper: Get title for candidate
   * In a full implementation, this would load from catalog or use candidate data
   */
  private getTitleForCandidate(candidate: CandidateInsight): string {
    // For now, generate a simple title from ID
    // In production, you'd load from insight catalog or store in candidate
    return candidate.id.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Helper: Get body for candidate
   * In a full implementation, this would load from catalog or use candidate data
   */
  private getBodyForCandidate(candidate: CandidateInsight): string {
    // For now, generate a simple body
    // In production, you'd load from insight catalog or store in candidate
    return `Insight about ${candidate.category}`;
  }

  /**
   * Step 5.12: Build and persist base rotation pack (without premium filtering)
   * The base pack is persisted to DB and premium filtering happens on read
   * 
   * @param userId - User ID
   * @param sessionId - Session ID
   * @param surface - Target surface
   * @returns RotationPackResponse (base pack, unfiltered)
   */
  async buildAndPersistRotationPack(
    userId: string,
    sessionId: string,
    surface: RotationSurface,
  ): Promise<RotationPackResponse> {
    // Step 1: Load candidates
    const allCandidates = await this.collectAllCandidates(userId, sessionId);

    // Step 2: Load history
    const history = await this.loadHistory(userId, sessionId);

    // Step 3: Generate seed
    const seed = generateInsightsV2Seed(userId, sessionId, `rotation_${surface}`);

    // Step 4: Select base pack (NO premium filtering)
    const pack = this.selectBaseRotationPack(allCandidates, history, surface, seed);
    pack.sessionId = sessionId;

    // Step 5: Persist base pack in MissionDeepInsights.insightsJson.rotationPacks
    const insights = await this.prisma.missionDeepInsights.findUnique({
      where: { sessionId },
      select: { insightsJson: true },
    });

    if (insights) {
      const insightsJson = insights.insightsJson as any;
      if (!insightsJson.rotationPacks) {
        insightsJson.rotationPacks = {};
      }
      insightsJson.rotationPacks[surface] = pack;

      await this.prisma.missionDeepInsights.update({
        where: { sessionId },
        data: {
          insightsJson: insightsJson,
        },
      });
    } else {
      logger.warn(`MissionDeepInsights not found for session ${sessionId}, cannot persist rotation pack`);
    }

    return pack;
  }

  /**
   * Step 5.12: Get rotation pack for surface with premium filtering on read
   * Loads base pack (unfiltered) and applies premium filtering based on current user tier
   * 
   * @param userId - User ID
   * @param sessionId - Session ID
   * @param surface - Target surface
   * @returns RotationPackResponse (filtered for current premium status)
   */
  async getRotationPackForSurface(
    userId: string,
    sessionId: string,
    surface: RotationSurface,
  ): Promise<RotationPackResponse> {
    // Step 1: Try to load saved base pack
    const insights = await this.prisma.missionDeepInsights.findUnique({
      where: { sessionId },
      select: {
        insightsJson: true,
        session: {
          select: { userId: true },
        },
      },
    });

    // Ownership check
    if (!insights) {
      // If insights record doesn't exist, try to build pack anyway (might work if session exists)
      try {
        return await this.buildAndPersistRotationPack(userId, sessionId, surface);
      } catch (err: any) {
        // If building fails, return null (controller will handle as empty pack)
        logger.warn(`[RotationService] Cannot build pack for ${sessionId}: ${err.message}`);
        return null as any; // Return null, controller will convert to empty pack
      }
    }
    if (insights.session.userId !== userId) {
      throw new Error(`Session ${sessionId} does not belong to user ${userId}`);
    }

    const insightsJson = insights.insightsJson as any;
    let basePack: RotationPackResponse | null = insightsJson?.rotationPacks?.[surface] || null;

    // Step 2: If no saved pack, build and persist base pack
    if (!basePack) {
      try {
        basePack = await this.buildAndPersistRotationPack(userId, sessionId, surface);
      } catch (err: any) {
        // If building fails, return null (controller will handle as empty pack)
        logger.warn(`[RotationService] Cannot build pack for ${sessionId}: ${err.message}`);
        return null as any; // Return null, controller will convert to empty pack
      }
    }

    // Step 3: Filter pack by premium status
    return this.filterPackByPremium(basePack, userId);
  }

  /**
   * Helper: Filter rotation pack by premium status
   */
  private async filterPackByPremium(
    basePack: RotationPackResponse,
    userId: string,
  ): Promise<RotationPackResponse> {
    // Load current premium status
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });
    const isPremiumUser = isPremiumTier(user?.tier);

    // Compute visible insights based on premium status
    const allInsights = basePack.selectedInsights ?? [];
    const premiumInsights = allInsights.filter((i) => i.isPremium);
    const freeInsights = allInsights.filter((i) => !i.isPremium);
    const visibleInsights = isPremiumUser ? allInsights : freeInsights;

    // Calculate premium metadata
    const totalAvailable = allInsights.length;
    const filteredBecausePremium = totalAvailable - visibleInsights.length;
    const premiumInsightIds = premiumInsights.map((i) => i.id);

    // Build new meta object preserving base fields but updating premium-aware fields
    const baseMeta = basePack.meta ?? {};
    const meta: RotationPackResponse['meta'] = {
      ...baseMeta,
      // Core fields preserved as-is
      seed: baseMeta.seed,
      excludedIds: baseMeta.excludedIds ?? [],
      quotas: baseMeta.quotas,
      version: baseMeta.version ?? 'v1',
      // Premium-aware fields
      totalAvailable,
      isPremiumUser,
      filteredBecausePremium,
      premiumInsightIds: isPremiumUser ? [] : premiumInsightIds, // Only include if filtered
      // pickedIds should always represent what THIS user sees
      pickedIds: visibleInsights.map((i) => i.id),
    };

    // Return filtered pack (do not mutate base pack)
    return {
      ...basePack,
      selectedInsights: visibleInsights,
      meta,
    };
  }

  /**
   * Step 5.11: Debug endpoint helper
   * Returns detailed rotation state for debugging
   * 
   * @param userId - User ID
   * @param sessionId - Session ID
   * @param surface - Target surface
   * @returns Debug information
   */
  async debugRotation(
    userId: string,
    sessionId: string,
    surface: RotationSurface,
  ): Promise<any> {
    const allCandidates = await this.collectAllCandidates(userId, sessionId);
    const history = await this.loadHistory(userId, sessionId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });
    const isPremium = isPremiumTier(user?.tier);
    const seed = generateInsightsV2Seed(userId, sessionId, `rotation_${surface}`);

    const afterCooldown = this.applyCooldown(allCandidates, history);
    const afterSurface = this.filterBySurface(afterCooldown, surface);
    const afterPremium = this.filterPremium(afterSurface, isPremium);
    const selected = this.applyQuotas(afterPremium, surface);

    return {
      allCandidates: allCandidates.length,
      history: {
        insightIds: history.insightIds.length,
        moodIds: history.moodIds.length,
        paragraphIds: history.paragraphIds.length,
        synergyIds: history.synergyIds.length,
      },
      filteredCandidates: {
        afterCooldown: afterCooldown.length,
        afterSurface: afterSurface.length,
        afterPremium: afterPremium.length,
        selected: selected.length,
      },
      selected: selected.map((c) => ({
        id: c.id,
        source: c.source,
        kind: c.kind,
        priority: c.priority,
        weight: c.weight,
      })),
      seed,
      isPremium,
      surface,
    };
  }
}

