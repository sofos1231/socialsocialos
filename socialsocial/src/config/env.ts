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

// Strong runtime diagnostics for networking base URL resolution
// eslint-disable-next-line no-console
console.log('[ENV] Sources ->',
  { EXPO_PUBLIC_API_URL: envPublicUrl, API_URL: envUrl, expo_extra_apiUrl: constantsUrl, global_API_URL: globalUrl }
);
// eslint-disable-next-line no-console
console.log('[ENV] Resolved API_URL =', ENV.API_URL);
// eslint-disable-next-line no-console
console.log(`[ENV][LOADED] API_URL=${ENV.API_URL}`);
if (!ENV.API_URL || !/^https?:\/\//i.test(ENV.API_URL)) {
  // eslint-disable-next-line no-console
  console.log('[ENV][WARNING] API_URL is empty or not an http(s) URL. Networking will fail on device.');
}
