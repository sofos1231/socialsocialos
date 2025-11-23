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
import { createABPracticeSession } from '../api/practice';

type Props = NativeStackScreenProps<PracticeStackParamList, 'ABPracticeSession'>;

type ABSessionResponse = PracticeSessionResponse & {
  mode?: string;
  ab?: {
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
};

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

export default function ABPracticeScreen({ navigation }: Props) {
  const [topic, setTopic] = useState('First message on dating app');
  const [optionA, setOptionA] = useState(
    'Okay, controversial question: pineapple on pizza – yes or absolutely yes?',
  );
  const [optionB, setOptionB] = useState(
    "Your profile gave me a very specific question: are you more 'sunset walk' or '3am deep talk'?",
  );
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<ABSessionResponse | null>(null);

  const runABSession = async () => {
    try {
      setLoading(true);

      const token = await readAccessToken();
      if (!token) {
        Alert.alert(
          'Not logged in',
          'No access token found. Please log in again before running an A/B mission.',
        );
        return;
      }

      const payload = {
        topic: topic.trim() || 'First message on dating app',
        optionA: optionA.trim(),
        optionB: optionB.trim(),
      };

      console.log('[UI][AB] sending payload', payload);

      const data = await createABPracticeSession(token, payload);
      console.log('[UI][AB] response', data);

      setLastResponse(data as ABSessionResponse);

      Alert.alert(
        'A/B mission complete',
        `Winner: ${
          data.ab?.winner === 'A' ? 'Option A' : data.ab?.winner === 'B' ? 'Option B' : 'N/A'
        }\nScore: ${data.rewards.score}\nXP: ${data.rewards.xpGained}\nCoins: ${
          data.rewards.coinsGained
        }`,
      );
    } catch (err: any) {
      const payload = err?.response?.data || String(err);
      console.log('[ABPracticeScreen][Error]', payload);
      Alert.alert('Error', 'Failed to run A/B mission');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => navigation.goBack();

  const rewards = lastResponse?.rewards;
  const ab = lastResponse?.ab;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>A/B Mission</Text>
      <Text style={styles.subtitle}>
        Test two different openers on the same topic. The backend scores both, gives you XP / coins,
        and tells you which one is stronger.
      </Text>

      <Text style={styles.label}>Topic</Text>
      <TextInput
        style={styles.input}
        value={topic}
        onChangeText={setTopic}
        placeholder="Topic (e.g. First message on dating app)"
        placeholderTextColor="#6b7280"
      />

      <Text style={styles.label}>Option A</Text>
      <TextInput
        style={styles.input}
        value={optionA}
        onChangeText={setOptionA}
        multiline
        placeholder="First opener"
        placeholderTextColor="#6b7280"
      />

      <Text style={styles.label}>Option B</Text>
      <TextInput
        style={styles.input}
        value={optionB}
        onChangeText={setOptionB}
        multiline
        placeholder="Second opener"
        placeholderTextColor="#6b7280"
      />

      <TouchableOpacity
        style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={runABSession}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Running…' : 'Run A/B Mission'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={goBack}
      >
        <Text style={styles.buttonText}>Back to Hub</Text>
      </TouchableOpacity>

      {rewards && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Last A/B Rewards</Text>
          <Text style={styles.value}>Score: {rewards.score}</Text>
          <Text style={styles.value}>Message Score: {rewards.messageScore}</Text>
          <Text style={styles.value}>XP gained: {rewards.xpGained}</Text>
          <Text style={styles.value}>Coins gained: {rewards.coinsGained}</Text>
          <Text style={styles.value}>Gems gained: {rewards.gemsGained}</Text>

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>Per-message</Text>
          {rewards.messages.map((m) => (
            <Text key={m.index} style={styles.messageRow}>
              #{m.index} – {m.rarity} – score {m.score} – XP {m.xp} – coins {m.coins}
            </Text>
          ))}
        </View>
      )}

      {ab && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>A/B Result</Text>
          {ab.prompt ? (
            <Text style={styles.value}>Prompt: {ab.prompt}</Text>
          ) : null}
          <Text style={styles.value}>
            Option A ({ab.optionA.score}): {ab.optionA.text}
          </Text>
          <Text style={styles.value}>
            Option B ({ab.optionB.score}): {ab.optionB.text}
          </Text>
          <Text style={[styles.value, styles.winnerText]}>
            Winner:{' '}
            {ab.winner === 'A'
              ? 'Option A'
              : ab.winner === 'B'
              ? 'Option B'
              : 'No clear winner'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#111827',
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
    color: '#f9fafb',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#e5e7eb',
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f9fafb',
    backgroundColor: '#111827',
    marginBottom: 4,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: '#22c55e',
  },
  secondaryButton: {
    backgroundColor: '#374151',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#f9fafb',
    fontWeight: '600',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#020617',
    padding: 16,
    borderRadius: 12,
    marginTop: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#f9fafb',
  },
  value: {
    fontSize: 14,
    color: '#e5e7eb',
    marginBottom: 4,
  },
  winnerText: {
    marginTop: 6,
    fontWeight: '700',
    color: '#fde68a',
  },
  separator: {
    height: 1,
    backgroundColor: '#1f2937',
    marginVertical: 10,
  },
  messageRow: {
    fontSize: 13,
    color: '#e5e7eb',
    marginBottom: 4,
  },
});
