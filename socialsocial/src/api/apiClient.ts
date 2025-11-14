import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ENV } from '../config/env';
import { getAccessToken, getRefreshToken, useTokens } from '../store/tokens';

type OnAuthLost = () => void;

let _onAuthLost: OnAuthLost | null = null;
export function setOnAuthLost(cb: OnAuthLost) { _onAuthLost = cb; }

// eslint-disable-next-line no-console
console.log('[ENV] API_URL =', ENV.API_URL);
export const api: AxiosInstance = axios.create({ baseURL: ENV.API_URL, timeout: 15000 });
// eslint-disable-next-line no-console
console.log('[API] axios.create baseURL=', api.defaults.baseURL);

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {} as any;
    (config.headers as any)['Authorization'] = `Bearer ${token}`;
  }
  if (typeof config.url === 'string' && config.url.startsWith('/') && !config.url.startsWith('/v1/')) {
    config.url = `/v1${config.url}`;
  }
  (config as any)._ts = typeof performance !== 'undefined' ? performance.now() : Date.now();
  // eslint-disable-next-line no-console
  console.log('[API][REQUEST]', {
    baseURL: (config as any).baseURL || api.defaults.baseURL,
    url: config.url,
    method: config.method,
    data: config.data,
    authorization: (config.headers as any)?.Authorization || (config.headers as any)?.authorization,
    headers: config.headers,
  });
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

async function refreshOnce() {
  const rt = getRefreshToken();
  if (!rt) throw new Error('No refresh token');
  const res = await axios.post(`${ENV.API_URL}/v1/auth/refresh`, { refreshToken: rt });
  await useTokens.getState().setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
}

api.interceptors.response.use(
  (res: AxiosResponse) => {
    // eslint-disable-next-line no-console
    console.log('[API][RESPONSE]', {
      url: res.config?.url,
      baseURL: (res.config as any)?.baseURL || api.defaults.baseURL,
      status: res.status,
      data: res.data,
      method: res.config?.method,
      headers: res.config?.headers,
    });
    return res;
  },
  async (err: AxiosError) => {
    const cfg = err.config as any;
    const status = err.response?.status;
    const code = (err.response?.data as any)?.error?.code;
    const started = (cfg && cfg._ts) || (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const dur = ((typeof performance !== 'undefined' ? performance.now() : Date.now()) - started) | 0;
    // eslint-disable-next-line no-console
    console.log(`[api] ${cfg?.method?.toUpperCase()} ${cfg?.url} -> ${status} in ${dur}ms`);
    // eslint-disable-next-line no-console
    console.log('[API][ERROR]', {
      message: err?.message,
      name: (err as any)?.name,
      status: err?.response?.status,
      data: err?.response?.data,
      url: err?.config?.url,
      baseURL: err?.config?.baseURL,
      method: err?.config?.method,
      headers: err?.config?.headers,
      code: (err as any)?.code,
      errno: (err as any)?.errno,
    });
    if ((err as any)?.code === 'ECONNREFUSED' || (err as any)?.code === 'ETIMEDOUT' || (err as any)?.code === 'ENETUNREACH') {
      // eslint-disable-next-line no-console
      console.log('[API][ERROR] Low-level network failure detected');
    }

    if (status === 401 && !cfg._retried) {
      cfg._retried = true;
      if (!isRefreshing) {
        isRefreshing = true;
        try { await refreshOnce(); pendingQueue.forEach(p => p.resolve(null)); }
        catch (e) { pendingQueue.forEach(p => p.reject(e)); await useTokens.getState().clearTokens(); _onAuthLost && _onAuthLost(); throw e; }
        finally { isRefreshing = false; pendingQueue = []; }
      } else {
        await new Promise((resolve, reject) => pendingQueue.push({ resolve, reject }));
      }
      return api(cfg);
    }

    if (status === 409 && code === 'IDEMPOTENT_REPLAY') {
      // Normalize replay as success-equivalent
      return Promise.resolve(err.response as AxiosResponse);
    }

    if (status === 429) {
      const retryAfter = Number(err.response?.headers?.['retry-after'] || 0);
      return Promise.reject(Object.assign(err, { message: 'Too many attempts — try again soon', retryAfter }));
    }

    // Friendly mapping for domain-specific errors
    if (status && err.response?.data && (err.response.data as any).error?.code) {
      const code = (err.response.data as any).error.code as string;
      const friendly: Record<string, string> = {
        WALLET_LIMIT_REACHED: 'You have reached the wallet limit for today.',
        INSUFFICIENT_DIAMONDS: 'Not enough gems to complete this action.',
        IAP_RECEIPT_REJECTED: 'The purchase receipt was rejected. Please try again.',
      };
      if (friendly[code]) {
        return Promise.reject(Object.assign(err, { message: friendly[code] }));
      }
    }

    return Promise.reject(err);
  }
);


