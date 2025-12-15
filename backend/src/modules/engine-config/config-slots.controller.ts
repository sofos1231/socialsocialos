// backend/src/modules/engine-config/config-slots.controller.ts
// Config Slots controller for snapshot management

import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ConfigSlotsService } from './config-slots.service';
import { AdminGuard } from '../auth/admin.guard';

@Controller('admin/config-slots')
@UseGuards(AdminGuard)
export class ConfigSlotsController {
  constructor(private readonly configSlotsService: ConfigSlotsService) {}

  /**
   * GET /v1/admin/config-slots
   * List all config slots
   */
  @Get()
  async listSlots() {
    const slots = await this.configSlotsService.listSlots();
    return { ok: true, slots };
  }

  /**
   * GET /v1/admin/config-slots/:id
   * Get a specific config slot
   */
  @Get(':id')
  async getSlot(@Param('id') id: string) {
    const slot = await this.configSlotsService.getSlot(id);
    return { ok: true, slot };
  }

  /**
   * GET /v1/admin/config-slots/by-number/:number
   * Get slot by slot number (1-5)
   */
  @Get('by-number/:number')
  async getSlotByNumber(@Param('number') number: string) {
    const slotNumber = parseInt(number, 10);
    if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > 5) {
      return { ok: false, error: 'Invalid slot number (must be 1-5)' };
    }
    const slot = await this.configSlotsService.getSlotByNumber(slotNumber);
    if (!slot) {
      return { ok: false, error: 'Slot not found' };
    }
    return { ok: true, slot };
  }

  /**
   * POST /v1/admin/config-slots
   * Create a new config slot
   */
  @Post()
  async createSlot(@Body() body: any) {
    const slot = await this.configSlotsService.createSlot({
      name: body.name,
      slotNumber: body.slotNumber ?? null,
      engineConfigJson: body.engineConfigJson,
      categoriesJson: body.categoriesJson ?? null,
      missionsJson: body.missionsJson ?? null,
      defaultSeedKey: body.defaultSeedKey ?? null,
    });
    return { ok: true, slot };
  }

  /**
   * PUT /v1/admin/config-slots/:id
   * Update a config slot
   */
  @Put(':id')
  async updateSlot(@Param('id') id: string, @Body() body: any) {
    const slot = await this.configSlotsService.updateSlot(id, {
      name: body.name,
      slotNumber: body.slotNumber,
      engineConfigJson: body.engineConfigJson,
      categoriesJson: body.categoriesJson,
      missionsJson: body.missionsJson,
      defaultSeedKey: body.defaultSeedKey,
    });
    return { ok: true, slot };
  }

  /**
   * DELETE /v1/admin/config-slots/:id
   * Delete a config slot
   */
  @Delete(':id')
  async deleteSlot(@Param('id') id: string) {
    await this.configSlotsService.deleteSlot(id);
    return { ok: true, message: 'Config slot deleted' };
  }
}

