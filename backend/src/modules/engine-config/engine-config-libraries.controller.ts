// backend/src/modules/engine-config/engine-config-libraries.controller.ts
// CRUD endpoints for EngineConfig JSON libraries

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { EngineConfigService } from './engine-config.service';
import { AdminGuard } from '../auth/admin.guard';
import {
  EngineScoringProfile,
  EngineDynamicsProfile,
  EngineGateConfig,
  EngineGateRequirementTemplate,
  EngineMicroFeedbackConfig,
} from './engine-config.types';

@Controller('admin/engine-config')
@UseGuards(AdminGuard)
export class EngineConfigLibrariesController {
  constructor(private readonly engineConfigService: EngineConfigService) {}

  // ==================== Scoring Profiles ====================

  @Get('scoring-profiles')
  async getScoringProfiles(): Promise<{ ok: true; profiles: EngineScoringProfile[] }> {
    const profiles = await this.engineConfigService.getScoringProfiles();
    return { ok: true, profiles };
  }

  @Post('scoring-profiles')
  async createScoringProfile(
    @Body() body: { profile: EngineScoringProfile },
  ): Promise<{ ok: true; profile: EngineScoringProfile }> {
    const profile = await this.engineConfigService.createScoringProfile(body.profile);
    return { ok: true, profile };
  }

  @Put('scoring-profiles/:code')
  async updateScoringProfile(
    @Param('code') code: string,
    @Body() body: { profile: EngineScoringProfile },
  ): Promise<{ ok: true; profile: EngineScoringProfile }> {
    if (body.profile.code !== code) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'Profile code in body must match URL parameter',
      });
    }
    const profile = await this.engineConfigService.updateScoringProfile(code, body.profile);
    return { ok: true, profile };
  }

  @Delete('scoring-profiles/:code')
  async deleteScoringProfile(
    @Param('code') code: string,
  ): Promise<{ ok: true; message: string }> {
    await this.engineConfigService.deleteScoringProfile(code);
    return { ok: true, message: `Scoring profile "${code}" deleted successfully` };
  }

  // ==================== Dynamics Profiles ====================

  @Get('dynamics-profiles')
  async getDynamicsProfiles(): Promise<{ ok: true; profiles: EngineDynamicsProfile[] }> {
    const profiles = await this.engineConfigService.getDynamicsProfiles();
    return { ok: true, profiles };
  }

  @Post('dynamics-profiles')
  async createDynamicsProfile(
    @Body() body: { profile: EngineDynamicsProfile },
  ): Promise<{ ok: true; profile: EngineDynamicsProfile }> {
    const profile = await this.engineConfigService.createDynamicsProfile(body.profile);
    return { ok: true, profile };
  }

  @Put('dynamics-profiles/:code')
  async updateDynamicsProfile(
    @Param('code') code: string,
    @Body() body: { profile: EngineDynamicsProfile },
  ): Promise<{ ok: true; profile: EngineDynamicsProfile }> {
    if (body.profile.code !== code) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'Profile code in body must match URL parameter',
      });
    }
    const profile = await this.engineConfigService.updateDynamicsProfile(code, body.profile);
    return { ok: true, profile };
  }

  @Delete('dynamics-profiles/:code')
  async deleteDynamicsProfile(
    @Param('code') code: string,
  ): Promise<{ ok: true; message: string }> {
    await this.engineConfigService.deleteDynamicsProfile(code);
    return { ok: true, message: `Dynamics profile "${code}" deleted successfully` };
  }

  // ==================== Gate Sets ====================

  @Get('gate-sets')
  async getGateSets(): Promise<{ ok: true; gates: EngineGateConfig[] }> {
    const gates = await this.engineConfigService.getGateSets();
    return { ok: true, gates };
  }

  @Post('gate-sets')
  async createGateSet(@Body() body: { gate: EngineGateConfig }): Promise<{ ok: true; gate: EngineGateConfig }> {
    const gate = await this.engineConfigService.createGateSet(body.gate);
    return { ok: true, gate };
  }

  @Put('gate-sets/:key')
  async updateGateSet(
    @Param('key') key: string,
    @Body() body: { gate: EngineGateConfig },
  ): Promise<{ ok: true; gate: EngineGateConfig }> {
    if (body.gate.key !== key) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'Gate key in body must match URL parameter',
      });
    }
    const gate = await this.engineConfigService.updateGateSet(key, body.gate);
    return { ok: true, gate };
  }

  @Delete('gate-sets/:key')
  async deleteGateSet(@Param('key') key: string): Promise<{ ok: true; message: string }> {
    await this.engineConfigService.deleteGateSet(key);
    return { ok: true, message: `Gate set "${key}" deleted successfully` };
  }

  // ==================== Objectives (Gate Requirement Templates) ====================

  @Get('objectives')
  async getObjectives(): Promise<{ ok: true; objectives: EngineGateRequirementTemplate[] }> {
    const objectives = await this.engineConfigService.getObjectives();
    return { ok: true, objectives };
  }

  @Post('objectives')
  async createObjective(
    @Body() body: { objective: EngineGateRequirementTemplate },
  ): Promise<{ ok: true; objective: EngineGateRequirementTemplate }> {
    const objective = await this.engineConfigService.createObjective(body.objective);
    return { ok: true, objective };
  }

  @Put('objectives/:code')
  async updateObjective(
    @Param('code') code: string,
    @Body() body: { objective: EngineGateRequirementTemplate },
  ): Promise<{ ok: true; objective: EngineGateRequirementTemplate }> {
    if (body.objective.code !== code) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'Objective code in body must match URL parameter',
      });
    }
    const objective = await this.engineConfigService.updateObjective(code, body.objective);
    return { ok: true, objective };
  }

  @Delete('objectives/:code')
  async deleteObjective(@Param('code') code: string): Promise<{ ok: true; message: string }> {
    await this.engineConfigService.deleteObjective(code);
    return { ok: true, message: `Objective "${code}" deleted successfully` };
  }

  // ==================== Micro Feedback ====================

  @Get('micro-feedback')
  async getMicroFeedback(): Promise<{ ok: true; config: EngineMicroFeedbackConfig | null }> {
    const config = await this.engineConfigService.getMicroFeedbackConfig();
    return { ok: true, config };
  }

  @Put('micro-feedback')
  async updateMicroFeedback(
    @Body() body: { config: EngineMicroFeedbackConfig },
  ): Promise<{ ok: true; config: EngineMicroFeedbackConfig }> {
    const config = await this.engineConfigService.updateMicroFeedback(body.config);
    return { ok: true, config };
  }
}

