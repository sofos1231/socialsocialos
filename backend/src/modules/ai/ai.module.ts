// FILE: backend/src/modules/ai/ai.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { AiScoringService } from './ai-scoring.service';
import { AiCoreScoringService } from './ai-core-scoring.service';
import { AiChatService } from './providers/ai-chat.service';
import { OpenAiClient } from './providers/openai.client';
// Phase 1: Import ScoringRuntime service
import { AiScoringRuntimeService } from './ai-scoring-runtime.service';
// Step 6.3-6.5: Import new AI engine services
import { OpeningsService } from '../ai-engine/openings.service';
import { MissionStateService } from '../ai-engine/mission-state.service';
import { RewardReleaseService } from '../ai-engine/reward-release.service';
// Step 6.6: Import micro-dynamics service
import { MicroDynamicsService } from '../ai-engine/micro-dynamics.service';
// Step 6.8: Import persona drift service
import { PersonaDriftService } from '../ai-engine/persona-drift.service';
// Step 7.2: Import engine config module
import { EngineConfigModule } from '../engine-config/engine-config.module';
// Step 8: Import new services for FastPath
import { ModelTierService } from './model-tier.service';
import { ScoreAccumulatorService } from './score-accumulator.service';
import { MoodStateMachineService } from '../mission-state/mood-state-machine.service';

@Module({
  imports: [PrismaModule, EngineConfigModule],
  providers: [
    AiScoringService,
    AiCoreScoringService,

    // NEW: real chat replies
    OpenAiClient,
    AiChatService,
    // Phase 1: ScoringRuntime service
    AiScoringRuntimeService,

    // Step 6.3-6.5: AI engine services
    OpeningsService,
    MissionStateService,
    // Step 6.4: Reward release service
    RewardReleaseService,
    // Step 6.6: Micro-dynamics service
    MicroDynamicsService,
    // Step 6.8: Persona drift service
    PersonaDriftService,
    // Step 8: FastPath services
    ModelTierService,
    ScoreAccumulatorService,
    MoodStateMachineService,
  ],
  exports: [
    AiScoringService,
    AiCoreScoringService,

    // export so PracticeService can inject it
    AiChatService,
    // Phase 1: Export ScoringRuntime service
    AiScoringRuntimeService,

    // Step 6.3-6.5: Export AI engine services
    OpeningsService,
    MissionStateService,
    // Step 6.4: Export reward release service
    RewardReleaseService,
    // Step 6.6: Export micro-dynamics service
    MicroDynamicsService,
    // Step 6.8: Export persona drift service
    PersonaDriftService,
    // Step 8: Export FastPath services
    ModelTierService,
    ScoreAccumulatorService,
    MoodStateMachineService,
  ],
})
export class AiModule {}
