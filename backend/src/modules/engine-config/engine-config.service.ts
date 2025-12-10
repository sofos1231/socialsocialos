// backend/src/modules/engine-config/engine-config.service.ts
// Step 7.2: Engine Config service for global knobs

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import {
  EngineConfigJson,
  EngineScoringProfile,
  EngineDynamicsProfile,
  EngineGateConfig,
} from './engine-config.types';

@Injectable()
export class EngineConfigService {
  private readonly logger = new Logger(EngineConfigService.name);
  private cachedConfig: EngineConfigJson | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get global engine config
   * Caches in memory for performance
   */
  async getGlobalConfig(): Promise<EngineConfigJson> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    const row = await this.prisma.engineConfig.findUnique({
      where: { key: 'GLOBAL_V1' },
    });

    if (!row) {
      // Return default config (matches current hard-coded behavior)
      return this.getDefaultConfig();
    }

    const config = row.configJson as any as EngineConfigJson;
    this.cachedConfig = config;
    return config;
  }

  /**
   * Update global engine config (partial merge)
   */
  async updateGlobalConfig(partial: Partial<EngineConfigJson>): Promise<EngineConfigJson> {
    const current = await this.getGlobalConfig();
    const updated: EngineConfigJson = {
      ...current,
      ...partial,
      // Deep merge arrays/objects
      scoringProfiles: partial.scoringProfiles ?? current.scoringProfiles,
      dynamicsProfiles: partial.dynamicsProfiles ?? current.dynamicsProfiles,
      gates: partial.gates ?? current.gates,
      mood: partial.mood ? { ...current.mood, ...partial.mood } : current.mood,
      statePolicy: partial.statePolicy
        ? { ...current.statePolicy, ...partial.statePolicy }
        : current.statePolicy,
    };

    // Validate
    this.validateConfig(updated);

    // Save
    await this.prisma.engineConfig.upsert({
      where: { key: 'GLOBAL_V1' },
      create: {
        key: 'GLOBAL_V1',
        configJson: updated as any,
      },
      update: {
        configJson: updated as any,
      },
    });

    // Clear cache
    this.cachedConfig = null;

    this.logger.log('Engine config updated');
    return updated;
  }

  /**
   * Get default scoring profile by code
   */
  async getScoringProfile(code?: string | null): Promise<EngineScoringProfile | null> {
    const config = await this.getGlobalConfig();
    const profileCode = code || config.defaultScoringProfileCode;
    return (
      config.scoringProfiles.find((p) => p.code === profileCode && p.active) || null
    );
  }

  /**
   * Get default dynamics profile by code
   */
  async getDynamicsProfile(code?: string | null): Promise<EngineDynamicsProfile | null> {
    const config = await this.getGlobalConfig();
    const profileCode = code || config.defaultDynamicsProfileCode;
    return (
      config.dynamicsProfiles.find((p) => p.code === profileCode && p.active) || null
    );
  }

  /**
   * Get gate config by key
   */
  async getGateConfig(key: string): Promise<EngineGateConfig | null> {
    const config = await this.getGlobalConfig();
    return config.gates.find((g) => g.key === key && g.active) || null;
  }

  /**
   * Validate config structure
   */
  private validateConfig(config: EngineConfigJson): void {
    // Ensure default profiles exist
    const defaultScoring = config.scoringProfiles.find(
      (p) => p.code === config.defaultScoringProfileCode && p.active,
    );
    if (!defaultScoring) {
      throw new BadRequestException(
        `Default scoring profile "${config.defaultScoringProfileCode}" not found or inactive`,
      );
    }

    const defaultDynamics = config.dynamicsProfiles.find(
      (p) => p.code === config.defaultDynamicsProfileCode && p.active,
    );
    if (!defaultDynamics) {
      throw new BadRequestException(
        `Default dynamics profile "${config.defaultDynamicsProfileCode}" not found or inactive`,
      );
    }

    // Validate trait weights sum to ~1.0
    for (const profile of config.scoringProfiles) {
      if (profile.active) {
        const sum =
          profile.traitWeights.confidence +
          profile.traitWeights.clarity +
          profile.traitWeights.humor +
          profile.traitWeights.tensionControl +
          profile.traitWeights.emotionalWarmth +
          profile.traitWeights.dominance;
        if (Math.abs(sum - 1.0) > 0.1) {
          this.logger.warn(
            `Scoring profile ${profile.code} trait weights sum to ${sum}, expected ~1.0`,
          );
        }
      }
    }
  }

  /**
   * Get default config (matches current hard-coded behavior)
   */
  private getDefaultConfig(): EngineConfigJson {
    return {
      scoringProfiles: [
        {
          code: 'DEFAULT_DATING_V1',
          name: 'Default Dating Profile',
          description: 'Default scoring profile matching current behavior',
          active: true,
          traitWeights: {
            confidence: 0.3,
            clarity: 0.25,
            humor: 0.15,
            tensionControl: 0.1,
            emotionalWarmth: 0.2,
            dominance: 0.0, // Not used in charismaIndex currently
          },
          lengthThresholds: {
            empty: 10,
            veryShort: 35,
            short: 55,
            medium: 75,
            long: 82,
            veryLong: 70,
          },
          punctuationBonuses: {
            questionPerMark: 2,
            questionMax: 10,
            exclamationPerMark: 3,
            exclamationMax: 12,
          },
          positionBonuses: [0, 2, 4, 5],
          rarityThresholds: {
            sPlus: 92,
            s: 84,
            a: 72,
            b: 58,
            c: 0,
          },
          xpMultipliers: {
            sPlus: 1.8,
            s: 1.5,
            a: 1.25,
            b: 1.0,
            c: 0.8,
          },
          coinsMultipliers: {
            sPlus: 1.7,
            s: 1.4,
            a: 1.2,
            b: 1.0,
            c: 0.7,
          },
          traitAdjustments: [
            { pattern: 'questionMark', trait: 'tensionControl', value: 10 },
            { pattern: 'emoji', trait: 'humor', value: 20 },
            { pattern: 'softLanguage', trait: 'confidence', value: -15 },
            { pattern: 'softLanguage', trait: 'dominance', value: -10 },
            { pattern: 'leadingLanguage', trait: 'dominance', value: 15 },
            { pattern: 'warmWords', trait: 'emotionalWarmth', value: 15 },
          ],
          fillerWords: ['like', 'um', 'uh', 'you know', 'kinda', 'sort of'],
          traitBuckets: {
            confidence: { veryLow: 0, low: 20, medium: 40, high: 60, veryHigh: 80 },
            clarity: { veryLow: 0, low: 20, medium: 40, high: 60, veryHigh: 80 },
            humor: { veryLow: 0, low: 20, medium: 40, high: 60, veryHigh: 80 },
            tensionControl: { veryLow: 0, low: 20, medium: 40, high: 60, veryHigh: 80 },
            emotionalWarmth: { veryLow: 0, low: 20, medium: 40, high: 60, veryHigh: 80 },
            dominance: { veryLow: 0, low: 20, medium: 40, high: 60, veryHigh: 80 },
          },
          traitEmaAlpha: 0.3, // Matches original traits.service.ts default
          strictMode: false,
          softCoachingMode: false,
        },
      ],
      defaultScoringProfileCode: 'DEFAULT_DATING_V1',
      dynamicsProfiles: [
        {
          code: 'NEUTRAL',
          name: 'Neutral',
          description: 'Balanced, moderate settings across all dynamics',
          active: true,
          pace: 50,
          emojiDensity: 30,
          flirtiveness: 40,
          hostility: 10,
          dryness: 40,
          vulnerability: 50,
          escalationSpeed: 50,
          randomness: 25,
        },
        {
          code: 'COLD_APPROACH_EASY',
          name: 'Cold Approach (Easy)',
          description: 'Friendly, approachable, low resistance for practice',
          active: true,
          pace: 45,
          emojiDensity: 40,
          flirtiveness: 30,
          hostility: 5,
          dryness: 20,
          vulnerability: 60,
          escalationSpeed: 30,
          randomness: 20,
        },
        {
          code: 'COLD_APPROACH_HARD',
          name: 'Cold Approach (Hard)',
          description: 'Higher resistance, more challenging, realistic cold approach',
          active: true,
          pace: 55,
          emojiDensity: 20,
          flirtiveness: 35,
          hostility: 40,
          dryness: 50,
          vulnerability: 30,
          escalationSpeed: 40,
          randomness: 30,
        },
      ],
      defaultDynamicsProfileCode: 'NEUTRAL',
      gates: [
        {
          key: 'GATE_MIN_MESSAGES',
          description: 'Minimum USER messages required',
          active: true,
          minMessages: 3,
        },
        {
          key: 'GATE_SUCCESS_THRESHOLD',
          description: 'Average score >= threshold → passed',
          active: true,
          successThreshold: 70,
        },
        {
          key: 'GATE_FAIL_FLOOR',
          description: 'Average score <= floor → failed',
          active: true,
          failFloor: 40,
        },
        {
          key: 'GATE_DISQUALIFIED',
          description: 'User disqualified (safety/content violation)',
          active: true,
        },
        {
          key: 'GATE_OBJECTIVE_PROGRESS',
          description: 'Objective progress gate (mission-specific)',
          active: true,
        },
      ],
      mood: {
        emaAlpha: 0.35,
        moodStateThresholds: {
          flow: { minScore: 80, minFlow: 70, maxTension: 40 },
          tense: { minTension: 70, orLowScore: { maxScore: 50, minTension: 50 } },
          warm: { minScore: 60, maxScore: 80, minWarmth: 50 },
          cold: { maxScore: 30, maxWarmth: 40 },
        },
        bands: [
          { key: 'CRITICAL', minPercent: 0, maxPercent: 20 },
          { key: 'LOW', minPercent: 20, maxPercent: 40 },
          { key: 'OK', minPercent: 40, maxPercent: 60 },
          { key: 'HIGH', minPercent: 60, maxPercent: 100 },
        ],
        decayPerTurn: 0,
        boostOnGoodMessage: 0,
        penaltyOnBadMessage: 0,
      },
      statePolicy: {
        minMessagesForVerdict: 3,
        failOnThreeCriticalMessages: false,
        allowRecoveryAfterFailGate: true,
      },
    };
  }
}

