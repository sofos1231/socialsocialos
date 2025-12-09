// src/modules/sessions/sessions.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { StatsModule } from '../stats/stats.module';
import { InsightsModule } from '../insights/insights.module';
// Step 5.1: Import new analytics modules
import { MoodModule } from '../mood/mood.module';
import { TraitsModule } from '../traits/traits.module';
import { GatesModule } from '../gates/gates.module';
import { PromptsModule } from '../prompts/prompts.module';
// Step 5.4: Import badges module
import { BadgesModule } from '../badges/badges.module';
// Step 5.9: Import synergy module
import { SynergyModule } from '../synergy/synergy.module';
// Step 5.11: Import rotation module
import { RotationModule } from '../rotation/rotation.module';

@Module({
  imports: [
    PrismaModule,
    StatsModule,
    InsightsModule,
    MoodModule,
    TraitsModule,
    GatesModule,
    PromptsModule,
    BadgesModule,
    SynergyModule,
    RotationModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
