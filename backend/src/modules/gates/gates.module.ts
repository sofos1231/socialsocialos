// backend/src/modules/gates/gates.module.ts
// Step 5.1: Gates module

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { GatesService } from './gates.service';
// Step 7.2: Import engine config module
import { EngineConfigModule } from '../engine-config/engine-config.module';

@Module({
  imports: [PrismaModule, EngineConfigModule],
  providers: [GatesService],
  exports: [GatesService],
})
export class GatesModule {}

