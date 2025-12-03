// FILE: backend/src/modules/practice/practice.service.ts

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

import type { PracticeMessageInput as AiPracticeMessageInput } from '../ai/ai.types';
import type { TranscriptMessage } from '../ai/ai-scoring.types';
import {
  MessageRole,
  MissionStatus,
  MissionDifficulty,
  MissionGoalType,
} from '@prisma/client';

type MissionStateStatus = 'IN_PROGRESS' | 'SUCCESS' | 'FAIL';
type MissionMood = 'SAFE' | 'WARNING' | 'DANGER' | 'GOOD';
type TranscriptMsg = { role: 'USER' | 'AI'; content: string };

type DisqualifyCode =
  | 'SEXUAL_EXPLICIT'
  | 'HARASSMENT_SLUR'
  | 'THREAT_VIOLENCE';

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
 * Normalize user text for deterministic moderation checks.
 * This is not "AI safety moderation" — it's game-rule disqualification only.
 */
function normalizeForRules(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // keep letters/numbers (including hebrew), drop punctuation
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

/**
 * Server-authoritative disqualify detector.
 * - Independent of aiContract (matches your architecture)
 * - Uses deterministic pattern rules
 */
function detectDisqualify(
  userTextRaw: string,
  userMsgIndex: number,
  ctx: { difficulty: MissionDifficulty; goalType: MissionGoalType | null },
): DisqualifyResult | null {
  const text = normalizeForRules(userTextRaw);
  if (!text) return null;

  // NOTE: keep these strict to reduce false positives.
  // Add more only after you see real false negatives in testing.

  const sexualPatterns: RegExp[] = [
    /\b(send\s+nudes|nudes|nude\s+pics)\b/i,
    /\b(fuck|blowjob|bj|anal|cum|orgasm)\b/i,
    /\b(pussy|dick|cock)\b/i,
    // Hebrew (basic)
    /\b(סקס|לזיין|זין|כוס|תמצצי|תמצוץ)\b/iu,
  ];

  const harassmentSlurs: RegExp[] = [
    /\b(bitch|whore|slut|cunt)\b/i,
    // Hebrew slurs (basic)
    /\b(זונה|שרמוטה|כלבה)\b/iu,
  ];

  const violenceThreatPatterns: RegExp[] = [
    /\b(i\s*will\s*kill\s*you|kill\s*you|i\s*will\s*hurt\s*you|hurt\s*you)\b/i,
    /\b(stab|shoot|rape)\b/i,
    // Hebrew (basic)
    /\b(אני\s*אהרוג|להרוג|לרצוח|לדקור|לאנוס)\b/iu,
  ];

  // Optional strictness dial (future): for now, disqualify conditions are global.
  // Keeping ctx here because you'll likely want category/difficulty-specific rules later.

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

/**
 * Deterministic mission state calculator (frontend-facing).
 * Ends when total USER messages reaches policy.maxMessages.
 */
function computeMissionState(
  messageScores: number[],
  policy: Required<MissionStatePayload>['policy'],
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

  let status: MissionStateStatus = 'IN_PROGRESS';
  if (totalUserMessages >= policy.maxMessages) {
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

  const delta = Array(params.deltaUserCount).fill(0); // disqualified ⇒ no reward farming
  return [...base, ...delta];
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

  async runPracticeSession(userId: string, dto: CreatePracticeSessionDto) {
    if (!userId) throw new BadRequestException('Missing userId.');
    if (!dto?.messages || dto.messages.length === 0) {
      throw new BadRequestException('No messages provided.');
    }

    const isContinuation = !!dto.sessionId;

    // Load existing session for continuation
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
      if (existingSession.userId !== userId) throw new UnauthorizedException('Session does not belong to user.');
      if (existingSession.status !== MissionStatus.IN_PROGRESS || existingSession.endedAt) {
        throw new BadRequestException('Session is not IN_PROGRESS.');
      }
    }

    const templateId = dto.templateId ?? existingSession?.templateId ?? null;
    const personaId = dto.personaId ?? existingSession?.personaId ?? null;

    // Load template details (NOT only aiContract) so backend rules can be label-driven
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
          },
        })
      : null;

    if (templateId && !template) throw new NotFoundException('Mission template not found.');

    const effectivePolicy = template
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

    // Build existing transcript (payload first)
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

    // Fallback: reconstruct transcript from ChatMessage rows (if payload missing)
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

    // Incoming delta messages (append)
    const deltaMessages: TranscriptMsg[] = dto.messages
      .filter((m: any) => m && typeof m.content === 'string')
      .map((m: any) => {
        const role: TranscriptMsg['role'] = m.role === 'USER' ? 'USER' : 'AI';
        return { role, content: safeTrim(m.content) };
      })
      .filter((m: TranscriptMsg) => m.content.length > 0);

    // Basic guard: must include at least one USER message in the delta
    const deltaUser = deltaMessages.filter((m) => m.role === 'USER');
    if (deltaUser.length === 0) {
      throw new BadRequestException('No USER messages provided.');
    }

    // Small de-dupe: if delta repeats the last message(s), drop them
    const fullTranscript: TranscriptMsg[] = [...existingTranscript];
    for (const dm of deltaMessages) {
      const last = fullTranscript[fullTranscript.length - 1];
      if (last && last.role === dm.role && last.content === dm.content) continue;
      fullTranscript.push(dm);
    }

    // ---------
    // ✅ DISQUALIFY GATE (server-authoritative, before any AI calls)
    // ---------
    const existingUserCount = existingTranscript.filter((m) => m.role === 'USER').length;

    let disqualify: DisqualifyResult | null = null;
    for (let i = 0; i < deltaUser.length; i++) {
      const userMsg = deltaUser[i]?.content ?? '';
      const userMsgIndex = existingUserCount + i; // index among USER messages
      const hit = detectDisqualify(userMsg, userMsgIndex, {
        difficulty: template?.difficulty ?? effectivePolicy.difficulty,
        goalType: template?.goalType ?? null,
      });
      if (hit) {
        disqualify = hit;
        break;
      }
    }

    // Topic: for new sessions must exist; for continuation fallback to existing topic
    const topic =
      safeTrim((dto as any).topic) ||
      safeTrim(existingSession?.topic) ||
      'Practice';

    if (!isContinuation && !topic) {
      throw new BadRequestException('topic is required for new sessions.');
    }

    if (disqualify) {
      // Build fallback messageScores WITHOUT calling AI scoring (fast, no farming)
      const scores = buildFallbackScoresOnDisqualify({
        existingScores,
        existingUserCount,
        deltaUserCount: deltaUser.length,
      });

      // Build missionState that ends immediately
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

      const aiReply =
        disqualify.code === 'SEXUAL_EXPLICIT'
          ? '⚠️ Mission ended: disqualified (sexual content).'
          : disqualify.code === 'HARASSMENT_SLUR'
            ? '⚠️ Mission ended: disqualified (harassment/insult).'
            : '⚠️ Mission ended: disqualified (threat/violence).';

      // Persist a clean transcript including a final AI note (deterministic)
      const transcriptToPersist: TranscriptMsg[] = [
        ...fullTranscript,
        { role: 'AI', content: aiReply },
      ];

      const saved = await this.sessions.createScoredSessionFromScores({
        userId,
        sessionId: existingSession?.id ?? null,
        topic,
        messageScores: scores,
        templateId,
        personaId,
        transcript: transcriptToPersist,
        assistantReply: aiReply,
        missionStatus: 'FAIL',
      });

      return {
        ...saved,
        aiReply,
        aiStructured: null,
        aiDebug: process.env.NODE_ENV !== 'production'
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
              aiContract: template?.aiContract ?? null,
            }
          : null,
        missionState,
      };
    }

    // ---------
    // Normal path (no disqualify): do AI scoring + AI reply + core metrics
    // ---------

    // Scoring: prefer incremental (existingScores + score(deltaUser)) if consistent
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
      if (deltaScores.length === 0) throw new BadRequestException('AI scoring produced no message scores.');

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
      if (messageScores.length === 0) throw new BadRequestException('AI scoring produced no message scores.');
    }

    const missionState = computeMissionState(messageScores, effectivePolicy);

    // Generate AI reply with FULL transcript (Step 8)
    const { aiReply, aiDebug, aiStructured } = await this.aiChat.generateReply({
      userId,
      topic,
      messages: fullTranscript,
      templateId,
      personaId,
    });

    const transcriptToPersist: TranscriptMsg[] = [
      ...fullTranscript,
      { role: 'AI', content: aiReply },
    ];

    // Core metrics on full transcript INCLUDING the generated reply
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
            aiContract: template?.aiContract ?? null, // AI behavior only
          }
        : null,
      missionState,
    };
  }
}
