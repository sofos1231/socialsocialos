// src/modules/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [StatsModule],     // 👈 get access to StatsService
  controllers: [DashboardController],
  // no need for providers here, StatsService comes from StatsModule
})
export class DashboardModule {}
