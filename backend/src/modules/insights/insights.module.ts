// backend/src/modules/insights/insights.module.ts
// Phase 1: Deep Insights Module

import { Module } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { PrismaModule } from '../../db/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}

