// src/app/components/DashboardMiniStatsCard.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { getMiniStats } from '../../api/dashboardService';

type Props = { accessToken: string };

export default function DashboardMiniStatsCard({ accessToken }: Props) {
  const [loading, setLoading] = useState(true);
  const [sessionsCount, setSessionsCount] = useState<number>(0);
  const [averageScore, setAverageScore] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stats = await getMiniStats(accessToken);
        if (mounted) {
          setSessionsCount(stats.sessionsCount);
          setAverageScore(stats.averageScore);
        }
      } catch (e) {
        console.warn('Error fetching mini stats:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [accessToken]);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator />
        <Text style={styles.sub}>Loading stats…</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your Practice Stats</Text>
      <View style={styles.row}>
        <View style={styles.block}>
          <Text style={styles.value}>{sessionsCount}</Text>
          <Text style={styles.label}>Sessions</Text>
        </View>
        <View style={styles.block}>
          <Text style={styles.value}>{averageScore.toFixed(2)}</Text>
          <Text style={styles.label}>Avg. Score</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, backgroundColor: '#111315' },
  title: { color: '#fff', fontWeight: '600', fontSize: 16, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 16 },
  block: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a1d21' },
  value: { color: '#fff', fontSize: 24, fontWeight: '700' },
  label: { color: '#9aa4ad', marginTop: 4, fontSize: 12 },
  sub: { color: '#9aa4ad', marginTop: 8 },
});
