// FILE: socialsocial/src/api/dashboard.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_API_BASE = 'http://10.0.0.2:3000'; // fallback ידידותי אם אין ENV

function getApiBaseUrl(): string {
  // באקספו 54 אפשר להשתמש ב-EXPO_PUBLIC_*
  const envBase =
    process.env.EXPO_PUBLIC_API_URL ||
    process.env.API_URL ||
    DEFAULT_API_BASE;

  // אנחנו רוצים תמיד לעבוד עם /v1
  if (envBase.endsWith('/v1')) {
    return envBase;
  }
  return `${envBase}/v1`;
}

export type DashboardSummary = any;

export interface DashboardSummaryResponse {
  ok: boolean;
  dashboard: DashboardSummary;
}

/**
 * שולף את ה-accessToken מה-AsyncStorage.
 * אם אין טוקן – זה מצב לא תקין לקריאה מוגנת.
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) {
      console.log('[dashboard][getAccessToken] no token in storage');
      return null;
    }
    return token;
  } catch (err) {
    console.log('[dashboard][getAccessToken] error reading token', err);
    return null;
  }
}

/**
 * קריאה קנונית ל-GET /v1/stats/dashboard עם Authorization header.
 */
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const baseUrl = getApiBaseUrl();
  const token = await getAccessToken();

  if (!token) {
    const err = new Error('NO_TOKEN');
    // מאפשר ל-hook להבחין בין בעיית טוקן לבין בעיית רשת
    (err as any).code = 'NO_TOKEN';
    throw err;
  }

  const url = `${baseUrl}/stats/dashboard`;

  console.log('[dashboard][request]', { url, hasToken: !!token });

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    console.log('[dashboard][parse] non-json response', text);
  }

  if (!res.ok) {
    console.log('[dashboard][error]', {
      status: res.status,
      body: json || text,
    });

    const err = new Error(
      json?.error?.message ||
        json?.message ||
        `Dashboard request failed with status ${res.status}`,
    );
    (err as any).code = json?.error?.code || json?.code || 'HTTP_ERROR';
    (err as any).status = res.status;
    throw err;
  }

  console.log('[dashboard][success]');

  // מבנה התשובה בבקאנד: { ok: true, dashboard: {...} }
  if (json && typeof json === 'object' && 'dashboard' in json) {
    return json.dashboard;
  }

  // fallback – אם מישהו שינה את התשובה בבקאנד
  return json;
}
