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
import {
  CreateMissionDto,
  UpdateMissionDto,
} from './dto/admin-mission.dto';
import { ReorderMissionsDto } from './dto/admin-missions-reorder.dto';

@Controller('admin/missions')
export class MissionsAdminController {
  constructor(
    private readonly missionsAdminService: MissionsAdminService,
  ) {}

  /**
   * GET /v1/admin/missions/meta
   * Categories, personas, enums – used by the Mission Builder sidebar.
   */
  @Get('meta')
  getMeta() {
    return this.missionsAdminService.getMeta();
  }

  /**
   * GET /v1/admin/missions/road
   * Mission Road (templates only, ordered by laneIndex/orderIndex).
   */
  @Get('road')
  getRoad() {
    return this.missionsAdminService.getRoad();
  }

  /**
   * GET /v1/admin/missions
   * Flat list of all active mission templates (with category + persona).
   */
  @Get()
  listMissions() {
    return this.missionsAdminService.listMissions();
  }

  /**
   * POST /v1/admin/missions
   * Create new mission template.
   */
  @Post()
  createMission(@Body() dto: CreateMissionDto) {
    return this.missionsAdminService.createMission(dto);
  }

  /**
   * PUT /v1/admin/missions/:id
   * The HTML dashboard uses PUT for update – mirror PATCH behavior.
   */
  @Put(':id')
  putMission(
    @Param('id') id: string,
    @Body() dto: UpdateMissionDto,
  ) {
    return this.missionsAdminService.updateMission(id, dto);
  }

  /**
   * PATCH /v1/admin/missions/:id
   * Same logic as PUT – partial update.
   */
  @Patch(':id')
  updateMission(
    @Param('id') id: string,
    @Body() dto: UpdateMissionDto,
  ) {
    return this.missionsAdminService.updateMission(id, dto);
  }

  /**
   * DELETE /v1/admin/missions/:id
   * Soft delete – sets active = false.
   */
  @Delete(':id')
  deleteMission(@Param('id') id: string) {
    return this.missionsAdminService.softDeleteMission(id);
  }

  /**
   * POST /v1/admin/missions/reorder
   * Reorders missions either by "orderedIds" or by "items".
   */
  @Post('reorder')
  reorder(@Body() dto: ReorderMissionsDto) {
    return this.missionsAdminService.reorderMissions(dto);
  }
}
