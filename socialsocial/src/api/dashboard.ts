// socialsocial/src/api/dashboard.ts
import { api } from './client';
import { DashboardSummaryResponse } from '../navigation/types';

/**
 * Fetch the canonical stats dashboard from /v1/stats/dashboard.
 * This is the single source of truth for wallet, streak, and summary stats.
 */
export async function fetchDashboardSummary(
  accessToken: string,
): Promise<DashboardSummaryResponse> {
  const res = await api.get<DashboardSummaryResponse>('/stats/dashboard', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return res.data;
}
