// backend/src/modules/insights/insights.module.ts
// Phase 1: Deep Insights Module

import { Module } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { PrismaModule } from '../../db/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StatsModule } from '../stats/stats.module';
import { RotationModule } from '../rotation/rotation.module';

@Module({
  imports: [PrismaModule, AuthModule, StatsModule, RotationModule],
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}

