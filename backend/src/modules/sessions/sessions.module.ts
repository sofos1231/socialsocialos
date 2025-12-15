// FILE: backend/src/modules/sessions/sessions.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

import { StatsModule } from '../stats/stats.module';
import { InsightsModule } from '../insights/insights.module';

// Step 5.1: Analytics modules
import { MoodModule } from '../mood/mood.module';
import { TraitsModule } from '../traits/traits.module';
import { GatesModule } from '../gates/gates.module';
import { PromptsModule } from '../prompts/prompts.module';

// Step 5.4: Badges
import { BadgesModule } from '../badges/badges.module';

// Step 5.9: Synergy
import { SynergyModule } from '../synergy/synergy.module';

// Step 5.11: Rotations
import { RotationModule } from '../rotation/rotation.module';

// Step 8: QueueModule for deep analysis
import { QueueModule } from '../queue/queue.module';

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

    // 🔥 FIX: Break circular dependency (SessionsModule ↔ QueueModule)
    forwardRef(() => QueueModule),
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
