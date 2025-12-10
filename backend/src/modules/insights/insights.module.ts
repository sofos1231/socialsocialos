// backend/src/modules/insights/insights.module.ts
// Phase 1: Deep Insights Module

import { Module, forwardRef } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { PrismaModule } from '../../db/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StatsModule } from '../stats/stats.module';
import { RotationModule } from '../rotation/rotation.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    StatsModule,
    forwardRef(() => RotationModule), // Use forwardRef to break circular dependency
  ],
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}

