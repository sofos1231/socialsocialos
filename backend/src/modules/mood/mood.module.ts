// backend/src/modules/mood/mood.module.ts
// Step 5.1: Mood module

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { MoodService } from './mood.service';
// Step 7.2: Import engine config module
import { EngineConfigModule } from '../engine-config/engine-config.module';

@Module({
  imports: [PrismaModule, EngineConfigModule],
  providers: [MoodService],
  exports: [MoodService],
})
export class MoodModule {}

