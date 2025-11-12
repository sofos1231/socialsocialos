import { api } from './apiClient';
import { useTokens } from '../store/tokens';

export async function login(email: string, password?: string) {
  const res = await api.post('/v1/auth/login', { email, password });
  const { accessToken, refreshToken } = res.data;
  await useTokens.getState().setTokens({ accessToken, refreshToken });
  return res.data as { accessToken: string; refreshToken?: string };
}

export async function signup(input: { email: string; password: string; name?: string }) {
  const res = await api.post('/v1/auth/signup', input);
  return res.data as { id: string; email: string; createdAt: string };
}

export async function refresh(refreshToken: string) {
  const res = await api.post('/v1/auth/refresh', { refreshToken });
  const { accessToken, refreshToken: rt } = res.data;
  await useTokens.getState().setTokens({ accessToken, refreshToken: rt });
  return res.data as { accessToken: string; refreshToken: string };
}

export async function revoke() {
  await api.post('/v1/auth/revoke');
  await useTokens.getState().clearTokens();
}


