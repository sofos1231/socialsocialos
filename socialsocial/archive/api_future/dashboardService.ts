// src/api/dashboardService.ts
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const USE_MOCK = (process.env.EXPO_PUBLIC_USE_MOCK_STATS || 'false') === 'true';

type MiniStats = { sessionsCount: number; averageScore: number };

const mockStats: MiniStats = { sessionsCount: 3, averageScore: 6.4 };

export async function getMiniStats(accessToken: string): Promise<MiniStats> {
  if (USE_MOCK) return mockStats;

  const res = await fetch(`${API_URL}/v1/dashboard/mini`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    return mockStats; // graceful fallback
  }
  return res.json();
}
