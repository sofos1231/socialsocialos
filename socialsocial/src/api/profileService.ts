import { api } from './apiClient';

export async function getProfile(): Promise<{ name?: string; email?: string }> {
  const res = await api.get('/users/profile');
  return res.data as { name?: string; email?: string };
}

export async function update(input: { email?: string; name?: string }) {
  const res = await api.put('/users/profile', input);
  return res.data as { success: boolean; profile: { name?: string; email?: string } };
}


