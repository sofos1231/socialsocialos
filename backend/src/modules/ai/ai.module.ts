// backend/src/modules/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { AiScoringService } from './ai-scoring.service';

/**
 * Phase 5.2.1 — AI module shell.
 *
 * For now this module only provides AiScoringService.
 * Later we can plug in:
 * - provider-specific LLM clients (OpenAI, Anthropic, etc.)
 * - configuration (models, timeouts, cost limits)
 * - caching / fallbacks
 */
@Module({
  providers: [AiScoringService],
  exports: [AiScoringService],
})
export class AiModule {}
