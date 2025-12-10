// backend/src/modules/analyzer/analyzer.controller.ts
// Step 5.7: Analyzer controller

import { Controller, Get, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyzerService } from './analyzer.service';
import { EntitlementsService, FeatureKey } from '../entitlements/entitlements.service';
import { LockedResponse } from '../shared/types/locked-response.type';
import { PrismaService } from '../../db/prisma.service';
import {
  AnalyzerListsResponse,
  AnalyzeMessageResponse,
  BurnMessageRequest,
} from './analyzer.types';

@Controller('analyzer')
@UseGuards(JwtAuthGuard)
export class AnalyzerController {
  constructor(
    private readonly analyzerService: AnalyzerService,
    private readonly entitlementsService: EntitlementsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Step 5.12: Get analyzer lists (Premium feature with LockedResponse)
   * GET /v1/analyzer/lists
   */
  @Get('lists')
  async getLists(@Req() req: any): Promise<LockedResponse<AnalyzerListsResponse>> {
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
    const fullData = await this.analyzerService.getAnalyzerLists(String(userId), 10);
    
    if (!entitlements.features[FeatureKey.ANALYZER_FULL]) {
      // Build preview (limited messages)
      const preview = {
        positive: fullData.positive.slice(0, 2), // First 2 positive
        negative: fullData.negative.slice(0, 2), // First 2 negative
      };
      
      return {
        locked: true,
        featureKey: FeatureKey.ANALYZER_FULL,
        preview,
        upsell: {
          title: 'Unlock Message Analyzer',
          body: 'Analyze and improve your messages with deep insights and actionable feedback.',
          ctaLabel: 'Unlock Premium',
        },
      };
    }
    
    return {
      locked: false,
      featureKey: FeatureKey.ANALYZER_FULL,
      full: fullData,
    };
  }

  /**
   * Step 5.12: Analyze a specific message (Premium feature with LockedResponse)
   * POST /v1/analyzer/analyze
   */
  @Post('analyze')
  async analyzeMessage(
    @Req() req: any,
    @Body() body: { messageId: string },
  ): Promise<LockedResponse<AnalyzeMessageResponse>> {
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
    const fullData = await this.analyzerService.analyzeMessage(String(userId), body.messageId);
    
    if (!entitlements.features[FeatureKey.ANALYZER_FULL] || !entitlements.features[FeatureKey.DEEP_PARAGRAPHS]) {
      // Build preview (message info without deep paragraphs)
      const preview = {
        message: fullData.message,
        breakdown: fullData.breakdown,
        paragraphs: [], // No paragraphs in preview
      };
      
      return {
        locked: true,
        featureKey: FeatureKey.DEEP_PARAGRAPHS,
        preview,
        upsell: {
          title: 'Unlock Deep Analysis',
          body: 'Get detailed paragraph-by-paragraph insights on what worked and what to improve.',
          ctaLabel: 'Unlock Premium',
        },
      };
    }
    
    return {
      locked: false,
      featureKey: FeatureKey.DEEP_PARAGRAPHS,
      full: fullData,
    };
  }

  /**
   * Step 5.7: Burn a message (exclude from all lists)
   * POST /v1/analyzer/burn
   */
  @Post('burn')
  @HttpCode(HttpStatus.NO_CONTENT)
  async burnMessage(
    @Req() req: any,
    @Body() body: BurnMessageRequest,
  ): Promise<void> {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    return this.analyzerService.burnMessage(String(userId), body.messageId);
  }
}

