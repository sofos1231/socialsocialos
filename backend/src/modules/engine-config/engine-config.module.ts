// backend/src/modules/engine-config/engine-config.module.ts
// Step 7.2: Engine Config module

import { Module } from '@nestjs/common';
import { EngineConfigService } from './engine-config.service';
import { EngineConfigController } from './engine-config.controller';
import { EngineConfigPromptsController } from './engine-config-prompts.controller';
import { EngineConfigLibrariesController } from './engine-config-libraries.controller';
import { ConfigSlotsService } from './config-slots.service';
import { ConfigSlotsController } from './config-slots.controller';
import { PrismaModule } from '../../db/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EngineConfigService, ConfigSlotsService],
  controllers: [
    EngineConfigController,
    EngineConfigPromptsController,
    EngineConfigLibrariesController,
    ConfigSlotsController,
  ],
  exports: [EngineConfigService, ConfigSlotsService],
})
export class EngineConfigModule {}

