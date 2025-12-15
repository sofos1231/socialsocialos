// backend/src/modules/engine-config/engine-config.controller.ts
// Step 7.2: Engine Config controller

import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { EngineConfigService } from './engine-config.service';
import { EngineConfigJson } from './engine-config.types';
import { AdminGuard } from '../auth/admin.guard';

@Controller('admin/engine-config')
@UseGuards(AdminGuard)
export class EngineConfigController {
  constructor(private readonly engineConfigService: EngineConfigService) {}

  /**
   * GET /v1/admin/engine-config
   */
  @Get()
  async getConfig(): Promise<{ ok: true; config: EngineConfigJson }> {
    const config = await this.engineConfigService.getGlobalConfig();
    return { ok: true, config };
  }

  /**
   * PUT /v1/admin/engine-config
   * Full replace (with validation)
   */
  @Put()
  async updateConfig(
    @Body() body: { config: EngineConfigJson },
  ): Promise<{ ok: true; config: EngineConfigJson }> {
    const config = await this.engineConfigService.updateGlobalConfig(body.config);
    return { ok: true, config };
  }
}

