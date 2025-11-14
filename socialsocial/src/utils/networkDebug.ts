import { Platform } from 'react-native';
import { ENV } from '../config/env';

// Basic network diagnostics on app startup
// eslint-disable-next-line no-console
console.log('[NETDBG] Platform =', Platform.OS);
// eslint-disable-next-line no-console
console.log('[NETDBG] ENV.API_URL =', ENV.API_URL);

async function tryFetch(url: string) {
  try {
    const res = await fetch(url, { method: 'GET' });
    const text = await res.text();
    // eslint-disable-next-line no-console
    console.log('[NETDBG] fetch', url, '->', res.status, text.slice(0, 120));
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.log('[NETDBG] fetch error', url, {
      message: e?.message,
      name: e?.name,
      code: e?.code,
      errno: e?.errno,
    });
  }
}

// Probe configured API health endpoint (if available)
if (ENV.API_URL) {
  const healthUrl = `${ENV.API_URL}/v1/health`;
  tryFetch(healthUrl);
}

// Optional probe of a known local IP health endpoint (if differs from ENV)
const fallbackIp = 'http://10.0.0.2:3000';
if (fallbackIp && fallbackIp !== ENV.API_URL) {
  tryFetch(`${fallbackIp}/v1/health`);
}


