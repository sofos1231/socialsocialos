// FILE: backend/src/modules/missions-admin/missions-admin.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MissionsAdminService } from './missions-admin.service';
import { CreateMissionDto, UpdateMissionDto } from './dto/admin-mission.dto';
import { ReorderMissionsDto } from './dto/admin-missions-reorder.dto';
import { AdminGuard } from '../auth/admin.guard';

@Controller('admin/missions')
@UseGuards(AdminGuard)
export class MissionsAdminController {
  constructor(private readonly missionsAdminService: MissionsAdminService) {}

  /**
   * GET /v1/admin/missions/meta
   */
  @Get('meta')
  getMeta() {
    return this.missionsAdminService.getMeta();
  }

  /**
   * GET /v1/admin/missions/road
   * (templates ordered by laneIndex/orderIndex)
   */
  @Get('road')
  getRoad() {
    return this.missionsAdminService.getRoad();
  }

  /**
   * ✅ Alias routes (some dashboard versions call these)
   * GET /v1/admin/missions/mission-road
   * GET /v1/admin/missions/missions-road
   */
  @Get('mission-road')
  getRoadAlias1() {
    return this.missionsAdminService.getRoad();
  }

  @Get('missions-road')
  getRoadAlias2() {
    return this.missionsAdminService.getRoad();
  }

  /**
   * ✅ IMPORTANT COMPAT FIX:
   * GET /v1/admin/missions
   *
   * Return a RAW ARRAY so *any* dashboard implementation works:
   * - dashboards that expect an array -> ✅
   * - dashboards that expect {items|missions|templates} -> also ✅ (they usually handle Array.isArray)
   */
  @Get()
  async listMissions() {
    return this.missionsAdminService.listMissionsFlat();
  }

  /**
   * Debug/compat: keep the wrapped format available:
   * GET /v1/admin/missions/list
   */
  @Get('list')
  listMissionsWrapped() {
    return this.missionsAdminService.listMissions();
  }

  /**
   * POST /v1/admin/missions
   */
  @Post()
  createMission(@Body() dto: CreateMissionDto) {
    return this.missionsAdminService.createMission(dto);
  }

  /**
   * PUT /v1/admin/missions/:id
   */
  @Put(':id')
  putMission(@Param('id') id: string, @Body() dto: UpdateMissionDto) {
    return this.missionsAdminService.updateMission(id, dto);
  }

  /**
   * PATCH /v1/admin/missions/:id
   */
  @Patch(':id')
  updateMission(@Param('id') id: string, @Body() dto: UpdateMissionDto) {
    return this.missionsAdminService.updateMission(id, dto);
  }

  /**
   * DELETE /v1/admin/missions/:id
   */
  @Delete(':id')
  deleteMission(@Param('id') id: string) {
    return this.missionsAdminService.softDeleteMission(id);
  }

  /**
   * POST /v1/admin/missions/reorder
   */
  @Post('reorder')
  reorder(@Body() dto: ReorderMissionsDto) {
    return this.missionsAdminService.reorderMissions(dto);
  }

  /**
   * ✅ Alias for reorder used by some dashboards:
   * POST /v1/admin/missions/road/reorder
   */
  @Post('road/reorder')
  reorderAlias(@Body() dto: ReorderMissionsDto) {
    return this.missionsAdminService.reorderMissions(dto);
  }

  // Note: Category routes are handled by MissionsAdminCategoriesController
  // to avoid duplicate route registration.

  /**
   * Step 7.2: GET /v1/admin/missions/attachments
   * List missions with their profile attachments
   */
  @Get('attachments')
  async getAttachments() {
    return this.missionsAdminService.getMissionAttachments();
  }

  /**
   * Step 7.2: PUT /v1/admin/missions/:id/attachments
   * Update mission profile attachments
   */
  @Put(':id/attachments')
  async updateAttachments(
    @Param('id') id: string,
    @Body() body: { scoringProfileCode?: string | null; dynamicsProfileCode?: string | null },
  ) {
    return this.missionsAdminService.updateMissionAttachments(id, body);
  }

  /**
   * Step 7.5: GET /v1/admin/missions/sessions/:sessionId/messages
   * Get session messages with scores and gate triggers
   * NOTE: This route must come before :id routes to avoid route conflicts
   */
  @Get('sessions/:sessionId/messages')
  async getSessionMessages(@Param('sessionId') sessionId: string) {
    return this.missionsAdminService.getSessionMessages(sessionId);
  }

  /**
   * Step 7.3: GET /v1/admin/missions/:id/stats
   * Get mission stats summary
   */
  @Get(':id/stats')
  async getMissionStats(
    @Param('id') id: string,
    @Query('timeWindow') timeWindow?: string,
  ) {
    const timeWindowDays = timeWindow === 'all' ? null : (timeWindow ? parseInt(timeWindow, 10) : 7);
    return this.missionsAdminService.getMissionStats(id, timeWindowDays);
  }

  /**
   * Step 7.4: GET /v1/admin/missions/:id/mood-timelines
   * Get mood timelines for a mission
   */
  @Get(':id/mood-timelines')
  async getMissionMoodTimelines(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.missionsAdminService.getMissionMoodTimelines(id, limitNum);
  }

  /**
   * Step 7.5: GET /v1/admin/missions/:id/sessions
   * Get recent sessions for a mission
   */
  @Get(':id/sessions')
  async getMissionSessions(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.missionsAdminService.getMissionSessions(id, limitNum);
  }

  /**
   * Phase 3: POST /v1/admin/missions/validate-config
   * Validates MissionConfigV1 without saving
   */
  @Post('validate-config')
  async validateConfig(@Body() body: { aiContract: any }) {
    return this.missionsAdminService.validateConfig(body.aiContract);
  }

  /**
   * Phase 3: POST /v1/admin/missions/generate-config
   * Generates MissionConfigV1 using builders
   */
  @Post('generate-config')
  async generateConfig(
    @Body()
    body: {
      builderType: 'OPENERS' | 'FLIRTING';
      params: {
        difficultyLevel: string;
        aiStyleKey: string;
        maxMessages: number;
        timeLimitSec: number;
        wordLimit?: number | null;
        userTitle: string;
        userDescription: string;
        objectiveKind?: string;
      };
    },
  ) {
    return this.missionsAdminService.generateConfig(body.builderType, body.params);
  }
}
