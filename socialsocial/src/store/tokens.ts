import { Platform } from 'react-native';
import create from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TokensState = {
  accessToken?: string;
  refreshToken?: string;
  setTokens: (t: { accessToken?: string; refreshToken?: string }) => Promise<void>;
  clearTokens: () => Promise<void>;
  hydrateFromStorage: () => Promise<void>;
};

const WEB = Platform.OS === 'web';

async function getStorageItem(key: string): Promise<string | null> {
  if (WEB && typeof localStorage !== 'undefined') return localStorage.getItem(key);
  return AsyncStorage.getItem(key);
}
async function setStorageItem(key: string, value: string): Promise<void> {
  if (WEB && typeof localStorage !== 'undefined') return void localStorage.setItem(key, value);
  return AsyncStorage.setItem(key, value);
}
async function removeStorageItem(key: string): Promise<void> {
  if (WEB && typeof localStorage !== 'undefined') return void localStorage.removeItem(key);
  return AsyncStorage.removeItem(key);
}

export const useTokens = create<TokensState>((set, get) => ({
  accessToken: undefined,
  refreshToken: undefined,
  setTokens: async ({ accessToken, refreshToken }) => {
    if (accessToken) await setStorageItem('accessToken', accessToken);
    if (refreshToken) await setStorageItem('refreshToken', refreshToken);
    set({ accessToken, refreshToken });
  },
  clearTokens: async () => {
    await removeStorageItem('accessToken');
    await removeStorageItem('refreshToken');
    set({ accessToken: undefined, refreshToken: undefined });
  },
  hydrateFromStorage: async () => {
    const [a, r] = await Promise.all([getStorageItem('accessToken'), getStorageItem('refreshToken')]);
    set({ accessToken: a || undefined, refreshToken: r || undefined });
  },
}));

export function getAccessToken(): string | undefined { return useTokens.getState().accessToken; }
export function getRefreshToken(): string | undefined { return useTokens.getState().refreshToken; }

export async function setTokens(accessToken?: string, refreshToken?: string) {
  await useTokens.getState().setTokens({ accessToken, refreshToken });
}

export async function clearTokens() { await useTokens.getState().clearTokens(); }
export async function hydrateFromStorage() { await useTokens.getState().hydrateFromStorage(); }


