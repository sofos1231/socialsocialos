// NOTE: This file currently uses Option A (rarity/xp-based) scoring/rewards. It will be migrated to Option B AiCore metrics later.

// backend/src/modules/practice/practice.module.ts
import { Module } from '@nestjs/common';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';
import { SessionsModule } from '../sessions/sessions.module';
import { AiModule } from '../ai/ai.module';
import { GatesModule } from '../gates/gates.module';
import { MissionsModule } from '../missions/missions.module';
// Step 8: Import QueueModule for deep analysis jobs
import { QueueModule } from '../queue/queue.module';
// EngineConfigModule for gate requirement templates
import { EngineConfigModule } from '../engine-config/engine-config.module';

@Module({
  imports: [
    SessionsModule,
    AiModule,         // 👈 NEW — we inject AiScoringService from here
    GatesModule,     // Step 6.4: Gates service for gate evaluation
    MissionsModule,  // Persona compatibility: use missions service as single source of truth
    QueueModule,     // Step 8: Queue for deep analysis jobs
    EngineConfigModule, // Gate requirement templates support
  ],
  controllers: [PracticeController],
  providers: [PracticeService],
})
export class PracticeModule {}
