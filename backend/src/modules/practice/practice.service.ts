// (I’m keeping your file intact; only changed the "fallback to DB chatMessage" section.)

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { AiScoringService } from '../ai/ai-scoring.service';
import { AiCoreScoringService } from '../ai/ai-core-scoring.service';
import { AiChatService } from '../ai/providers/ai-chat.service';
import { SessionsService } from '../sessions/sessions.service';
// Step 6.3-6.5: Import new services
import { OpeningsService } from '../ai-engine/openings.service';
import { MissionStateService } from '../ai-engine/mission-state.service';
import type { MissionStateV1, GateState } from '../ai-engine/mission-state-v1.schema';
// Step 6.4: Import gate and reward services
import { GatesService, type GateKey } from '../gates/gates.service';
import { RewardReleaseService } from '../ai-engine/reward-release.service';
import { getGateRequirementsForObjective } from '../ai-engine/registries/objective-gate-mappings.registry';
import { EngineConfigService } from '../engine-config/engine-config.service';
// Step 6.6: Import micro-dynamics service
import { MicroDynamicsService } from '../ai-engine/micro-dynamics.service';
// Step 6.8: Import persona drift service
import { PersonaDriftService } from '../ai-engine/persona-drift.service';
import { MissionsService } from '../missions/missions.service';
// Step 8: Import FastPath services
import { MoodStateMachineService } from '../mission-state/mood-state-machine.service';
import { ScoreAccumulatorService } from '../ai/score-accumulator.service';
import { computeUiEventHint, computeRarity } from './utils/micro-interactions.utils';
import {
  MessageChecklistFlag,
  MessageChecklistSnapshot,
  scoreFromChecklist,
  scoreToTier,
} from '../sessions/scoring';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DeepAnalysisJobPayload } from '../queue/jobs/deep-analysis.job';
import { MessageAnalysisJobPayload } from '../queue/jobs/message-analysis.job';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import {
  normalizeMissionConfigV1,
  type NormalizedMissionConfigV1,
  type NormalizeResult,
} from './mission-config-runtime';
import {
  MissionEndReasonCode,
  MISSION_END_REASON_CODES,
  MISSION_END_REASON_PRECEDENCE,
} from '../missions-admin/mission-config-v1.schema';
import { Prisma } from '@prisma/client';
// ✅ Step 5.6: Import allowlist serializer
import { toPracticeSessionResponsePublic } from '../shared/serializers/api-serializers';
// ✅ Step 5.7: Import shared normalizeEndReason
import { normalizeEndReason } from '../shared/normalizers/end-reason.normalizer';

import type { PracticeMessageInput as AiPracticeMessageInput } from '../ai/ai.types';
import type { TranscriptMessage } from '../ai/ai-scoring.types';
import {
  AiStyle,
  AiStyleKey,
  MessageRole,
  MissionStatus,
  MissionDifficulty,
  MissionGoalType,
} from '@prisma/client';

type MissionStateStatus = 'IN_PROGRESS' | 'SUCCESS' | 'FAIL';
type MissionMood = 'SAFE' | 'WARNING' | 'DANGER' | 'GOOD';
type TranscriptMsg = { role: 'USER' | 'AI'; content: string };

type DisqualifyCode = 'SEXUAL_EXPLICIT' | 'HARASSMENT_SLUR' | 'THREAT_VIOLENCE';

type DisqualifyResult = {
  code: DisqualifyCode;
  triggeredByUserMessageIndex: number;
  matchedText: string;
};

export interface MissionStatePayload {
  status: MissionStateStatus;
  progressPct: number;
  averageScore: number;
  totalMessages: number;

  remainingMessages?: number;
  mood?: MissionMood;

  policy?: {
    difficulty: MissionDifficulty;
    goalType: MissionGoalType | null;
    maxMessages: number;
    successScore: number;
    failScore: number;
  };

  disqualified?: boolean;
  disqualify?: DisqualifyResult | null;

  endReasonCode?: MissionEndReasonCode | null;
  endReasonMeta?: Record<string, any> | null;
  checklist?: {
    positiveHookCount: number;
    objectiveProgressCount: number;
    boundarySafeStreak: number;
    momentumStreak: number;
    lastFlags?: MessageChecklistFlag[] | null;
    requiredFlagHits: number;
  };
}

function safeTrim(s: any): string {
  return typeof s === 'string' ? s.trim() : '';
}

function toTranscriptRole(role: any): TranscriptMsg['role'] {
  return role === 'USER' ? 'USER' : 'AI';
}

function clampInt(n: any, min: number, max: number, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(v)));
}

/**
 * Step 8: Parse Step 8 structured JSON from AI response
 * Extracts micro-interaction fields from aiStructured.raw or aiReply
 */
/**
 * Phase 2: Removed numeric score fields - all scores derived from checklist via scoreFromChecklist
 */
function parseStep8StructuredJson(aiStructured: any, aiReply: string): {
  reply: string;
  checklist?: MessageChecklistSnapshot;
  moodDelta?: 'up' | 'down' | 'stable';
  tensionDelta?: 'up' | 'down' | 'stable';
  comfortDelta?: 'up' | 'down' | 'stable';
  boundaryRisk?: 'low' | 'med' | 'high';
  microFlags?: string[];
} {
  // Try to parse from aiStructured.raw first
  const raw = aiStructured?.raw;
  if (raw && typeof raw === 'object') {
    const reply = typeof raw.reply === 'string' ? raw.reply : aiReply;
    let checklist: MessageChecklistSnapshot | undefined;
    if (raw.checklist && typeof raw.checklist === 'object') {
      const rawFlags = Array.isArray(raw.checklist.flags) ? raw.checklist.flags : [];
      const normalizedFlags = rawFlags.filter((f: any) =>
        Object.values(MessageChecklistFlag).includes(f as MessageChecklistFlag),
      ) as MessageChecklistFlag[];
      const notes = Array.isArray(raw.checklist.notes)
        ? raw.checklist.notes.filter((n: any) => typeof n === 'string')
        : undefined;
      if (normalizedFlags.length > 0) {
        checklist = { flags: normalizedFlags, notes };
      }
    }
    // Phase 2: Removed localScoreTier and localScoreNumeric - scores derived from checklist only
    const moodDelta = ['up', 'down', 'stable'].includes(raw.moodDelta)
      ? (raw.moodDelta as 'up' | 'down' | 'stable')
      : undefined;
    const tensionDelta = ['up', 'down', 'stable'].includes(raw.tensionDelta)
      ? (raw.tensionDelta as 'up' | 'down' | 'stable')
      : undefined;
    const comfortDelta = ['up', 'down', 'stable'].includes(raw.comfortDelta)
      ? (raw.comfortDelta as 'up' | 'down' | 'stable')
      : undefined;
    const boundaryRisk = ['low', 'med', 'high'].includes(raw.boundaryRisk)
      ? (raw.boundaryRisk as 'low' | 'med' | 'high')
      : undefined;
    const microFlags = Array.isArray(raw.microFlags)
      ? raw.microFlags.filter((f: any) => typeof f === 'string')
      : undefined;

    return {
      reply,
      checklist,
      moodDelta,
      tensionDelta,
      comfortDelta,
      boundaryRisk,
      microFlags,
    };
  }

  // Phase 2: Fallback - missing checklist will result in safe low score via scoreFromChecklist({ flags: [] })
  return { reply: aiReply };
}


type BasePolicy = { maxMessages: number; successScore: number; failScore: number };

function basePolicyForDifficulty(d: MissionDifficulty): BasePolicy {
  switch (d) {
    case MissionDifficulty.EASY:
      return { maxMessages: 3, successScore: 70, failScore: 50 };
    case MissionDifficulty.MEDIUM:
      return { maxMessages: 4, successScore: 78, failScore: 55 };
    case MissionDifficulty.HARD:
      return { maxMessages: 5, successScore: 86, failScore: 60 };
    case MissionDifficulty.ELITE:
      return { maxMessages: 5, successScore: 92, failScore: 65 };
    default:
      return { maxMessages: 5, successScore: 80, failScore: 60 };
  }
}

function goalTypeSuccessModifier(goalType: MissionGoalType | null): number {
  switch (goalType) {
    case MissionGoalType.OPENING:
      return -5;
    case MissionGoalType.BOUNDARY:
      return +3;
    case MissionGoalType.RECOVERY:
      return +2;
    case MissionGoalType.LOGISTICS:
      return +1;
    case MissionGoalType.FLIRTING:
    case MissionGoalType.SOCIAL:
    default:
      return 0;
  }
}

function resolvePolicy(params: {
  difficulty: MissionDifficulty;
  goalType: MissionGoalType | null;
  templateMaxMessages: number | null;
}): Required<MissionStatePayload>['policy'] {
  const base = basePolicyForDifficulty(params.difficulty);
  const mod = goalTypeSuccessModifier(params.goalType);

  const maxMessages =
    params.templateMaxMessages && params.templateMaxMessages > 0
      ? clampInt(params.templateMaxMessages, 1, 50, base.maxMessages)
      : base.maxMessages;

  const successScore = clampInt(base.successScore + mod, 0, 100, base.successScore);
  const failScore = clampInt(base.failScore + Math.floor(mod / 2), 0, 100, base.failScore);

  return {
    difficulty: params.difficulty,
    goalType: params.goalType,
    maxMessages,
    successScore,
    failScore,
  };
}

function resolvePolicyFromStatePolicy(params: {
  difficulty: MissionDifficulty;
  goalType: MissionGoalType | null;
  statePolicy: NormalizedMissionConfigV1['statePolicy'];
}): {
  policy: Required<MissionStatePayload>['policy'];
  minMessagesBeforeEndResolved: number | null;
} {
  const maxMessages = clampInt(params.statePolicy.maxMessages, 1, 50, 5);
  const successScoreThreshold = clampInt(params.statePolicy.successScoreThreshold, 0, 100, 80);
  const failScoreThreshold = clampInt(params.statePolicy.failScoreThreshold, 0, 100, 60);

  const minMessagesBeforeEndResolved: number | null =
    params.statePolicy.minMessagesBeforeEnd === null ||
    params.statePolicy.minMessagesBeforeEnd === undefined
      ? null
      : clampInt(params.statePolicy.minMessagesBeforeEnd, 1, maxMessages, maxMessages);

  return {
    policy: {
      difficulty: params.difficulty,
      goalType: params.goalType,
      maxMessages,
      successScore: successScoreThreshold,
      failScore: failScoreThreshold,
    },
    minMessagesBeforeEndResolved,
  };
}

function normalizeForRules(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstRegexHit(text: string, patterns: RegExp[]): string | null {
  for (const r of patterns) {
    const m = r.exec(text);
    if (m && m[0]) return m[0];
  }
  return null;
}

function detectDisqualify(
  userTextRaw: string,
  userMsgIndex: number,
  _ctx: { difficulty: MissionDifficulty; goalType: MissionGoalType | null },
): DisqualifyResult | null {
  const text = normalizeForRules(userTextRaw);
  if (!text) return null;

  const sexualPatterns: RegExp[] = [
    /\b(send\s+nudes|nudes|nude\s+pics)\b/i,
    /\b(fuck|blowjob|bj|anal|cum|orgasm)\b/i,
    /\b(pussy|dick|cock)\b/i,
    /\b(סקס|לזיין|זין|כוס|תמצצי|תמצוץ)\b/iu,
  ];

  const harassmentSlurs: RegExp[] = [
    /\b(bitch|whore|slut|cunt)\b/i,
    /\b(זונה|שרמוטה|כלבה)\b/iu,
  ];

  const violenceThreatPatterns: RegExp[] = [
    /\b(i\s*will\s*kill\s*you|kill\s*you|i\s*will\s*hurt\s*you|hurt\s*you)\b/i,
    /\b(stab|shoot|rape)\b/i,
    /\b(אני\s*אהרוג|להרוג|לרצוח|לדקור|לאנוס)\b/iu,
  ];

  const sexualHit = firstRegexHit(text, sexualPatterns);
  if (sexualHit) {
    return {
      code: 'SEXUAL_EXPLICIT',
      triggeredByUserMessageIndex: userMsgIndex,
      matchedText: sexualHit,
    };
  }

  const slurHit = firstRegexHit(text, harassmentSlurs);
  if (slurHit) {
    return {
      code: 'HARASSMENT_SLUR',
      triggeredByUserMessageIndex: userMsgIndex,
      matchedText: slurHit,
    };
  }

  const threatHit = firstRegexHit(text, violenceThreatPatterns);
  if (threatHit) {
    return {
      code: 'THREAT_VIOLENCE',
      triggeredByUserMessageIndex: userMsgIndex,
      matchedText: threatHit,
    };
  }

  return null;
}

function computeMissionState(
  messageScores: number[],
  policy: Required<MissionStatePayload>['policy'],
  minMessagesBeforeEnd?: number | null,
  checklistAgg?: {
    positiveHookCount: number;
    objectiveProgressCount: number;
    boundarySafeStreak: number;
    momentumStreak: number;
    lastFlags?: MessageChecklistFlag[] | null;
  } | null,
): MissionStatePayload {
  const totalUserMessages = messageScores.length;

  // Phase 2: Checklist-driven mission state (numeric scores only for legacy compatibility)
  const defaultChecklist = {
    positiveHookCount: checklistAgg?.positiveHookCount ?? 0,
    objectiveProgressCount: checklistAgg?.objectiveProgressCount ?? 0,
    boundarySafeStreak: checklistAgg?.boundarySafeStreak ?? 0,
    momentumStreak: checklistAgg?.momentumStreak ?? 0,
    lastFlags: checklistAgg?.lastFlags ?? null,
  };

  // Legacy averageScore computed for compatibility only (not used for decisions)
  const sum = messageScores.reduce((acc, v) => acc + v, 0);
  const avgRaw = messageScores.length > 0 ? sum / messageScores.length : 0;
  const averageScore = Math.round(avgRaw);

  if (!messageScores.length) {
    return {
      status: 'IN_PROGRESS',
      progressPct: 0,
      averageScore: 0, // Legacy field
      totalMessages: 0,
      remainingMessages: policy.maxMessages,
      mood: 'SAFE',
      policy,
      disqualified: false,
      disqualify: null,
      checklist: { ...defaultChecklist, requiredFlagHits: 0 },
    };
  }

  // Phase 2: Checklist-based progress calculation
  const rawProgress = (totalUserMessages / Math.max(1, policy.maxMessages)) * 100;
  const hasBoundarySafety = defaultChecklist.boundarySafeStreak >= totalUserMessages * 0.8; // 80% boundary-safe
  const hasPositiveHook = defaultChecklist.positiveHookCount >= Math.ceil(totalUserMessages * 0.4); // At least 40% have hooks
  const hasObjectiveProgress = defaultChecklist.objectiveProgressCount >= Math.ceil(totalUserMessages * 0.3); // At least 30% show progress
  const hasMomentum = defaultChecklist.momentumStreak >= Math.max(2, Math.ceil(totalUserMessages * 0.5)); // At least 50% maintain momentum

  // Checklist-based success criteria
  const checklistPassCount = [hasPositiveHook, hasObjectiveProgress, hasBoundarySafety, hasMomentum].filter(Boolean).length;
  const checklistProgress = Math.min(100, checklistPassCount * 25 + defaultChecklist.momentumStreak * 5);
  const progressPct = Math.max(
    5,
    Math.min(
      100,
      Math.round(rawProgress * 0.4 + checklistProgress * 0.6), // Weighted toward checklist
    ),
  );

  const minEnd = minMessagesBeforeEnd ?? policy.maxMessages;

  // Phase 2: Mission success/fail determined by checklist, NOT numeric thresholds
  let status: MissionStateStatus = 'IN_PROGRESS';
  if (totalUserMessages >= policy.maxMessages && totalUserMessages >= minEnd) {
    // Success requires: boundary safety + objective progress + (hook OR momentum)
    const successCriteria = hasBoundarySafety && hasObjectiveProgress && (hasPositiveHook || hasMomentum);
    status = successCriteria ? 'SUCCESS' : 'FAIL';
  }

  const remainingMessages = Math.max(0, policy.maxMessages - totalUserMessages);

  // Phase 2: Mood determined by checklist flags, not numeric scores
  let mood: MissionMood = 'SAFE';
  if (!hasBoundarySafety) {
    mood = 'DANGER'; // Critical: boundary violations
  } else if (status === 'SUCCESS') {
    mood = 'GOOD';
  } else if (!hasObjectiveProgress && !hasPositiveHook) {
    mood = 'WARNING'; // Low engagement
  } else if (hasMomentum || hasPositiveHook) {
    mood = 'GOOD'; // Positive signals present
  }

  return {
    status, // Determined by checklist, not averageScore
    progressPct, // Weighted toward checklist
    averageScore, // Legacy compatibility only
    totalMessages: totalUserMessages,
    remainingMessages,
    mood, // Determined by checklist flags
    policy,
    disqualified: false,
    disqualify: null,
    checklist: {
      ...defaultChecklist,
      requiredFlagHits: checklistPassCount,
    },
  };
}

function buildFallbackScoresOnDisqualify(params: {
  existingScores: number[];
  existingUserCount: number;
  deltaUserCount: number;
}): number[] {
  const base =
    params.existingScores.length === params.existingUserCount
      ? params.existingScores
      : Array(params.existingUserCount).fill(0);

  const delta = Array(params.deltaUserCount).fill(0);
  return [...base, ...delta];
}

function computeEndReason(params: {
  aiMode: 'MISSION' | 'FREEPLAY';
  status: MissionStateStatus;
  disqualified: boolean;
  disqualify: DisqualifyResult | null;
  averageScore: number; // Legacy compatibility only
  policy: Required<MissionStatePayload>['policy'];
  normalizedConfig: NormalizedMissionConfigV1 | null;
  // Step 6.4: Gate state for objective-based missions
  gateState?: { allRequiredGatesMet: boolean; unmetGates: string[] } | null;
  // Phase 2: Checklist aggregates for end reason meta
  checklistAgg?: {
    positiveHookCount: number;
    objectiveProgressCount: number;
    boundarySafeStreak: number;
    momentumStreak: number;
  } | null;
}): { code: MissionEndReasonCode | null; meta: Record<string, any> | null } {
  if (params.aiMode === 'FREEPLAY') {
    return { code: null, meta: null };
  }

  if (params.status === 'IN_PROGRESS') {
    return { code: null, meta: null };
  }

  if (params.disqualified && params.disqualify) {
    return {
      code: 'ABORT_DISQUALIFIED',
      meta: {
        disqualifyCode: params.disqualify.code,
        triggeredByUserMessageIndex: params.disqualify.triggeredByUserMessageIndex,
        matchedText: params.disqualify.matchedText,
      },
    };
  }

  const naturalReason: MissionEndReasonCode =
    params.status === 'SUCCESS' ? 'SUCCESS_OBJECTIVE' : 'FAIL_OBJECTIVE';

  // Step 6.4 Fix: Check if gates are authoritative (gate sequence end reasons allowed)
  const allowedEndReasons = params.normalizedConfig?.statePolicy.allowedEndReasons ?? [];
  const hasGateSequenceEndReasons = allowedEndReasons.includes('SUCCESS_GATE_SEQUENCE') || 
                                     allowedEndReasons.includes('FAIL_GATE_SEQUENCE');
  
  // If gate sequence end reasons are allowed and gate state exists, use gates as authoritative
  if (hasGateSequenceEndReasons && params.gateState) {
    const allGatesMet = params.gateState.allRequiredGatesMet;
    const unmetGates = params.gateState.unmetGates ?? [];
    
    if (allGatesMet && allowedEndReasons.includes('SUCCESS_GATE_SEQUENCE')) {
      return {
        code: 'SUCCESS_GATE_SEQUENCE',
        meta: {
          // Phase 2: Checklist aggregates (primary)
          checklist: params.checklistAgg ? {
            positiveHookCount: params.checklistAgg.positiveHookCount,
            objectiveProgressCount: params.checklistAgg.objectiveProgressCount,
            boundarySafeStreak: params.checklistAgg.boundarySafeStreak,
            momentumStreak: params.checklistAgg.momentumStreak,
          } : null,
          // Legacy numeric fields (compatibility only)
          averageScore: params.averageScore,
          successScoreThreshold: params.policy.successScore,
          failScoreThreshold: params.policy.failScore,
          naturalReason,
          finalStatus: params.status,
          gateState: {
            allRequiredGatesMet: true,
            unmetGates: [],
          },
        },
      };
    } else if (!allGatesMet && allowedEndReasons.includes('FAIL_GATE_SEQUENCE')) {
      return {
        code: 'FAIL_GATE_SEQUENCE',
        meta: {
          // Phase 2: Checklist aggregates (primary)
          checklist: params.checklistAgg ? {
            positiveHookCount: params.checklistAgg.positiveHookCount,
            objectiveProgressCount: params.checklistAgg.objectiveProgressCount,
            boundarySafeStreak: params.checklistAgg.boundarySafeStreak,
            momentumStreak: params.checklistAgg.momentumStreak,
          } : null,
          // Legacy numeric fields (compatibility only)
          averageScore: params.averageScore,
          successScoreThreshold: params.policy.successScore,
          failScoreThreshold: params.policy.failScore,
          naturalReason,
          finalStatus: params.status,
          gateState: {
            allRequiredGatesMet: false,
            unmetGates,
          },
        },
      };
    }
    // If gate state exists but gates aren't met and FAIL_GATE_SEQUENCE not allowed, fall through to normal logic
  }

  // Phase 2: Build meta with checklist aggregates (primary) and legacy numeric fields (compatibility)
  const baseMeta = {
    // Phase 2: Checklist aggregates (primary)
    checklist: params.checklistAgg ? {
      positiveHookCount: params.checklistAgg.positiveHookCount,
      objectiveProgressCount: params.checklistAgg.objectiveProgressCount,
      boundarySafeStreak: params.checklistAgg.boundarySafeStreak,
      momentumStreak: params.checklistAgg.momentumStreak,
    } : null,
    // Legacy numeric fields (compatibility only)
    averageScore: params.averageScore,
    successScoreThreshold: params.policy.successScore,
    failScoreThreshold: params.policy.failScore,
    naturalReason,
    finalStatus: params.status,
    ...(params.gateState ? {
      gateState: {
        allRequiredGatesMet: params.gateState.allRequiredGatesMet,
        unmetGates: params.gateState.unmetGates ?? [],
      },
    } : {}),
  };

  if (!params.normalizedConfig || !params.normalizedConfig.statePolicy.allowedEndReasons) {
    return {
      code: naturalReason,
      meta: baseMeta,
    };
  }

  if (allowedEndReasons.length === 0) {
    return {
      code: naturalReason,
      meta: baseMeta,
    };
  }

  if (allowedEndReasons.includes(naturalReason)) {
    return {
      code: naturalReason,
      meta: baseMeta,
    };
  }

  const precedence =
    params.normalizedConfig.endReasonPrecedenceResolved &&
    params.normalizedConfig.endReasonPrecedenceResolved.length > 0
      ? params.normalizedConfig.endReasonPrecedenceResolved
      : MISSION_END_REASON_PRECEDENCE;

  let remappedCode: MissionEndReasonCode | null = null;
  for (const code of precedence) {
    if (allowedEndReasons.includes(code)) {
      remappedCode = code;
      break;
    }
  }

  if (!remappedCode) {
    remappedCode = allowedEndReasons[0];
  }

  return {
    code: remappedCode,
    meta: {
      ...baseMeta,
      remapped: true,
      originalNaturalReason: naturalReason,
    },
  };
}

// ✅ Step 5.7: normalizeEndReason moved to shared/normalizers/end-reason.normalizer.ts

/**
 * ✅ Step 5.5: Sanitize practice response (remove debug/internal fields)
 * 
 * Debug gating rules:
 * - aiDebug: Only include if NODE_ENV !== 'production' AND AI_DEBUG_EXPOSE === 'true'
 * - aiStructured: Remove 'raw' field if present (keep other fields for backwards compatibility)
 * - Production: NEVER expose debug fields, even if flag set
 */
function sanitizePracticeResponse<T extends Record<string, any>>(resp: T): T {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowDebug = !isProduction && process.env.AI_DEBUG_EXPOSE === 'true';

  // Create sanitized copy
  const sanitized: any = { ...resp };

  // Remove aiDebug unless explicitly allowed (and never in production)
  if (!allowDebug && 'aiDebug' in sanitized) {
    delete sanitized.aiDebug;
  }

  // Sanitize aiStructured: remove 'raw' field if present
  if ('aiStructured' in sanitized && sanitized.aiStructured && typeof sanitized.aiStructured === 'object') {
    const { raw, ...rest } = sanitized.aiStructured as any;
    sanitized.aiStructured = rest as any;
  }

  return sanitized as T;
}

@Injectable()
export class PracticeService {
  private readonly logger = new Logger(PracticeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiScoring: AiScoringService,
    private readonly aiCore: AiCoreScoringService,
    private readonly aiChat: AiChatService,
    private readonly sessions: SessionsService,
    // Step 6.3-6.5: Inject new services
    private readonly openingsService: OpeningsService,
    private readonly missionStateService: MissionStateService,
    // Step 6.4: Inject gate and reward services
    private readonly gatesService: GatesService,
    private readonly rewardReleaseService: RewardReleaseService,
    // Step 6.6: Inject micro-dynamics service
    private readonly microDynamicsService: MicroDynamicsService,
    // Step 6.8: Inject persona drift service
    private readonly personaDriftService: PersonaDriftService,
    // Persona compatibility: use missions service as single source of truth
    private readonly missionsService: MissionsService,
    // Step 8: Inject FastPath services
    private readonly moodStateMachine: MoodStateMachineService,
    private readonly scoreAccumulator: ScoreAccumulatorService,
    // Gate requirement templates
    private readonly engineConfigService?: EngineConfigService,
    @InjectQueue('deep-analysis') private readonly deepAnalysisQueue?: Queue,
    @InjectQueue('message-analysis') private readonly messageAnalysisQueue?: Queue,
  ) {}

  /**
   * Phase 1: Extract localSeverity from structured AI output
   */
  private extractLocalSeverity(step8Data: ReturnType<typeof parseStep8StructuredJson>, aiStructured: any): 'NORMAL' | 'RUDE' | 'VERY_RUDE' | 'CREEPY' | 'VULNERABLE' {
    // Try to get from structured output
    const raw = aiStructured?.raw;
    if (raw && typeof raw === 'object') {
      const severity = raw.localSeverity;
      if (typeof severity === 'string') {
        const upper = severity.toUpperCase();
        if (upper === 'NORMAL' || upper === 'RUDE' || upper === 'VERY_RUDE' || upper === 'CREEPY' || upper === 'VULNERABLE') {
          return upper as 'NORMAL' | 'RUDE' | 'VERY_RUDE' | 'CREEPY' | 'VULNERABLE';
        }
      }
    }

    // Derive from boundaryRisk as fallback
    const boundaryRisk = step8Data.boundaryRisk ?? 'low';
    if (boundaryRisk === 'high') {
      return 'CREEPY';
    } else if (boundaryRisk === 'med') {
      return 'RUDE';
    }

    // Default to NORMAL
    return 'NORMAL';
  }

  private async resolveFreePlayAiStyle(params: {
    templateId: string | null;
    dtoAiStyleKey: string | null;
    existingPayload: any | null;
  }): Promise<{ aiStyle: AiStyle | null; aiStyleKey: AiStyleKey | null }> {
    if (params.templateId) return { aiStyle: null, aiStyleKey: null };

    const payloadKey =
      safeTrim(params.existingPayload?.freeplay?.aiStyleKey) ||
      safeTrim(params.existingPayload?.aiStyleKey);

    const rawKey = safeTrim(params.dtoAiStyleKey) || payloadKey;
    if (!rawKey) return { aiStyle: null, aiStyleKey: null };

    const found = await this.prisma.aiStyle.findUnique({
      where: { key: rawKey as any },
    });

    if (!found) {
      throw new BadRequestException(`Unknown aiStyleKey: ${rawKey}`);
    }

    return { aiStyle: found, aiStyleKey: found.key };
  }

  async runPracticeSession(userId: string, dto: CreatePracticeSessionDto) {
    if (!userId) throw new BadRequestException('Missing userId.');
    if (!dto?.messages || dto.messages.length === 0) {
      throw new BadRequestException('No messages provided.');
    }

    type DtoV2 = CreatePracticeSessionDto & { aiStyleKey?: string | null; mode?: string | null };
    const dtoV2 = dto as DtoV2;

    const isContinuation = !!dto.sessionId;

    const existingSession = isContinuation
      ? await this.prisma.practiceSession.findUnique({
          where: { id: dto.sessionId! },
          select: {
            id: true,
            userId: true,
            topic: true,
            templateId: true,
            personaId: true,
            status: true,
            endedAt: true,
            payload: true,
          },
        })
      : null;

    if (isContinuation) {
      if (!existingSession) throw new NotFoundException('Session not found.');
      if (existingSession.userId !== userId)
        throw new UnauthorizedException('Session does not belong to user.');
      if (existingSession.status !== MissionStatus.IN_PROGRESS || existingSession.endedAt) {
        throw new BadRequestException('Session is not IN_PROGRESS.');
      }
    }

    const templateId = dto.templateId ?? existingSession?.templateId ?? null;
    const personaId = dto.personaId ?? existingSession?.personaId ?? null;

    const template = templateId
      ? await this.prisma.practiceMissionTemplate.findUnique({
          where: { id: templateId },
          select: {
            id: true,
            difficulty: true,
            goalType: true,
            maxMessages: true,
            timeLimitSec: true,
            wordLimit: true,
            aiContract: true,
            isAttractionSensitive: true,
            targetRomanticGender: true,
            aiStyleId: true,
            aiStyle: {
              select: {
                id: true,
                key: true,
                isActive: true,
              },
            },
            personaId: true,
          },
        })
      : null;

    if (templateId && !template) throw new NotFoundException('Mission template not found.');

    if (templateId && template?.personaId) {
      const persona = await this.prisma.aiPersona.findUnique({
        where: { id: template.personaId },
        select: { 
          id: true, 
          active: true, 
          personaGender: true,
          name: true,
          description: true,
          style: true,
          avatarUrl: true,
          voicePreset: true,
        },
      });
      
      if (!persona) {
        throw new BadRequestException({
          code: 'MISSION_TEMPLATE_INVALID_PERSONA',
          message: `Template references persona "${template.personaId}" that does not exist`,
        });
      }
      if (!persona.active) {
        throw new BadRequestException({
          code: 'MISSION_TEMPLATE_INACTIVE_PERSONA',
          message: `Template references persona "${template.personaId}" that is inactive`,
        });
      }

      // Use missions service as single source of truth for persona compatibility
      // This ensures consistent behavior across mission start and practice session creation
      const compatiblePersona = await this.missionsService.selectCompatiblePersona(
        template as any,
        persona as any,
      );

      // Update template's personaId to use compatible persona for this session
      // Note: This doesn't persist to the template, just uses it for this session
      if (compatiblePersona && compatiblePersona.id !== template.personaId) {
        (template as any).personaId = compatiblePersona.id;
      }
    }

    if (templateId && template?.aiStyle) {
      if (!template.aiStyle.isActive) {
        throw new BadRequestException({
          code: 'MISSION_TEMPLATE_INACTIVE_STYLE',
          message: `Template references aiStyle "${template.aiStyle.key}" that is inactive`,
        });
      }
    }

    let normalizedMissionConfigV1: NormalizedMissionConfigV1 | null = null;

    if (isContinuation) {
      const persisted = (existingSession?.payload as any)?.normalizedMissionConfigV1 ?? null;
      if (persisted && typeof persisted === 'object' && (persisted as any).version === 1) {
        normalizedMissionConfigV1 = persisted as NormalizedMissionConfigV1;
      }
    }

    if (!normalizedMissionConfigV1 && templateId) {
      const normalizeResult = normalizeMissionConfigV1(template?.aiContract ?? null);

      if (normalizeResult.ok === false) {
        const isDev = process.env.NODE_ENV !== 'production';
        const errorCode =
          normalizeResult.reason === 'missing'
            ? 'MISSION_CONFIG_MISSING'
            : 'MISSION_CONFIG_INVALID';

        throw new BadRequestException({
          code: errorCode,
          message:
            normalizeResult.reason === 'missing'
              ? 'Mission template is missing missionConfigV1'
              : 'Mission template aiContract is missing or not a valid object / missionConfigV1 invalid',
          ...(isDev && normalizeResult.errors ? { details: normalizeResult.errors } : {}),
        });
      }

      normalizedMissionConfigV1 = normalizeResult.value;
    }

    let effectivePolicy: Required<MissionStatePayload>['policy'];
    let minMessagesBeforeEndResolved: number | null = null;

    if (templateId && normalizedMissionConfigV1?.statePolicy) {
      const resolved = resolvePolicyFromStatePolicy({
        difficulty: template.difficulty,
        goalType: template.goalType ?? null,
        statePolicy: normalizedMissionConfigV1.statePolicy,
      });
      effectivePolicy = resolved.policy;
      minMessagesBeforeEndResolved = resolved.minMessagesBeforeEndResolved;
    } else {
      effectivePolicy = template
        ? resolvePolicy({
            difficulty: template.difficulty,
            goalType: template.goalType ?? null,
            templateMaxMessages: template.maxMessages ?? null,
          })
        : resolvePolicy({
            difficulty: MissionDifficulty.EASY,
            goalType: null,
            templateMaxMessages: 5,
          });
    }

    let existingTranscript: TranscriptMsg[] = [];
    let existingScores: number[] = [];

    if (existingSession?.payload && typeof existingSession.payload === 'object') {
      const p: any = existingSession.payload as any;

      const fromPayload = Array.isArray(p?.transcript) ? p.transcript : [];
      existingTranscript = fromPayload
        .filter((m: any) => m && typeof m.content === 'string')
        .map((m: any) => ({
          role: toTranscriptRole(m.role),
          content: safeTrim(m.content),
        }))
        .filter((m: TranscriptMsg) => m.content.length > 0);

      existingScores = Array.isArray(p?.messageScores)
        ? p.messageScores.filter((n: any) => typeof n === 'number' && Number.isFinite(n))
        : [];
    }

    // ✅ FIX: DB fallback ordering must handle NULL turnIndex safely
    if (isContinuation && existingTranscript.length === 0) {
      const rows = await this.prisma.chatMessage.findMany({
        where: { sessionId: existingSession!.id },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true, createdAt: true, turnIndex: true, meta: true },
      });

      const allHaveTurnIndex = rows.every((r) => typeof r.turnIndex === 'number');
      const allHaveMetaIndex = rows.every((r) => typeof (r.meta as any)?.index === 'number');

      const sorted = [...rows].sort((a, b) => {
        if (allHaveTurnIndex) return (a.turnIndex as number) - (b.turnIndex as number);
        if (allHaveMetaIndex) return ((a.meta as any).index as number) - ((b.meta as any).index as number);
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      existingTranscript = sorted
        .map((r) => {
          const role: TranscriptMsg['role'] = r.role === MessageRole.USER ? 'USER' : 'AI';
          return { role, content: safeTrim(r.content) };
        })
        .filter((m) => m.content.length > 0);
    }

    const deltaMessages: TranscriptMsg[] = dto.messages
      .filter((m: any) => m && typeof m.content === 'string')
      .map((m: any) => {
        const role: TranscriptMsg['role'] = m.role === 'USER' ? 'USER' : 'AI';
        return { role, content: safeTrim(m.content) };
      })
      .filter((m: TranscriptMsg) => m.content.length > 0);

    const deltaUser = deltaMessages.filter((m) => m.role === 'USER');
    if (deltaUser.length === 0) {
      throw new BadRequestException('No USER messages provided.');
    }

    const fullTranscript: TranscriptMsg[] = [...existingTranscript];
    for (const dm of deltaMessages) {
      const last = fullTranscript[fullTranscript.length - 1];
      if (last && last.role === dm.role && last.content === dm.content) continue;
      fullTranscript.push(dm);
    }

    const existingUserCount = existingTranscript.filter((m) => m.role === 'USER').length;

    let disqualify: DisqualifyResult | null = null;
    for (let i = 0; i < deltaUser.length; i++) {
      const userMsg = deltaUser[i]?.content ?? '';
      const userMsgIndex = existingUserCount + i;
      const hit = detectDisqualify(userMsg, userMsgIndex, {
        difficulty: template?.difficulty ?? effectivePolicy.difficulty,
        goalType: template?.goalType ?? null,
      });
      if (hit) {
        disqualify = hit;
        break;
      }
    }

    const topic = safeTrim((dto as any).topic) || safeTrim(existingSession?.topic) || 'Practice';
    if (!isContinuation && !topic) {
      throw new BadRequestException('topic is required for new sessions.');
    }

    const existingPayload =
      existingSession?.payload && typeof existingSession.payload === 'object'
        ? (existingSession.payload as any)
        : null;

    const mergedDtoStyleKey =
      safeTrim((dto as any)?.freeplay?.aiStyleKey ?? null) ||
      safeTrim(dtoV2.aiStyleKey ?? null) ||
      null;

    const freePlayStyle = await this.resolveFreePlayAiStyle({
      templateId,
      dtoAiStyleKey: mergedDtoStyleKey,
      existingPayload,
    });

    const rawMode = safeTrim(dtoV2.mode ?? null);
    let aiMode: 'MISSION' | 'FREEPLAY';

    if (templateId) {
      aiMode = 'MISSION';
    } else if (rawMode === 'MISSION' || rawMode === 'FREEPLAY') {
      aiMode = rawMode;
    } else {
      aiMode = 'FREEPLAY';
    }

    // Step 6.3-6.5: Initialize mission state from openings config
    let missionStateV1: MissionStateV1 | null = null;
    const isFirstMessage = existingTranscript.length === 0 && deltaUser.length > 0;

    if (normalizedMissionConfigV1) {
      const openings = normalizedMissionConfigV1.openings;
      const personaInitMood = openings?.personaInitMood ?? null;

      // Step 6.4: Get gate requirements - check for gate requirement template first, then fallback to objective+difficulty mapping
      const objective = normalizedMissionConfigV1.objective;
      const difficultyLevel = normalizedMissionConfigV1.difficulty?.level ?? MissionDifficulty.EASY;
      
      let requiredGates: GateKey[] = [];
      
      // Check if mission has a gate requirement template code
      const gateRequirementTemplateCode = (normalizedMissionConfigV1 as any).gateRequirementTemplateCode;
      if (gateRequirementTemplateCode && this.engineConfigService) {
        try {
          const template = await this.engineConfigService.getGateRequirementTemplate(gateRequirementTemplateCode);
          if (template && template.requiredGates) {
            requiredGates = template.requiredGates as GateKey[];
          }
        } catch (error) {
          this.logger.warn(
            `Failed to load gate requirement template ${gateRequirementTemplateCode}, falling back to objective mapping: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      
      // Fallback to objective+difficulty mapping if no template or template load failed
      if (requiredGates.length === 0) {
        const gateRequirement = getGateRequirementsForObjective(objective.kind, difficultyLevel);
        requiredGates = gateRequirement?.requiredGates ?? [];
      }

      if (isFirstMessage) {
        // Step 6.3: Initialize mission state from openings
        // Step 6.4: Pass required gates for gate state initialization
        missionStateV1 = this.missionStateService.createInitialMissionState(personaInitMood, requiredGates);
      } else if (existingSession?.payload && typeof existingSession.payload === 'object') {
        // Step 6.5: Load existing mission state from payload
        const p: any = existingSession.payload as any;
        if (p?.missionStateV1 && typeof p.missionStateV1 === 'object') {
          missionStateV1 = p.missionStateV1 as MissionStateV1;
          // Step 6.4: Ensure gate state exists if gates are required
          if (requiredGates.length > 0 && !missionStateV1.gateState) {
            missionStateV1.gateState = {
              gates: {},
              allRequiredGatesMet: false,
              requiredGates: [...requiredGates],
              metGates: [],
              unmetGates: [...requiredGates],
            };
          }
        }
      }

      // If still no mission state, create default
      if (!missionStateV1) {
        missionStateV1 = this.missionStateService.createInitialMissionState(personaInitMood, requiredGates);
      }
    }

    // Step 6.9 Prep: Extract trace data for telemetry
    const dynamics = normalizedMissionConfigV1?.dynamics ?? null;
    const difficulty = normalizedMissionConfigV1?.difficulty ?? null;
    const style = normalizedMissionConfigV1?.style ?? null;

    // Step 6.5: Initialize variables for mission state tracking (will be updated after scoring)
    let lastTraits: Record<string, number> | null = null;

    const trace: {
      dynamicsUsage: {
        pace: number | null;
        emojiDensity: number | null;
        flirtiveness: number | null;
        hostility: number | null;
        dryness: number | null;
        vulnerability: number | null;
        escalationSpeed: number | null;
        randomness: number | null;
      } | null;
      difficultyInfluence: {
        strictness: number | null;
        ambiguityTolerance: number | null;
        emotionalPenalty: number | null;
        bonusForCleverness: number | null;
        failThreshold: number | null;
        recoveryDifficulty: number | null;
      } | null;
      styleInfluence: {
        aiStyleKey: string | null;
        styleIntensity: string | null;
      } | null;
      rewardLeakBlocked?: boolean;
      originalAiReply?: string;
      // Step 6.6: Micro-dynamics telemetry
      microDynamics?: {
        riskIndex: number | null;
        momentumIndex: number | null;
        flowIndex: number | null;
      } | null;
      // Step 6.8: Persona stability telemetry
      personaStability?: number | null;
      activeModifiers?: string[] | null; // List of active modifier keys
      // Step 6.10: AI call trace snapshots
      aiCallSnapshots: import('../ai/ai-trace.types').AiCallTraceSnapshot[];
    } = {
      // Step 6.9 Prep: Trace how dynamics influenced the session
      dynamicsUsage: dynamics
        ? {
            pace: dynamics.pace ?? null,
            emojiDensity: dynamics.emojiDensity ?? null,
            flirtiveness: dynamics.flirtiveness ?? null,
            hostility: dynamics.hostility ?? null,
            dryness: dynamics.dryness ?? null,
            vulnerability: dynamics.vulnerability ?? null,
            escalationSpeed: dynamics.escalationSpeed ?? null,
            randomness: dynamics.randomness ?? null,
          }
        : null,

      // Step 6.9 Prep: Trace how difficulty influenced scoring
      difficultyInfluence: difficulty
        ? {
            strictness: difficulty.strictness ?? null,
            ambiguityTolerance: difficulty.ambiguityTolerance ?? null,
            emotionalPenalty: difficulty.emotionalPenalty ?? null,
            bonusForCleverness: difficulty.bonusForCleverness ?? null,
            failThreshold: difficulty.failThreshold ?? null,
            recoveryDifficulty: difficulty.recoveryDifficulty ?? null,
          }
        : null,

      // Step 6.9 Prep: Trace how style influenced behavior
      styleInfluence: style
        ? {
            aiStyleKey: style.aiStyleKey ?? null,
            styleIntensity: style.styleIntensity ?? null,
          }
        : null,
      // Step 6.6: Trace micro-dynamics
      microDynamics: missionStateV1?.microDynamics
        ? {
            riskIndex: missionStateV1.microDynamics.riskIndex,
            momentumIndex: missionStateV1.microDynamics.momentumIndex,
            flowIndex: missionStateV1.microDynamics.flowIndex,
          }
        : null,
      // Step 6.8: Trace persona stability
      personaStability: missionStateV1?.personaStability ?? null,
      activeModifiers: missionStateV1?.activeModifiers
        ? missionStateV1.activeModifiers.map((m) => m.key)
        : null,
      // Step 6.10: AI call trace snapshots (will be populated after AI call)
      aiCallSnapshots: [],
    };

    const payloadExtras = {
      mode: aiMode,
      freeplay: {
        aiStyleKey: freePlayStyle.aiStyleKey ?? null,
      },
      aiStyleKey: freePlayStyle.aiStyleKey ?? null,
      normalizedMissionConfigV1: normalizedMissionConfigV1 ?? null,
      // Step 6.9 Prep: Add trace data for future telemetry integration
      trace,
      // Step 6.5: Store mission state for next message cycle
      missionStateV1: missionStateV1 ?? null,
      lastTraits: lastTraits,
    };

    if (disqualify) {
      const scores = buildFallbackScoresOnDisqualify({
        existingScores,
        existingUserCount,
        deltaUserCount: deltaUser.length,
      });

      const avg =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;

      const missionState: MissionStatePayload = {
        status: 'FAIL',
        progressPct: 100,
        averageScore: avg,
        totalMessages: scores.length,
        remainingMessages: 0,
        mood: 'DANGER',
        policy: effectivePolicy,
        disqualified: true,
        disqualify,
      };

      const endReason = computeEndReason({
        aiMode,
        status: missionState.status,
        disqualified: true,
        disqualify,
        averageScore: avg,
        policy: effectivePolicy,
        normalizedConfig: normalizedMissionConfigV1,
      });
      missionState.endReasonCode = endReason.code;
      missionState.endReasonMeta = endReason.meta;

      // ✅ Step 5.3: Normalize endReasonCode/endReasonMeta before returning
      const normalizedEndReason = normalizeEndReason(
        missionState.endReasonCode,
        missionState.endReasonMeta,
      );
      missionState.endReasonCode = normalizedEndReason.endReasonCode;
      missionState.endReasonMeta = normalizedEndReason.endReasonMeta;

      const aiReply =
        disqualify.code === 'SEXUAL_EXPLICIT'
          ? '⚠️ Mission ended: disqualified (sexual content).'
          : disqualify.code === 'HARASSMENT_SLUR'
            ? '⚠️ Mission ended: disqualified (harassment/insult).'
            : '⚠️ Mission ended: disqualified (threat/violence).';

      const transcriptToPersist: TranscriptMsg[] = [...fullTranscript, { role: 'AI', content: aiReply }];

      const saved = await this.sessions.createScoredSessionFromScores({
        userId,
        sessionId: existingSession?.id ?? null,
        topic,
        messageScores: scores,
        templateId,
        personaId,
        transcript: transcriptToPersist,
        assistantReply: aiReply,
        missionStatus: missionState.status,
        aiMode,
        extraPayload: payloadExtras,
        endReasonCode: missionState.endReasonCode ?? null,
        endReasonMeta: missionState.endReasonMeta ?? null,
      });

      // ✅ Step 5.6: Apply allowlist-only serializer (no spreading raw objects)
      return toPracticeSessionResponsePublic(
        sanitizePracticeResponse({
          ...saved,
          aiReply,
          aiStructured: null,
          aiDebug:
            process.env.NODE_ENV !== 'production'
              ? { disqualify, note: 'Disqualified before AI calls. No LLM used.' }
              : undefined,
          mission: templateId
            ? {
                templateId,
                difficulty: template?.difficulty ?? null,
                goalType: template?.goalType ?? null,
                maxMessages: effectivePolicy.maxMessages,
                scoring: {
                  successScore: effectivePolicy.successScore,
                  failScore: effectivePolicy.failScore,
                },
                aiStyle: (template?.aiStyle ?? null) as AiStyle | null,
                aiContract: template?.aiContract ?? null,
              }
            : null,
          missionState,
        }),
      );
    }

    // Step 6.3-6.5: Build unified mission config for prompt builder
    // Step 6.4: Now includes objective
    const unifiedMissionConfig = normalizedMissionConfigV1
      ? {
          aiStyle: freePlayStyle.aiStyle ?? null,
          dynamics: normalizedMissionConfigV1.dynamics ?? null,
          difficulty: normalizedMissionConfigV1.difficulty ?? null,
          openings: normalizedMissionConfigV1.openings ?? null,
          responseArchitecture: normalizedMissionConfigV1.responseArchitecture ?? null,
          objective: normalizedMissionConfigV1.objective ?? null,
        }
      : null;

    // Phase 1: Lane A - FastPath - Call AI with mini model and request structured JSON
    // Measure latency
    const startedAt = Date.now();
    const { aiReply, aiDebug, aiStructured, errorCode, syntheticReply } = await this.aiChat.generateReply({
      userId,
      topic,
      messages: fullTranscript,
      templateId,
      personaId,
      aiStyleKey: freePlayStyle.aiStyleKey ?? undefined,
      aiStyle: freePlayStyle.aiStyle ?? undefined,
      // Step 6.3-6.5: Pass unified mission config and state
      missionConfig: unifiedMissionConfig
        ? {
            ...unifiedMissionConfig,
            // Step 6.9: Include AI runtime profile
            aiRuntimeProfile: normalizedMissionConfigV1?.aiRuntimeProfile ?? null,
          }
        : null,
      missionState: missionStateV1,
      isFirstMessage,
      // Step 8: Use mini model for FastPath
      modelTier: 'mini',
    });
    const latencyMs = Date.now() - startedAt;
    
    // Phase 1: Log latency for monitoring
    this.logger.log(`Lane A latency: ${latencyMs}ms for session ${existingSession?.id || 'new'}`);

    // Phase 1: Parse structured JSON and extract localSeverity
    const step8Data = parseStep8StructuredJson(aiStructured, aiReply);
    const localSeverity = this.extractLocalSeverity(step8Data, aiStructured);
    
    // Step 8: Apply safe defaults if parsing failed
    const moodDelta = step8Data.moodDelta ?? 'stable';
    const tensionDelta = step8Data.tensionDelta ?? 'stable';
    const comfortDelta = step8Data.comfortDelta ?? 'stable';
    const boundaryRisk = step8Data.boundaryRisk ?? 'low';
    const microFlags = step8Data.microFlags ?? [];

    const checklistSnapshot =
      step8Data.checklist && step8Data.checklist.flags?.length
        ? step8Data.checklist
        : { flags: [] };
    const checklistScore = scoreFromChecklist(checklistSnapshot);

    const localScoreNumeric = checklistScore.numericScore;
    const localScoreTier = checklistScore.tier;

    // ============================================================================
    // LANE A: Fast path — NO heavy analytics here. All deep scoring/mood/gates 
    // happens in MessageAnalysisWorker (Lane B).
    // ============================================================================
    
    // Phase 1.1: Removed heavy logic from Lane A:
    // - Mood state machine updates → moved to MessageAnalysisWorker
    // - Score accumulator updates → moved to MessageAnalysisWorker  
    // - Mission state service updates → moved to MessageAnalysisWorker
    // - Gate evaluation → moved to MessageAnalysisWorker
    // - Micro-dynamics computation → moved to MessageAnalysisWorker
    // - Persona drift detection → moved to MessageAnalysisWorker
    //
    // Lane A now only:
    // - Extracts localSeverity from structured output
    // - Builds minimal messageScores for persistence (from checklist)
    // - Reads currentMoodState from stored session (updated by Lane B)
    // - Enqueues message-analysis job for heavy work

    // Build minimal messageScores from checklist for persistence
    let messageScores: number[] = [];
    const lastFlags: string[] = checklistScore.flags.map((f) => f.toString());

    if (isContinuation && existingScores.length > 0) {
      messageScores = [...existingScores, localScoreNumeric];
    } else {
      const allUserMessages = fullTranscript.filter((m) => m.role === 'USER');
      if (allUserMessages.length === 1) {
        messageScores = [localScoreNumeric];
      } else {
        const previousScores = existingScores.length > 0 
          ? existingScores 
          : Array(allUserMessages.length - 1).fill(0);
        messageScores = [...previousScores, localScoreNumeric];
      }
    }

    // Phase 1.1: Removed aiCallSnapshot building (uses missionStateV1 which is no longer updated in Lane A)
    // Trace snapshots will be built in Lane B if needed

    // Step 6.4 Fix: Server-side reward leakage guard
    // Step 8: Use parsed reply from structured JSON, fallback to aiReply
    let finalAiReply = step8Data.reply || aiReply;
    // Phase 1.1: Reward leakage guard simplified - use stored session state
    // Full gate state evaluation happens in Lane B, so we use minimal check here
    if (normalizedMissionConfigV1?.objective && existingSession) {
      // Read gate state from stored session payload (updated by Lane B)
      const storedPayload = existingSession.payload as any;
      const storedGateState = storedPayload?.missionStateV1?.gateState;
      
      // Temporary: Use minimal missionStateV1 for reward permissions (will be improved in Phase 2)
      const sessionCurrentMood = (existingSession as any).currentMoodState || 'NEUTRAL';
      const tempMissionState = missionStateV1 || {
        mood: { currentMood: sessionCurrentMood, tensionLevel: 50 },
        gateState: storedGateState || null,
      };
      
      const rewardPermissions = this.rewardReleaseService.getRewardPermissionsForState(
        tempMissionState as any,
        normalizedMissionConfigV1.objective,
      );

      const objectiveKind = normalizedMissionConfigV1.objective.kind;
      let rewardLeakBlocked = false;

      if (rewardPermissions.phoneNumber === 'FORBIDDEN' && objectiveKind === 'GET_NUMBER') {
        const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
        if (phoneRegex.test(finalAiReply)) {
          finalAiReply = 'I\'m not quite ready to share my number yet, but I\'m enjoying our chat!';
          rewardLeakBlocked = true;
        }
      } else if (rewardPermissions.instagram === 'FORBIDDEN' && objectiveKind === 'GET_INSTAGRAM') {
        const instagramRegex = /@[\w.]+/;
        if (instagramRegex.test(finalAiReply)) {
          finalAiReply = 'I prefer to keep my social media private for now, but thanks for asking!';
          rewardLeakBlocked = true;
        }
      } else if (rewardPermissions.dateAgreement === 'FORBIDDEN' && objectiveKind === 'GET_DATE_AGREEMENT') {
        const dateAgreementRegex = /(?:let's|we should|how about)\s(?:meet|go out|grab a drink|get coffee|hang out)\s(?:on|this|next)?\s(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|tonight|tomorrow)/i;
        if (dateAgreementRegex.test(finalAiReply)) {
          finalAiReply = 'I\'m having a great time chatting, but I\'m not ready to make plans just yet.';
          rewardLeakBlocked = true;
        }
      }

      if (rewardLeakBlocked) {
        payloadExtras.trace.rewardLeakBlocked = true;
        payloadExtras.trace.originalAiReply = aiReply;
      }
    }

    const transcriptToPersist: TranscriptMsg[] = [...fullTranscript, { role: 'AI', content: finalAiReply }];

    // Phase 1.1: Removed aiCore.scoreSession() call from Lane A (heavy, moved to Lane B)
    // aiCoreResult will be computed in MessageAnalysisWorker if needed
    const aiCoreResult = null;

    // Phase 1: Add latency for AI message
    (payloadExtras as any).latencyMs = latencyMs;

    // Phase 1.1: Mission state computation simplified - use stored state from session
    // Heavy computation (gates, progress, end reason) happens in Lane B
    // For Lane A response, we use minimal state derived from message count
    const checklistAgg = {
      positiveHookCount: checklistScore.flags.includes(MessageChecklistFlag.POSITIVE_HOOK_HIT) ? 1 : 0,
      objectiveProgressCount: checklistScore.flags.includes(MessageChecklistFlag.OBJECTIVE_PROGRESS) ? 1 : 0,
      boundarySafeStreak: checklistScore.flags.includes(MessageChecklistFlag.NO_BOUNDARY_ISSUES) ? 1 : 0,
      momentumStreak: checklistScore.flags.includes(MessageChecklistFlag.MOMENTUM_MAINTAINED) ? 1 : 0,
      lastFlags: checklistScore.flags,
    };

    // Temporary: Minimal mission state for response (will be replaced by stored state in Phase 2)
    const missionState = computeMissionState(
      messageScores,
      effectivePolicy,
      minMessagesBeforeEndResolved,
      checklistAgg,
    );

    // Temporary: Minimal end reason computation (full logic in Lane B)
    const endReason = computeEndReason({
      aiMode,
      status: missionState.status,
      disqualified: false,
      disqualify: null,
      averageScore: missionState.averageScore,
      policy: effectivePolicy,
      normalizedConfig: normalizedMissionConfigV1,
      gateState: null, // Gates evaluated in Lane B
      checklistAgg: checklistAgg,
    });
    missionState.endReasonCode = endReason.code;
    missionState.endReasonMeta = endReason.meta;

    // ✅ Step 5.3: Normalize endReasonCode/endReasonMeta before returning
    {
      const normalizedEndReason = normalizeEndReason(
        missionState.endReasonCode,
        missionState.endReasonMeta,
      );
      missionState.endReasonCode = normalizedEndReason.endReasonCode;
      missionState.endReasonMeta = normalizedEndReason.endReasonMeta;
    }

    const saved = await this.sessions.createScoredSessionFromScores({
      userId,
      sessionId: existingSession?.id ?? null,
      topic,
      messageScores,
      aiCoreResult,
      templateId,
      personaId,
      transcript: transcriptToPersist,
      assistantReply: finalAiReply,
      missionStatus: missionState.status,
      aiMode,
      extraPayload: payloadExtras,
      endReasonCode: missionState.endReasonCode ?? null,
      endReasonMeta: missionState.endReasonMeta ?? null,
    });

    // Phase 1.1: Read currentMoodState from saved session (updated by Lane B)
    // Reload session to get latest state after save
    // Note: currentMoodState field may not exist until migration is run, so we handle gracefully
    const savedSession = await this.prisma.practiceSession.findUnique({
      where: { id: saved.sessionId },
    });
    const currentMoodString = ((savedSession as any)?.currentMoodState?.toLowerCase()) || 
                              (missionStateV1?.mood?.currentMood?.toLowerCase()) || 
                              'neutral';
    const localScoreRarity = checklistScore?.rarity ?? computeRarity(localScoreTier);
    const uiEventHint = computeUiEventHint(localScoreTier, microFlags, boundaryRisk);
    const lastUserMessageIndex = fullTranscript.filter((m) => m.role === 'USER').length;

    // Step 8: Build FastPath response
    const fastPathResponse = {
      ...saved,
      aiReply: finalAiReply,
      aiStructured,
      aiDebug: process.env.NODE_ENV !== 'production' ? aiDebug : undefined,
      mission: templateId
        ? {
            templateId,
            difficulty: template?.difficulty ?? null,
            goalType: template?.goalType ?? null,
            maxMessages: effectivePolicy.maxMessages,
            scoring: {
              successScore: effectivePolicy.successScore, // @deprecated - legacy compatibility
              failScore: effectivePolicy.failScore, // @deprecated - legacy compatibility
            },
            aiStyle: (template?.aiStyle ?? null) as AiStyle | null,
            aiContract: template?.aiContract ?? null,
          }
        : null,
      missionState,
      // Phase 3: Checklist-native aggregates
      checklist: {
        positiveHookCount: checklistAgg.positiveHookCount,
        objectiveProgressCount: checklistAgg.objectiveProgressCount,
        boundarySafeStreak: checklistAgg.boundarySafeStreak,
        momentumStreak: checklistAgg.momentumStreak,
        lastMessageFlags: Array.isArray(checklistAgg.lastFlags)
          ? checklistAgg.lastFlags.map((f) => f.toString())
          : [],
      },
      // Step 8: Micro-interaction fields
      currentMood: currentMoodString,
      localScoreTier,
      localScoreNumeric,
      localScoreRarity,
      uiEventHint,
      microFlags,
      moodDelta,
      tensionDelta,
      comfortDelta,
      boundaryRisk,
      turnIndex: lastUserMessageIndex,
      // Phase 1: Add localSeverity to response
      localSeverity,
    };

    // Phase 1: Enqueue message-analysis job (per-message analysis)
    const usedSessionId = saved.sessionId;
    const lastMessageIndex = transcriptToPersist.length - 1; // AI reply index
    
    if (this.messageAnalysisQueue) {
      try {
        const messageAnalysisPayload: MessageAnalysisJobPayload = {
          sessionId: usedSessionId,
          messageIndex: lastMessageIndex,
          userId,
        };

        // Fire-and-forget: don't await, don't block FastPath
        this.messageAnalysisQueue.add('message-analysis', messageAnalysisPayload, {
          jobId: `message-analysis:${usedSessionId}:${lastMessageIndex}`, // Deduplication
        }).catch((err) => {
          // TODO: record queue_processing_errors_total
          console.error(`[PracticeService] Failed to enqueue message analysis job:`, err);
        });
      } catch (err: any) {
        // TODO: record queue_processing_errors_total
        console.error(`[PracticeService] Error enqueueing message analysis job:`, err);
        // Don't throw - FastPath must continue even if queue fails
      }
    } else {
      // Queue not available - log but don't block
      console.warn(`[PracticeService] Message analysis queue not available, skipping job enqueue`);
    }

    // Phase 1.1: Deprecated - deep-analysis is now replaced by per-message `message-analysis` worker + `insights` worker.
    // Deep-analysis queue is kept for legacy endpoints/admin flows only.
    // Commented out for main chat path to avoid duplicate work with message-analysis.
    /*
    if (this.deepAnalysisQueue) {
      try {
        const jobPayload: DeepAnalysisJobPayload = {
          traceId: `trace-${usedSessionId}-${lastUserMessageIndex}-${Date.now()}`,
          missionId: templateId ?? 'freeplay',
          sessionId: usedSessionId,
          userId,
          lastMessageIndex: lastUserMessageIndex,
          fastTags: {
            localScoreTier,
            moodDelta,
            tensionDelta,
            comfortDelta,
            boundaryRisk,
            microFlags,
          },
          timestamp: new Date().toISOString(),
        };

        // Fire-and-forget: don't await, don't block FastPath
        this.deepAnalysisQueue.add('deep-analysis', jobPayload, {
          jobId: `deep-analysis:${usedSessionId}:${lastUserMessageIndex}`, // Deduplication
        }).catch((err) => {
          // TODO: record queue_processing_errors_total
          console.error(`[PracticeService] Failed to enqueue deep analysis job:`, err);
        });
      } catch (err: any) {
        // TODO: record queue_processing_errors_total
        console.error(`[PracticeService] Error enqueueing deep analysis job:`, err);
        // Don't throw - FastPath must continue even if queue fails
      }
    } else {
      // Queue not available - log but don't block
      console.warn(`[PracticeService] Deep analysis queue not available, skipping job enqueue`);
    }
    */

    // TODO: record fastpath_latency_ms here (stop timer)

    // ✅ Step 5.6: Apply allowlist-only serializer (no spreading raw objects)
    return toPracticeSessionResponsePublic(sanitizePracticeResponse(fastPathResponse));
  }
}
