// FILE: backend/src/modules/queue/queue.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { MoodModule } from '../mood/mood.module';
import { TraitsModule } from '../traits/traits.module';
import { GatesModule } from '../gates/gates.module';
import { PromptsModule } from '../prompts/prompts.module';
import { InsightsModule } from '../insights/insights.module';
import { SynergyModule } from '../synergy/synergy.module';
import { AiModule } from '../ai/ai.module';
import { SessionsModule } from '../sessions/sessions.module';
import { EngineConfigModule } from '../engine-config/engine-config.module';

import { BullModule } from '@nestjs/bullmq';
import { DeepAnalysisWorker } from './workers/deep-analysis.worker';
import { MessageAnalysisWorker } from './workers/message-analysis.worker';
import { InsightsWorker } from './workers/insights.worker';

@Module({
  imports: [
    PrismaModule,
    MoodModule,
    TraitsModule,
    GatesModule,
    PromptsModule,
    InsightsModule,
    SynergyModule,
    AiModule,
    EngineConfigModule,

    // 🔥 FIXED: Break circular dependency
    forwardRef(() => SessionsModule),

    BullModule.forRootAsync({
      useFactory: () => ({
        connection: process.env.REDIS_URL
          ? { url: process.env.REDIS_URL }
          : {
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379', 10),
            },
      }),
    }),

    BullModule.registerQueue({
      name: 'deep-analysis',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    }),
    // Phase 1: New queues for two-lane AI engine
    BullModule.registerQueue({
      name: 'message-analysis',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    }),
    BullModule.registerQueue({
      name: 'insights',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    }),
  ],
  providers: [DeepAnalysisWorker, MessageAnalysisWorker, InsightsWorker],
  exports: [BullModule],
})
export class QueueModule {}
