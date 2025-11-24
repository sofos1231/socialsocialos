// FILE: socialsocial/src/api/dashboardService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken } from './apiClient';

export interface DashboardSummaryResponse {
  ok: boolean;
  // נשאיר גמיש כדי להתאים למה שהבקאנד מחזיר בפועל
  dashboard: any;
}

/**
 * מוודא שה-Authorization header מוגדר לפי accessToken.
 * אם התקבל accessToken כפרמטר – נשתמש בו.
 * אחרת ננסה לשלוף מה-AsyncStorage (מפתח 'accessToken').
 */
async function ensureAuthToken(accessToken?: string | null) {
  try {
    let token = accessToken ?? null;

    if (!token) {
      token = await AsyncStorage.getItem('accessToken');
    }

    if (token) {
      setAuthToken(token);
    } else {
      // עדיין נרשום לוג כדי שתוכל להבין אם אין טוקן בכלל
      // eslint-disable-next-line no-console
      console.log('[dashboardService] no accessToken available');
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('[dashboardService] error while ensuring token', err);
  }
}

/**
 * פנייה קנונית לדשבורד.
 * הבקאנד אמור להחזיר:
 * { ok: true, dashboard: {...} }
 *
 * הנתיב מניח שיש לך בבקאנד:
 * GET /v1/stats/dashboard
 *
 * אפשר לקרוא עם או בלי accessToken:
 * - getDashboardSummary()                → ישלוף טוקן מה-AsyncStorage
 * - getDashboardSummary(accessToken)     → ישתמש בטוקן שהועבר
 */
export const getDashboardSummary = async (
  accessToken?: string,
): Promise<DashboardSummaryResponse> => {
  await ensureAuthToken(accessToken);

  const response = await api.get<DashboardSummaryResponse>('/v1/stats/dashboard');
  return response.data;
};

/**
 * פונקציה ייעודית לקומפוננטות "מיני" (כמו DashboardMiniStatsCard).
 * שומרת חתימה אחורה:
 * - getMiniStats()
 * - getMiniStats(accessToken)
 */
export const getMiniStats = async (accessToken?: string): Promise<any> => {
  const { dashboard } = await getDashboardSummary(accessToken);
  return dashboard;
};
