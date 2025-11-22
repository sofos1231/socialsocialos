// socialsocial/src/screens/VoicePracticeScreen.tsx
//
// Voice practice test screen:
// - Lets you type a "transcript" (simulating speech-to-text)
// - Calls POST /v1/practice/voice-session
// - Shows rewards + per-message breakdown

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

type Props = NativeStackScreenProps<
  PracticeStackParamList,
  'VoicePracticeSession'
>;

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function readAccessToken(): Promise<string | null> {
  try {
    const a = await AsyncStorage.getItem('accessToken');
    if (a) return a;
    const legacy = await AsyncStorage.getItem('token');
    return legacy;
  } catch (e) {
    console.log('[VoicePracticeScreen] failed to read token', e);
    return null;
  }
}

export default function VoicePracticeScreen({ navigation }: Props) {
  const [topic, setTopic] = useState('First date opener – voice');
  const [transcript, setTranscript] = useState(
    'So, I have a fun question: if we could teleport anywhere for coffee right now, where would we go?',
  );
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] =
    useState<PracticeSessionResponse | null>(null);

  const runVoiceSession = async () => {
    try {
      setLoading(true);

      const token = await readAccessToken();
      if (!token) {
        Alert.alert(
          'Not logged in',
          'No access token found. Please log in again before running a voice session.',
        );
        return;
      }

      const body = {
        topic: topic.trim(),
        transcript: transcript.trim(),
      };

      console.log('[UI][VOICE] sending body', body);

      const res = await fetch(`${API_BASE_URL}/v1/practice/voice-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data: PracticeSessionResponse & any = await res.json();

      if (!res.ok || !data?.ok) {
        const msg =
          data?.error?.message ||
          `Request failed with status ${res.status} (${res.statusText})`;
        console.log('[UI][VOICE] error payload', data);
        throw new Error(msg);
      }

      console.log('[UI][VOICE] response', data);
      setLastResponse(data);

      Alert.alert(
        'Voice session complete',
        `Score: ${data.rewards.score}\nXP: ${data.rewards.xpGained}\nCoins: ${data.rewards.coinsGained}`,
      );
    } catch (err: any) {
      console.log('[VoicePractice Error]', err?.message ?? err);
      Alert.alert('Error', 'Failed to run voice practice session');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => navigation.goBack();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Voice Practice Session</Text>
      <Text style={styles.subtitle}>
        This screen simulates a speech-to-text flow. It sends your "transcript" to
        <Text style={styles.mono}> /v1/practice/voice-session</Text> and shows the
        rewards and updated stats.
      </Text>

      <Text style={styles.label}>Topic</Text>
      <TextInput
        style={styles.input}
        value={topic}
        onChangeText={setTopic}
        placeholder="Topic (e.g. first date opener – voice)"
        placeholderTextColor="#666"
      />

      <Text style={styles.label}>Transcript</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={transcript}
        onChangeText={setTranscript}
        placeholder="What you said out loud…"
        placeholderTextColor="#666"
        multiline
      />

      <TouchableOpacity
        style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={runVoiceSession}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Running…' : 'Run Voice Session'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={goBack}
      >
        <Text style={styles.buttonText}>Back to Hub</Text>
      </TouchableOpacity>

      {lastResponse && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Session Rewards</Text>
          <Text style={styles.value}>Score: {lastResponse.rewards.score}</Text>
          <Text style={styles.value}>
            Message Score: {lastResponse.rewards.messageScore}
          </Text>
          <Text style={styles.value}>
            XP gained: {lastResponse.rewards.xpGained}
          </Text>
          <Text style={styles.value}>
            Coins gained: {lastResponse.rewards.coinsGained}
          </Text>
          <Text style={styles.value}>
            Gems gained: {lastResponse.rewards.gemsGained}
          </Text>

          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Per-message</Text>
          {lastResponse.rewards.messages.map((m) => (
            <Text key={m.index} style={styles.messageRow}>
              #{m.index} – {m.rarity} – score {m.score} – XP {m.xp} – coins{' '}
              {m.coins}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 48,
    backgroundColor: '#111',
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#181818',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  textarea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#1DB954',
  },
  secondaryButton: {
    backgroundColor: '#333',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1f1f1f',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#fff',
  },
  value: {
    fontSize: 14,
    color: '#eee',
    marginBottom: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 8,
  },
  messageRow: {
    fontSize: 13,
    color: '#eee',
    marginBottom: 4,
  },
  mono: {
    fontFamily: 'monospace',
    color: '#0af',
  },
});
