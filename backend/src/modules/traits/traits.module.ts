// backend/src/modules/traits/traits.module.ts
// Step 5.1: Traits module

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { TraitsService } from './traits.service';
// Step 7.2: Import engine config module
import { EngineConfigModule } from '../engine-config/engine-config.module';

@Module({
  imports: [PrismaModule, EngineConfigModule],
  providers: [TraitsService],
  exports: [TraitsService],
})
export class TraitsModule {}

