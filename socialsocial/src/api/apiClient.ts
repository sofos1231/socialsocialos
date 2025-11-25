// FILE: socialsocial/src/api/apiClient.ts
import axios, { AxiosError, AxiosInstance, AxiosRequestHeaders } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';

function normalizeBase(url: string) {
  return url ? url.replace(/\/+$/, '') : '';
}

const baseURL = `${normalizeBase(ENV.API_URL)}/v1`;

if (!ENV.API_URL) {
  // eslint-disable-next-line no-console
  console.warn('[apiClient] Missing API_URL (see src/config/env.ts). Requests will fail.');
}
// eslint-disable-next-line no-console
console.log('[apiClient] baseURL =', baseURL);

const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
});

// one global callback for 401
let onAuthLostCallback: (() => void) | null = null;

export const setOnAuthLost = (cb: (() => void) | null) => {
  onAuthLostCallback = cb;
};

export const setAuthToken = (token: string | null) => {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
};

// Attach token automatically (so you don’t have to call setAuthToken everywhere)
api.interceptors.request.use(
  async (config) => {
    try {
      const stored =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));
      if (stored) {
        config.headers = (config.headers || {}) as AxiosRequestHeaders;
        config.headers.Authorization = `Bearer ${stored}`;
      }
    } catch {}
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401 && onAuthLostCallback) onAuthLostCallback();
    return Promise.reject(error);
  },
);

export default api;
