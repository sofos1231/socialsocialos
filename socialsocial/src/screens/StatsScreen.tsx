import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchDashboardSummary } from '../api/dashboard';
import type { DashboardSummaryResponse } from '../navigation/types';

async function readAccessToken(): Promise<string | null> {
  try {
    const a = await AsyncStorage.getItem('accessToken');
    if (a) return a;
    const legacy = await AsyncStorage.getItem('token');
    return legacy;
  } catch (e) {
    console.log('[StatsScreen] failed to read token', e);
    return null;
  }
}

export default function StatsScreen() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await readAccessToken();
      if (!token) {
        setError('Not authenticated. Please log in.');
        setSummary(null);
        return;
      }

      const data = await fetchDashboardSummary(token);
      console.log('[UI][STATS] summary', data);
      setSummary(data);
    } catch (err: any) {
      const payload = err?.response?.data || String(err);
      console.log('[Stats Error]', payload);
      setError('Failed to load stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const stats = summary?.stats;
  const latest = stats?.latest;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Stats</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      )}

      {summary && stats && !loading && !error && (
        <>
          {/* Overall & social score */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Overall</Text>
            <Text style={styles.value}>
              Sessions: {stats.sessionsCount} (success {stats.successCount} / fail{' '}
              {stats.failCount})
            </Text>
            <Text style={styles.value}>
              Avg Score: {Math.round(stats.averageScore)}
            </Text>
            <Text style={styles.value}>
              Avg Message Score: {Math.round(stats.averageMessageScore)}
            </Text>
            <Text style={styles.value}>
              Streak: {summary.streak.current} days
            </Text>
            <Text style={styles.value}>XP: {summary.wallet.xp}</Text>
            <Text style={styles.value}>
              Lifetime XP: {summary.wallet.lifetimeXp}
            </Text>

            <View style={styles.separator} />

            <Text style={styles.sectionTitle}>Social Score</Text>
            <Text style={styles.value}>
              Social Score:{' '}
              {stats.socialScore != null ? Math.round(stats.socialScore) : '—'}
            </Text>
            <Text style={styles.value}>
              Tier: {stats.socialTier ?? '—'}
            </Text>
          </View>

          {/* AiCore snapshot */}
          {latest && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Latest Charisma Snapshot</Text>
              <Text style={styles.value}>
                Charisma Index:{' '}
                {latest.charismaIndex != null ? latest.charismaIndex : '—'}{' '}
                {latest.aiCoreVersion ? `(v${latest.aiCoreVersion})` : ''}
              </Text>
              <Text style={styles.value}>
                Confidence: {latest.confidenceScore ?? '—'}
              </Text>
              <Text style={styles.value}>
                Clarity: {latest.clarityScore ?? '—'}
              </Text>
              <Text style={styles.value}>Humor: {latest.humorScore ?? '—'}</Text>
              <Text style={styles.value}>
                Tension: {latest.tensionScore ?? '—'}
              </Text>
              <Text style={styles.value}>
                Warmth: {latest.emotionalWarmth ?? '—'}
              </Text>
              <Text style={styles.value}>
                Dominance: {latest.dominanceScore ?? '—'}
              </Text>
              <Text style={styles.value}>
                Messages: {latest.totalMessages ?? '—'} | Words:{' '}
                {latest.totalWords ?? '—'}
              </Text>
              <Text style={styles.value}>
                Filler words: {latest.fillerWordsCount ?? '—'}
              </Text>
            </View>
          )}

          {/* Recent sessions */}
          {Array.isArray(stats.recentSessions) &&
            stats.recentSessions.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Recent Sessions</Text>
                {stats.recentSessions.map((s, idx) => (
                  <Text key={`${s.createdAt}-${idx}`} style={styles.value}>
                    • {new Date(s.createdAt).toLocaleString()} – score {s.score ?? '—'}
                    , charisma {s.charismaIndex ?? '—'}
                  </Text>
                ))}
              </View>
            )}
        </>
      )}

      {!summary && !loading && !error && (
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
  errorText: {
    color: '#f87171',
    marginBottom: 10,
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
    marginTop: 8,
  },
});
