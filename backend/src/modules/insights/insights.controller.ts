// backend/src/modules/insights/insights.controller.ts
// Step 5.2: Insights API controller (glue to Step 5.3)

import { Controller, Get, Param, Query, UseGuards, UnauthorizedException, NotFoundException, Req, Inject, forwardRef } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { RotationService } from '../rotation/rotation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DeepInsightsResponse } from './insights.types';
import { normalizeInsightsResponse } from './insights.read-normalizer';
import { RotationSurface } from '../rotation/rotation.types';

@Controller('insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(
    private readonly insightsService: InsightsService,
    @Inject(forwardRef(() => RotationService))
    private readonly rotationService: RotationService,
  ) {}

  /**
   * GET /v1/insights/session/:sessionId
   * Get insights for a specific session
   * 
   * Requirements:
   * - JWT required (UseGuards)
   * - Ownership check (session.userId === auth.userId)
   * - Safe defaults for old sessions (no 500s)
   * 
   * @param sessionId - Session ID
   * @param req - Request with user from JWT
   * @returns DeepInsightsResponse with v2 insights
   */
  @Get('session/:sessionId')
  async getSessionInsights(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
  ): Promise<DeepInsightsResponse> {
    // Extract userId from JWT (same pattern as other controllers)
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }

    try {
      // Get insights (includes ownership check)
      // Service method returns normalized response with safe defaults
      const response = await this.insightsService.getSessionInsightsPublic(sessionId, String(userId));
      
      // Ensure normalization (safe defaults for old sessions)
      return normalizeInsightsResponse(response);
    } catch (error: any) {
      // Handle ownership/not found errors
      if (error.message?.includes('not found')) {
        throw new NotFoundException('Session insights not found');
      }
      if (error.message?.includes('do not belong')) {
        throw new UnauthorizedException('Access denied');
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Step 5.11: GET /v1/insights/rotation/:sessionId
   * Get rotation pack for a specific surface (resilient - builds pack if missing)
   * 
   * @param sessionId - Session ID
   * @param surface - Rotation surface (default: 'MISSION_END')
   * @param req - Request with user from JWT
   * @returns RotationPackResponse (never 404, returns empty pack if needed)
   */
  @Get('rotation/:sessionId')
  async getRotationPack(
    @Param('sessionId') sessionId: string,
    @Query('surface') surface: RotationSurface = 'MISSION_END',
    @Req() req: any,
  ) {
    const userId = req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }

    try {
      const pack = await this.rotationService.getRotationPackForSurface(String(userId), sessionId, surface);
      
      // If pack is null/undefined, return empty pack instead of 404
      if (!pack) {
        return {
          sessionId,
          surface,
          selectedInsights: [],
          meta: {
            seed: '',
            excludedIds: [],
            pickedIds: [],
            quotas: {
              gate: 0,
              hook: 0,
              pattern: 0,
              tip: 0,
            },
            version: 'v1',
            totalAvailable: 0,
            filteredBecausePremium: 0,
            isPremiumUser: false,
            premiumInsightIds: [],
          },
        };
      }
      
      return pack;
    } catch (error: any) {
      // Log error but return empty pack instead of throwing
      console.warn(`[InsightsController] Failed to load rotation pack for ${sessionId}:`, error);
      
      // Return empty pack as fallback
      return {
        sessionId,
        surface,
        selectedInsights: [],
        meta: {
          seed: '',
          excludedIds: [],
          pickedIds: [],
          quotas: {
            gate: 0,
            hook: 0,
            pattern: 0,
            tip: 0,
          },
          version: 'v1',
          totalAvailable: 0,
          filteredBecausePremium: 0,
          isPremiumUser: false,
          premiumInsightIds: [],
        },
      };
    }
  }
}

