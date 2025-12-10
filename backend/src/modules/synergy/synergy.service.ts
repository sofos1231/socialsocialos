// backend/src/modules/synergy/synergy.service.ts
// Step 5.9: Trait Synergy Map computation service

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { TraitKey } from '../stats/stats.types';
import {
  CandidateInsight,
  InsightKind,
  InsightSource,
  RotationSurface,
} from '../insights/insights.types';

const logger = new Logger('SynergyService');

/**
 * Step 5.9: Synergy JSON payload structure (versioned for forward compatibility)
 */
export interface SynergyJsonPayload {
  version: 'v1';
  correlationMatrix: Record<TraitKey, Record<TraitKey, number>>;
  graphData: {
    nodes: Array<{
      id: TraitKey;
      label: string;
      x: number;
      y: number;
    }>;
    edges: Array<{
      source: TraitKey;
      target: TraitKey;
      weight: number; // -1 to 1 correlation
    }>;
  };
  emotionLinks: {
    moodStateAtEnd: string | null; // Reserved for Step 5.10
    tensionTrendHint: 'RISING' | 'FALLING' | 'FLAT' | null;
    candidateDrivers: Array<{
      traitKey: string;
      reason: string;
    }>;
  };
}

/**
 * Trait labels for display
 */
const TRAIT_LABELS: Record<TraitKey, string> = {
  confidence: 'Confidence',
  clarity: 'Clarity',
  humor: 'Humor',
  tensionControl: 'Tension Control',
  emotionalWarmth: 'Emotional Warmth',
  dominance: 'Dominance',
};

/**
 * All trait keys in fixed order (for deterministic processing)
 */
const ALL_TRAIT_KEYS: TraitKey[] = [
  'confidence',
  'clarity',
  'humor',
  'tensionControl',
  'emotionalWarmth',
  'dominance',
];

/**
 * Step 5.9: Deterministic node positions (fixed circle layout)
 * Positions are fixed to ensure determinism - no randomness
 */
function getDeterministicNodePositions(): Array<{ id: TraitKey; label: string; x: number; y: number }> {
  const radius = 150;
  const centerX = 200;
  const centerY = 200;
  const count = ALL_TRAIT_KEYS.length;
  
  return ALL_TRAIT_KEYS.map((traitKey, index) => {
    const angle = (2 * Math.PI * index) / count - Math.PI / 2; // Start at top
    return {
      id: traitKey,
      label: TRAIT_LABELS[traitKey],
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });
}

/**
 * Step 5.9: Compute Pearson-like correlation coefficient between two trait arrays
 * Deterministic: same inputs always produce same output
 */
function computeCorrelation(
  traitAValues: number[],
  traitBValues: number[],
): number {
  if (traitAValues.length !== traitBValues.length || traitAValues.length === 0) {
    return 0;
  }

  const n = traitAValues.length;
  
  // Compute means
  const meanA = traitAValues.reduce((sum, v) => sum + v, 0) / n;
  const meanB = traitBValues.reduce((sum, v) => sum + v, 0) / n;

  // Compute covariance and variances
  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;

  for (let i = 0; i < n; i++) {
    const diffA = traitAValues[i] - meanA;
    const diffB = traitBValues[i] - meanB;
    covariance += diffA * diffB;
    varianceA += diffA * diffA;
    varianceB += diffB * diffB;
  }

  // Pearson correlation: cov / sqrt(varA * varB)
  const denominator = Math.sqrt(varianceA * varianceB);
  if (denominator === 0) {
    return 0;
  }

  const correlation = covariance / denominator;
  
  // Clamp to [-1, 1] and round to 2 decimal places for determinism
  return Math.max(-1, Math.min(1, Math.round(correlation * 100) / 100));
}

@Injectable()
export class SynergyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Step 5.9: Compute and persist trait synergy for a session
   * 
   * @param userId - User ID
   * @param sessionId - Session ID
   */
  async computeAndPersistSynergy(userId: string, sessionId: string): Promise<void> {
    try {
      // 1) Load trait history for user (last K sessions, sorted deterministically)
      const K = 15; // Use last 15 sessions for correlation computation
      const MIN_SESSIONS = 5; // Minimum sessions required for meaningful correlation

      const history = await this.prisma.userTraitHistory.findMany({
        where: {
          userId,
          // Exclude current session (it may not be finalized yet)
          sessionId: { not: sessionId },
        },
        orderBy: {
          recordedAt: 'asc', // Deterministic: oldest first
        },
        take: K,
        select: {
          traitsJson: true,
        },
      });

      // 2) If insufficient sessions, write minimal synergyJson
      if (history.length < MIN_SESSIONS) {
        logger.debug(
          `Insufficient trait history for synergy (${history.length} < ${MIN_SESSIONS}), writing minimal payload`,
        );
        
        const minimalPayload: SynergyJsonPayload = {
          version: 'v1',
          correlationMatrix: this.buildEmptyCorrelationMatrix(),
          graphData: {
            nodes: getDeterministicNodePositions(),
            edges: [],
          },
          emotionLinks: {
            moodStateAtEnd: null,
            tensionTrendHint: null,
            candidateDrivers: [],
          },
        };

        await this.prisma.sessionTraitSynergy.upsert({
          where: { sessionId },
          create: {
            sessionId,
            userId,
            synergyJson: minimalPayload as any,
            computedAt: new Date(),
          },
          update: {
            synergyJson: minimalPayload as any,
            computedAt: new Date(),
          },
        });

        return;
      }

      // 3) Extract trait values from history (deterministic order)
      const traitValues: Record<TraitKey, number[]> = {
        confidence: [],
        clarity: [],
        humor: [],
        tensionControl: [],
        emotionalWarmth: [],
        dominance: [],
      };

      for (const row of history) {
        const traits = row.traitsJson as any as Record<TraitKey, number>;
        for (const traitKey of ALL_TRAIT_KEYS) {
          const value = typeof traits[traitKey] === 'number' ? traits[traitKey] : 0;
          traitValues[traitKey].push(value);
        }
      }

      // 4) Compute correlation matrix (deterministic)
      const correlationMatrix: Record<TraitKey, Record<TraitKey, number>> = {
        confidence: {},
        clarity: {},
        humor: {},
        tensionControl: {},
        emotionalWarmth: {},
        dominance: {},
      };

      for (const traitA of ALL_TRAIT_KEYS) {
        for (const traitB of ALL_TRAIT_KEYS) {
          if (traitA === traitB) {
            correlationMatrix[traitA][traitB] = 1.0; // Self-correlation
          } else {
            const correlation = computeCorrelation(
              traitValues[traitA],
              traitValues[traitB],
            );
            correlationMatrix[traitA][traitB] = correlation;
          }
        }
      }

      // 5) Build graph data with deterministic positions
      const nodes = getDeterministicNodePositions();
      const edges: Array<{ source: TraitKey; target: TraitKey; weight: number }> = [];

      // Add edges for all trait pairs (filter weak correlations if desired)
      for (let i = 0; i < ALL_TRAIT_KEYS.length; i++) {
        for (let j = i + 1; j < ALL_TRAIT_KEYS.length; j++) {
          const traitA = ALL_TRAIT_KEYS[i];
          const traitB = ALL_TRAIT_KEYS[j];
          const weight = correlationMatrix[traitA][traitB];
          
          // Include all edges (or filter by threshold, e.g., |weight| > 0.3)
          edges.push({
            source: traitA,
            target: traitB,
            weight,
          });
        }
      }

      // 6) Build synergy payload with emotionLinks placeholder
      const synergyPayload: SynergyJsonPayload = {
        version: 'v1',
        correlationMatrix,
        graphData: {
          nodes,
          edges,
        },
        emotionLinks: {
          moodStateAtEnd: null, // Reserved for Step 5.10
          tensionTrendHint: null, // Reserved for Step 5.10
          candidateDrivers: [], // Reserved for Step 5.10
        },
      };

      // 7) Upsert into SessionTraitSynergy
      await this.prisma.sessionTraitSynergy.upsert({
        where: { sessionId },
        create: {
          sessionId,
          userId,
          synergyJson: synergyPayload as any,
          computedAt: new Date(),
        },
        update: {
          synergyJson: synergyPayload as any,
          computedAt: new Date(),
        },
      });

      logger.debug(`Computed and persisted trait synergy for session ${sessionId}`);
    } catch (error: any) {
      logger.error(
        `Failed to compute trait synergy for session ${sessionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Build empty correlation matrix (all zeros)
   */
  private buildEmptyCorrelationMatrix(): Record<TraitKey, Record<TraitKey, number>> {
    const matrix: Record<TraitKey, Record<TraitKey, number>> = {
      confidence: {},
      clarity: {},
      humor: {},
      tensionControl: {},
      emotionalWarmth: {},
      dominance: {},
    };

    for (const traitA of ALL_TRAIT_KEYS) {
      for (const traitB of ALL_TRAIT_KEYS) {
        matrix[traitA][traitB] = traitA === traitB ? 1.0 : 0.0;
      }
    }

    return matrix;
  }

  /**
   * Step 5.11: Get synergy candidates for rotation engine
   * Generates insight candidates from high-correlation trait pairs
   * 
   * @param synergyJson - Synergy JSON payload (from SessionTraitSynergy)
   * @returns Array of CandidateInsight objects
   */
  async getSynergyCandidatesForRotation(
    synergyJson: SynergyJsonPayload,
  ): Promise<CandidateInsight[]> {
    const candidates: CandidateInsight[] = [];
    const correlationMatrix = synergyJson.correlationMatrix;
    const CORRELATION_THRESHOLD = 0.45; // Minimum absolute correlation to generate insight

    // Process all trait pairs (deterministic order)
    for (let i = 0; i < ALL_TRAIT_KEYS.length; i++) {
      for (let j = i + 1; j < ALL_TRAIT_KEYS.length; j++) {
        const traitA = ALL_TRAIT_KEYS[i];
        const traitB = ALL_TRAIT_KEYS[j];
        const correlation = correlationMatrix[traitA]?.[traitB] ?? 0;

        // Only generate insights for high correlations
        if (Math.abs(correlation) >= CORRELATION_THRESHOLD) {
          const isPositive = correlation > 0;
          const labelA = TRAIT_LABELS[traitA];
          const labelB = TRAIT_LABELS[traitB];
          const absCorr = Math.abs(correlation);

          // Generate stable ID based on trait pair and correlation sign
          const insightId = `synergy_${traitA}_${traitB}_${isPositive ? 'positive' : 'negative'}_v1`;

          // Generate title and body based on correlation strength
          let title: string;
          let body: string;

          if (isPositive) {
            if (absCorr >= 0.7) {
              title = `Strong Synergy: ${labelA} & ${labelB}`;
              body = `Your ${labelA.toLowerCase()} and ${labelB.toLowerCase()} traits show a strong positive correlation (${correlation.toFixed(2)}). When one improves, the other tends to follow. This synergy creates a powerful foundation for growth.`;
            } else {
              title = `Synergy: ${labelA} & ${labelB}`;
              body = `Your ${labelA.toLowerCase()} and ${labelB.toLowerCase()} traits are positively correlated (${correlation.toFixed(2)}). Working on one can help strengthen the other.`;
            }
          } else {
            if (absCorr >= 0.7) {
              title = `Trade-off: ${labelA} vs ${labelB}`;
              body = `Your ${labelA.toLowerCase()} and ${labelB.toLowerCase()} traits show a strong negative correlation (${correlation.toFixed(2)}). When one increases, the other tends to decrease. Finding balance between these traits is key.`;
            } else {
              title = `Inverse Relationship: ${labelA} & ${labelB}`;
              body = `Your ${labelA.toLowerCase()} and ${labelB.toLowerCase()} traits are inversely related (${correlation.toFixed(2)}). Consider how to balance both effectively.`;
            }
          }

          candidates.push({
            id: insightId,
            kind: 'SYNERGY' as InsightKind,
            source: 'SYNERGY' as InsightSource,
            category: 'synergy',
            priority: Math.round(absCorr * 100), // Higher correlation = higher priority
            weight: Math.round(absCorr * 100),
            evidence: {
              // Store correlation value in evidence
            },
            isPremium: true, // Step 5.12: Synergy insights are premium (advanced analytics)
            surfaces: ['SYNERGY_MAP', 'ADVANCED_TAB'] as RotationSurface[],
            title: title, // Step 5.11: Include generated title
            body: body, // Step 5.11: Include generated body
          });
        }
      }
    }

    return candidates;
  }
}

