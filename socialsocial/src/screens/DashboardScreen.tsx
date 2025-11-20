// socialsocial/src/screens/DashboardScreen.tsx

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { api } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

interface DashboardSnapshot {
  ok: boolean;
  user: {
    id: string;
    email: string;
    createdAt: string;
  };
  streak: {
    current: number;
  };
  wallet: {
    xp: number;
    level: number;
    coins: number;
    gems: number;
    lifetimeXp: number;
  };
  stats: {
    sessionsCount: number;
    successCount: number;
    failCount: number;
    averageScore: number;
    averageMessageScore: number;
    lastSessionAt: string | null;
  };
}

export default function DashboardScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DashboardSnapshot | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);

      // Make sure we actually have a token before calling the backend
      const storedAccessToken =
        (await AsyncStorage.getItem('accessToken')) ||
        (await AsyncStorage.getItem('token'));

      if (!storedAccessToken) {
        Alert.alert('Not logged in', 'Please log in again to view your dashboard.');
        setSummary(null);
        return;
      }

      const res = await api.get<DashboardSnapshot>('/dashboard/summary');
      console.log('[UI][DASHBOARD] summary', res.data);
      setSummary(res.data);
    } catch (err: any) {
      const payload = err?.response?.data || String(err);
      console.log('[Dashboard Error]', payload);
      Alert.alert('Error', 'Failed to load dashboard summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading summary…</Text>
        </View>
      )}

      {summary && !loading && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>User</Text>
          <Text style={styles.value}>Email: {summary.user.email}</Text>
          <Text style={styles.value}>
            Streak: {summary.streak.current} day
            {summary.streak.current === 1 ? '' : 's'}
          </Text>

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>Wallet</Text>
          <Text style={styles.value}>XP: {summary.wallet.xp}</Text>
          <Text style={styles.value}>Level: {summary.wallet.level}</Text>
          <Text style={styles.value}>Coins: {summary.wallet.coins}</Text>
          <Text style={styles.value}>Gems: {summary.wallet.gems}</Text>

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>Practice Stats</Text>
          <Text style={styles.value}>Sessions: {summary.stats.sessionsCount}</Text>
          <Text style={styles.value}>Average Score: {summary.stats.averageScore}</Text>
          <Text style={styles.value}>
            Avg Message Score: {summary.stats.averageMessageScore}
          </Text>
        </View>
      )}

      {!summary && !loading && (
        <Text style={styles.emptyText}>
          No dashboard data yet. Run a practice session to generate stats.
        </Text>
      )}

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={() => navigation.navigate('Practice')}
      >
        <Text style={styles.buttonText}>Go to Practice</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.secondaryButton, loading && styles.buttonDisabled]}
        onPress={fetchSummary}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Refresh Summary</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#111',
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    color: '#fff',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: '#ccc',
  },
  card: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    marginVertical: 10,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 16,
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
    fontSize: 16,
  },
});
