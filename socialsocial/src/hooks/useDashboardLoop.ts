// FILE: socialsocial/src/hooks/useDashboardLoop.ts

import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardSummary, DashboardSummary } from '../api/dashboard';

type Status = 'idle' | 'loading' | 'ready' | 'error';

export interface UseDashboardLoopResult {
  // API החדש
  status: Status;
  isLoading: boolean;
  summary: DashboardSummary | null;
  error: string | null;
  reload: () => Promise<void>;

  // שדות Legacy שהמסכים עדיין משתמשים בהם
  loadingSummary: boolean;
  loadingPractice: boolean;
  lastRewards: any;
  reloadSummary: () => Promise<void>;
  runDebugPractice: () => Promise<void>;
}

/**
 * הוק שאחראי לטעינת ה-dashboard summary מצד הפרונט.
 * משתמש ב-fetchDashboardSummary ששולח JWT ב-Authorization header.
 *
 * בנוסף, מחזיר שדות legacy כדי לא לשבור PracticeHubScreen / StatsScreen:
 * - loadingSummary
 * - loadingPractice
 * - lastRewards
 * - reloadSummary
 * - runDebugPractice
 */
export function useDashboardLoop(): UseDashboardLoopResult {
  const [status, setStatus] = useState<Status>('idle');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    console.log('[useDashboardLoop][loadSummary] start');

    setStatus('loading');
    setError(null);

    try {
      const data = await fetchDashboardSummary();
      setSummary(data);
      setStatus('ready');
      console.log('[useDashboardLoop][loadSummary] success');
    } catch (err: any) {
      const message =
        err?.code === 'NO_TOKEN'
          ? 'NO_TOKEN'
          : err?.message || 'UNKNOWN_ERROR';

      console.log('[useDashboardLoop][loadSummary] error', {
        message,
        raw: err,
      });

      setError(message);
      setStatus('error');
    }
  }, []);

  // טוען פעם אחת כשמונט
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // גזירה לשדות ה"ישנים"
  const loadingSummary = status === 'loading';
  const loadingPractice = false; // אין לנו לוגיקת practice פה – זה רק כדי לשמור תאימות
  const lastRewards = (summary as any)?.lastRewards ?? null;

  const reloadSummary = loadSummary;

  const runDebugPractice = async () => {
    // זה היה חלק ממצב debug ישן; משאירים כ-no-op כדי לא לשבור את המסך
    console.log('[useDashboardLoop][runDebugPractice] legacy no-op');
  };

  return {
    // מודל חדש
    status,
    isLoading: status === 'loading',
    summary,
    error,
    reload: loadSummary,

    // תאימות למסכים הקיימים
    loadingSummary,
    loadingPractice,
    lastRewards,
    reloadSummary,
    runDebugPractice,
  };
}
