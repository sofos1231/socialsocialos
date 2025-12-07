// backend/src/modules/shared/serializers/api-serializers.ts
// ✅ Step 5.6: Allowlist-only serializers (no spreading raw DB objects)

import { MessageRole } from '@prisma/client';
import { normalizeChatMessageRead } from '../normalizers/chat-message.normalizer';

/**
 * Public API shape for chat messages (allowlist-only)
 * Only these 5 fields are exposed to the frontend.
 */
export interface ApiChatMessage {
  turnIndex: number;
  role: MessageRole;
  content: string;
  score: number | null;
  traitData: {
    traits: Record<string, any>;
    flags: string[];
    label: string | null;
  };
}

/**
 * Public API shape for aiStructured (allowlist-only, no raw field)
 */
export interface ApiAiStructured {
  replyText: string;
  messageScore?: number;
  rarity?: 'C' | 'B' | 'A' | 'S' | 'S+';
  tags?: string[];
  parseOk: boolean;
}

/**
 * Public API shape for practice session response (allowlist-only)
 */
export interface PracticeSessionResponsePublic {
  ok: boolean;
  rewards: {
    score: number;
    messageScore: number;
    isSuccess: boolean;
    xpGained: number;
    coinsGained: number;
    gemsGained: number;
    rarityCounts: Record<string, number>;
    messages: Array<{
      index: number;
      score: number;
      rarity: 'C' | 'B' | 'A' | 'S' | 'S+';
      xp: number;
      coins: number;
      gems: number;
    }>;
  };
  dashboard: any; // Complex nested structure, validated separately
  sessionId: string;
  messages: ApiChatMessage[];
  aiReply: string;
  aiStructured: ApiAiStructured | null;
  mission: {
    templateId: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'ELITE';
    goalType: 'CONVERSATION' | 'PERSUASION' | 'NEGOTIATION' | null;
    maxMessages: number;
    scoring: {
      successScore: number;
      failScore: number;
    };
    aiStyle: any | null;
    aiContract: Record<string, any> | null;
  } | null;
  missionState: {
    status: 'IN_PROGRESS' | 'SUCCESS' | 'FAIL';
    progressPct: number;
    averageScore: number;
    totalMessages: number;
    remainingMessages?: number;
    mood?: 'SAFE' | 'WARNING' | 'DANGER' | 'GOOD';
    policy?: {
      difficulty: any;
      goalType: any;
      maxMessages: number;
      successScore: number;
      failScore: number;
    };
    disqualified?: boolean;
    disqualify?: {
      code: 'SEXUAL_EXPLICIT' | 'HARASSMENT_SLUR' | 'THREAT_VIOLENCE';
      triggeredByUserMessageIndex: number;
      matchedText: string;
    } | null;
    endReasonCode: string | null;
    endReasonMeta: Record<string, any> | null;
  };
}

/**
 * ✅ Step 5.6: Allowlist-only serializer for chat messages
 * Returns ONLY the 5 public fields. No spreading raw DB objects.
 */
export function toApiChatMessage(input: any): ApiChatMessage {
  // Normalize first to ensure consistent shape
  const normalized = normalizeChatMessageRead(
    input,
    typeof input?.turnIndex === 'number' && input.turnIndex >= 0 ? input.turnIndex : 0,
  );

  // Allowlist: pick only the 5 public fields
  return {
    turnIndex: normalized.turnIndex,
    role: normalized.role,
    content: normalized.content,
    score: normalized.score,
    traitData: normalized.traitData,
  };
}

/**
 * ✅ Step 5.6: Allowlist-only serializer for aiStructured
 * Removes 'raw' field and any other unexpected keys.
 */
function toApiAiStructured(input: any): ApiAiStructured | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  // Allowlist: only these fields
  return {
    replyText: typeof input.replyText === 'string' ? input.replyText : '',
    messageScore:
      typeof input.messageScore === 'number' && input.messageScore >= 0 && input.messageScore <= 100
        ? input.messageScore
        : undefined,
    rarity:
      typeof input.rarity === 'string' && ['C', 'B', 'A', 'S', 'S+'].includes(input.rarity)
        ? (input.rarity as 'C' | 'B' | 'A' | 'S' | 'S+')
        : undefined,
    tags: Array.isArray(input.tags) ? input.tags.filter((t: any) => typeof t === 'string') : undefined,
    parseOk: typeof input.parseOk === 'boolean' ? input.parseOk : false,
    // Explicitly exclude 'raw' and any other fields
  };
}

/**
 * ✅ Step 5.6: Allowlist-only serializer for chat message response
 */
export function toChatMessageResponsePublic(message: any): { message: ApiChatMessage } {
  return {
    message: toApiChatMessage(message),
  };
}

/**
 * ✅ Step 5.6: Allowlist-only serializer for practice session response
 * Hard rule: never include any raw or unknown nested keys.
 */
export function toPracticeSessionResponsePublic(resp: any): PracticeSessionResponsePublic {
  // Allowlist: only these 9 top-level keys
  const result: PracticeSessionResponsePublic = {
    ok: resp?.ok === true,
    rewards: {
      score: typeof resp?.rewards?.score === 'number' ? resp.rewards.score : 0,
      messageScore: typeof resp?.rewards?.messageScore === 'number' ? resp.rewards.messageScore : 0,
      isSuccess: resp?.rewards?.isSuccess === true,
      xpGained: typeof resp?.rewards?.xpGained === 'number' ? resp.rewards.xpGained : 0,
      coinsGained: typeof resp?.rewards?.coinsGained === 'number' ? resp.rewards.coinsGained : 0,
      gemsGained: typeof resp?.rewards?.gemsGained === 'number' ? resp.rewards.gemsGained : 0,
      rarityCounts:
        resp?.rewards?.rarityCounts && typeof resp.rewards.rarityCounts === 'object'
          ? resp.rewards.rarityCounts
          : {},
      messages: Array.isArray(resp?.rewards?.messages)
        ? resp.rewards.messages.map((m: any) => ({
            index: typeof m?.index === 'number' ? m.index : 0,
            score: typeof m?.score === 'number' ? m.score : 0,
            rarity:
              typeof m?.rarity === 'string' && ['C', 'B', 'A', 'S', 'S+'].includes(m.rarity)
                ? (m.rarity as 'C' | 'B' | 'A' | 'S' | 'S+')
                : 'C',
            xp: typeof m?.xp === 'number' ? m.xp : 0,
            coins: typeof m?.coins === 'number' ? m.coins : 0,
            gems: typeof m?.gems === 'number' ? m.gems : 0,
          }))
        : [],
    },
    dashboard: resp?.dashboard ?? null, // Keep as-is (validated separately)
    sessionId: typeof resp?.sessionId === 'string' ? resp.sessionId : '',
    messages: Array.isArray(resp?.messages)
      ? resp.messages.map((m: any) => toApiChatMessage(m))
      : [],
    aiReply: typeof resp?.aiReply === 'string' ? resp.aiReply : '',
    aiStructured: toApiAiStructured(resp?.aiStructured),
    mission: resp?.mission && typeof resp.mission === 'object'
      ? {
          templateId: typeof resp.mission.templateId === 'string' ? resp.mission.templateId : '',
          difficulty:
            typeof resp.mission.difficulty === 'string' &&
            ['EASY', 'MEDIUM', 'HARD', 'ELITE'].includes(resp.mission.difficulty)
              ? (resp.mission.difficulty as 'EASY' | 'MEDIUM' | 'HARD' | 'ELITE')
              : 'EASY',
          goalType:
            typeof resp.mission.goalType === 'string' &&
            ['CONVERSATION', 'PERSUASION', 'NEGOTIATION'].includes(resp.mission.goalType)
              ? (resp.mission.goalType as 'CONVERSATION' | 'PERSUASION' | 'NEGOTIATION')
              : null,
          maxMessages: typeof resp.mission.maxMessages === 'number' ? resp.mission.maxMessages : 0,
          scoring: {
            successScore:
              typeof resp.mission.scoring?.successScore === 'number'
                ? resp.mission.scoring.successScore
                : 0,
            failScore:
              typeof resp.mission.scoring?.failScore === 'number' ? resp.mission.scoring.failScore : 0,
          },
          aiStyle: resp.mission.aiStyle ?? null,
          aiContract:
            resp.mission.aiContract && typeof resp.mission.aiContract === 'object'
              ? resp.mission.aiContract
              : null,
        }
      : null,
    missionState: {
      status:
        typeof resp?.missionState?.status === 'string' &&
        ['IN_PROGRESS', 'SUCCESS', 'FAIL'].includes(resp.missionState.status)
          ? (resp.missionState.status as 'IN_PROGRESS' | 'SUCCESS' | 'FAIL')
          : 'IN_PROGRESS',
      progressPct:
        typeof resp?.missionState?.progressPct === 'number' ? resp.missionState.progressPct : 0,
      averageScore:
        typeof resp?.missionState?.averageScore === 'number' ? resp.missionState.averageScore : 0,
      totalMessages:
        typeof resp?.missionState?.totalMessages === 'number' ? resp.missionState.totalMessages : 0,
      remainingMessages:
        typeof resp?.missionState?.remainingMessages === 'number'
          ? resp.missionState.remainingMessages
          : undefined,
      mood:
        typeof resp?.missionState?.mood === 'string' &&
        ['SAFE', 'WARNING', 'DANGER', 'GOOD'].includes(resp.missionState.mood)
          ? (resp.missionState.mood as 'SAFE' | 'WARNING' | 'DANGER' | 'GOOD')
          : undefined,
      policy: resp?.missionState?.policy
        ? {
            difficulty: resp.missionState.policy.difficulty,
            goalType: resp.missionState.policy.goalType,
            maxMessages:
              typeof resp.missionState.policy.maxMessages === 'number'
                ? resp.missionState.policy.maxMessages
                : 0,
            successScore:
              typeof resp.missionState.policy.successScore === 'number'
                ? resp.missionState.policy.successScore
                : 0,
            failScore:
              typeof resp.missionState.policy.failScore === 'number'
                ? resp.missionState.policy.failScore
                : 0,
          }
        : undefined,
      disqualified: resp?.missionState?.disqualified === true,
      disqualify: resp?.missionState?.disqualify && typeof resp.missionState.disqualify === 'object'
        ? {
            code:
              typeof resp.missionState.disqualify.code === 'string' &&
              ['SEXUAL_EXPLICIT', 'HARASSMENT_SLUR', 'THREAT_VIOLENCE'].includes(
                resp.missionState.disqualify.code,
              )
                ? (resp.missionState.disqualify.code as
                    | 'SEXUAL_EXPLICIT'
                    | 'HARASSMENT_SLUR'
                    | 'THREAT_VIOLENCE')
                : 'SEXUAL_EXPLICIT',
            triggeredByUserMessageIndex:
              typeof resp.missionState.disqualify.triggeredByUserMessageIndex === 'number'
                ? resp.missionState.disqualify.triggeredByUserMessageIndex
                : 0,
            matchedText:
              typeof resp.missionState.disqualify.matchedText === 'string'
                ? resp.missionState.disqualify.matchedText
                : '',
          }
        : undefined,
      endReasonCode:
        typeof resp?.missionState?.endReasonCode === 'string' ? resp.missionState.endReasonCode : null,
      endReasonMeta:
        resp?.missionState?.endReasonMeta && typeof resp.missionState.endReasonMeta === 'object'
          ? resp.missionState.endReasonMeta
          : null,
    },
  };

  return result;
}

/**
 * ✅ Step 5.6: Allowlist-only serializer for sessions mock response
 * Same structure as practice session but without aiReply, aiStructured, mission, missionState
 */
export function toSessionsMockResponsePublic(resp: any): Omit<
  PracticeSessionResponsePublic,
  'aiReply' | 'aiStructured' | 'mission' | 'missionState'
> {
  const full = toPracticeSessionResponsePublic({
    ...resp,
    aiReply: '',
    aiStructured: null,
    mission: null,
    missionState: {
      status: 'IN_PROGRESS',
      progressPct: 0,
      averageScore: 0,
      totalMessages: 0,
      endReasonCode: null,
      endReasonMeta: null,
    },
  });

  // Remove fields not in mock response
  const { aiReply, aiStructured, mission, missionState, ...mockResponse } = full;
  return mockResponse;
}

