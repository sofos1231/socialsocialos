// FILE: backend/src/modules/queue/workers/deep-analysis.worker.ts
// Step 8: Deep Analysis Worker - Processes analytics asynchronously

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../db/prisma.service';
import { DeepAnalysisJobPayload } from '../jobs/deep-analysis.job';
// Step 8: Import analytics services
import { MoodService } from '../../mood/mood.service';
import { TraitsService } from '../../traits/traits.service';
import { GatesService } from '../../gates/gates.service';
import { PromptsService } from '../../prompts/prompts.service';
import { InsightsService } from '../../insights/insights.service';
import { SynergyService } from '../../synergy/synergy.service';

/**
 * Step 8: Deep Analysis Worker
 * Processes DEEP_ANALYSIS jobs asynchronously to compute heavy analytics
 */
@Processor('deep-analysis')
@Injectable()
export class DeepAnalysisWorker extends WorkerHost {
  private readonly logger = new Logger(DeepAnalysisWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly moodService: MoodService,
    private readonly traitsService: TraitsService,
    private readonly gatesService: GatesService,
    private readonly promptsService: PromptsService,
    private readonly insightsService: InsightsService,
    private readonly synergyService: SynergyService,
  ) {
    super();
  }

  /**
   * Step 8: Process deep analysis job
   * Computes all Step 5-6 analytics and updates lastAnalyzedMessageIndex
   */
  async process(job: Job<DeepAnalysisJobPayload>): Promise<void> {
    // TODO: record deep_analyzer_processing_time_ms here (start timer)
    // TODO: record deep_analysis_queue_depth (BullMQ provides this)
    const { sessionId, userId, lastMessageIndex } = job.data;
    this.logger.log(
      `Processing deep analysis job for session ${sessionId}, message index ${lastMessageIndex}`,
    );

    try {
      // Step 1: Load session
      const session = await this.prisma.practiceSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          userId: true,
          status: true,
          payload: true,
        },
      });

      if (!session) {
        this.logger.warn(`Session ${sessionId} not found, skipping job`);
        return;
      }

      if (session.userId !== userId) {
        this.logger.warn(`Session ${sessionId} does not belong to user ${userId}, skipping job`);
        return;
      }

      // Phase 1.1: Check if already processed by new message-analysis pipeline
      // If session has MissionDeepInsights, skip to avoid duplicate work
      const messages = await this.prisma.chatMessage.findMany({
        where: { sessionId },
        select: { id: true, traitData: true },
        take: 1,
      });
      
      // Check traitData for scoring info instead of scoringSnapshot
      const hasScoringSnapshots = messages.some((m) => {
        const traitData = m.traitData as any;
        return traitData?.scoringSnapshot !== null && traitData?.scoringSnapshot !== undefined;
      });
      const hasInsights = await this.prisma.missionDeepInsights.findUnique({
        where: { sessionId },
        select: { id: true },
      });

      if (hasScoringSnapshots || hasInsights) {
        this.logger.log(
          `Session ${sessionId} already processed by message-analysis pipeline (has scoring snapshots or insights), skipping deep-analysis`,
        );
        return;
      }

      // Step 2: Check if already analyzed (avoid duplicate work)
      const payload = session.payload as any;
      const deepAnalysisMetadata = payload?.deepAnalysisMetadata ?? {};
      const currentAnalyzedIndex = deepAnalysisMetadata.lastAnalyzedMessageIndex ?? -1;

      if (currentAnalyzedIndex >= lastMessageIndex) {
        this.logger.log(
          `Session ${sessionId} already analyzed up to index ${currentAnalyzedIndex}, skipping`,
        );
        return;
      }

      // Step 3: Run analytics services (same as before, but async now)
      // These are the services that were removed from createScoredSessionFromScores hot path
      try {
        await this.moodService.buildAndPersistForSession(userId, sessionId);
      } catch (err: any) {
        this.logger.error(`Mood Timeline failed for ${sessionId}:`, err);
        // Continue with other analytics
      }

      try {
        await this.traitsService.persistTraitHistoryAndUpdateScores(userId, sessionId);
      } catch (err: any) {
        this.logger.error(`Trait History failed for ${sessionId}:`, err);
        // Continue with other analytics
      }

      try {
        await this.gatesService.evaluateAndPersist(sessionId);
      } catch (err: any) {
        this.logger.error(`Gate Outcomes failed for ${sessionId}:`, err);
        // Continue with other analytics
      }

      try {
        await this.promptsService.matchAndTriggerHooksForSession(sessionId);
      } catch (err: any) {
        this.logger.error(`Prompt Hooks failed for ${sessionId}:`, err);
        // Continue with other analytics
      }

      try {
        await this.insightsService.buildAndPersistForSession(sessionId);
      } catch (err: any) {
        this.logger.error(`Deep Insights failed for ${sessionId}:`, err);
        // Continue with other analytics
      }

      try {
        await this.synergyService.computeAndPersistSynergy(userId, sessionId);
      } catch (err: any) {
        this.logger.error(`Trait Synergy failed for ${sessionId}:`, err);
        // Continue with other analytics
      }

      // Step 4: Update lastAnalyzedMessageIndex in session payload
      const updatedPayload = {
        ...payload,
        deepAnalysisMetadata: {
          ...deepAnalysisMetadata,
          lastAnalyzedMessageIndex: lastMessageIndex,
          lastAnalyzedAt: new Date().toISOString(),
        },
      };

      await this.prisma.practiceSession.update({
        where: { id: sessionId },
        data: {
          payload: updatedPayload as any,
        },
      });

      this.logger.log(
        `Deep analysis completed for session ${sessionId}, analyzed up to index ${lastMessageIndex}`,
      );
      // TODO: record deep_analyzer_processing_time_ms here (stop timer)
      // TODO: record deep_analyzer_success_total
    } catch (error: any) {
      // TODO: record queue_processing_errors_total (error, sessionId, jobId)
      // TODO: record deep_analyzer_errors_total
      this.logger.error(`Deep analysis job failed for session ${sessionId}:`, error);
      // Don't throw - let BullMQ handle retries
      throw error;
    }
  }
}

