// socialsocial/src/screens/StatsScreen.tsx

import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useDashboardLoop } from '../hooks/useDashboardLoop';

export default function StatsScreen() {
  const {
    summary,
    loadingSummary,
    error,
    reloadSummary,
  } = useDashboardLoop();

  const stats = summary?.stats;
  const latest = stats?.latest;
  const insights = stats?.insights?.latest as
    | {
        charismaIndex: number;
        strongestTraits?: { trait: string; score: number }[];
        weakestTraits?: { trait: string; score: number }[];
        flagsSample?: string[];
      }
    | undefined;

  const recentSessions = Array.isArray(stats?.recentSessions)
    ? (stats!.recentSessions as any[])
    : [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Stats</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {loadingSummary && (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading stats…</Text>
        </View>
      )}

      {/* High-level practice stats */}
      {stats && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Practice Overview</Text>
          <Text style={styles.value}>
            Sessions: {stats.sessionsCount} (success {stats.successCount} / fail{' '}
            {stats.failCount})
          </Text>
          <Text style={styles.value}>
            Average Score: {Math.round(stats.averageScore)}
          </Text>
          <Text style={styles.value}>
            Avg Message Score: {Math.round(stats.averageMessageScore)}
          </Text>
          <Text style={styles.value}>
            Last Session: {stats.lastSessionAt || '—'}
          </Text>

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>Social Score</Text>
          <Text style={[styles.value, styles.subtitleStrong]}>
            {stats.socialScore ?? '—'}{' '}
            {stats.socialTier ? `(${stats.socialTier})` : ''}
          </Text>
        </View>
      )}

      {/* Latest charisma metrics */}
      {latest && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Latest Session – Charisma</Text>
          <Text style={styles.value}>
            Charisma Index: {latest.charismaIndex ?? '—'}
          </Text>
          <Text style={styles.value}>
            Confidence: {latest.confidenceScore ?? '—'}
          </Text>
          <Text style={styles.value}>
            Clarity: {latest.clarityScore ?? '—'}
          </Text>
          <Text style={styles.value}>
            Humor: {latest.humorScore ?? '—'}
          </Text>
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

      {/* AI insights – narrative */}
      {insights && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>AI Insights</Text>

          {Array.isArray(insights.strongestTraits) &&
            insights.strongestTraits.length > 0 && (
              <>
                <Text style={[styles.value, styles.subtitleStrong]}>
                  Strongest traits
                </Text>
                {insights.strongestTraits.map((t) => (
                  <Text key={`strong-${t.trait}`} style={styles.value}>
                    • {t.trait}: {t.score}
                  </Text>
                ))}
              </>
            )}

          {Array.isArray(insights.weakestTraits) &&
            insights.weakestTraits.length > 0 && (
              <>
                <Text style={[styles.value, styles.subtitleWeak]}>
                  Traits to improve
                </Text>
                {insights.weakestTraits.map((t) => (
                  <Text key={`weak-${t.trait}`} style={styles.value}>
                    • {t.trait}: {t.score}
                  </Text>
                ))}
              </>
            )}

          {Array.isArray(insights.flagsSample) &&
            insights.flagsSample.length > 0 && (
              <>
                <Text style={[styles.value, styles.subtitleNeutral]}>
                  Notable moments
                </Text>
                {insights.flagsSample.map((f, idx) => (
                  <Text key={`flag-${idx}`} style={styles.value}>
                    • {f}
                  </Text>
                ))}
              </>
            )}
        </View>
      )}

      {/* Recent sessions list */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        {recentSessions.length === 0 && (
          <Text style={styles.emptyText}>No sessions yet.</Text>
        )}

        {recentSessions.map((s: any) => (
          <View key={s.id} style={styles.sessionRow}>
            <View style={styles.sessionLeft}>
              <Text style={styles.value}>
                {s.createdAt ? String(s.createdAt) : '—'}
              </Text>
              <Text style={styles.valueSmall}>
                Topic: {s.topic || '—'}
              </Text>
            </View>
            <View style={styles.sessionRight}>
              <Text style={styles.valueSmall}>Score: {s.score}</Text>
              {s.charismaIndex != null && (
                <Text style={styles.valueSmall}>
                  Charisma: {s.charismaIndex}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Manual refresh */}
      <View style={styles.footerRow}>
        <Text style={styles.footerLabel}>Pull fresh stats:</Text>
        <Text style={styles.footerLink} onPress={reloadSummary}>
          Refresh
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    color: '#fff',
  },
  errorText: {
    color: '#f87171',
    marginBottom: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: '#e5e7eb',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 8,
  },
  value: {
    fontSize: 14,
    color: '#eee',
    marginBottom: 2,
  },
  valueSmall: {
    fontSize: 12,
    color: '#d1d5db',
  },
  subtitleStrong: {
    marginTop: 6,
    fontWeight: '600',
    color: '#bbf7d0',
  },
  subtitleWeak: {
    marginTop: 6,
    fontWeight: '600',
    color: '#fecaca',
  },
  subtitleNeutral: {
    marginTop: 6,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  separator: {
    height: 1,
    backgroundColor: '#1f2937',
    marginVertical: 8,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2937',
  },
  sessionLeft: {
    flex: 1,
    paddingRight: 6,
  },
  sessionRight: {
    alignItems: 'flex-end',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  footerLabel: {
    color: '#9ca3af',
    marginRight: 4,
  },
  footerLink: {
    color: '#22c55e',
    fontWeight: '600',
  },
});
