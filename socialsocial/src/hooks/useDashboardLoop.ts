import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  DashboardSummaryResponse,
  PracticeSessionRequest,
  PracticeSessionResponse,
  SessionRewards,
} from '../navigation/types';
import { fetchDashboardSummary } from '../api/dashboard';
import { createPracticeSession } from '../api/practice';

async function readAccessToken(): Promise<string | null> {
  try {
    const a = await AsyncStorage.getItem('accessToken');
    if (a) return a;
    const legacy = await AsyncStorage.getItem('token');
    return legacy;
  } catch (e) {
    console.log('[useDashboardLoop] failed to read token', e);
    return null;
  }
}

export function useDashboardLoop() {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [lastSession, setLastSession] = useState<PracticeSessionResponse | null>(null);
  const [lastRewards, setLastRewards] = useState<SessionRewards | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingPractice, setLoadingPractice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const token = await readAccessToken();
      if (!token) {
        setError('Not authenticated. Please log in.');
        setSummary(null);
        return;
      }
      const data = await fetchDashboardSummary(token);
      setSummary(data);
      setError(null);
    } catch (err: any) {
      const payload = err?.response?.data || err?.payload || String(err);
      console.log('[useDashboardLoop][loadSummary] error', payload);
      setError('Failed to load dashboard summary.');
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const runDebugPractice = useCallback(async () => {
    setLoadingPractice(true);
    try {
      const token = await readAccessToken();
      if (!token) {
        setError('Not authenticated. Please log in.');
        return;
      }
      const payload: PracticeSessionRequest = {
        topic: 'Loop debug run',
        messages: [
          { role: 'USER', content: 'Hey there!' },
          { role: 'AI', content: 'Hello! How can I help?' },
          { role: 'USER', content: 'Just testing the loop.' },
          { role: 'AI', content: 'Great, everything looks good!' },
        ],
      };
      const res = await createPracticeSession(token, payload);
      setLastSession(res);
      setLastRewards(res.rewards);
      setSummary(res.dashboard);
      setError(null);
    } catch (err: any) {
      const payload = err?.response?.data || err?.payload || String(err);
      console.log('[useDashboardLoop][runDebugPractice] error', payload);
      setError('Failed to run practice session.');
    } finally {
      setLoadingPractice(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return {
    summary,
    lastSession,
    lastRewards,
    loadingSummary,
    loadingPractice,
    error,
    reloadSummary: loadSummary,
    runDebugPractice,
  };
}
