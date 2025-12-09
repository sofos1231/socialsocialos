import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('auth_token');
  } catch {
    return null;
  }
}

async function request(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401) {
    // bubble a recognizable error
    const err: any = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }
  const json = await res.json();
  if (!res.ok) {
    const err: any = new Error(json?.message || 'Request failed');
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}

export const api = {
  getHub: () => request('/practice/hub'),
  listMissions: (category?: string) => request(`/practice/missions${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  // DEPRECATED / NOT IMPLEMENTED: Backend routes do not exist. Use /practice/session instead.
  // start: (body: { missionId?: string; mode: 'standard'|'quick'|'shadow' }) => request('/practice/start', { method: 'POST', body: JSON.stringify(body) }),
  // submit: (sessionId: string, turn: any) => request(`/practice/submit/${sessionId}`, { method: 'POST', body: JSON.stringify(turn) }),
  // complete: (sessionId: string) => request(`/practice/complete/${sessionId}`, { method: 'POST' }),
  // abort: (sessionId: string) => request(`/practice/abort/${sessionId}`, { method: 'POST' }),
};


