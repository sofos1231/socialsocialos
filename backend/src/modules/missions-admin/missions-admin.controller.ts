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
} from '@nestjs/common';
import { MissionsAdminService } from './missions-admin.service';
import { CreateMissionDto, UpdateMissionDto } from './dto/admin-mission.dto';
import { ReorderMissionsDto } from './dto/admin-missions-reorder.dto';

@Controller('admin/missions')
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
}
