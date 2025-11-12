import Constants from 'expo-constants';

function normalize(u: string) { return u ? u.replace(/\/$/, '') : ''; }

const constantsUrl = (Constants.expoConfig?.extra as any)?.apiUrl ?? '';
const envPublicUrl = (process.env.EXPO_PUBLIC_API_URL as string) || '';
const envUrl = (process.env.API_URL as string) || '';
const globalUrl = (global as any)?.API_URL || '';

export const ENV = {
  API_URL: normalize(envPublicUrl || envUrl || constantsUrl || globalUrl || ''),
};

if (!ENV.API_URL) {
  // eslint-disable-next-line no-console
  console.warn('[ENV] Missing API_URL — set expo extra.apiUrl or process.env.API_URL before start.');
}
