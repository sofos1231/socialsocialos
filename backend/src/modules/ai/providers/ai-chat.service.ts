import { Injectable, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { AiStyle, AiStyleKey } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OpenAiClient, OpenAiChatMessage } from './openai.client';
import {
  MissionConfigV1,
  MissionConfigV1Dynamics,
  MissionConfigV1Difficulty,
  MissionConfigV1Openings,
  MissionConfigV1ResponseArchitecture,
  MissionConfigV1Objective,
  MissionConfigV1AiRuntimeProfile,
} from '../../missions-admin/mission-config-v1.schema';
import { OpeningsService } from '../../ai-engine/openings.service';
import { RewardReleaseService } from '../../ai-engine/reward-release.service';
import type { MissionStateV1 } from '../../ai-engine/mission-state-v1.schema';
import { AiProviderConfig } from './ai-provider.types';
import { EngineConfigService } from '../../engine-config/engine-config.service';
import { ModelTierService } from '../model-tier.service';

type IncomingMsg = { role: 'USER' | 'AI'; content: string };

type StructuredRarity = 'C' | 'B' | 'A' | 'S' | 'S+';

export type AiStructuredReply = {
  replyText: string;
  messageScore?: number;
  rarity?: StructuredRarity;
  tags?: string[];
  raw?: any;
  parseOk: boolean;
};

function isPlainObject(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function stylePreset(aiStyle: AiStyle | null | undefined) {
  const key = aiStyle?.key ?? AiStyleKey.NEUTRAL;

  // Tone constraints (must never violate aiContract rules).
  // Keep these short & enforceable.
  switch (key) {
    case AiStyleKey.FLIRTY:
      return {
        label: 'FLIRTY',
        temperature: 0.78,
        rules: [
          `Tone: flirty, intriguing, warm.`,
          `Use light teasing + playful curiosity.`,
          `Keep it PG-13. No explicit sexual content.`,
          `Avoid over-complimenting; keep it natural and confident.`,
        ],
      };

    case AiStyleKey.PLAYFUL:
      return {
        label: 'PLAYFUL',
        temperature: 0.82,
        rules: [
          `Tone: playful, witty, upbeat.`,
          `Short punchy lines, mild humor.`,
          `No coaching unless contract explicitly asks.`,
          `Use emojis sparingly (0-1).`,
        ],
      };

    case AiStyleKey.CHALLENGING:
      return {
        label: 'CHALLENGING',
        temperature: 0.66,
        rules: [
          `Tone: confident, slightly hard-to-get.`,
          `Be concise. Don't over-explain.`,
          `Push back lightly when needed; maintain boundaries.`,
          `Keep tension without being rude.`,
        ],
      };

    case AiStyleKey.NEUTRAL:
    default:
      return {
        label: 'NEUTRAL',
        temperature: 0.7,
        rules: [
          `Tone: natural, friendly, grounded.`,
          `Be human and consistent with persona.`,
          `No coaching unless contract explicitly asks.`,
        ],
      };
  }
}

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openai: OpenAiClient,
    private readonly openingsService: OpeningsService,
    private readonly rewardReleaseService: RewardReleaseService, // Step 6.4 Fix: Inject RewardReleaseService
    @Optional()
    @Inject(forwardRef(() => EngineConfigService))
    private readonly engineConfigService?: EngineConfigService, // Step 7.2: Inject EngineConfigService for dynamics profiles
    private readonly modelTierService?: ModelTierService, // Step 8: Model tier routing
  ) {}

  async generateReply(params: {
    userId: string;
    topic: string;
    messages: IncomingMsg[];
    templateId?: string | null;
    personaId?: string | null;

    /**
     * ✅ NEW – allow explicit aiStyle from FreePlay / other callers.
     * If provided, this overrides mission template style.
     */
    aiStyleKey?: string | AiStyleKey;
    aiStyle?: AiStyle | null;

    /**
     * Step 6.3-6.5: Unified mission config and state
     */
    missionConfig?: {
      aiStyle?: AiStyle | null;
      dynamics?: MissionConfigV1Dynamics | null;
      difficulty?: MissionConfigV1Difficulty | null;
      openings?: MissionConfigV1Openings | null;
      responseArchitecture?: MissionConfigV1ResponseArchitecture | null;
      aiRuntimeProfile?: MissionConfigV1AiRuntimeProfile | null; // Step 6.9: AI runtime profile
    } | null;
    missionState?: MissionStateV1 | null;
    isFirstMessage?: boolean; // Step 6.3: Indicates if this is the first message
    /**
     * Step 8: Model tier routing (mini/heavy/hero)
     * If provided, overrides aiRuntimeProfile.model
     */
    modelTier?: 'mini' | 'heavy' | 'hero';
  }): Promise<{ aiReply: string; aiStructured?: AiStructuredReply; aiDebug?: any; errorCode?: string; syntheticReply?: boolean }> {
    const { topic, messages, templateId, personaId } = params;

    const ctx = templateId ? await this.loadMissionContext(templateId) : null;
    const persona =
      ctx?.persona || (personaId ? await this.loadPersona(personaId) : null);

    // Prisma returns JsonValue (can be string/null/etc). Guard it.
    const aiContractRaw: unknown = ctx?.aiContract ?? null;
    const aiContractObj = isPlainObject(aiContractRaw) ? aiContractRaw : null;

    const mode = aiContractObj?.outputFormat?.mode;
    const wantsJson = mode === 'json' || mode === 'JSON';

    // ✅ Effective AiStyle resolution:
    // 1) explicit param (FreePlay / override)
    // 2) template.aiStyle
    // 3) fallback NEUTRAL
    const explicitStyle = params.aiStyle ?? null;
    const templateStyle = ctx?.template?.aiStyle ?? null;

    let effectiveAiStyle: AiStyle | null = null;
    let styleSource: 'EXPLICIT' | 'TEMPLATE' | 'NONE' = 'NONE';

    if (explicitStyle) {
      effectiveAiStyle = explicitStyle;
      styleSource = 'EXPLICIT';
    } else if (templateStyle) {
      effectiveAiStyle = templateStyle;
      styleSource = 'TEMPLATE';
    }

    const preset = stylePreset(effectiveAiStyle);
    const effectiveKey = effectiveAiStyle?.key ?? null;
    // DEBUG: shows whether style came from FreePlay or mission template
    // (keep for now, can be removed later)
    // eslint-disable-next-line no-console
    console.log(
      `[AI_STYLE_PROOF] source=${styleSource} aiStyleKey=${effectiveKey ?? 'NULL'} preset=${preset.label}`,
    );

    // Step 6.3-6.5: Extract unified mission config and state
    const missionConfig = params.missionConfig ?? this.extractUnifiedMissionConfig(aiContractObj, effectiveAiStyle);
    const missionState = params.missionState ?? null;
    const isFirstMessage = params.isFirstMessage ?? (messages.length === 0 || messages.every(m => m.role === 'USER'));

    // Step 6.3: Generate opening if first message
    // Step 6.0 Fix: Use extracted openings from fallback pattern
    let openingText: string | null = null;
    const effectiveOpenings = missionConfig?.openings ?? null;
    const effectiveDynamics = missionConfig?.dynamics ?? null;
    const effectiveDifficulty = missionConfig?.difficulty ?? null;
    if (isFirstMessage && effectiveOpenings && effectiveAiStyle) {
      const openingResult = this.openingsService.generateOpening({
        aiStyleKey: effectiveAiStyle.key,
        openings: effectiveOpenings,
        dynamics: effectiveDynamics,
        difficulty: effectiveDifficulty,
        personaName: persona?.name ?? null,
      });
      openingText = openingResult.openingText;
    }

    const system = await this.buildSystemPrompt({
      topic,
      mission: ctx?.template ? {
        id: ctx.template.id,
        code: ctx.template.code,
        title: ctx.template.title,
        description: ctx.template.description,
        aiStyle: ctx.template.aiStyle,
        isAttractionSensitive: ctx.template.isAttractionSensitive ?? false,
        targetRomanticGender: ctx.template.targetRomanticGender ?? null,
      } : null,
      category: ctx?.category ?? null,
      persona,
      aiStyle: effectiveAiStyle,
      aiContract: aiContractObj,
      wantsJson,
      missionConfig,
      missionState,
      isFirstMessage,
      openingText,
    });

    const chat: OpenAiChatMessage[] = [
      { role: 'system', content: system },
      ...this.normalizeConversation(messages),
    ];

    // Step 6.9: Build AI provider config from mission config + style preset
    // Step 8: Model tier routing - if modelTier provided, use it to override model
    const aiRuntimeProfile =
      missionConfig && 'aiRuntimeProfile' in missionConfig
        ? missionConfig.aiRuntimeProfile ?? null
        : null;
    
    // Step 8: Determine model - modelTier takes precedence over aiRuntimeProfile.model
    let selectedModel: string | undefined;
    if (params.modelTier && this.modelTierService) {
      selectedModel = this.modelTierService.getModelForTier(params.modelTier);
    } else {
      selectedModel = aiRuntimeProfile?.model;
    }
    
    const aiProviderConfig: AiProviderConfig = {
      model: selectedModel,
      temperature: aiRuntimeProfile?.temperature ?? preset.temperature,
      maxTokens: aiRuntimeProfile?.maxTokens ?? 260,
      topP: aiRuntimeProfile?.topP,
      presencePenalty: aiRuntimeProfile?.presencePenalty,
      frequencyPenalty: aiRuntimeProfile?.frequencyPenalty,
      timeoutMs: aiRuntimeProfile?.timeoutMs,
      retryConfig: aiRuntimeProfile?.retryAttempts
        ? {
            maxAttempts: aiRuntimeProfile.retryAttempts,
            backoffMs: [200, 500, 1000],
          }
        : undefined,
    };

    // Step 6.10: Verbose trace logging (dev-only)
    const isDev = process.env.NODE_ENV !== 'production';
    const verboseTrace = isDev && process.env.AI_VERBOSE_TRACE === 'true';
    if (verboseTrace) {
      const promptPreview = system.slice(0, 500);
      this.logger.debug(
        `[AI_VERBOSE_TRACE] Prompt preview (${system.length} chars): ${promptPreview}...`,
      );
    }

    const out = await this.openai.createChatCompletion({
      messages: chat,
      config: aiProviderConfig,
      responseFormat: wantsJson ? 'json_object' : undefined,
    });

    // Step 6.9: Handle structured result (success or error)
    let aiReply: string;
    let syntheticReply = false;
    let errorCode: string | undefined;

    if (out.ok) {
      aiReply = out.text;
    } else {
      // Step 6.9: Error case - use synthetic fallback
      // TypeScript narrowing: out.ok is false, so out is the error variant
      const errorResult = out as Extract<typeof out, { ok: false }>;
      errorCode = errorResult.errorCode;
      aiReply = "Sorry — I couldn't generate a reply right now.";
      syntheticReply = true;
      // TODO: record ai_provider_errors_total (errorCode, model, userId)
      this.logger.warn(
        `AI call failed: ${errorResult.errorCode} - ${errorResult.errorMessage}`,
      );
    }

    // Step 6.10: Verbose trace logging for response (dev-only)
    if (verboseTrace) {
      const responsePreview = aiReply.slice(0, 200);
      this.logger.debug(
        `[AI_VERBOSE_TRACE] Response preview (${aiReply.length} chars): ${responsePreview}...`,
      );
    }

    let aiStructured: AiStructuredReply | undefined;

    if (wantsJson) {
      const parsed = tryParseStructuredJson(aiReply);
      if (parsed?.parseOk && typeof parsed.replyText === 'string' && parsed.replyText.trim()) {
        aiReply = parsed.replyText.trim();
        aiStructured = parsed;
      } else {
        aiStructured = {
          replyText: coerceReplyTextFromAnything(parsed?.raw ?? aiReply) || fallbackReply(aiReply),
          parseOk: false,
          raw: parsed?.raw ?? aiReply,
        };
        aiReply = aiStructured.replyText;
      }
    }

    return {
      aiReply,
      aiStructured,
      aiDebug: {
        provider: 'openai',
        model: out.debug.model,
        latencyMs: out.debug.ms,
        tokens: out.debug.tokens,
        attempt: out.debug.attempt,
        contractMode: wantsJson ? 'json' : 'text',
        parseOk: aiStructured ? aiStructured.parseOk : undefined,
        aiStyle: preset.label,
        aiStyleKey: effectiveKey ?? null,
        aiStyleSource: styleSource,
        errorCode: errorCode,
        syntheticReply: syntheticReply,
      },
      errorCode: errorCode,
      syntheticReply: syntheticReply,
    };
  }

  private normalizeConversation(messages: IncomingMsg[]): OpenAiChatMessage[] {
    return (messages || [])
      .filter((m) => typeof m?.content === 'string' && m.content.trim().length > 0)
      .map((m) => ({
        role: m.role === 'USER' ? 'user' : 'assistant',
        content: m.content.trim(),
      }));
  }

  private async buildSystemPrompt(params: {
    topic: string;
    mission:
      | {
          id: string;
          code: string;
          title: string;
          description: string | null;
          aiStyle: AiStyle | null;
          isAttractionSensitive?: boolean;
          targetRomanticGender?: any;
        }
      | null;
    category: { id: string; code: string; label: string } | null;
    persona:
      | {
          id: string;
          code: string;
          name: string;
          description?: string | null;
          style?: string | null;
          personaGender?: any;
        }
      | null;
    aiStyle: AiStyle | null;
    aiContract: Record<string, any> | null;
    wantsJson: boolean;
    // Step 6.3-6.5: Unified mission config and state
    missionConfig?: {
      aiStyle?: AiStyle | null;
      dynamics?: MissionConfigV1Dynamics | null;
      difficulty?: MissionConfigV1Difficulty | null;
      openings?: MissionConfigV1Openings | null;
      responseArchitecture?: MissionConfigV1ResponseArchitecture | null;
      aiRuntimeProfile?: MissionConfigV1AiRuntimeProfile | null;
    } | null;
    missionState?: MissionStateV1 | null;
    isFirstMessage?: boolean;
    openingText?: string | null;
  }): Promise<string> {
    const {
      topic,
      mission,
      category,
      persona,
      aiStyle,
      aiContract,
      wantsJson,
      missionConfig,
      missionState,
      isFirstMessage,
      openingText,
    } = params;

    const isAttractionSensitive = mission?.isAttractionSensitive ?? false;

    const preset = stylePreset(aiStyle);
    const aiStyleKey = aiStyle?.key ?? null;

    const contractJson = aiContract != null ? safeJson(aiContract, 7000) : null;

    const schemaDesc =
      typeof aiContract?.outputFormat?.schemaDescription === 'string'
        ? aiContract.outputFormat.schemaDescription.trim()
        : null;

    const hardJsonRules = wantsJson
      ? [
          ``,
          `OUTPUT FORMAT (HARD):`,
          `- Respond with ONE raw JSON object only.`,
          `- No markdown. No code fences. No extra text.`,
          `- Required key: "replyText" (string).`,
          `- Required key: "checklist" (object) with:`,
          `    - "flags": string[] using only: POSITIVE_HOOK_HIT, MULTIPLE_HOOKS_HIT, OBJECTIVE_PROGRESS, MOOD_STRONG_UP, MOMENTUM_MAINTAINED, NO_BOUNDARY_ISSUES, GOOD_CALIBRATION, CLARITY_GOOD, WARMTH_GOOD`,
          `    - optional "notes": string[] (brief reasons).`,
          `- Do NOT return numeric scores. The server will derive scores from the checklist.`,
          schemaDesc ? `- Schema hint: ${schemaDesc}` : null,
        ]
          .filter(Boolean)
          .join('\n')
      : null;

    // Step 6.1 & 6.2: Extract dynamics and difficulty (use unified config if available)
    let dynamics = missionConfig?.dynamics ?? (this.extractMissionConfig(aiContract)?.dynamics ?? null);
    const difficulty = missionConfig?.difficulty ?? (this.extractMissionConfig(aiContract)?.difficulty ?? null);
    
    // Step 7.2: If dynamicsProfileCode is set, load profile and use its values as base
    const fullMissionConfig = missionConfig ?? this.extractMissionConfig(aiContract);
    if (fullMissionConfig && 'dynamicsProfileCode' in fullMissionConfig && fullMissionConfig.dynamicsProfileCode && this.engineConfigService && dynamics) {
      try {
        const profile = await this.engineConfigService.getDynamicsProfile(fullMissionConfig.dynamicsProfileCode);
        if (profile && profile.active) {
          // Use profile values as base, but allow mission-level overrides
          dynamics = {
            ...dynamics,
            pace: dynamics.pace !== null && dynamics.pace !== undefined ? dynamics.pace : profile.pace,
            emojiDensity: dynamics.emojiDensity !== null && dynamics.emojiDensity !== undefined ? dynamics.emojiDensity : profile.emojiDensity,
            flirtiveness: dynamics.flirtiveness !== null && dynamics.flirtiveness !== undefined ? dynamics.flirtiveness : profile.flirtiveness,
            hostility: dynamics.hostility !== null && dynamics.hostility !== undefined ? dynamics.hostility : profile.hostility,
            dryness: dynamics.dryness !== null && dynamics.dryness !== undefined ? dynamics.dryness : profile.dryness,
            vulnerability: dynamics.vulnerability !== null && dynamics.vulnerability !== undefined ? dynamics.vulnerability : profile.vulnerability,
            escalationSpeed: dynamics.escalationSpeed !== null && dynamics.escalationSpeed !== undefined ? dynamics.escalationSpeed : profile.escalationSpeed,
            randomness: dynamics.randomness !== null && dynamics.randomness !== undefined ? dynamics.randomness : profile.randomness,
          };
        }
      } catch (e) {
        this.logger.warn(`Failed to load dynamics profile ${fullMissionConfig.dynamicsProfileCode}: ${e}`);
        // Continue with existing dynamics
      }
    }
    // Step 6.0 Fix: Use same fallback pattern for responseArchitecture and openings
    const responseArchitecture = missionConfig?.responseArchitecture ?? (this.extractMissionConfig(aiContract)?.responseArchitecture ?? null);
    const openings = missionConfig?.openings ?? (this.extractMissionConfig(aiContract)?.openings ?? null);

    // Step 6.1: Build dynamics block
    const dynamicsBlock = this.buildDynamicsBlock(dynamics, aiStyle);

    // Step 6.2: Build difficulty block
    const difficultyBlock = this.buildDifficultyBlock(difficulty);

    // Step 6.4: Build response architecture block (with dynamics integration)
    const responseArchitectureBlock = this.buildResponseArchitectureBlock(responseArchitecture, dynamics);

    // Step 6.5: Build mood state block (with response architecture for context)
    const moodStateBlock = this.buildMoodStateBlock(missionState, responseArchitecture);

    // Step 6.4: Build objective, gate status, and reward permissions blocks
    const objectiveBlock = this.buildObjectiveBlock(missionConfig, aiContract);
    const gateStatusBlock = this.buildGateStatusBlock(missionState);
    const rewardPermissionsBlock = this.buildRewardPermissionsBlock(missionState, missionConfig, aiContract);
    // Step 6.8: Build modifier hints block
    const modifierHintsBlock = this.buildModifierHintsBlock(missionState);

    const checklistBlock = [
      ``,
      `CHECKLIST SCORING (HARD):`,
      `- For every USER message, set checklist.flags based on the content.`,
      `- Use only these flags:`,
      `  * POSITIVE_HOOK_HIT: at least one clearly positive hook or pattern was triggered.`,
      `  * MULTIPLE_HOOKS_HIT: two or more positive hooks in this single message.`,
      `  * OBJECTIVE_PROGRESS: clearly advances the mission objective (specific step forward).`,
      `  * MOOD_STRONG_UP: conversation mood/energy clearly improves because of this message.`,
      `  * MOMENTUM_MAINTAINED: maintains a good streak without dropping quality.`,
      `  * NO_BOUNDARY_ISSUES: no boundary problems, respectful and safe.`,
      `  * GOOD_CALIBRATION: tone matches persona, context, and user signals.`,
      `  * CLARITY_GOOD: message is clear and easy to follow.`,
      `  * WARMTH_GOOD: message feels warm/positive/empathetic.`,
      `- Optional: checklist.notes[] with short human-readable reasons.`,
      `- Do NOT output numeric scores; the server will compute them from the checklist.`,
    ].join('\n');

    // Step 6.1: Combine style + dynamics for enhanced behavior
    const styleBlock = [
      `AI STYLE (HARD TONE LAYER): ${preset.label} (${aiStyleKey ?? 'NEUTRAL'})`,
      ...preset.rules.map((r) => `- ${r}`),
      `- This style must NEVER override or violate the Mission AI Contract below.`,
    ].join('\n');

    // Step 6.3: Opening instruction for first message
    const openingBlock = isFirstMessage && openingText
      ? [
          ``,
          `OPENING MESSAGE (FIRST MESSAGE ONLY):`,
          `- You MUST start the conversation with this exact opening: "${openingText}"`,
          `- This opening reflects your initial mood, style, and dynamics.`,
          `- After sending this opening, continue naturally based on the user's response.`,
        ].join('\n')
      : null;

    return [
      `You are the assistant in "SocialGym" — a roleplay practice chat.`,
      `Your job: respond as the assigned persona, and follow the mission rules strictly.`,
      ``,
      `Topic: ${topic}`,
      mission
        ? `Mission: ${mission.title} (${mission.code})\nDescription: ${mission.description ?? ''}`.trim()
        : `Mission: (none)`,
      category ? `Category: ${category.label} (${category.code})` : `Category: (none)`,
      persona
        ? [
            `Persona: ${persona.name} (${persona.code})`,
            persona.description ? `Persona description: ${persona.description}` : null,
            persona.style ? `Persona style: ${persona.style}` : null,
          ]
            .filter(Boolean)
            .join('\n')
        : `Persona: (none)`,
      // Gender context for attraction-sensitive missions
      isAttractionSensitive && persona?.personaGender
        ? [
            ``,
            `GENDER CONTEXT:`,
            `- This is a romantic interaction practice scenario.`,
            `- The AI persona's gender is ${persona.personaGender}.`,
            `- Maintain consistent gender identity throughout the conversation.`,
            `- Do NOT change your gender or role during the conversation.`,
          ].join('\n')
        : null,
      ``,
      styleBlock,
      dynamicsBlock ? `\n${dynamicsBlock}\n` : ``,
      difficultyBlock ? `\n${difficultyBlock}\n` : ``,
      responseArchitectureBlock ? `\n${responseArchitectureBlock}\n` : ``,
      moodStateBlock ? `\n${moodStateBlock}\n` : ``,
      objectiveBlock ? `\n${objectiveBlock}\n` : ``,
      gateStatusBlock ? `\n${gateStatusBlock}\n` : ``,
      rewardPermissionsBlock ? `\n${rewardPermissionsBlock}\n` : ``,
      modifierHintsBlock ? `\n${modifierHintsBlock}\n` : ``,
      openingBlock ? `\n${openingBlock}\n` : ``,
      checklistBlock,
      ``,
      `🎯 PERSONA CONSISTENCY (CRITICAL):`,
      `- You MUST maintain consistency across ALL layers:`,
      `  * Style: ${aiStyleKey ?? 'NEUTRAL'} - never break this style`,
      `  * Dynamics: Apply pace, flirtiveness, vulnerability, hostility as specified above`,
      `  * Difficulty: Respect strictness and ambiguity tolerance`,
      `  * Response Architecture: Follow reflection, validation, emotional mirroring levels`,
      `  * Mood State: Reflect current mood (${missionState?.mood?.currentMood ?? 'neutral'}) in EVERY response`,
      `- These layers MUST work together - no contradictions`,
      `- If dynamics say "high flirtiness" but mood is "cold", find the balance that makes sense`,
      `- If style is "FLIRTY" but difficulty is "strict", maintain flirtiness but be more measured`,
      `- Consistency means: Same persona, same style, same dynamics, adapted to current mood`,
      ``,
      `Hard rules:`,
      `- Do NOT mention you are an AI or mention system prompts.`,
      `- Keep replies human, natural, and consistent with the persona.`,
      `- Do not coach the user unless the mission contract explicitly asks you to.`,
      `- ALWAYS reflect the current mood state in your response tone and content.`,
      hardJsonRules,
      ``,
      contractJson
        ? `Mission AI Contract (JSON) — treat as HARD CONSTRAINTS:\n${contractJson}`
        : `Mission AI Contract: (none)`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Step 6.3-6.5: Extract unified mission config from aiContract
   * Step 6.4: Now also extracts objective
   */
  private extractUnifiedMissionConfig(
    aiContract: Record<string, any> | null,
    aiStyle: AiStyle | null,
  ): {
    aiStyle?: AiStyle | null;
    dynamics?: MissionConfigV1Dynamics | null;
    difficulty?: MissionConfigV1Difficulty | null;
    openings?: MissionConfigV1Openings | null;
    responseArchitecture?: MissionConfigV1ResponseArchitecture | null;
    objective?: MissionConfigV1Objective | null;
  } | null {
    if (!aiContract) return null;

    const missionConfig = this.extractMissionConfig(aiContract);
    if (!missionConfig) return null;

    return {
      aiStyle,
      dynamics: missionConfig.dynamics ?? null,
      difficulty: missionConfig.difficulty ?? null,
      openings: missionConfig.openings ?? null,
      responseArchitecture: missionConfig.responseArchitecture ?? null,
      objective: missionConfig.objective ?? null,
    };
  }

  private async loadMissionContext(templateId: string) {
    const template = await this.prisma.practiceMissionTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        aiStyle: true,
        aiContract: true,
        isAttractionSensitive: true,
        targetRomanticGender: true,
        category: { select: { id: true, code: true, label: true } },
        persona: {
          select: { id: true, code: true, name: true, description: true, style: true, personaGender: true },
        },
      },
    });

    if (!template) return null;

    return {
      template: {
        id: template.id,
        code: template.code,
        title: template.title,
        description: template.description ?? null,
        aiStyle: template.aiStyle ?? null,
        isAttractionSensitive: template.isAttractionSensitive ?? false,
        targetRomanticGender: template.targetRomanticGender ?? null,
      },
      aiContract: template.aiContract ?? null,
      category: template.category ?? null,
      persona: template.persona ?? null,
    };
  }

  private async loadPersona(personaId: string) {
    const p = await this.prisma.aiPersona.findUnique({
      where: { id: personaId },
      select: { id: true, code: true, name: true, description: true, style: true },
    });
    return p ?? null;
  }

  /**
   * Step 6.1 & 6.2: Extract MissionConfigV1 from aiContract
   */
  private extractMissionConfig(
    aiContract: Record<string, any> | null,
  ): MissionConfigV1 | null {
    if (!aiContract || typeof aiContract !== 'object') return null;
    if (!aiContract.missionConfigV1 || typeof aiContract.missionConfigV1 !== 'object') {
      return null;
    }
    return aiContract.missionConfigV1 as MissionConfigV1;
  }

  /**
   * Step 6.1: Build dynamics block for system prompt
   */
  private buildDynamicsBlock(
    dynamics: MissionConfigV1Dynamics | null,
    aiStyle: AiStyle | null,
  ): string | null {
    if (!dynamics) return null;

    const instructions: string[] = [];

    // Pace: Controls response speed and urgency
    if (dynamics.pace !== null && dynamics.pace !== undefined) {
      if (dynamics.pace >= 70) {
        instructions.push(
          `- RESPONSE PACE: Fast-paced. Keep responses quick, energetic, and forward-moving.`,
        );
      } else if (dynamics.pace <= 30) {
        instructions.push(
          `- RESPONSE PACE: Slow and measured. Take your time, be thoughtful, don't rush.`,
        );
      } else {
        instructions.push(`- RESPONSE PACE: Moderate pace. Natural flow.`);
      }
    }

    // Emoji Density: Controls emoji usage
    if (dynamics.emojiDensity !== null && dynamics.emojiDensity !== undefined) {
      if (dynamics.emojiDensity >= 60) {
        instructions.push(`- EMOJI USAGE: Use emojis frequently (2-3 per message).`);
      } else if (dynamics.emojiDensity <= 20) {
        instructions.push(`- EMOJI USAGE: Minimal or no emojis. Keep it text-focused.`);
      } else {
        instructions.push(`- EMOJI USAGE: Occasional emojis (0-1 per message).`);
      }
    }

    // Flirtiveness: Controls flirtatious behavior
    if (dynamics.flirtiveness !== null && dynamics.flirtiveness !== undefined) {
      if (dynamics.flirtiveness >= 70) {
        instructions.push(
          `- FLIRTINESS: High. Be playful, flirty, create romantic tension. Use light teasing.`,
        );
      } else if (dynamics.flirtiveness <= 25) {
        instructions.push(
          `- FLIRTINESS: Low. Keep it platonic and friendly. No romantic undertones.`,
        );
      } else {
        instructions.push(`- FLIRTINESS: Moderate. Natural, friendly with light playfulness.`);
      }
    }

    // Hostility: Controls pushback/resistance
    if (dynamics.hostility !== null && dynamics.hostility !== undefined) {
      if (dynamics.hostility >= 60) {
        instructions.push(
          `- PUSHBACK LEVEL: High. Push back, challenge, be harder to impress. Maintain boundaries firmly.`,
        );
      } else if (dynamics.hostility <= 15) {
        instructions.push(`- PUSHBACK LEVEL: Low. Be warm, accepting, easy-going.`);
      } else {
        instructions.push(`- PUSHBACK LEVEL: Moderate. Balanced between warm and challenging.`);
      }
    }

    // Dryness: Controls humor style
    if (dynamics.dryness !== null && dynamics.dryness !== undefined) {
      if (dynamics.dryness >= 70) {
        instructions.push(
          `- HUMOR STYLE: Dry and sarcastic. Use wit, subtle sarcasm, deadpan humor.`,
        );
      } else if (dynamics.dryness <= 20) {
        instructions.push(`- HUMOR STYLE: Warm and friendly. Positive, uplifting humor.`);
      } else {
        instructions.push(`- HUMOR STYLE: Balanced. Mix of warmth and wit.`);
      }
    }

    // Vulnerability: Controls openness
    if (dynamics.vulnerability !== null && dynamics.vulnerability !== undefined) {
      if (dynamics.vulnerability >= 70) {
        instructions.push(
          `- VULNERABILITY: High. Be open, emotionally available, share feelings.`,
        );
      } else if (dynamics.vulnerability <= 25) {
        instructions.push(`- VULNERABILITY: Low. Keep it guarded, surface-level.`);
      } else {
        instructions.push(`- VULNERABILITY: Moderate. Some openness, but balanced.`);
      }
    }

    // Escalation Speed: Controls how quickly conversation escalates
    if (dynamics.escalationSpeed !== null && dynamics.escalationSpeed !== undefined) {
      if (dynamics.escalationSpeed >= 70) {
        instructions.push(
          `- ESCALATION: Fast. Move conversation forward quickly, increase intimacy rapidly.`,
        );
      } else if (dynamics.escalationSpeed <= 30) {
        instructions.push(
          `- ESCALATION: Slow. Take time to build connection, gradual progression.`,
        );
      } else {
        instructions.push(`- ESCALATION: Moderate. Natural progression.`);
      }
    }

    // Randomness: Controls unpredictability
    if (dynamics.randomness !== null && dynamics.randomness !== undefined) {
      if (dynamics.randomness >= 60) {
        instructions.push(
          `- UNPREDICTABILITY: High. Be more spontaneous, unexpected, keep them guessing.`,
        );
      } else if (dynamics.randomness <= 25) {
        instructions.push(`- UNPREDICTABILITY: Low. Be consistent and predictable.`);
      } else {
        instructions.push(`- UNPREDICTABILITY: Moderate. Some variety, but consistent.`);
      }
    }

    if (instructions.length === 0) return null;

    return [
      `DYNAMICS (CONVERSATION BEHAVIOR):`,
      `These dynamics shape how you respond and interact:`,
      ...instructions,
      `- Combine these dynamics with your AI Style above to create natural, consistent behavior.`,
    ].join('\n');
  }

  /**
   * Step 6.2: Build difficulty block for system prompt
   */
  private buildDifficultyBlock(
    difficulty: MissionConfigV1Difficulty | null,
  ): string | null {
    if (!difficulty) return null;

    const instructions: string[] = [];

    // Strictness: How strictly to grade (for scoring context, not persona behavior)
    // Note: This is informational for the AI, actual grading happens in scoring service
    if (difficulty.strictness !== null && difficulty.strictness !== undefined) {
      if (difficulty.strictness >= 70) {
        instructions.push(
          `- GRADING CONTEXT: This mission uses strict grading. Responses will be evaluated very carefully.`,
        );
      } else if (difficulty.strictness <= 30) {
        instructions.push(
          `- GRADING CONTEXT: This mission uses lenient grading. More forgiving evaluation.`,
        );
      }
    }

    // Ambiguity Tolerance: How much ambiguity is acceptable
    if (difficulty.ambiguityTolerance !== null && difficulty.ambiguityTolerance !== undefined) {
      if (difficulty.ambiguityTolerance <= 30) {
        instructions.push(
          `- CLARITY EXPECTATION: User responses should be clear and unambiguous.`,
        );
      } else if (difficulty.ambiguityTolerance >= 70) {
        instructions.push(
          `- CLARITY EXPECTATION: Some ambiguity in user responses is acceptable.`,
        );
      }
    }

    if (instructions.length === 0) return null;

    return [
      `DIFFICULTY SETTINGS:`,
      `These settings affect how this mission is evaluated:`,
      ...instructions,
    ].join('\n');
  }

  /**
   * Step 6.4: Build response architecture block for system prompt
   * Enhanced to integrate dynamics (pace, flirtiveness, vulnerability) into reasoning steps
   */
  private buildResponseArchitectureBlock(
    responseArchitecture: MissionConfigV1ResponseArchitecture | null,
    dynamics?: MissionConfigV1Dynamics | null,
  ): string | null {
    if (!responseArchitecture) return null;

    const instructions: string[] = [];

    // Extract dynamics values for integration
    const pace = dynamics?.pace ?? 50;
    const flirtiveness = dynamics?.flirtiveness ?? 40;
    const vulnerability = dynamics?.vulnerability ?? 50;
    const hostility = dynamics?.hostility ?? 30;

    // Internal Reasoning Steps with Dynamics Integration
    instructions.push(
      `RESPONSE ARCHITECTURE (INTERNAL REASONING):`,
      `Before responding, follow these steps and apply dynamics:`,
      ``,
      `1. INTERPRETATION:`,
      `   - Determine what the user means beyond the words.`,
      `   - Identify subtext, tension, and underlying intent.`,
      `   - Consider context from previous messages.`,
      `   - ${pace >= 70 ? 'Interpret quickly - don\'t overthink.' : pace <= 30 ? 'Take time to fully understand the nuance.' : 'Interpret naturally with moderate consideration.'}`,
      ``,
      `2. PERSONA LENS (APPLY DYNAMICS HERE):`,
      `   - Apply your persona's emotional and cognitive lens to interpret the message.`,
      `   - ${responseArchitecture.emotionalMirroring !== null && responseArchitecture.emotionalMirroring >= 0.7 ? 'Emotionally mirror the user\'s tone and energy.' : 'Respond authentically to your persona.'}`,
      `   - ${flirtiveness >= 70 ? 'Apply high flirtiness: Look for romantic/playful subtext, create tension.' : flirtiveness <= 25 ? 'Apply low flirtiness: Keep it platonic, no romantic undertones.' : 'Apply moderate flirtiness: Natural playfulness.'}`,
      `   - ${vulnerability >= 70 ? 'Apply high vulnerability: Be open to emotional depth, share feelings.' : vulnerability <= 25 ? 'Apply low vulnerability: Keep it guarded, surface-level.' : 'Apply moderate vulnerability: Some openness, balanced.'}`,
      `   - ${hostility >= 60 ? 'Apply high pushback: Challenge, maintain boundaries, be harder to impress.' : hostility <= 15 ? 'Apply low pushback: Be warm, accepting, easy-going.' : 'Apply moderate pushback: Balanced warmth and challenge.'}`,
      `   - What would your persona feel or think given these dynamics?`,
      ``,
      `3. COGNITIVE FILTER (APPLY DIFFICULTY + DYNAMICS):`,
      `   - Apply difficulty thresholds (strictness, ambiguity tolerance) to your interpretation.`,
      `   - ${responseArchitecture.clarity !== null && responseArchitecture.clarity >= 0.7 ? 'Be very clear and direct.' : 'Allow some ambiguity if appropriate.'}`,
      `   - ${responseArchitecture.reflection !== null && responseArchitecture.reflection >= 0.7 ? 'Reflect deeply before responding.' : 'Respond naturally.'}`,
      `   - ${pace >= 70 ? 'Filter quickly - prioritize speed over depth.' : pace <= 30 ? 'Filter carefully - prioritize depth and thoughtfulness.' : 'Filter with balanced consideration.'}`,
      ``,
      `4. RESPONSE BUILDER (APPLY ALL LAYERS):`,
      `   - Formulate your final response using the filtered interpretation and persona lens.`,
      `   - ${responseArchitecture.validation !== null && responseArchitecture.validation >= 0.7 ? 'Validate and affirm the user.' : 'Respond authentically.'}`,
      `   - ${responseArchitecture.pushPullFactor !== null && responseArchitecture.pushPullFactor >= 0.7 ? 'Create push-pull dynamics (interest with some resistance).' : 'Respond naturally.'}`,
      `   - ${responseArchitecture.riskTaking !== null && responseArchitecture.riskTaking >= 0.7 ? 'Take risks and be bold.' : 'Be measured and safe.'}`,
      `   - ${responseArchitecture.personaConsistency !== null && responseArchitecture.personaConsistency >= 0.8 ? 'Maintain STRICT persona consistency - never break character.' : 'Allow natural variation while staying in character.'}`,
      `   - RESPONSE LENGTH: ${pace >= 70 ? 'Keep responses SHORT and punchy (1-2 sentences max).' : pace <= 30 ? 'Allow LONGER responses (3-5 sentences, thoughtful).' : 'Moderate length (2-3 sentences).'}`,
      `   - EMOTIONAL DEPTH: ${vulnerability >= 70 ? 'Show DEEP emotional depth, share feelings openly.' : vulnerability <= 25 ? 'Keep emotions SURFACE-LEVEL, guarded.' : 'Moderate emotional depth.'}`,
      `   - FLIRTINESS LEVEL: ${flirtiveness >= 70 ? 'Be HIGHLY flirty, playful, create romantic tension.' : flirtiveness <= 25 ? 'Be PLATONIC, no romantic undertones.' : 'Moderate flirtiness, natural playfulness.'}`,
    );

    // Reflection level
    if (responseArchitecture.reflection !== null && responseArchitecture.reflection !== undefined) {
      if (responseArchitecture.reflection >= 0.7) {
        instructions.push(`   - REFLECTION: High. Think deeply before responding.`);
      } else if (responseArchitecture.reflection <= 0.3) {
        instructions.push(`   - REFLECTION: Low. Respond quickly and naturally.`);
      }
    }

    // Emotional mirroring
    if (responseArchitecture.emotionalMirroring !== null && responseArchitecture.emotionalMirroring !== undefined) {
      if (responseArchitecture.emotionalMirroring >= 0.7) {
        instructions.push(`   - EMOTIONAL MIRRORING: High. Match and reflect the user's emotional tone.`);
      } else if (responseArchitecture.emotionalMirroring <= 0.3) {
        instructions.push(`   - EMOTIONAL MIRRORING: Low. Maintain your own emotional state.`);
      }
    }

    // Reasoning depth
    if (responseArchitecture.reasoningDepth !== null && responseArchitecture.reasoningDepth !== undefined) {
      if (responseArchitecture.reasoningDepth >= 0.7) {
        instructions.push(`   - REASONING DEPTH: High. Think analytically and deeply.`);
      } else if (responseArchitecture.reasoningDepth <= 0.3) {
        instructions.push(`   - REASONING DEPTH: Low. Keep it simple and surface-level.`);
      }
    }

    return instructions.join('\n');
  }

  /**
   * Step 6.5: Build mood state block for system prompt
   * Enhanced to show tension/stability impact and ensure mood context is prominent
   */
  private buildMoodStateBlock(
    missionState: MissionStateV1 | null,
    responseArchitecture?: MissionConfigV1ResponseArchitecture | null,
  ): string | null {
    if (!missionState || !missionState.mood) return null;

    const mood = missionState.mood;
    const instructions: string[] = [];

    instructions.push(
      `⚠️ CURRENT MOOD STATE (CRITICAL - MUST INFLUENCE YOUR RESPONSE):`,
      `Your current emotional/relational state:`,
      `- Mood: ${mood.currentMood.toUpperCase()}`,
      `- Positivity: ${mood.positivityPct}%`,
      `- Tension Level: ${Math.round(mood.tensionLevel * 100)}%`,
      `- Stability: ${mood.isStable ? 'Stable' : 'Shifting'}`,
      mood.lastChangeReason ? `- Last Change: ${mood.lastChangeReason}` : null,
      ``,
      `🎯 MOOD-BASED BEHAVIOR (APPLY THESE TO YOUR RESPONSE):`,
    );

    // Mood-specific instructions
    switch (mood.currentMood) {
      case 'warm':
        instructions.push(
          `- Be warm, friendly, and open.`,
          `- Show positive interest and engagement.`,
          `- Use positive language and emojis if appropriate.`,
        );
        break;
      case 'cold':
        instructions.push(
          `- Be more reserved and distant.`,
          `- Reduce warmth and enthusiasm.`,
          `- Be more guarded in your responses.`,
        );
        break;
      case 'excited':
        instructions.push(
          `- Be energetic and enthusiastic.`,
          `- Show high interest and engagement.`,
          `- Use exclamation marks and positive language.`,
        );
        break;
      case 'annoyed':
        instructions.push(
          `- Show mild annoyance or frustration.`,
          `- Be slightly less warm.`,
          `- May push back or challenge slightly.`,
        );
        break;
      case 'testing':
        instructions.push(
          `- Test the user's intentions.`,
          `- Be slightly challenging or skeptical.`,
          `- Don't be too easy or eager.`,
        );
        break;
      case 'interested':
        instructions.push(
          `- Show genuine interest.`,
          `- Ask follow-up questions.`,
          `- Be engaged and curious.`,
        );
        break;
      case 'bored':
        instructions.push(
          `- Show mild disinterest.`,
          `- Be less enthusiastic.`,
          `- May give shorter responses.`,
        );
        break;
      case 'neutral':
      default:
        instructions.push(
          `- Maintain neutral, balanced tone.`,
          `- Be friendly but not overly warm or cold.`,
        );
        break;
    }

    // Tension-based instructions (CRITICAL - must affect response)
    if (mood.tensionLevel >= 0.7) {
      instructions.push(
        ``,
        `⚠️ HIGH TENSION (${Math.round(mood.tensionLevel * 100)}%):`,
        `   - Be MORE CAREFUL and measured in your response.`,
        `   - Reduce risk-taking and boldness.`,
        `   - Be more guarded and aware of potential issues.`,
        `   - ${responseArchitecture ? 'Lower emotional mirroring - maintain distance.' : 'Keep emotional distance.'}`,
        `   - ${responseArchitecture && responseArchitecture.clarity ? 'Increase clarity - be very direct and clear.' : 'Be clear and direct.'}`,
        `   - This tension MUST be reflected in your tone - be more cautious.`,
      );
    } else if (mood.tensionLevel <= 0.3) {
      instructions.push(
        ``,
        `✅ LOW TENSION (${Math.round(mood.tensionLevel * 100)}%):`,
        `   - Feel free to be MORE RELAXED and playful.`,
        `   - Increase risk-taking and boldness if appropriate.`,
        `   - Be more open and warm.`,
        `   - ${responseArchitecture && responseArchitecture.riskTaking ? 'Take more risks - be bolder.' : 'Be more adventurous.'}`,
        `   - This low tension MUST be reflected in your tone - be more relaxed.`,
      );
    } else {
      instructions.push(
        ``,
        `⚖️ MODERATE TENSION (${Math.round(mood.tensionLevel * 100)}%):`,
        `   - Maintain balanced approach.`,
        `   - Be aware but not overly cautious.`,
      );
    }

    // Stability instructions (CRITICAL - affects consistency)
    if (!mood.isStable) {
      instructions.push(
        ``,
        `🔄 MOOD SHIFTING (UNSTABLE):`,
        `   - Your mood is in transition - this MUST be visible in your response.`,
        `   - Allow your responses to reflect this transition naturally.`,
        `   - ${mood.lastChangeReason ? `You're shifting because: ${mood.lastChangeReason}` : 'You\'re experiencing a mood shift.'}`,
        `   - Don't be completely consistent - show the shift happening.`,
      );
    } else {
      instructions.push(
        ``,
        `✅ MOOD STABLE:`,
        `   - Your mood is stable - maintain consistency with your current state.`,
        `   - Don't make sudden changes - stay consistent with ${mood.currentMood} mood.`,
      );
    }

    // Explicit instruction to apply mood to response
    instructions.push(
      ``,
      `🚨 CRITICAL: Your response MUST reflect the current mood state above.`,
      `   - If mood is ${mood.currentMood}, your response MUST sound ${mood.currentMood}.`,
      `   - If tension is ${mood.tensionLevel >= 0.7 ? 'high' : mood.tensionLevel <= 0.3 ? 'low' : 'moderate'}, your response MUST reflect that.`,
      `   - If mood is ${mood.isStable ? 'stable' : 'shifting'}, your response MUST show that.`,
      `   - DO NOT ignore the mood state - it is a PRIMARY factor in your response.`,
    );

    return instructions.filter(Boolean).join('\n');
  }

  /**
   * Step 6.4: Build objective block for system prompt
   */
  private buildObjectiveBlock(
    missionConfig: {
      objective?: MissionConfigV1Objective | null;
      dynamics?: MissionConfigV1Dynamics | null;
      difficulty?: MissionConfigV1Difficulty | null;
      openings?: MissionConfigV1Openings | null;
      responseArchitecture?: MissionConfigV1ResponseArchitecture | null;
    } | null,
    aiContract: Record<string, any> | null,
  ): string | null {
    const objective = missionConfig?.objective ?? this.extractMissionConfig(aiContract)?.objective ?? null;
    if (!objective) return null;

    return [
      `🎯 ACTIVE OBJECTIVE:`,
      `- Objective Type: ${objective.kind}`,
      `- Title: ${objective.userTitle}`,
      `- Description: ${objective.userDescription}`,
      `- Your goal is to help the user achieve this objective through natural conversation.`,
      `- Do NOT explicitly state the objective to the user unless it's part of the mission design.`,
    ].join('\n');
  }

  /**
   * Step 6.4: Build gate status block for system prompt
   * Phase 2: Updated to use checklist-based descriptions (no numeric scores)
   */
  private buildGateStatusBlock(missionState: MissionStateV1 | null): string | null {
    if (!missionState?.gateState) return null;

    const gateState = missionState.gateState;
    const metGates = gateState.metGates;
    const unmetGates = gateState.unmetGates;

    // Phase 2: Checklist-based gate descriptions (no numeric score references)
    const gateDescriptions: Record<string, string> = {
      GATE_MIN_MESSAGES: 'Minimum messages sent',
      GATE_SUCCESS_THRESHOLD: 'Sufficient positive hooks, objective progress, boundary safety, and momentum',
      GATE_FAIL_FLOOR: 'Boundary safety maintained and objective progress shown',
      GATE_DISQUALIFIED: 'Not disqualified',
      GATE_OBJECTIVE_PROGRESS: 'Objective progress demonstrated',
    };

    const metGatesList = metGates.map((key) => `  ✅ ${key}: ${gateDescriptions[key] ?? key}`).join('\n');
    const unmetGatesList = unmetGates.map((key) => `  ❌ ${key}: ${gateDescriptions[key] ?? key}`).join('\n');

    return [
      `🚪 GATE STATUS (CRITICAL - DO NOT IGNORE):`,
      `Current gate state for this mission (based on checklist flags, not numeric scores):`,
      metGates.length > 0 ? `Met Gates:\n${metGatesList}` : `Met Gates: None yet`,
      unmetGates.length > 0 ? `Unmet Gates:\n${unmetGatesList}` : `Unmet Gates: None (all met!)`,
      ``,
      `All Required Gates Met: ${gateState.allRequiredGatesMet ? 'YES ✅' : 'NO ❌'}`,
      gateState.allRequiredGatesMet
        ? `- All gates are met (positive hooks, objective progress, boundary safety, momentum). You may proceed toward the objective reward when appropriate.`
        : `- Some gates are not yet met. You must NOT provide the objective reward until all gates are met (sufficient positive hooks, objective progress, boundary safety, and momentum).`,
    ].join('\n');
  }

  /**
   * Step 6.4: Build reward permissions block for system prompt
   */
  private buildRewardPermissionsBlock(
    missionState: MissionStateV1 | null,
    missionConfig: {
      objective?: MissionConfigV1Objective | null;
      dynamics?: MissionConfigV1Dynamics | null;
      difficulty?: MissionConfigV1Difficulty | null;
      openings?: MissionConfigV1Openings | null;
      responseArchitecture?: MissionConfigV1ResponseArchitecture | null;
    } | null,
    aiContract: Record<string, any> | null,
  ): string | null {
    if (!missionState) return null;

    const objective = missionConfig?.objective ?? this.extractMissionConfig(aiContract)?.objective ?? null;
    if (!objective) return null;

    // Step 6.4 Fix: Use RewardReleaseService as single source of truth
    const permissions = this.rewardReleaseService.getRewardPermissionsForState(missionState, objective);
    
    // Map objective to reward description
    let rewardDescription: string = 'mission success';
    switch (objective.kind) {
      case 'GET_NUMBER':
        rewardDescription = 'phone number';
        break;
      case 'GET_INSTAGRAM':
        rewardDescription = 'Instagram handle';
        break;
      case 'GET_DATE_AGREEMENT':
        rewardDescription = 'date agreement';
        break;
      case 'FIX_AWKWARD_MOMENT':
      case 'HOLD_BOUNDARY':
      case 'PRACTICE_OPENING':
        rewardDescription = 'mission pass';
        break;
    }

    const allGatesMet = permissions.allGatesMet;
    const unmetGates = permissions.unmetGates;

    return [
      `🔒 REWARD PERMISSIONS (CRITICAL - STRICTLY ENFORCE):`,
      `Objective Reward: ${rewardDescription}`,
      `Status: ${allGatesMet ? 'ALLOWED ✅' : 'FORBIDDEN ❌'}`,
      ...(unmetGates.length > 0 ? [`Unmet Gates: ${unmetGates.join(', ')}`] : []),
      ``,
      allGatesMet
        ? [
            `✅ YOU ARE ALLOWED to provide the reward (${rewardDescription}) when:`,
            `  - The conversation naturally reaches a point where it makes sense`,
            `  - The user has demonstrated sufficient engagement and skill`,
            `  - It feels authentic and not forced`,
            `  - You can provide it in a natural, organic way`,
            ``,
            `⚠️ IMPORTANT: Even though gates are met, you should NOT give the reward immediately.`,
            `  Wait for the right moment in the conversation. Make it feel earned and natural.`,
          ].join('\n')
        : [
            `❌ YOU ARE FORBIDDEN from providing the reward (${rewardDescription}) until:`,
            `  - ALL required gates are met (see Gate Status above)`,
            `  - The user has demonstrated sufficient progress`,
            ``,
            `🚨 CRITICAL: If the user asks for ${rewardDescription} before gates are met, you must:`,
            `  - Politely deflect or redirect`,
            `  - Continue building rapport and engagement`,
            `  - Do NOT give the reward even if asked directly`,
            `  - You can say things like "Let's get to know each other better first" or similar`,
            `  - But do NOT explicitly mention "gates" or "requirements" to the user`,
          ].join('\n'),
    ].join('\n');
  }

  /**
   * Step 6.8: Build modifier hints block for prompt
   * Applies active modifiers to adjust AI behavior
   */
  private buildModifierHintsBlock(missionState: MissionStateV1 | null): string | null {
    if (!missionState?.activeModifiers || missionState.activeModifiers.length === 0) {
      return null;
    }

    const hints: string[] = [];
    hints.push(`⚡ ACTIVE MODIFIERS (Temporary Behavior Adjustments):`);

    for (const modifier of missionState.activeModifiers) {
      if (modifier.effect === 'reduceRisk') {
        hints.push(
          `- Play slightly safer/less risky for the next ${modifier.remainingTurns} message(s). Reason: ${modifier.reason ?? 'Risk reduction'}`,
        );
      } else if (modifier.effect === 'lowerWarmth') {
        hints.push(
          `- Reduce warmth slightly for the next ${modifier.remainingTurns} message(s). Reason: ${modifier.reason ?? 'Warmth reduction'}`,
        );
      }
    }

    hints.push(
      `- These modifiers are temporary and will expire after the specified number of messages.`,
      `- Adjust your tone and approach accordingly, but maintain overall persona consistency.`,
    );

    return hints.join('\n');
  }
}

function safeJson(obj: any, maxChars: number) {
  try {
    const s = JSON.stringify(obj, null, 2);
    if (s.length <= maxChars) return s;
    return s.slice(0, maxChars) + '\n...<truncated>';
  } catch {
    return String(obj);
  }
}

function stripCodeFences(s: string) {
  const t = (s || '').trim();
  if (!t) return t;
  if (t.startsWith('```')) {
    const withoutStart = t.replace(/^```[a-zA-Z]*\n?/, '');
    return withoutStart.replace(/```$/, '').trim();
  }
  return t;
}

function extractJsonObjectCandidate(s: string): string | null {
  const t = stripCodeFences(s);
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  return t.slice(first, last + 1).trim();
}

function clampScore(n: any): number | undefined {
  const x = Number(n);
  if (!Number.isFinite(x)) return undefined;
  const clamped = Math.max(0, Math.min(100, x));
  return Math.round(clamped);
}

function toRarity(v: any): StructuredRarity | undefined {
  if (v === 'C' || v === 'B' || v === 'A' || v === 'S' || v === 'S+') return v;
  return undefined;
}

function toTags(v: any): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const cleaned = v
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter((x) => x.length > 0)
    .slice(0, 12);
  return cleaned.length ? cleaned : undefined;
}

function fallbackReply(raw: string) {
  const t = (raw || '').trim();
  if (!t) return "Sorry — I couldn't generate a reply right now.";
  if (t.startsWith('{') && t.endsWith('}')) return "Sorry — I couldn't generate a reply right now.";
  return t;
}

function coerceReplyTextFromAnything(raw: any): string | null {
  if (typeof raw === 'string') return raw.trim() || null;
  if (raw && typeof raw === 'object') {
    const candidates = [raw.replyText, raw.text, raw.reply, raw.content, raw.message];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) return c.trim();
    }
  }
  return null;
}

function tryParseStructuredJson(text: string): AiStructuredReply | null {
  const candidate = extractJsonObjectCandidate(text);
  if (!candidate) {
    return { replyText: fallbackReply(text), parseOk: false, raw: text };
  }

  try {
    const obj = JSON.parse(candidate);
    const replyText = coerceReplyTextFromAnything(obj) || fallbackReply(text);
    const messageScore = clampScore(obj?.messageScore);
    const rarity = toRarity(obj?.rarity);
    const tags = toTags(obj?.tags);

    return {
      replyText,
      messageScore,
      rarity,
      tags,
      raw: obj,
      parseOk: typeof obj === 'object' && obj !== null,
    };
  } catch {
    return { replyText: fallbackReply(text), parseOk: false, raw: candidate };
  }
}
