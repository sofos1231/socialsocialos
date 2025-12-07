// src/modules/sessions/sessions.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { StatsModule } from '../stats/stats.module';
import { InsightsModule } from '../insights/insights.module';

@Module({
  imports: [PrismaModule, StatsModule, InsightsModule],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
