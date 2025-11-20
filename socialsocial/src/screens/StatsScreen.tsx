// socialsocial/src/screens/StatsScreen.tsx

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '../api/client';
import { DashboardSummaryResponse } from '../navigation/types';

export default function StatsScreen() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<DashboardSummaryResponse>('/dashboard/summary');
      console.log('[UI][STATS] summary', res.data);
      setSummary(res.data);
    } catch (err: any) {
      const payload = err?.response?.data || String(err);
      console.log('[Stats Error]', payload);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Stats</Text>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      )}

      {summary && !loading && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Overall</Text>
          <Text style={styles.value}>Sessions: {summary.stats.sessionsCount}</Text>
          <Text style={styles.value}>
            Avg Score: {summary.stats.averageScore}
          </Text>
          <Text style={styles.value}>
            Avg Message Score: {summary.stats.averageMessageScore}
          </Text>
          <Text style={styles.value}>Streak: {summary.streak.current} days</Text>
          <Text style={styles.value}>XP: {summary.wallet.xp}</Text>
          <Text style={styles.value}>Lifetime XP: {summary.wallet.lifetimeXp}</Text>
        </View>
      )}

      {!summary && !loading && (
        <Text style={styles.emptyText}>
          No stats yet. Complete a practice session to generate data.
        </Text>
      )}
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
  emptyText: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 8,
  },
});
