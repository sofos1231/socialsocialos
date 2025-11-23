// src/api/dashboardService.ts
// Stub for mini dashboard stats used in src/app/components/DashboardMiniStatsCard.tsx

export interface MiniStats {
  sessionsCount: number;
  socialScore: number;
  level: number;
  xp: number;
  averageScore: number;
}

/**
 * Temporary stub that returns static mini stats.
 * Signature matches usage: getMiniStats(accessToken)
 */
export async function getMiniStats(accessToken?: string): Promise<MiniStats> {
  console.warn(
    '[dashboardService] getMiniStats() stub called – returning fake mini stats. accessToken:',
    accessToken ? 'provided' : 'none',
  );

  return {
    sessionsCount: 0,
    socialScore: 0,
    level: 1,
    xp: 0,
    averageScore: 0,
  };
}
