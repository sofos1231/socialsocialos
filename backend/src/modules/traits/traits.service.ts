// backend/src/modules/traits/traits.service.ts
// Step 5.1: Trait history and long-term scores service

import { Injectable, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { EngineConfigService } from '../engine-config/engine-config.service';
import { Prisma } from '@prisma/client';
import { loadSessionAnalyticsSnapshot } from '../shared/helpers/session-snapshot.helper';

/**
 * Trait snapshot - aggregated trait values for a session
 */
export interface TraitSnapshot {
  confidence: number;
  clarity: number;
  humor: number;
  tensionControl: number;
  emotionalWarmth: number;
  dominance: number;
}

/**
 * Core trait keys (must match CharismaTraitKey from insights)
 */
const TRAIT_KEYS: (keyof TraitSnapshot)[] = [
  'confidence',
  'clarity',
  'humor',
  'tensionControl',
  'emotionalWarmth',
  'dominance',
];

/**
 * Clamps value to 0-100 range
 */
function clampTrait(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

@Injectable()
export class TraitsService {
  private traitEmaAlpha: number = 0.3; // Default, will be loaded from config

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(forwardRef(() => EngineConfigService))
    private readonly engineConfigService?: EngineConfigService,
  ) {
    // Load trait EMA alpha from config
    this.loadTraitEmaAlpha();
  }

  /**
   * Load trait EMA alpha from EngineConfig
   */
  private async loadTraitEmaAlpha() {
    try {
      if (this.engineConfigService) {
        const profile = await this.engineConfigService.getScoringProfile();
        if (profile?.traitEmaAlpha !== undefined) {
          this.traitEmaAlpha = profile.traitEmaAlpha;
        }
      }
    } catch (e) {
      // Fallback to default
      this.traitEmaAlpha = 0.3;
    }
  }

  /**
   * Computes trait snapshot for a session
   * Aggregates traits from USER messages (average, clamped 0-100)
   * 
   * @param sessionId - Session ID to compute snapshot for
   * @returns TraitSnapshot with aggregated values
   */
  async computeSessionTraitSnapshot(
    sessionId: string,
  ): Promise<TraitSnapshot> {
    const snapshot = await loadSessionAnalyticsSnapshot(this.prisma, sessionId);

    const userMessages = snapshot.messages.filter((m) => m.role === 'USER');

    if (userMessages.length === 0) {
      throw new Error(`Session ${sessionId} has no USER messages`);
    }

    // Aggregate traits across all USER messages
    const traitSums: Partial<Record<keyof TraitSnapshot, number>> = {};
    const traitCounts: Partial<Record<keyof TraitSnapshot, number>> = {};

    for (const msg of userMessages) {
      const traits = msg.traitData.traits || {};
      for (const key of TRAIT_KEYS) {
        const value = traits[key];
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100) {
          traitSums[key] = (traitSums[key] || 0) + value;
          traitCounts[key] = (traitCounts[key] || 0) + 1;
        }
      }
    }

    // Compute averages and clamp
    const snapshotResult: Partial<TraitSnapshot> = {};
    for (const key of TRAIT_KEYS) {
      const sum = traitSums[key] || 0;
      const count = traitCounts[key] || 0;
      const avg = count > 0 ? sum / count : 0;
      snapshotResult[key] = clampTrait(avg);
    }

    // Ensure all traits are present (default to 0 if missing)
    const result: TraitSnapshot = {
      confidence: snapshotResult.confidence ?? 0,
      clarity: snapshotResult.clarity ?? 0,
      humor: snapshotResult.humor ?? 0,
      tensionControl: snapshotResult.tensionControl ?? 0,
      emotionalWarmth: snapshotResult.emotionalWarmth ?? 0,
      dominance: snapshotResult.dominance ?? 0,
    };

    return result;
  }

  /**
   * Computes deltas between current snapshot and previous scores
   * 
   * @param current - Current trait snapshot
   * @param previous - Previous trait scores (from UserTraitScores) or null
   * @returns Delta object (current - previous, or current if no previous)
   */
  computeDeltas(
    current: TraitSnapshot,
    previous: TraitSnapshot | null,
  ): TraitSnapshot {
    if (!previous) {
      // No previous scores - deltas are just current values
      return { ...current };
    }

    return {
      confidence: current.confidence - previous.confidence,
      clarity: current.clarity - previous.clarity,
      humor: current.humor - previous.humor,
      tensionControl: current.tensionControl - previous.tensionControl,
      emotionalWarmth: current.emotionalWarmth - previous.emotionalWarmth,
      dominance: current.dominance - previous.dominance,
    };
  }

  /**
   * Updates long-term trait scores using exponential moving average
   * Formula: newScore = (current * 0.7) + (previous * 0.3)
   * This gives more weight to recent performance while preserving history
   * 
   * @param current - Current session snapshot
   * @param previous - Previous long-term scores or null
   * @returns Updated long-term scores
   */
  updateLongTermScores(
    current: TraitSnapshot,
    previous: TraitSnapshot | null,
  ): TraitSnapshot {
    if (!previous) {
      // First session - use current as baseline
      return { ...current };
    }

    // Exponential moving average (loaded from config, default 0.7)
    const alpha = this.traitEmaAlpha;
    const result: TraitSnapshot = {
      confidence: clampTrait(current.confidence * alpha + previous.confidence * (1 - alpha)),
      clarity: clampTrait(current.clarity * alpha + previous.clarity * (1 - alpha)),
      humor: clampTrait(current.humor * alpha + previous.humor * (1 - alpha)),
      tensionControl: clampTrait(
        current.tensionControl * alpha + previous.tensionControl * (1 - alpha),
      ),
      emotionalWarmth: clampTrait(
        current.emotionalWarmth * alpha + previous.emotionalWarmth * (1 - alpha),
      ),
      dominance: clampTrait(current.dominance * alpha + previous.dominance * (1 - alpha)),
    };

    return result;
  }

  /**
   * Persists trait history and updates long-term scores
   * Idempotent: upserts by sessionId (history) and userId (scores)
   * 
   * @param userId - User ID
   * @param sessionId - Session ID
   */
  async persistTraitHistoryAndUpdateScores(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const snapshot = await loadSessionAnalyticsSnapshot(this.prisma, sessionId);

    // Compute current session snapshot
    const currentSnapshot = await this.computeSessionTraitSnapshot(sessionId);

    // Load previous long-term scores (if any)
    const previousScoresRow = await this.prisma.userTraitScores.findUnique({
      where: { userId },
    });

    const previousScores: TraitSnapshot | null = previousScoresRow?.traitsJson
      ? (previousScoresRow.traitsJson as any as TraitSnapshot)
      : null;

    // Compute deltas
    const deltas = this.computeDeltas(currentSnapshot, previousScores);

    // Compute average message score
    const userMessages = snapshot.messages.filter((m) => m.role === 'USER');
    const scores = userMessages
      .map((m) => m.score)
      .filter((s): s is number => typeof s === 'number' && s >= 0 && s <= 100);
    const avgMessageScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : null;

    // Get session score (from PracticeSession)
    const session = await this.prisma.practiceSession.findUnique({
      where: { id: sessionId },
      select: { score: true },
    });
    const sessionScore = session?.score ?? null;

    // Upsert trait history (unique by sessionId)
    await this.prisma.userTraitHistory.upsert({
      where: { sessionId },
      create: {
        sessionId,
        userId,
        traitsJson: currentSnapshot as unknown as Prisma.InputJsonValue,
        deltasJson: deltas as unknown as Prisma.InputJsonValue,
        sessionScore,
        avgMessageScore,
        missionId: snapshot.templateId ?? null,
        recordedAt: new Date(),
      },
      update: {
        traitsJson: currentSnapshot as unknown as Prisma.InputJsonValue,
        deltasJson: deltas as unknown as Prisma.InputJsonValue,
        sessionScore,
        avgMessageScore,
        missionId: snapshot.templateId ?? null,
      },
    });

    // Update long-term scores
    const updatedScores = this.updateLongTermScores(currentSnapshot, previousScores);

    // Upsert long-term scores (unique by userId)
    await this.prisma.userTraitScores.upsert({
      where: { userId },
      create: {
        userId,
        traitsJson: updatedScores as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
      update: {
        traitsJson: updatedScores as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
  }
}

