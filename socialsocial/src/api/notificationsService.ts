import { api } from './apiClient';

export async function send(input: { to: string; title: string; body: string }) {
  const res = await api.post('/v1/notifications/send', input);
  return res.data as { status: number };
}

export async function test() {
  const res = await api.post('/v1/notifications/test', {});
  return res.data as { status: number };
}


