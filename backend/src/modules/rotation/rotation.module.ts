// backend/src/modules/rotation/rotation.module.ts
// Step 5.11: Rotation module

import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { InsightsModule } from '../insights/insights.module';
import { MoodModule } from '../mood/mood.module';
import { SynergyModule } from '../synergy/synergy.module';
import { AnalyzerModule } from '../analyzer/analyzer.module';
import { StatsModule } from '../stats/stats.module';
import { RotationService } from './rotation.service';
import { RotationController } from './rotation.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => InsightsModule), // Use forwardRef to break circular dependency
    MoodModule,
    SynergyModule,
    AnalyzerModule,
    StatsModule, // For StatsService.buildMessageBreakdown
    AuthModule, // For JwtAuthGuard
  ],
  controllers: [RotationController],
  providers: [RotationService],
  exports: [RotationService],
})
export class RotationModule {}

