// src/modules/stats/stats.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [PrismaModule],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService], // 👈 IMPORTANT: export so other modules (Dashboard) can use it
})
export class StatsModule {}
