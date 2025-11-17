import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

export default function DashboardScreen({ navigation }: any) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // local mocked grades
  const [mockScores, setMockScores] = useState<number[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/sessions/dashboard/summary');
      setSummary(res.data);
    } catch (e: any) {
      Alert.alert('Load Error', e?.message ?? 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, []);

  const createMock = async () => {
    try {
      setLoading(true);

      // 1) Generate randomized mock grade
      const randomScore = Math.floor(Math.random() * 100) + 1;

      // 2) Create mock session in backend
      await api.post('/sessions/mock');

      // 3) Reload dashboard summary
      await load();

      // 4) Add this score to state
      setMockScores(prev => [...prev, randomScore]);
    } catch (e: any) {
      Alert.alert('Create Session Error', e?.message ?? 'Failed to create mock session');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('accessToken');
    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
  };

  useEffect(() => {
    load();
  }, [load]);

  // 🔹 Derived stats
  const practicesCount = mockScores.length;
  const averageScore =
    practicesCount === 0
      ? 0
      : Math.round(mockScores.reduce((sum, score) => sum + score, 0) / practicesCount);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      <TouchableOpacity style={styles.button} onPress={createMock} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Working…' : 'Create Mock Session'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.logout]}
        onPress={logout}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Summary</Text>

        <Text style={styles.cardText}>
          {summary ? JSON.stringify(summary, null, 2) : '{}'}
        </Text>

        {/* 🔹 Two side-by-side statistic boxes */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statTitle}>Practices</Text>
            <Text style={styles.statValue}>{practicesCount}</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statTitle}>Average</Text>
            <Text style={styles.statValue}>{averageScore}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0E1118',
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '100%',
    marginTop: 12,
  },
  logout: { backgroundColor: '#ef4444' },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: '600' },

  card: {
    marginTop: 20,
    width: '100%',
    backgroundColor: '#1a1f2a',
    borderRadius: 8,
    padding: 12,
  },
  cardTitle: {
    color: 'white',
    fontWeight: '700',
    marginBottom: 8,
  },
  cardText: {
    color: '#cbd5e1',
    fontFamily: 'Courier' as any,
    fontSize: 12,
  },

  // ========== NEW STATS STYLES ==========
  statsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#232b3b',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statTitle: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 4,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
});
