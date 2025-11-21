// NOTE: This file currently uses Option A (rarity/xp-based) scoring/rewards.
// It will be migrated to Option B AiCore metrics later.

// backend/src/modules/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { AiScoringService } from './ai-scoring.service';
import { AiCoreScoringService } from './ai-core-scoring.service';

/**
 * AI module shell.
 *
 * For now this module provides:
 * - AiScoringService  → Option A / premium effects (rarities, microfeedback)
 * - AiCoreScoringService → Option B core metrics engine (charisma traits)
 *
 * Later we can plug in:
 * - provider-specific LLM clients (OpenAI, Anthropic, etc.)
 * - configuration (models, timeouts, cost limits)
 * - caching / fallbacks
 */
@Module({
  providers: [AiScoringService, AiCoreScoringService],
  exports: [AiScoringService, AiCoreScoringService],
})
export class AiModule {}
