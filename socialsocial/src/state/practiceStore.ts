import { useCallback, useRef, useState } from 'react';
import { api } from '../lib/api';
// NOTE: api.start, api.submit, api.complete, api.abort are deprecated (backend routes don't exist)

type HubPayload = any;

export function usePracticeStore() {
  const [hub, setHub] = useState<HubPayload | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const cacheAtRef = useRef<number>(0);

  const fetchHub = useCallback(async () => {
    const now = Date.now();
    if (hub && now - cacheAtRef.current < 60_000) return hub;
    try {
      const data = await api.getHub();
      setHub(data);
      if (data?.activeSession?.id) setActiveSessionId(data.activeSession.id);
      cacheAtRef.current = now;
      return data;
    } catch (e: any) {
      if (e?.status === 401) {
        // TODO: dispatch logout
      }
      throw e;
    }
  }, [hub]);

  // DEPRECATED: These methods call non-existent backend routes.
  // Session creation happens via /practice/session (called directly from PracticeScreen).
  // If needed in future, implement backend routes first.
  // const startMission = useCallback(async (missionId: string) => {
  //   const s = await api.start({ missionId, mode: 'standard' });
  //   setActiveSessionId(s.id);
  //   return s;
  // }, []);

  // const startQuickDrill = useCallback(async () => {
  //   const s = await api.start({ mode: 'quick' });
  //   setActiveSessionId(s.id);
  //   return s;
  // }, []);

  // const startShadow = useCallback(async () => {
  //   const s = await api.start({ mode: 'shadow' });
  //   setActiveSessionId(s.id);
  //   return s;
  // }, []);

  // const submit = useCallback(async (payload: any) => {
  //   if (!activeSessionId) throw new Error('no active session');
  //   return api.submit(activeSessionId, payload);
  // }, [activeSessionId]);

  // const complete = useCallback(async () => {
  //   if (!activeSessionId) throw new Error('no active session');
  //   const res = await api.complete(activeSessionId);
  //   setActiveSessionId(null);
  //   cacheAtRef.current = 0; // invalidate hub cache
  //   return res;
  // }, [activeSessionId]);

  // const abort = useCallback(async () => {
  //   if (!activeSessionId) return;
  //   await api.abort(activeSessionId);
  //   setActiveSessionId(null);
  // }, [activeSessionId]);

  return {
    hub,
    activeSessionId,
    fetchHub,
    // startMission,
    // startQuickDrill,
    // startShadow,
    // submit,
    // complete,
    // abort,
  } as const;
}


