// NOTE: This file currently uses Option A (rarity/xp-based) scoring/rewards. It will be migrated to Option B AiCore metrics later.

// socialsocial/src/screens/PracticeScreen.tsx

import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PracticeStackParamList, PracticeSessionRequest, PracticeSessionResponse } from '../navigation/types';
import { createPracticeSession } from '../api/practice';

type Props = NativeStackScreenProps<PracticeStackParamList, 'PracticeSession'>;

export default function PracticeScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<PracticeSessionResponse | null>(null);

  const runPractice = async () => {
    try {
      setLoading(true);

      // 🔑 Try to read token (support both possible keys just in case)
      const storedAccessToken =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (!storedAccessToken) {
        Alert.alert(
          'Not logged in',
          'No access token found. Please log in again before running a practice session.',
        );
        setLoading(false);
        return;
      }

      const body: PracticeSessionRequest = {
        topic: 'First real practice',
        messages: [
          { role: 'USER', content: 'Hey :)' },
          { role: 'AI', content: 'Hi!' },
          { role: 'USER', content: 'How are you?' },
          { role: 'AI', content: 'Great!' },
        ],
      };

      console.log('[UI][PRACTICE] sending body', body);

      const res = await createPracticeSession(storedAccessToken, body);

      console.log('[UI][PRACTICE] response', res);
      setLastResponse(res);

      Alert.alert(
        'Practice session complete',
        `Score: ${res.rewards.score}\nXP: ${res.rewards.xpGained}\nCoins: ${res.rewards.coinsGained}`,
      );
    } catch (err: any) {
      const payload = err?.response?.data || String(err);
      console.log('[Practice Error]', payload);
      Alert.alert('Error', 'Failed to run practice session');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => navigation.goBack();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Real Practice Session</Text>
      <Text style={styles.subtitle}>
        This screen calls POST <Text style={styles.mono}>/v1/practice/session</Text> with your real user,
        updates XP / coins / stats in the DB, and returns an updated dashboard snapshot.
      </Text>

      <TouchableOpacity
        style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
        onPress={runPractice}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Running…' : 'Run Practice Session'}
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
          <Text style={styles.sectionTitle}>Last Practice Rewards</Text>
          <Text>Score: {lastResponse.rewards.score}</Text>
          <Text>Message Score: {lastResponse.rewards.messageScore}</Text>
          <Text>XP gained: {lastResponse.rewards.xpGained}</Text>
          <Text>Coins gained: {lastResponse.rewards.coinsGained}</Text>
          <Text>Gems gained: {lastResponse.rewards.gemsGained}</Text>

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>Per-message</Text>
          {lastResponse.rewards.messages.map((m) => (
            <Text key={m.index} style={styles.messageRow}>
              #{m.index} – {m.rarity} – score {m.score} – XP {m.xp} – coins {m.coins}
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
