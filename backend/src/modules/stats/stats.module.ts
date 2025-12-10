// src/modules/stats/stats.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { CategoryStatsService } from './category-stats.service';

@Module({
  imports: [PrismaModule, EntitlementsModule],
  controllers: [StatsController],
  providers: [StatsService, CategoryStatsService],
  exports: [StatsService, CategoryStatsService], // 👈 IMPORTANT: export so other modules (Dashboard, Sessions) can use it
})
export class StatsModule {}
