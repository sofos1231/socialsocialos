export type StreakState = {
  daysThisWeek: boolean[];   // length 7, Sun..Sat
  todayIndex: number;        // 0..6
  currentStreak: number;     // e.g., 5
  xpBonusPercent: number;    // e.g., 10
  percentile: number;        // e.g., 82
  username: string;          // e.g., "Shalev"
};

const MILESTONES = [5, 7, 14, 30] as const;
export type Milestone = typeof MILESTONES[number];

export function isMilestone(n: number): n is Milestone {
  return (MILESTONES as readonly number[]).includes(n);
}

export function nextMilestone(n: number): Milestone | null {
  for (const m of MILESTONES) if (n < m) return m;
  return null;
}

export function daysToNext(n: number): number | null {
  const nxt = nextMilestone(n);
  return nxt ? Math.max(0, nxt - n) : null;
}


