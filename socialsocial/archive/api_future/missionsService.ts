import { api } from './apiClient';

export type Mission = { id: string; title: string; description: string };

export async function list(): Promise<{ items: Mission[] }> {
  const res = await api.get('/v1/missions');
  return res.data as { items: Mission[] };
}

export async function claim(id: string, body?: { score?: number }, opts?: { idempotencyKey?: string }) {
  const headers: Record<string, string> = {};
  if (opts?.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
  const res = await api.post(`/v1/missions/${id}/claim`, body || {}, { headers });
  return res.data as { success?: boolean };
}


