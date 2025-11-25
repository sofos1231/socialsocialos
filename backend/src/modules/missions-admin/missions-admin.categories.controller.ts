// FILE: backend/src/modules/missions-admin/missions-admin.categories.controller.ts

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
    CreateMissionCategoryDto,
    UpdateMissionCategoryDto,
  } from './dto/admin-category.dto';
  
  @Controller('admin/missions/categories')
  export class MissionsAdminCategoriesController {
    constructor(
      private readonly missionsAdminService: MissionsAdminService,
    ) {}
  
    /**
     * GET /v1/admin/missions/categories
     * List all mission categories.
     */
    @Get()
    listCategories() {
      return this.missionsAdminService.listCategories();
    }
  
    /**
     * POST /v1/admin/missions/categories
     * Create a new mission category.
     */
    @Post()
    createCategory(@Body() dto: CreateMissionCategoryDto) {
      return this.missionsAdminService.createCategory(dto);
    }
  
    /**
     * PATCH /v1/admin/missions/categories/:id
     * Partial update for a mission category.
     */
    @Patch(':id')
    patchCategory(
      @Param('id') id: string,
      @Body() dto: UpdateMissionCategoryDto,
    ) {
      return this.missionsAdminService.updateCategory(id, dto);
    }
  
    /**
     * PUT /v1/admin/missions/categories/:id
     * Full update – HTML dashboard uses PUT, so we alias to the same logic as PATCH.
     */
    @Put(':id')
    putCategory(
      @Param('id') id: string,
      @Body() dto: UpdateMissionCategoryDto,
    ) {
      return this.missionsAdminService.updateCategory(id, dto);
    }
  
    /**
     * DELETE /v1/admin/missions/categories/:id
     * Delete (or future soft-delete) a category.
     */
    @Delete(':id')
    deleteCategory(@Param('id') id: string) {
      return this.missionsAdminService.deleteCategory(id);
    }
  }
  