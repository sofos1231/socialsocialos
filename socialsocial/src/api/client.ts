// socialsocial/src/api/client.ts
import axios, { AxiosRequestHeaders } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';

function normalizeBase(url: string) {
  if (!url) return '';
  return url.replace(/\/+$/, '');
}

// Base URL: e.g. http://10.0.2.2:3000/v1
const baseURL = `${normalizeBase(ENV.API_URL)}/v1`;

console.log('[API] baseURL =', baseURL);

export const api = axios.create({
  baseURL,
  timeout: 10000,
});

// Attach token + debug logs
api.interceptors.request.use(
  async (config) => {
    try {
      const storedAccessToken =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (storedAccessToken) {
        // Ensure headers is typed correctly
        config.headers = (config.headers ||
          {}) as AxiosRequestHeaders;

        config.headers.Authorization = `Bearer ${storedAccessToken}`;
      }
    } catch (e) {
      console.log('[API] failed to read token from AsyncStorage', e);
    }

    const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
    console.log('[API REQUEST]', config.method?.toUpperCase(), fullUrl);
    return config;
  },
  (error) => Promise.reject(error),
);

// Log responses + errors
api.interceptors.response.use(
  (res) => {
    console.log('[API RESPONSE]', res.status, res.config.url);
    return res;
  },
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    console.log('[API ERROR]', status, data || String(error));
    return Promise.reject(error);
  },
);
