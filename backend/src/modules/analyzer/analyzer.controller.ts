// backend/src/modules/analyzer/analyzer.controller.ts
// Step 5.7: Analyzer controller

import { Controller, Get, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyzerService } from './analyzer.service';
import {
  AnalyzerListsResponse,
  AnalyzeMessageResponse,
  BurnMessageRequest,
} from './analyzer.types';

@Controller('analyzer')
@UseGuards(JwtAuthGuard)
export class AnalyzerController {
  constructor(private readonly analyzerService: AnalyzerService) {}

  /**
   * Step 5.7: Get analyzer lists (positive and negative messages)
   * GET /v1/analyzer/lists
   */
  @Get('lists')
  async getLists(@Req() req: any): Promise<AnalyzerListsResponse> {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    return this.analyzerService.getAnalyzerLists(String(userId), 10);
  }

  /**
   * Step 5.7: Analyze a specific message
   * POST /v1/analyzer/analyze
   */
  @Post('analyze')
  async analyzeMessage(
    @Req() req: any,
    @Body() body: { messageId: string },
  ): Promise<AnalyzeMessageResponse> {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);
    return this.analyzerService.analyzeMessage(String(userId), body.messageId);
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

