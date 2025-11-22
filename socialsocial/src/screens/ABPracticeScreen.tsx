// socialsocial/src/screens/ABPracticeScreen.tsx

import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  PracticeStackParamList,
  PracticeSessionResponse,
} from '../navigation/types';

// ---------- Types specific to A/B mode ----------

type ABPracticeBody = {
  topic: string;
  optionA: string;
  optionB: string;
};

type ABMeta = {
  prompt: string | null;
  optionA: {
    text: string;
    score: number;
    details?: any;
  };
  optionB: {
    text: string;
    score: number;
    details?: any;
  };
  winner: 'A' | 'B';
};

type ABPracticeResponse = PracticeSessionResponse & {
  mode?: string;
  ab?: ABMeta;
};

type Props = NativeStackScreenProps<
  PracticeStackParamList,
  'ABPracticeSession'
>;

// ---------- Helpers ----------

async function readAccessToken(): Promise<string | null> {
  try {
    const direct = await AsyncStorage.getItem('accessToken');
    if (direct) return direct;
    const legacy = await AsyncStorage.getItem('token');
    return legacy;
  } catch (e) {
    console.log('[ABPracticeScreen] failed to read token', e);
    return null;
  }
}

/**
 * Local helper – calls POST /v1/practice/ab-session with bearer token.
 * We keep this local so we don’t have to modify ../api/practice.ts.
 */
async function createABPracticeSession(
  token: string,
  body: ABPracticeBody,
): Promise<ABPracticeResponse> {
  const baseUrl =
    process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

  const res = await fetch(`${baseUrl}/v1/practice/ab-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as any;

  if (!res.ok || data?.ok === false) {
    const msg =
      data?.error?.message ||
      data?.message ||
      `Request failed with status ${res.status} (${res.statusText})`;
    console.log('[UI][AB] error payload', data);
    throw new Error(msg);
  }

  return data as ABPracticeResponse;
}

// ---------- Screen ----------

export default function ABPracticeScreen({ navigation }: Props) {
  const [topic, setTopic] = useState('First message on dating app');
  const [optionA, setOptionA] = useState(
    'Okay, controversial question: pineapple on pizza – yes or absolutely yes?',
  );
  const [optionB, setOptionB] = useState(
    "Your profile gave me a very specific question: are you more 'sunset walk' or '3am deep talk'?",
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<ABPracticeResponse | null>(
    null,
  );

  const runABSession = async () => {
    try {
      setBusy(true);
      setError(null);

      const token = await readAccessToken();
      if (!token) {
        Alert.alert(
          'Not logged in',
          'No access token found. Please log in again.',
        );
        return;
      }

      const body: ABPracticeBody = {
        topic: topic.trim() || 'First message on dating app',
        optionA: optionA.trim(),
        optionB: optionB.trim(),
      };

      console.log('[UI][AB] sending body', body);
      const data = await createABPracticeSession(token, body);
      console.log('[UI][AB] response', data);

      setLastResponse(data);

      const winner = data.ab?.winner ?? 'A';
      const winnerText =
        winner === 'A' ? 'Option A won 🎯' : 'Option B won 🎯';

      Alert.alert(
        'A/B session complete',
        `${winnerText}\n\nScore: ${data.rewards.score}\nXP: ${data.rewards.xpGained}\nCoins: ${data.rewards.coinsGained}`,
      );
    } catch (e: any) {
      console.log('[UI][AB] error', e);
      const msg = e?.message || 'Failed to run A/B session.';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => navigation.goBack();

  const winnerLabel = (() => {
    if (!lastResponse?.ab) return null;
    const w = lastResponse.ab.winner;
    if (w === 'A') return 'Winner: Option A';
    if (w === 'B') return 'Winner: Option B';
    return 'Winner: –';
  })();

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={s.h1}>A/B Mission</Text>
      <Text style={s.sub}>
        This screen calls{' '}
        <Text style={s.code}>POST /v1/practice/ab-session</Text> and compares
        two openers. The backend updates XP, coins, gems, dashboard and returns
        which opener won.
      </Text>

      {error && <Text style={s.error}>{error}</Text>}

      <Text style={s.label}>Topic</Text>
      <TextInput
        style={s.input}
        value={topic}
        onChangeText={setTopic}
        placeholder="Topic (e.g. First message on dating app)"
      />

      <Text style={s.label}>Option A</Text>
      <TextInput
        style={[s.input, s.multi]}
        value={optionA}
        onChangeText={setOptionA}
        multiline
      />

      <Text style={s.label}>Option B</Text>
      <TextInput
        style={[s.input, s.multi]}
        value={optionB}
        onChangeText={setOptionB}
        multiline
      />

      <TouchableOpacity
        style={[s.btn, busy && s.btnDisabled]}
        disabled={busy}
        onPress={runABSession}
      >
        <Text style={s.btnText}>
          {busy ? 'Running…' : 'Run A/B Mission'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.secondaryBtn} onPress={goBack}>
        <Text style={s.secondaryBtnText}>Back to Hub</Text>
      </TouchableOpacity>

      {lastResponse && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Last A/B Result</Text>
          {winnerLabel && <Text style={s.cardLine}>{winnerLabel}</Text>}
          <Text style={s.cardLine}>
            Session score: {lastResponse.rewards.score}
          </Text>
          <Text style={s.cardLine}>
            XP gained: {lastResponse.rewards.xpGained}
          </Text>
          <Text style={s.cardLine}>
            Coins gained: {lastResponse.rewards.coinsGained}
          </Text>

          {lastResponse.ab && (
            <>
              <Text style={s.cardSubtitle}>Option A</Text>
              <Text style={s.cardLine}>
                {lastResponse.ab.optionA.text} (score {lastResponse.ab.optionA.score})
              </Text>

              <Text style={s.cardSubtitle}>Option B</Text>
              <Text style={s.cardLine}>
                {lastResponse.ab.optionB.text} (score {lastResponse.ab.optionB.score})
              </Text>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ---------- Styles ----------

const s = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#111',
  },
  h1: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
    color: '#fff',
  },
  sub: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 16,
  },
  code: {
    fontFamily: 'monospace',
    color: '#4ade80',
  },
  label: {
    marginTop: 8,
    marginBottom: 4,
    color: '#e5e5e5',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    backgroundColor: '#18181b',
  },
  multi: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  btn: {
    marginTop: 16,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  secondaryBtnText: {
    color: '#e5e7eb',
    fontWeight: '500',
  },
  error: {
    color: '#f87171',
    marginBottom: 8,
  },
  card: {
    marginTop: 18,
    backgroundColor: '#1f2933',
    borderRadius: 12,
    padding: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    color: '#fff',
  },
  cardSubtitle: {
    marginTop: 8,
    fontWeight: '600',
    color: '#bfdbfe',
  },
  cardLine: {
    fontSize: 14,
    color: '#e5e7eb',
    marginBottom: 2,
  },
});
