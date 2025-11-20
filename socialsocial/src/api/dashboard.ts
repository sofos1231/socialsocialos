// socialsocial/src/api/dashboard.ts
import { api } from './client';
import { DashboardSummaryResponse } from '../navigation/types';

export async function fetchDashboardSummary(
  accessToken: string,
): Promise<DashboardSummaryResponse> {
  const res = await api.get<DashboardSummaryResponse>('/dashboard/summary', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return res.data;
}
