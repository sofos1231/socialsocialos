import { api } from './apiClient';
import { useTokens } from '../store/tokens';

export async function login(email: string, password?: string) {
  // eslint-disable-next-line no-console
  console.log('[AUTH][login] request', { email, hasPassword: !!password });
  try {
    const fullUrl = `${api.defaults.baseURL}/v1/auth/login`;
    // eslint-disable-next-line no-console
    console.log('[AUTH][login] sending request to', fullUrl);
    const res = await api.post('/v1/auth/login', { email, password });
    const { accessToken, refreshToken, user } = res.data;
    await useTokens.getState().setTokens({ accessToken, refreshToken });
    // eslint-disable-next-line no-console
    console.log('[AUTH][login] SUCCESS', { userId: user?.id, hasAccessToken: !!accessToken });
    return { accessToken, refreshToken, user } as { accessToken: string; refreshToken?: string; user: any };
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.log('[AUTH][login] ERROR', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      status: error?.response?.status,
      data: error?.response?.data,
      baseURL: error?.config?.baseURL,
      url: error?.config?.url,
      method: error?.config?.method,
      headers: error?.config?.headers,
      errno: error?.errno,
    });
    throw error;
  }
}

export async function signup(input: { email: string; password: string; name?: string }) {
  // eslint-disable-next-line no-console
  console.log('[AUTH][signup] request', { email: input.email, hasPassword: !!input.password, hasName: !!input.name });
  try {
    const fullUrl = `${api.defaults.baseURL}/v1/auth/signup`;
    // eslint-disable-next-line no-console
    console.log('[AUTH][signup] sending request to', fullUrl);
    const res = await api.post('/v1/auth/signup', input);
    const { accessToken, refreshToken, user } = res.data;
    await useTokens.getState().setTokens({ accessToken, refreshToken });
    // eslint-disable-next-line no-console
    console.log('[AUTH][signup] SUCCESS', { userId: user?.id, hasAccessToken: !!accessToken });
    return { accessToken, refreshToken, user } as { accessToken: string; refreshToken?: string; user: any };
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.log('[AUTH][signup] ERROR', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      status: error?.response?.status,
      data: error?.response?.data,
      baseURL: error?.config?.baseURL,
      url: error?.config?.url,
      method: error?.config?.method,
      headers: error?.config?.headers,
      errno: error?.errno,
    });
    throw error;
  }
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


