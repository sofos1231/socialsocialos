// backend/src/modules/engine-config/engine-config.service.ts
// Step 7.2: Engine Config service for global knobs

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import {
  EngineConfigJson,
  EngineScoringProfile,
  EngineDynamicsProfile,
  EngineGateConfig,
  EngineGateRequirementTemplate,
  EngineMicroFeedbackConfig,
  EngineMicroDynamicsConfig,
  EnginePersonaConfig,
} from './engine-config.types';

@Injectable()
export class EngineConfigService {
  private readonly logger = new Logger(EngineConfigService.name);
  private cachedConfig: EngineConfigJson | null = null;
  // Wave 4: Config update subscribers for cache invalidation
  private configUpdateSubscribers: Set<() => void | Promise<void>> = new Set();
  // Wave 4.1: Monotonic revision counter for deterministic refresh
  private revision = 0;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Wave 4: Register a callback to be invoked when config is updated
   */
  onConfigUpdated(fn: () => void | Promise<void>): void {
    this.configUpdateSubscribers.add(fn);
  }

  /**
   * Wave 4.1: Get current revision number (monotonic, incremented on each update)
   */
  getRevision(): number {
    return this.revision;
  }

  /**
   * Get global engine config
   * Caches in memory for performance
   */
  async getGlobalConfig(): Promise<EngineConfigJson> {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    try {
      const row = await this.prisma.engineConfig.findUnique({
        where: { key: 'GLOBAL_V1' },
      });

      if (!row) {
        // Return default config (matches current hard-coded behavior)
        const defaultConfig = this.getDefaultConfig();
        this.cachedConfig = defaultConfig;
        return defaultConfig;
      }

      const config = row.configJson as any as EngineConfigJson;
      // Backward compatibility: ensure gateRequirementTemplates exists
      if (!config.gateRequirementTemplates) {
        config.gateRequirementTemplates = [];
      }
      this.cachedConfig = config;
      return config;
    } catch (error) {
      // If Prisma fails (e.g., table doesn't exist yet), fall back to defaults
      this.logger.warn(
        `Failed to load EngineConfig from DB, using defaults: ${error instanceof Error ? error.message : String(error)}`,
      );
      const defaultConfig = this.getDefaultConfig();
      this.cachedConfig = defaultConfig;
      return defaultConfig;
    }
  }

  /**
   * Update global engine config (full replace)
   */
  async updateGlobalConfig(config: EngineConfigJson): Promise<EngineConfigJson> {
    // Validate
    this.validateConfig(config);

    try {
      // Save
      await this.prisma.engineConfig.upsert({
        where: { key: 'GLOBAL_V1' },
        create: {
          key: 'GLOBAL_V1',
          configJson: config as any,
        },
        update: {
          configJson: config as any,
        },
      });

      // Clear cache
      this.cachedConfig = null;

      // Wave 4.1: Notify all subscribers deterministically (await all, log failures)
      const subscriberResults = await Promise.allSettled(
        Array.from(this.configUpdateSubscribers).map((fn) => Promise.resolve(fn())),
      );
      subscriberResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.logger.warn(
            `Config update subscriber ${index} failed: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
          );
        }
      });

      // Wave 4.1: Increment revision after successful update
      this.revision++;

      this.logger.log(`Engine config updated (revision ${this.revision})`);
      return config;
    } catch (error) {
      this.logger.error(
        `Failed to save EngineConfig to DB: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadRequestException(
        `Failed to save engine config: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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
   * Get gate requirement template by code
   */
  async getGateRequirementTemplate(code?: string | null): Promise<EngineGateRequirementTemplate | null> {
    if (!code) return null;
    const config = await this.getGlobalConfig();
    return (
      config.gateRequirementTemplates?.find((t) => t.code === code && t.active) || null
    );
  }

  /**
   * Get micro feedback config
   */
  async getMicroFeedbackConfig() {
    const config = await this.getGlobalConfig();
    return config.microFeedback || null;
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

    // Ensure gateRequirementTemplates exists (backward compatibility: initialize if missing)
    if (!config.gateRequirementTemplates) {
      config.gateRequirementTemplates = [];
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
   * Public for seeding purposes
   */
  getDefaultConfig(): EngineConfigJson {
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
          traitBaseValues: {
            humor: 40,
            tensionControl: 50,
            emotionalWarmth: 50,
            dominance: 50,
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
      gateRequirementTemplates: [
        {
          code: 'BASIC_CHAT_FLOW',
          name: 'Basic Chat Flow',
          description: 'Minimum engagement requirement - just needs minimum messages',
          active: true,
          requiredGates: ['GATE_MIN_MESSAGES'],
        },
        {
          code: 'QUALITY_THRESHOLD',
          name: 'Quality Threshold',
          description: 'Requires minimum messages and quality score threshold',
          active: true,
          requiredGates: ['GATE_MIN_MESSAGES', 'GATE_SUCCESS_THRESHOLD'],
        },
        {
          code: 'SAFETY_DISQUALIFY',
          name: 'Safety Disqualify',
          description: 'Ensures user is not disqualified for safety violations',
          active: true,
          requiredGates: ['GATE_DISQUALIFIED'],
        },
        {
          code: 'OBJECTIVE_PROGRESS',
          name: 'Objective Progress',
          description: 'Requires progress toward mission objective',
          active: true,
          requiredGates: ['GATE_OBJECTIVE_PROGRESS'],
        },
        {
          code: 'FAIL_FLOOR_GUARD',
          name: 'Fail Floor Guard',
          description: 'Prevents mission failure if score drops below floor',
          active: true,
          requiredGates: ['GATE_FAIL_FLOOR'],
        },
        {
          code: 'FULL_GATE_SUITE',
          name: 'Full Gate Suite',
          description: 'All gates required - maximum quality and safety checks',
          active: true,
          requiredGates: [
            'GATE_MIN_MESSAGES',
            'GATE_SUCCESS_THRESHOLD',
            'GATE_FAIL_FLOOR',
            'GATE_DISQUALIFIED',
            'GATE_OBJECTIVE_PROGRESS',
          ],
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
      microFeedback: {
        bands: [
          {
            minScore: 92,
            maxScore: 100,
            rarity: 'S+',
            message: 'Brilliant tension and clarity here. This is the kind of line that can shift the whole vibe.',
          },
          {
            minScore: 84,
            maxScore: 91,
            rarity: 'S',
            message: 'Strong message with attractive energy. A tiny bit more specificity could make it killer.',
          },
          {
            minScore: 72,
            maxScore: 83,
            rarity: 'A',
            message: "Good message. You're on the right track – a bit more playfulness or detail would level this up.",
          },
          {
            minScore: 58,
            maxScore: 71,
            rarity: 'B',
            message: 'Decent but safe. You can afford to be slightly bolder or more personal here.',
          },
          {
            minScore: 0,
            maxScore: 57,
            rarity: 'C',
            message: 'This message is okay, but lacks a clear hook. Try adding a small tease or detail that invites a reply.',
          },
        ],
        veryShortMessage: 'Feels too short and low-effort. Give the other side a bit more to work with.',
        defaultMessage: 'This message is okay, but lacks a clear hook. Try adding a small tease or detail that invites a reply.',
      },
      microDynamics: {
        risk: {
          baseRiskFromScore: { min: 20, max: 80 },
          tensionPenalty: { threshold: 0.3, maxPenalty: 35 },
          difficultyAdjustments: { HARD: -15, MEDIUM: -5, EASY: 0 },
          progressAdjustments: { early: -10, late: 10 },
        },
        momentum: {
          scoreDeltaMultiplier: 0.5,
          gateProgressMultiplier: 0.3,
          moodBonuses: { positive: 10, negative: -10 },
          trendMultiplier: 0.3,
        },
        flow: {
          varianceToFlowMultiplier: 2.0,
        },
      },
      persona: {
        driftPenalties: {
          styleMoodConflict: -20,
          styleMoodConflictMinor: -15,
          dynamicsMoodConflict: -15,
          vulnerabilityMoodConflict: -10,
          scoreStyleConflict: -15,
          negativeFlagsConflict: -10,
        },
        modifierEvents: {
          tensionSpikeThreshold: 0.7,
          moodDropSeverity: { low: 0.6, high: 0.9 },
          scoreCollapseThreshold: 30,
          scoreCollapseSeverityDivisor: 50,
          negativeFlagsThreshold: 2,
          negativeFlagsSeverityDivisor: 3,
        },
        modifierEffects: {
          reduceRiskAmount: -20,
          lowerWarmthAmount: -15,
        },
      },
    };
  }

  /**
   * Get micro dynamics config
   */
  async getMicroDynamicsConfig() {
    const config = await this.getGlobalConfig();
    return config.microDynamics || null;
  }

  /**
   * Get persona config
   */
  async getPersonaConfig() {
    const config = await this.getGlobalConfig();
    return config.persona || null;
  }

  // ==================== Scoring Profiles CRUD ====================

  async getScoringProfiles(): Promise<EngineScoringProfile[]> {
    const config = await this.getGlobalConfig();
    return config.scoringProfiles || [];
  }

  async createScoringProfile(profile: EngineScoringProfile): Promise<EngineScoringProfile> {
    if (!profile.code || !profile.name) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'Profile code and name are required',
      });
    }

    const config = await this.getGlobalConfig();
    if (!config.scoringProfiles) {
      config.scoringProfiles = [];
    }

    // Check uniqueness
    if (config.scoringProfiles.find((p) => p.code === profile.code)) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Scoring profile with code "${profile.code}" already exists`,
      });
    }

    // Default active to true if omitted
    if (profile.active === undefined) {
      profile.active = true;
    }

    config.scoringProfiles.push(profile);
    await this.updateGlobalConfig(config);
    return profile;
  }

  async updateScoringProfile(code: string, profile: EngineScoringProfile): Promise<EngineScoringProfile> {
    const config = await this.getGlobalConfig();
    if (!config.scoringProfiles) {
      config.scoringProfiles = [];
    }

    const index = config.scoringProfiles.findIndex((p) => p.code === code);
    if (index === -1) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Scoring profile with code "${code}" not found`,
      });
    }

    // If code changed, check uniqueness
    if (profile.code !== code && config.scoringProfiles.find((p) => p.code === profile.code)) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Scoring profile with code "${profile.code}" already exists`,
      });
    }

    // If updating default profile to inactive, block or auto-repoint
    if (config.defaultScoringProfileCode === code && profile.active === false) {
      // Auto-repoint to first active profile, or throw if none
      const activeProfile = config.scoringProfiles.find((p) => p.code !== code && p.active);
      if (activeProfile) {
        config.defaultScoringProfileCode = activeProfile.code;
        this.logger.warn(
          `Default scoring profile "${code}" deactivated, auto-repointed to "${activeProfile.code}"`,
        );
      } else {
        throw new BadRequestException({
          code: 'VALIDATION',
          message: 'Cannot deactivate default scoring profile when no other active profiles exist',
        });
      }
    }

    config.scoringProfiles[index] = profile;
    await this.updateGlobalConfig(config);
    return profile;
  }

  async deleteScoringProfile(code: string): Promise<void> {
    const config = await this.getGlobalConfig();
    if (!config.scoringProfiles) {
      config.scoringProfiles = [];
    }

    const index = config.scoringProfiles.findIndex((p) => p.code === code);
    if (index === -1) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Scoring profile with code "${code}" not found`,
      });
    }

    // If deleting default profile, auto-repoint or block
    if (config.defaultScoringProfileCode === code) {
      const activeProfile = config.scoringProfiles.find((p) => p.code !== code && p.active);
      if (activeProfile) {
        config.defaultScoringProfileCode = activeProfile.code;
        this.logger.warn(
          `Default scoring profile "${code}" deleted, auto-repointed to "${activeProfile.code}"`,
        );
      } else {
        throw new BadRequestException({
          code: 'VALIDATION',
          message: 'Cannot delete default scoring profile when no other active profiles exist',
        });
      }
    }

    config.scoringProfiles.splice(index, 1);
    await this.updateGlobalConfig(config);
  }

  // ==================== Dynamics Profiles CRUD ====================

  async getDynamicsProfiles(): Promise<EngineDynamicsProfile[]> {
    const config = await this.getGlobalConfig();
    return config.dynamicsProfiles || [];
  }

  async createDynamicsProfile(profile: EngineDynamicsProfile): Promise<EngineDynamicsProfile> {
    if (!profile.code || !profile.name) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'Profile code and name are required',
      });
    }

    const config = await this.getGlobalConfig();
    if (!config.dynamicsProfiles) {
      config.dynamicsProfiles = [];
    }

    // Check uniqueness
    if (config.dynamicsProfiles.find((p) => p.code === profile.code)) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Dynamics profile with code "${profile.code}" already exists`,
      });
    }

    // Default active to true if omitted
    if (profile.active === undefined) {
      profile.active = true;
    }

    config.dynamicsProfiles.push(profile);
    await this.updateGlobalConfig(config);
    return profile;
  }

  async updateDynamicsProfile(code: string, profile: EngineDynamicsProfile): Promise<EngineDynamicsProfile> {
    const config = await this.getGlobalConfig();
    if (!config.dynamicsProfiles) {
      config.dynamicsProfiles = [];
    }

    const index = config.dynamicsProfiles.findIndex((p) => p.code === code);
    if (index === -1) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Dynamics profile with code "${code}" not found`,
      });
    }

    // If code changed, check uniqueness
    if (profile.code !== code && config.dynamicsProfiles.find((p) => p.code === profile.code)) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Dynamics profile with code "${profile.code}" already exists`,
      });
    }

    // If updating default profile to inactive, block or auto-repoint
    if (config.defaultDynamicsProfileCode === code && profile.active === false) {
      const activeProfile = config.dynamicsProfiles.find((p) => p.code !== code && p.active);
      if (activeProfile) {
        config.defaultDynamicsProfileCode = activeProfile.code;
        this.logger.warn(
          `Default dynamics profile "${code}" deactivated, auto-repointed to "${activeProfile.code}"`,
        );
      } else {
        throw new BadRequestException({
          code: 'VALIDATION',
          message: 'Cannot deactivate default dynamics profile when no other active profiles exist',
        });
      }
    }

    config.dynamicsProfiles[index] = profile;
    await this.updateGlobalConfig(config);
    return profile;
  }

  async deleteDynamicsProfile(code: string): Promise<void> {
    const config = await this.getGlobalConfig();
    if (!config.dynamicsProfiles) {
      config.dynamicsProfiles = [];
    }

    const index = config.dynamicsProfiles.findIndex((p) => p.code === code);
    if (index === -1) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Dynamics profile with code "${code}" not found`,
      });
    }

    // If deleting default profile, auto-repoint or block
    if (config.defaultDynamicsProfileCode === code) {
      const activeProfile = config.dynamicsProfiles.find((p) => p.code !== code && p.active);
      if (activeProfile) {
        config.defaultDynamicsProfileCode = activeProfile.code;
        this.logger.warn(
          `Default dynamics profile "${code}" deleted, auto-repointed to "${activeProfile.code}"`,
        );
      } else {
        throw new BadRequestException({
          code: 'VALIDATION',
          message: 'Cannot delete default dynamics profile when no other active profiles exist',
        });
      }
    }

    config.dynamicsProfiles.splice(index, 1);
    await this.updateGlobalConfig(config);
  }

  // ==================== Gate Sets CRUD ====================

  async getGateSets(): Promise<EngineGateConfig[]> {
    const config = await this.getGlobalConfig();
    return config.gates || [];
  }

  async createGateSet(gate: EngineGateConfig): Promise<EngineGateConfig> {
    if (!gate.key || !gate.description) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'Gate key and description are required',
      });
    }

    const config = await this.getGlobalConfig();
    if (!config.gates) {
      config.gates = [];
    }

    // Check uniqueness
    if (config.gates.find((g) => g.key === gate.key)) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Gate set with key "${gate.key}" already exists`,
      });
    }

    // Default active to true if omitted
    if (gate.active === undefined) {
      gate.active = true;
    }

    config.gates.push(gate);
    await this.updateGlobalConfig(config);
    return gate;
  }

  async updateGateSet(key: string, gate: EngineGateConfig): Promise<EngineGateConfig> {
    const config = await this.getGlobalConfig();
    if (!config.gates) {
      config.gates = [];
    }

    const index = config.gates.findIndex((g) => g.key === key);
    if (index === -1) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Gate set with key "${key}" not found`,
      });
    }

    // If key changed, check uniqueness
    if (gate.key !== key && config.gates.find((g) => g.key === gate.key)) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Gate set with key "${gate.key}" already exists`,
      });
    }

    config.gates[index] = gate;
    await this.updateGlobalConfig(config);
    return gate;
  }

  async deleteGateSet(key: string): Promise<void> {
    const config = await this.getGlobalConfig();
    if (!config.gates) {
      config.gates = [];
    }

    const index = config.gates.findIndex((g) => g.key === key);
    if (index === -1) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Gate set with key "${key}" not found`,
      });
    }

    // Check if gate is referenced in any gateRequirementTemplates
    const referencedIn = (config.gateRequirementTemplates || []).filter((t) =>
      t.requiredGates.includes(key),
    );
    if (referencedIn.length > 0) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Cannot delete gate "${key}" - it is referenced in ${referencedIn.length} objective(s): ${referencedIn.map((t) => t.code).join(', ')}`,
      });
    }

    config.gates.splice(index, 1);
    await this.updateGlobalConfig(config);
  }

  // ==================== Objectives (Gate Requirement Templates) CRUD ====================

  async getObjectives(): Promise<EngineGateRequirementTemplate[]> {
    const config = await this.getGlobalConfig();
    return config.gateRequirementTemplates || [];
  }

  async createObjective(objective: EngineGateRequirementTemplate): Promise<EngineGateRequirementTemplate> {
    if (!objective.code || !objective.name) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'Objective code and name are required',
      });
    }

    const config = await this.getGlobalConfig();
    if (!config.gateRequirementTemplates) {
      config.gateRequirementTemplates = [];
    }

    // Check uniqueness
    if (config.gateRequirementTemplates.find((o) => o.code === objective.code)) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Objective with code "${objective.code}" already exists`,
      });
    }

    // Default active to true if omitted
    if (objective.active === undefined) {
      objective.active = true;
    }

    // Validate requiredGates exist
    if (objective.requiredGates && objective.requiredGates.length > 0) {
      const existingGates = (config.gates || []).map((g) => g.key);
      const missingGates = objective.requiredGates.filter((g) => !existingGates.includes(g));
      if (missingGates.length > 0) {
        throw new BadRequestException({
          code: 'VALIDATION',
          message: `Required gates not found: ${missingGates.join(', ')}`,
        });
      }
    }

    config.gateRequirementTemplates.push(objective);
    await this.updateGlobalConfig(config);
    return objective;
  }

  async updateObjective(
    code: string,
    objective: EngineGateRequirementTemplate,
  ): Promise<EngineGateRequirementTemplate> {
    const config = await this.getGlobalConfig();
    if (!config.gateRequirementTemplates) {
      config.gateRequirementTemplates = [];
    }

    const index = config.gateRequirementTemplates.findIndex((o) => o.code === code);
    if (index === -1) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Objective with code "${code}" not found`,
      });
    }

    // If code changed, check uniqueness
    if (objective.code !== code && config.gateRequirementTemplates.find((o) => o.code === objective.code)) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Objective with code "${objective.code}" already exists`,
      });
    }

    // Validate requiredGates exist
    if (objective.requiredGates && objective.requiredGates.length > 0) {
      const existingGates = (config.gates || []).map((g) => g.key);
      const missingGates = objective.requiredGates.filter((g) => !existingGates.includes(g));
      if (missingGates.length > 0) {
        throw new BadRequestException({
          code: 'VALIDATION',
          message: `Required gates not found: ${missingGates.join(', ')}`,
        });
      }
    }

    config.gateRequirementTemplates[index] = objective;
    await this.updateGlobalConfig(config);
    return objective;
  }

  async deleteObjective(code: string): Promise<void> {
    const config = await this.getGlobalConfig();
    if (!config.gateRequirementTemplates) {
      config.gateRequirementTemplates = [];
    }

    const index = config.gateRequirementTemplates.findIndex((o) => o.code === code);
    if (index === -1) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: `Objective with code "${code}" not found`,
      });
    }

    config.gateRequirementTemplates.splice(index, 1);
    await this.updateGlobalConfig(config);
  }

  // ==================== Micro Feedback CRUD ====================

  async updateMicroFeedback(config: EngineMicroFeedbackConfig): Promise<EngineMicroFeedbackConfig> {
    // Validate bands
    if (!config.bands || !Array.isArray(config.bands)) {
      throw new BadRequestException({
        code: 'VALIDATION',
        message: 'Micro feedback bands array is required',
      });
    }

    // Validate each band
    for (const band of config.bands) {
      if (typeof band.minScore !== 'number' || typeof band.maxScore !== 'number') {
        throw new BadRequestException({
          code: 'VALIDATION',
          message: 'Each band must have minScore and maxScore as numbers',
        });
      }
      if (band.minScore < 0 || band.minScore > 100 || band.maxScore < 0 || band.maxScore > 100) {
        throw new BadRequestException({
          code: 'VALIDATION',
          message: 'Band scores must be between 0 and 100',
        });
      }
      if (band.minScore > band.maxScore) {
        throw new BadRequestException({
          code: 'VALIDATION',
          message: 'Band minScore must be <= maxScore',
        });
      }
      if (!band.message || typeof band.message !== 'string') {
        throw new BadRequestException({
          code: 'VALIDATION',
          message: 'Each band must have a message string',
        });
      }
    }

    const engineConfig = await this.getGlobalConfig();
    engineConfig.microFeedback = config;
    await this.updateGlobalConfig(engineConfig);
    return config;
  }
}

