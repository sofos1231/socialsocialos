// FILE: backend/src/modules/queue/workers/message-analysis.worker.ts
// Phase 1: Message Analysis Worker - Processes per-message scoring, hooks, mood, traits, gates

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../../../db/prisma.service';
import { MessageAnalysisJobPayload } from '../jobs/message-analysis.job';
import { ChatMessage, PracticeSession, PromptHook } from '@prisma/client';
import { AiScoringRuntimeService, ScoringResult } from '../../ai/ai-scoring-runtime.service';
import { EngineConfigService } from '../../engine-config/engine-config.service';
import { EngineConfigJson } from '../../engine-config/engine-config.types';
import { MoodService } from '../../mood/mood.service';
import { TraitsService } from '../../traits/traits.service';
import { GatesService } from '../../gates/gates.service';
import { PromptsService } from '../../prompts/prompts.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InsightsJobPayload } from '../jobs/insights.job';

/**
 * Phase 1: Message Analysis Worker
 * Processes per-message analysis jobs: scoring → hooks → mood → traits → gates
 * 
 * Traits & gates now consume the new ScoringResult structure (checklists/dimensions/etc.),
 * not the old averageScore-only metrics. They read from ChatMessage.scoringSnapshot after
 * it's persisted, ensuring they use the authoritative scoring data from Lane B.
 */
@Processor('message-analysis')
@Injectable()
export class MessageAnalysisWorker extends WorkerHost {
  private readonly logger = new Logger(MessageAnalysisWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringRuntime: AiScoringRuntimeService,
    @Optional()
    @Inject(forwardRef(() => EngineConfigService))
    private readonly engineConfigService?: EngineConfigService,
    private readonly moodService?: MoodService,
    private readonly traitsService?: TraitsService,
    private readonly gatesService?: GatesService,
    private readonly promptsService?: PromptsService,
    @Optional()
    @InjectQueue('insights')
    private readonly insightsQueue?: Queue<InsightsJobPayload>,
  ) {
    super();
  }

  /**
   * Phase 1: Process message analysis job
   */
  async process(job: Job<MessageAnalysisJobPayload>): Promise<void> {
    const startedAt = Date.now();
    const { sessionId, messageIndex, userId } = job.data;
    
    this.logger.log(
      `Processing message analysis for session ${sessionId}, message index ${messageIndex}`,
    );

    try {
      // Step 1: Load session and messages
      const session = await this.prisma.practiceSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            where: {
              turnIndex: { lte: messageIndex },
            },
            orderBy: { turnIndex: 'asc' },
          },
        },
      });

      if (!session) {
        this.logger.warn(`Session ${sessionId} not found, skipping job`);
        return;
      }

      if (userId && session.userId !== userId) {
        this.logger.warn(`Session ${sessionId} does not belong to user ${userId}, skipping job`);
        return;
      }

      // Step 2: Load engine config
      const engineConfig = this.engineConfigService
        ? await this.engineConfigService.getGlobalConfig()
        : null;

      if (!engineConfig) {
        this.logger.warn(`Engine config not available, skipping job`);
        return;
      }

      // Step 3: Call ScoringRuntime
      const scoringResult = await this.scoringRuntime.scoreMessage(
        session,
        session.messages,
        messageIndex,
        engineConfig,
      );

      // Step 4: Evaluate hooks for this message
      const firedHooks = await this.evaluateHooksForMessage(
        session,
        session.messages,
        messageIndex,
        scoringResult,
        engineConfig,
      );

      // Step 5: Accumulate hook evidence per cluster
      const evidenceScores = await this.accumulateHookEvidence(
        session,
        session.messages,
        firedHooks,
        engineConfig,
      );

      // Step 6: Compute authoritative mood state
      const moodState = await this.computeMoodStateFromEvidence(
        session,
        evidenceScores,
        engineConfig,
      );

      // Step 9: Persist scoring results first (so traits/gates can read from it)
      const targetMessage = session.messages.find((m) => m.turnIndex === messageIndex);
      if (targetMessage) {
        await this.prisma.chatMessage.update({
          where: { id: targetMessage.id },
          data: {
            // Store scoring result and mood state in traitData (fields may not be in generated client)
            traitData: {
              ...(targetMessage.traitData as any),
              hooks: firedHooks,
              scoringSnapshot: scoringResult,
              moodStateAfterMessage: moodState,
            } as any,
          },
        });
      }

      // Update session currentMoodState (field exists in schema but may not be in generated client)
      // Store in payload instead if field doesn't exist
      await this.prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          // Use type assertion since field exists in schema
          currentMoodState: moodState,
        } as any,
      });

      // Step 10: Update traits & XP (reads from persisted scoringSnapshot)
      // Traits service reads from ChatMessage.scoringSnapshot and traitData after persistence
      if (this.traitsService) {
        try {
          await this.traitsService.persistTraitHistoryAndUpdateScores(session.userId, sessionId);
        } catch (err: any) {
          this.logger.error(`Trait update failed for ${sessionId}:`, err);
          // Continue with other analytics
        }
      }

      // Step 11: Evaluate gates (reads from persisted scoringSnapshot and session state)
      // Gates service reads from session state and ChatMessage.scoringSnapshot after persistence
      let missionEnded = false;
      if (this.gatesService) {
        try {
          await this.gatesService.evaluateAndPersist(sessionId);
          // Check if mission ended by reading gate outcomes from DB
          if (session.status === 'IN_PROGRESS') {
            const gateOutcomes = await this.prisma.gateOutcome.findMany({
              where: { sessionId, passed: false },
            });
            // Check if any gate indicates mission end (would need to check gate config for isFinal)
            // For now, just check if any gates failed
            if (gateOutcomes.length > 0) {
              // Mission end logic would be determined by gate configuration
              // This is a simplified check
            }
          }
        } catch (err: any) {
          this.logger.error(`Gate evaluation failed for ${sessionId}:`, err);
          // Continue with other analytics
        }
      }

      // Step 12: If mission ended, enqueue insights job
      if (missionEnded && this.insightsQueue) {
        try {
          await this.insightsQueue.add(
            'insights',
            {
              sessionId,
              userId: session.userId,
            },
            {
              jobId: `insights:${sessionId}`,
            },
          );
          this.logger.log(`Enqueued insights job for ended session ${sessionId}`);
        } catch (err: any) {
          this.logger.error(`Failed to enqueue insights job:`, err);
        }
      }

      const duration = Date.now() - startedAt;
      this.logger.log(
        `Message analysis completed for session ${sessionId}, message ${messageIndex} in ${duration}ms`,
      );
    } catch (error: any) {
      this.logger.error(
        `Message analysis job failed for session ${sessionId}, message ${messageIndex}:`,
        error,
      );
      // Don't throw - let BullMQ handle retries
      throw error;
    }
  }

  /**
   * Phase 1: Evaluate hooks for a single message
   */
  private async evaluateHooksForMessage(
    session: PracticeSession,
    messages: ChatMessage[],
    messageIndex: number,
    scoringResult: ScoringResult,
    engineConfig: EngineConfigJson,
  ): Promise<string[]> {
    const firedHooks: string[] = [];

    // Load enabled hooks
    const enabledHooks = await this.prisma.promptHook.findMany({
      where: { isEnabled: true },
      orderBy: { priority: 'desc' },
    });

    if (enabledHooks.length === 0) {
      return firedHooks;
    }

    // Get target message
    const targetMessage = messages.find((m) => m.turnIndex === messageIndex);
    if (!targetMessage || targetMessage.role !== 'USER') {
      return firedHooks; // Only evaluate hooks for user messages
    }

    // Build context for hook evaluation
    const userMessages = messages.filter((m) => m.role === 'USER');
    const traitData = (targetMessage.traitData as any) || {};
    const traits = traitData.traits || {};

    // Extract dimensions from scoring result
    const dimensions = scoringResult.dimensions || {};
    const semanticFlags = scoringResult.semanticFlags || {};

    // Evaluate each hook
    for (const hook of enabledHooks) {
      try {
        const conditions = (hook.conditionsJson as any) || {};
        
        // Phase 1: Simple condition evaluation
        // Check if hook conditions match scoring result
        let matches = true;

        // Check required traits
        if (conditions.requiredTraits && Array.isArray(conditions.requiredTraits)) {
          for (const traitCond of conditions.requiredTraits) {
            const traitValue = traits[traitCond.trait] || dimensions[traitCond.trait] || 0;
            if (traitCond.operator === 'gte' && traitValue < traitCond.value) {
              matches = false;
              break;
            }
            if (traitCond.operator === 'lte' && traitValue > traitCond.value) {
              matches = false;
              break;
            }
          }
        }

        // Check semantic flags
        if (conditions.requiredFlags && Array.isArray(conditions.requiredFlags)) {
          for (const flag of conditions.requiredFlags) {
            if (!semanticFlags[flag]) {
              matches = false;
              break;
            }
          }
        }

        if (matches) {
          // Check cooldown
          const lastTrigger = await this.prisma.promptHookTrigger.findFirst({
            where: {
              hookId: hook.id,
              sessionId: session.id,
            },
            orderBy: { triggeredAt: 'desc' },
          });

          const meta = (hook.metaJson as any) || {};
          const cooldownSeconds = meta.cooldownSeconds ?? 0;

          if (!lastTrigger || cooldownSeconds === 0 || 
              (Date.now() - lastTrigger.triggeredAt.getTime()) / 1000 >= cooldownSeconds) {
            // Create trigger
            await this.prisma.promptHookTrigger.create({
              data: {
                hookId: hook.id,
                sessionId: session.id,
                userId: session.userId,
                matchedContext: {
                  messageIndex,
                  scoringResult,
                } as any,
              },
            });

            firedHooks.push(hook.id);
          }
        }
      } catch (err: any) {
        this.logger.warn(`Error evaluating hook ${hook.id}:`, err);
        // Continue with other hooks
      }
    }

    return firedHooks;
  }

  /**
   * Phase 1: Accumulate hook evidence per cluster
   */
  private async accumulateHookEvidence(
    session: PracticeSession,
    messages: ChatMessage[],
    firedHooks: string[],
    engineConfig: EngineConfigJson,
  ): Promise<Record<string, number>> {
    const evidenceScores: Record<string, number> = {};

    // Load all hooks to get cluster info
    const hookIds = firedHooks;
    if (hookIds.length === 0) {
      return evidenceScores;
    }

    const hooks = await this.prisma.promptHook.findMany({
      where: { id: { in: hookIds } },
    });

    // Phase 1: Simple evidence accumulation
    // For each fired hook, add its moodImpactWeight to its cluster
    for (const hook of hooks) {
      const meta = (hook.metaJson as any) || {};
      const clusterKey = meta.clusterKey || 'default';
      const moodImpactWeight = meta.moodImpactWeight || 1.0;

      evidenceScores[clusterKey] = (evidenceScores[clusterKey] || 0) + moodImpactWeight;
    }

    // Store evidence in session payload for persistence
    const payload = (session.payload as any) || {};
    const existingEvidence = payload.hookEvidence || {};
    
    // Merge new evidence with existing
    for (const [cluster, weight] of Object.entries(evidenceScores)) {
      existingEvidence[cluster] = (existingEvidence[cluster] || 0) + weight;
    }

    await this.prisma.practiceSession.update({
      where: { id: session.id },
      data: {
        payload: {
          ...payload,
          hookEvidence: existingEvidence,
        } as any,
      },
    });

    return existingEvidence;
  }

  /**
   * Phase 1: Compute authoritative mood state from evidence
   */
  private async computeMoodStateFromEvidence(
    session: PracticeSession,
    evidenceScores: Record<string, number>,
    engineConfig: EngineConfigJson,
  ): Promise<string> {
    // Phase 1: Simple mood computation
    // Use existing mood service if available, otherwise use simple logic
    if (this.moodService) {
      // Get current mood state (field exists in schema but may not be in generated client)
      const currentMoodState = (session as any).currentMoodState || 'NEUTRAL';
      
      // Phase 1: Simple mood transition based on evidence
      // Positive evidence → better mood, negative evidence → worse mood
      const positiveEvidence = evidenceScores['positive'] || 0;
      const negativeEvidence = evidenceScores['negative'] || 0;
      const netEvidence = positiveEvidence - negativeEvidence;

      // Use mood config if available
      const moodConfig = engineConfig.mood;
      if (moodConfig && moodConfig.moodStateThresholds) {
        // For Phase 1, use simple threshold-based transitions
        // This will be refined in Phase 2
        if (netEvidence > 5) {
          return 'FLOW';
        } else if (netEvidence < -5) {
          return 'TENSE';
        } else if (netEvidence > 2) {
          return 'WARM';
        } else if (netEvidence < -2) {
          return 'COLD';
        }
        return currentMoodState;
      }
    }

    // Fallback: return current mood or default (field exists in schema but may not be in generated client)
    return (session as any).currentMoodState || 'NEUTRAL';
  }
}

