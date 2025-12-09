// backend/src/modules/analyzer/analyzer.module.ts
// Step 5.7: Analyzer module

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { StatsModule } from '../stats/stats.module';
import { AnalyzerController } from './analyzer.controller';
import { AnalyzerService } from './analyzer.service';

@Module({
  imports: [PrismaModule, StatsModule], // Import StatsModule to use StatsService
  controllers: [AnalyzerController],
  providers: [AnalyzerService],
  exports: [AnalyzerService], // Export if needed by other modules
})
export class AnalyzerModule {}

