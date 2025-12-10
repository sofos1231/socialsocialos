// FILE: backend/src/modules/stats/stats.controller.ts

import { Controller, Get, Query, Req, UseGuards, Param } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EntitlementsService, FeatureKey } from '../entitlements/entitlements.service';
import { LockedResponse } from '../shared/types/locked-response.type';
import { PrismaService } from '../../db/prisma.service';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly entitlementsService: EntitlementsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    return this.statsService.getDashboardForUser(String(userId));
  }

  @Get('badges')
  async getBadges(@Req() req: any) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    return this.statsService.getBadgesForUser(String(userId));
  }

  @Get('traits/summary')
  async getTraitsSummary(@Req() req: any) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    return this.statsService.getTraitsSummaryForUser(String(userId));
  }

  @Get('traits/history')
  async getTraitHistory(@Req() req: any, @Query('limit') limit?: string) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.statsService.getTraitHistoryForUser(String(userId), limitNum);
  }

  @Get('summary')
  async getStatsSummary(@Req() req: any) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    return this.statsService.getStatsSummaryForUser(String(userId));
  }

  /**
   * Step 5.12: Get advanced metrics (Premium feature with LockedResponse)
   * Returns all 7 systems: message evolution, radar360, persona sensitivity, etc.
   */
  @Get('advanced')
  async getAdvancedMetrics(@Req() req: any): Promise<LockedResponse<any>> {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    
    // Get user and entitlements
    const user = await this.prisma.user.findUnique({
      where: { id: String(userId) },
      select: { tier: true },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const entitlements = this.entitlementsService.getEntitlements(user);
    const fullData = await this.statsService.getAdvancedMetricsForUser(String(userId));
    
    if (!entitlements.features[FeatureKey.ADVANCED_METRICS]) {
      // Build preview (simplified version)
      const preview = {
        isPremium: false,
        messageEvolution: {
          points: fullData.messageEvolution.points.slice(0, 3), // First 3 points only
        },
        radar360: {
          current: fullData.radar360.current,
          deltasVsLast3: {},
          microInsights: [],
        },
        personaSensitivity: {
          rows: fullData.personaSensitivity.rows.slice(0, 2), // First 2 personas
        },
        trendingTraitsHeatmap: {
          weeks: fullData.trendingTraitsHeatmap.weeks.slice(0, 2), // First 2 weeks
        },
        behavioralBiasTracker: {
          items: fullData.behavioralBiasTracker.items.slice(0, 2), // First 2 biases
        },
        signatureStyleCard: fullData.signatureStyleCard,
        hallOfFame: {
          messages: fullData.hallOfFame.messages.slice(0, 2), // First 2 messages
        },
      };
      
      return {
        locked: true,
        featureKey: FeatureKey.ADVANCED_METRICS,
        preview,
        upsell: {
          title: 'Unlock Advanced Metrics',
          body: 'See deep conversation patterns across all 7 systems: message evolution, persona insights, behavioral patterns, and more.',
          ctaLabel: 'Unlock Premium',
        },
      };
    }
    
    return {
      locked: false,
      featureKey: FeatureKey.ADVANCED_METRICS,
      full: fullData,
    };
  }

  /**
   * Step 5.12: Get trait synergy map (Premium feature with LockedResponse)
   * Returns correlation matrix and graph data for trait relationships
   */
  @Get('synergy')
  async getSynergy(@Req() req: any): Promise<LockedResponse<any>> {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    
    // Get user and entitlements
    const user = await this.prisma.user.findUnique({
      where: { id: String(userId) },
      select: { tier: true },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const entitlements = this.entitlementsService.getEntitlements(user);
    const fullData = await this.statsService.getSynergyForUser(String(userId));
    
    if (!entitlements.features[FeatureKey.SYNERGY_MAP]) {
      // Build preview (simplified version)
      const preview = {
        nodes: fullData.nodes.slice(0, 3), // First 3 nodes
        edges: fullData.edges.slice(0, 2), // First 2 edges
        correlationMatrix: {}, // Empty matrix for preview
      };
      
      return {
        locked: true,
        featureKey: FeatureKey.SYNERGY_MAP,
        preview,
        upsell: {
          title: 'Unlock Synergy Map',
          body: 'See how your traits interact and influence each other with a full correlation analysis.',
          ctaLabel: 'Unlock Premium',
        },
      };
    }
    
    return {
      locked: false,
      featureKey: FeatureKey.SYNERGY_MAP,
      full: fullData,
    };
  }

  /**
   * Step 5.12: Get mood timeline for a session (Premium feature with LockedResponse)
   */
  @Get('mood/session/:sessionId')
  async getMoodTimeline(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
  ): Promise<LockedResponse<any>> {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    
    // Get user and entitlements
    const user = await this.prisma.user.findUnique({
      where: { id: String(userId) },
      select: { tier: true },
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const entitlements = this.entitlementsService.getEntitlements(user);
    const fullData = await this.statsService.getMoodTimelineForSession(String(userId), sessionId);
    
    // If there is no data, fabricate an empty-but-valid structure
    const emptyData: any = fullData ?? {
      sessionId,
      payload: {
        version: 1,
        snapshots: [],
        current: { moodState: 'NEUTRAL', moodPercent: 50 },
      },
      current: { moodState: 'NEUTRAL', moodPercent: 50 },
      insights: [],
    };
    
    if (!entitlements.features[FeatureKey.MOOD_TIMELINE_FULL]) {
      // Build preview (simplified version - just current mood state)
      const preview = {
        sessionId: emptyData.sessionId,
        payload: {
          version: emptyData.payload.version,
          snapshots: [], // No snapshots in preview
          current: emptyData.current,
        },
        current: emptyData.current,
        insights: [], // No insights in preview
      };
      
      return {
        locked: true,
        featureKey: FeatureKey.MOOD_TIMELINE_FULL,
        preview,
        upsell: {
          title: 'Unlock Mood Timeline',
          body: 'See your emotional journey throughout the session with detailed mood tracking and insights.',
          ctaLabel: 'Unlock Premium',
        },
      };
    }
    
    return {
      locked: false,
      featureKey: FeatureKey.MOOD_TIMELINE_FULL,
      full: emptyData,
    };
  }
}
