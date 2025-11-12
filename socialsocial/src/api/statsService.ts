import { api } from './apiClient';

export async function getUser(userId: string) {
  const res = await api.get(`/v1/stats/user/${encodeURIComponent(userId)}`);
  return res.data as Record<string, unknown>;
}

export async function getHistory(params?: { from?: string; to?: string; cursor?: string; limit?: number }) {
  const res = await api.get('/v1/stats/history', { params });
  return res.data as { items: Array<Record<string, unknown>> };
}

export async function update(payload: Record<string, unknown>) {
  const res = await api.post('/v1/stats/update', payload);
  return res.data as { ok: boolean };
}


