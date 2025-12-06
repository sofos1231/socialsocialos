import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { AiScoringService } from '../ai/ai-scoring.service';
import { AiCoreScoringService } from '../ai/ai-core-scoring.service';
import { AiChatService } from '../ai/providers/ai-chat.service';
import { SessionsService } from '../sessions/sessions.service';
import { CreatePracticeSessionDto } from './dto/create-practice-session.dto';
import {
  normalizeMissionConfigV1,
  type NormalizedMissionConfigV1,
  type NormalizeResult,
} from './mission-config-runtime';
import {
  MissionEndReasonCode,
  MISSION_END_REASON_PRECEDENCE,
} from '../missions-admin/mission-config-v1.schema';

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
  triggeredByUserMessageIndex: number; // index among USER messages in the session
  matchedText: string; // the term/pattern that matched (best-effort)
};

export interface MissionStatePayload {
  status: MissionStateStatus;
  progressPct: number;
  averageScore: number;
  totalMessages: number;

  remainingMessages?: number;
  mood?: MissionMood;

  // Debug + UI friendliness
  policy?: {
    difficulty: MissionDifficulty;
    goalType: MissionGoalType | null;
    maxMessages: number;
    successScore: number;
    failScore: number;
  };

  disqualified?: boolean;
  disqualify?: DisqualifyResult | null;

  // ✅ Phase 1 / Step 3: End reason code and metadata
  endReasonCode?: MissionEndReasonCode | null;
  endReasonMeta?: Record<string, any> | null;
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

/**
 * ✅ Phase 1 / Step 2: Resolve policy from NormalizedMissionConfigV1.statePolicy
 * Builds policy object from statePolicy with clamping, preserving difficulty/goalType from template.
 */
function resolvePolicyFromStatePolicy(params: {
  difficulty: MissionDifficulty;
  goalType: MissionGoalType | null;
  statePolicy: NormalizedMissionConfigV1['statePolicy'];
}): {
  policy: Required<MissionStatePayload>['policy'];
  minMessagesBeforeEndResolved: number | null;
} {
  // Clamp maxMessages to 1..50
  const maxMessages = clampInt(params.statePolicy.maxMessages, 1, 50, 5);

  // Clamp thresholds to 0..100
  const successScoreThreshold = clampInt(params.statePolicy.successScoreThreshold, 0, 100, 80);
  const failScoreThreshold = clampInt(params.statePolicy.failScoreThreshold, 0, 100, 60);

  // Resolve minMessagesBeforeEnd: if null/undefined → null, else clamp to 1..maxMessages
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
): MissionStatePayload {
  const totalUserMessages = messageScores.length;

  if (!messageScores.length) {
    return {
      status: 'IN_PROGRESS',
      progressPct: 0,
      averageScore: 0,
      totalMessages: 0,
      remainingMessages: policy.maxMessages,
      mood: 'SAFE',
      policy,
      disqualified: false,
      disqualify: null,
    };
  }

  const sum = messageScores.reduce((acc, v) => acc + v, 0);
  const avgRaw = sum / messageScores.length;
  const averageScore = Math.round(avgRaw);

  const rawProgress = (totalUserMessages / Math.max(1, policy.maxMessages)) * 100;
  const progressPct = Math.max(5, Math.min(100, Math.round(rawProgress)));

  // ✅ Phase 1 / Step 2: Respect minMessagesBeforeEnd if provided
  // Safe approach: minEnd <= maxMessages (enforced in resolvePolicyFromStatePolicy)
  // End only if both conditions met: reached maxMessages AND reached minMessagesBeforeEnd
  const minEnd = minMessagesBeforeEnd ?? policy.maxMessages;

  let status: MissionStateStatus = 'IN_PROGRESS';
  if (totalUserMessages >= policy.maxMessages && totalUserMessages >= minEnd) {
    status = averageScore >= policy.successScore ? 'SUCCESS' : 'FAIL';
  }

  const remainingMessages = Math.max(0, policy.maxMessages - totalUserMessages);

  let mood: MissionMood = 'SAFE';
  if (status === 'SUCCESS') mood = 'GOOD';
  else if (averageScore < policy.failScore) mood = 'DANGER';
  else if (averageScore < policy.failScore + 7) mood = 'WARNING';
  else if (averageScore >= policy.successScore - 5) mood = 'GOOD';

  return {
    status,
    progressPct,
    averageScore,
    totalMessages: totalUserMessages,
    remainingMessages,
    mood,
    policy,
    disqualified: false,
    disqualify: null,
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

/**
 * ✅ Phase 1 / Step 3: Compute end reason code based on mission state and config.
 * Returns null for FREEPLAY or IN_PROGRESS status.
 * Applies allowedEndReasons filtering and precedence remapping when config is available.
 */
function computeEndReason(params: {
  aiMode: 'MISSION' | 'FREEPLAY';
  status: MissionStateStatus;
  disqualified: boolean;
  disqualify: DisqualifyResult | null;
  averageScore: number;
  policy: Required<MissionStatePayload>['policy'];
  normalizedConfig: NormalizedMissionConfigV1 | null;
}): { code: MissionEndReasonCode | null; meta: Record<string, any> | null } {
  // FREEPLAY: no end reason computation
  if (params.aiMode === 'FREEPLAY') {
    return { code: null, meta: null };
  }

  // IN_PROGRESS: no end reason yet
  if (params.status === 'IN_PROGRESS') {
    return { code: null, meta: null };
  }

  // Disqualify: always ABORT_DISQUALIFIED (bypasses allowedEndReasons)
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

  // Normal endings: compute natural reason
  const naturalReason: MissionEndReasonCode =
    params.status === 'SUCCESS' ? 'SUCCESS_OBJECTIVE' : 'FAIL_OBJECTIVE';

  // If no normalized config, use natural reason
  if (!params.normalizedConfig || !params.normalizedConfig.statePolicy.allowedEndReasons) {
    return {
      code: naturalReason,
      meta: {
        averageScore: params.averageScore,
        successScoreThreshold: params.policy.successScore,
        failScoreThreshold: params.policy.failScore,
        naturalReason,
        finalStatus: params.status,
      },
    };
  }

  const allowedEndReasons = params.normalizedConfig.statePolicy.allowedEndReasons;

  // If allowedEndReasons is empty, use natural reason
  if (allowedEndReasons.length === 0) {
    return {
      code: naturalReason,
      meta: {
        averageScore: params.averageScore,
        successScoreThreshold: params.policy.successScore,
        failScoreThreshold: params.policy.failScore,
        naturalReason,
        finalStatus: params.status,
      },
    };
  }

  // If natural reason is allowed, use it
  if (allowedEndReasons.includes(naturalReason)) {
    return {
      code: naturalReason,
      meta: {
        averageScore: params.averageScore,
        successScoreThreshold: params.policy.successScore,
        failScoreThreshold: params.policy.failScore,
        naturalReason,
        finalStatus: params.status,
      },
    };
  }

  // Natural reason not allowed: remap using precedence
  const precedence =
    params.normalizedConfig.endReasonPrecedenceResolved &&
    params.normalizedConfig.endReasonPrecedenceResolved.length > 0
      ? params.normalizedConfig.endReasonPrecedenceResolved
      : MISSION_END_REASON_PRECEDENCE;

  // Find first code in precedence that is in allowedEndReasons
  let remappedCode: MissionEndReasonCode | null = null;
  for (const code of precedence) {
    if (allowedEndReasons.includes(code)) {
      remappedCode = code;
      break;
    }
  }

  // Fallback: use first allowed reason if none found in precedence
  if (!remappedCode) {
    remappedCode = allowedEndReasons[0];
  }

  return {
    code: remappedCode,
    meta: {
      averageScore: params.averageScore,
      successScoreThreshold: params.policy.successScore,
      failScoreThreshold: params.policy.failScore,
      naturalReason,
      finalStatus: params.status,
      remapped: true,
      originalNaturalReason: naturalReason,
    },
  };
}

@Injectable()
export class PracticeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiScoring: AiScoringService,
    private readonly aiCore: AiCoreScoringService,
    private readonly aiChat: AiChatService,
    private readonly sessions: SessionsService,
  ) {}

  private async resolveFreePlayAiStyle(params: {
    templateId: string | null;
    dtoAiStyleKey: string | null;
    existingPayload: any | null;
  }): Promise<{ aiStyle: AiStyle | null; aiStyleKey: AiStyleKey | null }> {
    // If a real mission template is used, style comes from the template (NOT freeplay).
    if (params.templateId) return { aiStyle: null, aiStyleKey: null };

    const payloadKey =
      safeTrim(params.existingPayload?.freeplay?.aiStyleKey) ||
      safeTrim(params.existingPayload?.aiStyleKey);

    const rawKey = safeTrim(params.dtoAiStyleKey) || payloadKey;
    if (!rawKey) return { aiStyle: null, aiStyleKey: null };

    // DB key is enum AiStyleKey; accept string input from FE and validate via DB.
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

    // Part-2 compatibility: dto may (soon) include aiStyleKey; keep backward compatible for now.
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
            aiStyle: {
              // ✅ STEP 4.2: Validate aiStyle exists and is active
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

    // ✅ STEP 4.2: Validate persona exists and is active (if template has personaId)
    if (templateId && template?.personaId) {
      const persona = await this.prisma.aiPersona.findUnique({
        where: { id: template.personaId },
        select: { id: true, active: true },
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
    }

    // ✅ STEP 4.2: Validate aiStyle exists and is active (if template has aiStyleId)
    if (templateId && template?.aiStyle) {
      if (!template.aiStyle.isActive) {
        throw new BadRequestException({
          code: 'MISSION_TEMPLATE_INACTIVE_STYLE',
          message: `Template references aiStyle "${template.aiStyle.key}" that is inactive`,
        });
      }
    }

    // ✅ Phase 1 / Step 1: Normalize missionConfigV1 at session start
    // Continuations: reuse snapshot from payload if present (snapshot semantics)
    // New sessions: normalize from template.aiContract (FAIL-FAST if missing/invalid)
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

    // ✅ Phase 1 / Step 2: Use statePolicy when available (MISSION mode only)
    // Fallback to resolvePolicy() for FREEPLAY or legacy missions without normalizedMissionConfigV1
    let effectivePolicy: Required<MissionStatePayload>['policy'];
    let minMessagesBeforeEndResolved: number | null = null;

    if (templateId && normalizedMissionConfigV1?.statePolicy) {
      // Use statePolicy-driven policy
      const resolved = resolvePolicyFromStatePolicy({
        difficulty: template.difficulty,
        goalType: template.goalType ?? null,
        statePolicy: normalizedMissionConfigV1.statePolicy,
      });
      effectivePolicy = resolved.policy;
      minMessagesBeforeEndResolved = resolved.minMessagesBeforeEndResolved;
    } else {
      // Fallback: use existing resolvePolicy() logic (FREEPLAY or legacy missions)
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

    if (isContinuation && existingTranscript.length === 0) {
      const rows = await this.prisma.chatMessage.findMany({
        where: { sessionId: existingSession!.id },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true },
      });

      existingTranscript = rows
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

    const payloadExtras = {
      mode: aiMode,
      freeplay: {
        aiStyleKey: freePlayStyle.aiStyleKey ?? null,
      },
      // root-level for backwards compat
      aiStyleKey: freePlayStyle.aiStyleKey ?? null,
      // ✅ Phase 1 / Step 1: Persist normalized mission config snapshot
      normalizedMissionConfigV1: normalizedMissionConfigV1 ?? null,
    };

    // Handle disqualify early return
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

      // ✅ Phase 1 / Step 3: Compute end reason for disqualify
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

      return {
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
      };
    }

    let messageScores: number[] = [];

    if (isContinuation && existingScores.length === existingUserCount && existingScores.length > 0) {
      const deltaNormalized: AiPracticeMessageInput[] = deltaUser.map((m, idx) => ({
        index: existingScores.length + idx,
        role: 'user',
        content: m.content,
      }));

      const aiDelta = await this.aiScoring.scoreConversation({
        userId,
        personaId,
        templateId,
        messages: deltaNormalized,
      });

      const deltaScores = (aiDelta?.perMessage ?? []).map((m) => m.score);
      if (deltaScores.length === 0)
        throw new BadRequestException('AI scoring produced no message scores.');

      messageScores = [...existingScores, ...deltaScores];
    } else {
      const allUser = fullTranscript.filter((m) => m.role === 'USER');
      const normalizedAll: AiPracticeMessageInput[] = allUser.map((m, idx) => ({
        index: idx,
        role: 'user',
        content: m.content,
      }));

      const aiAll = await this.aiScoring.scoreConversation({
        userId,
        personaId,
        templateId,
        messages: normalizedAll,
      });

      messageScores = (aiAll?.perMessage ?? []).map((m) => m.score);
      if (messageScores.length === 0)
        throw new BadRequestException('AI scoring produced no message scores.');
    }

    const missionState = computeMissionState(messageScores, effectivePolicy, minMessagesBeforeEndResolved);

    // ✅ Phase 1 / Step 3: Compute end reason for normal path
    const endReason = computeEndReason({
      aiMode,
      status: missionState.status,
      disqualified: false,
      disqualify: null,
      averageScore: missionState.averageScore,
      policy: effectivePolicy,
      normalizedConfig: normalizedMissionConfigV1,
    });
    missionState.endReasonCode = endReason.code;
    missionState.endReasonMeta = endReason.meta;

    // ✅ Step 4: pass aiStyleKey / aiStyle to AiChatService (FreePlay-aware)
    const { aiReply, aiDebug, aiStructured } = await this.aiChat.generateReply({
      userId,
      topic,
      messages: fullTranscript,
      templateId,
      personaId,
      aiStyleKey: freePlayStyle.aiStyleKey ?? undefined,
      aiStyle: freePlayStyle.aiStyle ?? undefined,
    });

    const transcriptToPersist: TranscriptMsg[] = [...fullTranscript, { role: 'AI', content: aiReply }];

    const transcriptForCore: TranscriptMessage[] = transcriptToPersist.map((m) => ({
      text: m.content,
      sentBy: m.role === 'USER' ? 'user' : 'ai',
    }));
    const aiCoreResult = await this.aiCore.scoreSession(transcriptForCore);

    const saved = await this.sessions.createScoredSessionFromScores({
      userId,
      sessionId: existingSession?.id ?? null,
      topic,
      messageScores,
      aiCoreResult,
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

    return {
      ...saved,
      aiReply,
      aiStructured,
      aiDebug: process.env.NODE_ENV !== 'production' ? aiDebug : undefined,
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
    };
  }
}
