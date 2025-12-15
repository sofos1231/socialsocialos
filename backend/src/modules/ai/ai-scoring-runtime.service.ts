// FILE: backend/src/modules/ai/ai-scoring-runtime.service.ts
// Phase 1: Scoring Runtime Service for Lane B

import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { PracticeSession, ChatMessage } from '@prisma/client';
import { OpenAiClient } from './providers/openai.client';
import { EngineConfigService } from '../engine-config/engine-config.service';
import { EngineConfigJson, EngineScoringProfile } from '../engine-config/engine-config.types';
import { AiProviderConfig } from './providers/ai-provider.types';

export interface ScoringResult {
  checklists: Record<string, Record<string, boolean>>;
  dimensions: Record<string, number>; // 0-1
  microDynamicsTags: string[];
  semanticFlags: Record<string, boolean>;
}

@Injectable()
export class AiScoringRuntimeService {
  private readonly logger = new Logger(AiScoringRuntimeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiClient,
    @Optional()
    @Inject(forwardRef(() => EngineConfigService))
    private readonly engineConfigService?: EngineConfigService,
  ) {}

  /**
   * Phase 1: Score a single message using ScoringRuntime LLM
   */
  async scoreMessage(
    session: PracticeSession,
    messages: ChatMessage[],
    targetMessageIndex: number,
    engineConfig: EngineConfigJson,
  ): Promise<ScoringResult> {
    const targetMessage = messages.find((m) => m.turnIndex === targetMessageIndex);
    if (!targetMessage) {
      throw new Error(`Message with turnIndex ${targetMessageIndex} not found`);
    }

    // Get scoring profile from engine config
    const scoringProfile = await this.getScoringProfile(engineConfig, session);
    
    // Build prompt
    const prompt = this.buildScoringPrompt(messages, targetMessageIndex, scoringProfile, engineConfig);

    // Call LLM with scoring profile
    // Phase 1: Use defaults (will be configurable via EngineConfig in Phase 2)
    const aiProviderConfig: AiProviderConfig = {
      model: 'gpt-4o-mini', // Phase 1: Default to mini model for scoring
      temperature: 0.3, // Lower temperature for more consistent scoring
      maxTokens: 800,
      topP: 0.9,
      responseFormat: 'json_object',
    };

    try {
      const result = await this.openai.createChatCompletion({
        messages: [
          {
            role: 'system',
            content: prompt.system,
          },
          {
            role: 'user',
            content: prompt.user,
          },
        ],
        config: aiProviderConfig,
      });

      if (!result.ok) {
        const errorCode = 'errorCode' in result ? result.errorCode : 'UNKNOWN';
        this.logger.warn(`ScoringRuntime LLM call failed: ${errorCode}`);
        return this.getDefaultScoringResult();
      }

      // Parse JSON response
      const parsed = this.parseScoringResult(result.text);
      return parsed;
    } catch (error: any) {
      this.logger.error(`ScoringRuntime error: ${error.message}`, error.stack);
      return this.getDefaultScoringResult();
    }
  }

  private async getScoringProfile(
    engineConfig: EngineConfigJson,
    session: PracticeSession,
  ): Promise<EngineScoringProfile | null> {
    // Try to get profile from session
    // Note: scoringRuntimeProfileKey exists in schema but may not be in generated client
    const profileKey = (session as any).scoringRuntimeProfileKey;
    if (profileKey && this.engineConfigService) {
      const profile = await this.engineConfigService.getScoringProfile(profileKey);
      if (profile) return profile;
    }

    // Fallback to default from engine config
    const defaultProfile = engineConfig.scoringProfiles.find(
      (p) => p.code === engineConfig.defaultScoringProfileCode && p.active,
    );
    return defaultProfile || null;
  }

  private buildScoringPrompt(
    messages: ChatMessage[],
    targetMessageIndex: number,
    scoringProfile: EngineScoringProfile | null,
    engineConfig: EngineConfigJson,
  ): { system: string; user: string } {
    // Get context window (last 10 messages before target)
    const contextStart = Math.max(0, targetMessageIndex - 10);
    const contextMessages = messages
      .filter((m) => m.turnIndex >= contextStart && m.turnIndex <= targetMessageIndex)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const targetMessage = messages.find((m) => m.turnIndex === targetMessageIndex);
    const targetText = targetMessage?.content || '';

    // Phase 1: Simple prompt template (will be replaced with EngineConfig.scoring.scoringPromptTemplate in Phase 2)
    const systemPrompt = `You are a social skills scoring engine. Analyze the user's message and return a structured JSON score.

Return a JSON object with this exact structure:
{
  "checklists": {
    "boundarySafety": {
      "respectful": boolean,
      "noPressure": boolean,
      "appropriateTone": boolean
    },
    "engagement": {
      "asksQuestions": boolean,
      "showsInterest": boolean,
      "reciprocates": boolean
    },
    "authenticity": {
      "genuine": boolean,
      "notGeneric": boolean,
      "personalTouch": boolean
    },
    "momentum": {
      "movesForward": boolean,
      "buildsConnection": boolean,
      "createsInterest": boolean
    },
    "emotionalIntelligence": {
      "readsContext": boolean,
      "appropriateResponse": boolean,
      "showsEmpathy": boolean
    }
  },
  "dimensions": {
    "confidence": number (0-1),
    "clarity": number (0-1),
    "humor": number (0-1),
    "tensionControl": number (0-1),
    "emotionalWarmth": number (0-1),
    "dominance": number (0-1)
  },
  "microDynamicsTags": string[],
  "semanticFlags": {
    "positiveHook": boolean,
    "boundaryIssue": boolean,
    "vulnerability": boolean,
    "creepy": boolean,
    "rude": boolean
  }
}`;

    const userPrompt = `Context messages:
${contextMessages}

Target message to score:
${targetText}

Analyze the target message and return the scoring JSON.`;

    return {
      system: systemPrompt,
      user: userPrompt,
    };
  }

  private parseScoringResult(text: string): ScoringResult {
    try {
      const parsed = JSON.parse(text);
      
      // Validate and normalize structure
      return {
        checklists: parsed.checklists || {},
        dimensions: parsed.dimensions || {},
        microDynamicsTags: Array.isArray(parsed.microDynamicsTags) ? parsed.microDynamicsTags : [],
        semanticFlags: parsed.semanticFlags || {},
      };
    } catch (error: any) {
      this.logger.warn(`Failed to parse scoring result: ${error.message}`);
      return this.getDefaultScoringResult();
    }
  }

  private getDefaultScoringResult(): ScoringResult {
    return {
      checklists: {},
      dimensions: {},
      microDynamicsTags: [],
      semanticFlags: {},
    };
  }
}

