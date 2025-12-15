// FILE: backend/src/modules/queue/workers/insights.worker.ts
// Phase 1: Insights Worker - Generates deep insights at mission end

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../db/prisma.service';
import { InsightsJobPayload } from '../jobs/insights.job';
import { MissionStatus } from '@prisma/client';
import { InsightsService } from '../../insights/insights.service';

/**
 * Phase 1: Insights Worker
 * Generates deep insights for finalized missions
 */
@Processor('insights')
@Injectable()
export class InsightsWorker extends WorkerHost {
  private readonly logger = new Logger(InsightsWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly insightsService: InsightsService,
  ) {
    super();
  }

  /**
   * Phase 1: Process insights job
   */
  async process(job: Job<InsightsJobPayload>): Promise<void> {
    const startedAt = Date.now();
    const { sessionId, userId } = job.data;

    this.logger.log(`Processing insights job for session ${sessionId}`);

    try {
      // Step 1: Load session
      const session = await this.prisma.practiceSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        this.logger.warn(`Session ${sessionId} not found, skipping job`);
        return;
      }

      if (userId && session.userId !== userId) {
        this.logger.warn(`Session ${sessionId} does not belong to user ${userId}, skipping job`);
        return;
      }

      // Step 2: Check if session is finalized
      const isFinalized =
        session.status === MissionStatus.SUCCESS ||
        session.status === MissionStatus.FAIL ||
        session.status === MissionStatus.ABORTED;

      if (!isFinalized) {
        this.logger.warn(`Session ${sessionId} is not finalized (status: ${session.status}), skipping insights`);
        return;
      }

      // Step 3: Check if insights already exist (avoid double-generation)
      const existingInsights = await this.prisma.missionDeepInsights.findUnique({
        where: { sessionId },
      });

      if (existingInsights) {
        this.logger.log(`Insights already exist for session ${sessionId}, skipping`);
        return;
      }

      // Step 4: Generate insights using existing service
      await this.insightsService.buildAndPersistForSession(sessionId);

      const duration = Date.now() - startedAt;
      this.logger.log(`Insights generation completed for session ${sessionId} in ${duration}ms`);
    } catch (error: any) {
      this.logger.error(`Insights job failed for session ${sessionId}:`, error);
      // Don't throw - let BullMQ handle retries
      throw error;
    }
  }
}

