// FILE: socialsocial/src/logic/missionEndReasons.ts

export type MissionEndReasonCode =
  | 'SUCCESS_OBJECTIVE'
  | 'FAIL_OBJECTIVE'
  | 'LIMIT_MESSAGE_COUNT_REACHED'
  | 'LIMIT_TIME_REACHED'
  | 'ABORT_USER_LEFT'
  | 'ABORT_DISQUALIFIED'
  | string;

export type MissionStatus =
  | 'IN_PROGRESS'
  | 'SUCCESS'
  | 'FAIL'
  | 'DISQUALIFIED'
  | 'ABORTED'
  | string;

export type EndReasonTone = 'success' | 'fail' | 'warning' | 'danger' | 'neutral';

export type EndReasonMeta = Record<string, any> | null | undefined;

export type MissionStatePayload = {
  status?: MissionStatus | null;
  progressPct?: number | null;
  mood?: string | null; // future-proof
  endReasonCode?: MissionEndReasonCode | null;
  endReasonMeta?: EndReasonMeta;
};

export type EndReasonCopy = {
  title: string;
  subtitle: string;
  tone: EndReasonTone;
  // for future expansions (Rules/Timer/Strikes UI)
  showRulesCTA?: boolean;
};

function safeStr(x: any) {
  if (x === null || x === undefined) return '';
  return String(x);
}

function disqualifyExplanation(meta: EndReasonMeta): string {
  const code = safeStr(meta?.disqualifyCode);
  // Keep this HUMAN. Do not leak matchedText in prod UI.
  switch (code) {
    case 'BANNED_WORD':
      return 'You used a forbidden rule-breaking phrase.';
    case 'INSULT':
      return 'You crossed the “respect” rule.';
    case 'SEXUAL_CONTENT':
      return 'You crossed the sexual content rule.';
    case 'SPAM':
      return 'Your message looked like spam.';
    default:
      return code ? `You broke a mission rule (${code}).` : 'You broke a mission rule.';
  }
}

const END_REASON_COPY: Record<string, EndReasonCopy> = {
  SUCCESS_OBJECTIVE: {
    title: 'Objective achieved',
    subtitle: 'You completed the mission goal.',
    tone: 'success',
  },
  FAIL_OBJECTIVE: {
    title: 'Objective missed',
    subtitle: 'You didn’t meet the mission goal this time.',
    tone: 'fail',
  },
  LIMIT_MESSAGE_COUNT_REACHED: {
    title: 'Message limit reached',
    subtitle: 'You hit the mission’s message cap.',
    tone: 'warning',
  },
  LIMIT_TIME_REACHED: {
    title: 'Time is up',
    subtitle: 'You hit the mission’s time limit.',
    tone: 'warning',
  },
  ABORT_USER_LEFT: {
    title: 'Mission ended',
    subtitle: 'You left before completing the mission.',
    tone: 'neutral',
  },
  ABORT_DISQUALIFIED: {
    title: 'Disqualified',
    subtitle: 'You broke a mission rule.',
    tone: 'danger',
    showRulesCTA: true,
  },
};

export function getEndReasonCopy(missionState?: MissionStatePayload | null): EndReasonCopy & {
  code: MissionEndReasonCode | null;
  status: MissionStatus | null;
  disqualifyNote?: string;
} {
  const status = (missionState?.status ?? null) as any;
  const code = (missionState?.endReasonCode ?? null) as any;
  const meta = missionState?.endReasonMeta ?? null;

  // Primary: endReasonCode mapping
  if (code && END_REASON_COPY[code]) {
    const base = END_REASON_COPY[code];
    if (code === 'ABORT_DISQUALIFIED') {
      return {
        ...base,
        code,
        status,
        disqualifyNote: disqualifyExplanation(meta),
      };
    }
    return { ...base, code, status };
  }

  // Secondary: unknown endReasonCode → graceful fallback
  if (code) {
    const title =
      code === 'ABORT_DISQUALIFIED' ? 'Disqualified' : 'Mission ended';
    const tone: EndReasonTone =
      code === 'ABORT_DISQUALIFIED' ? 'danger' : 'neutral';

    return {
      title,
      subtitle: 'This mission ended for a specific reason.',
      tone,
      showRulesCTA: code === 'ABORT_DISQUALIFIED',
      code,
      status,
      disqualifyNote: code === 'ABORT_DISQUALIFIED' ? disqualifyExplanation(meta) : undefined,
    };
  }

  // Tertiary: no code yet → status-based fallback
  switch (status) {
    case 'SUCCESS':
      return { title: 'Mission complete', subtitle: 'Nice work.', tone: 'success', code: null, status };
    case 'FAIL':
      return { title: 'Mission failed', subtitle: 'Try again with a different approach.', tone: 'fail', code: null, status };
    case 'DISQUALIFIED':
      return { title: 'Disqualified', subtitle: 'You broke a mission rule.', tone: 'danger', showRulesCTA: true, code: null, status };
    default:
      return { title: 'Mission ended', subtitle: 'Session finished.', tone: 'neutral', code: null, status };
  }
}
