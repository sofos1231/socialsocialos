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

  const stats = summary?.stats;
  const averages = stats?.averages;
  const latest = stats?.latest;
  const insights = stats?.insights;
  const recentSessions = stats?.recentSessions ?? [];

  // Latest insight is loosely typed as `any` on purpose
  const latestInsight: any | null = insights?.latest ?? null;

  const strongestTraits: { trait: string; score: number }[] = Array.isArray(
    latestInsight?.strongestTraits,
  )
    ? latestInsight.strongestTraits
    : [];

  const weakestTraits: { trait: string; score: number }[] = Array.isArray(
    latestInsight?.weakestTraits,
  )
    ? latestInsight.weakestTraits
    : [];

  const improvingTraits: string[] = insights?.trends?.improvingTraits ?? [];
  const decliningTraits: string[] = insights?.trends?.decliningTraits ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Stats</Text>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      )}

      {summary && !loading && stats && (
        <>
          {/* High-level overview */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.value}>Sessions: {stats.sessionsCount}</Text>
            <Text style={styles.value}>Success: {stats.successCount}</Text>
            <Text style={styles.value}>Fail: {stats.failCount}</Text>
            <Text style={styles.value}>
              Avg Score: {stats.averageScore.toFixed(1)}
            </Text>
            <Text style={styles.value}>
              Avg Message Score: {stats.averageMessageScore.toFixed(2)}
            </Text>
            <Text style={styles.value}>Streak: {summary.streak.current} days</Text>
            <Text style={styles.value}>XP: {summary.wallet.xp}</Text>
            <Text style={styles.value}>
              Lifetime XP: {summary.wallet.lifetimeXp}
            </Text>
            <Text style={styles.value}>
              Last Session:{' '}
              {stats.lastSessionAt ? stats.lastSessionAt : '—'}
            </Text>
          </View>

          {/* Social Score + Tier */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Social Score</Text>
            {stats.socialScore == null ? (
              <Text style={styles.value}>
                Do your first AI practice session to unlock your Social Score.
              </Text>
            ) : (
              <>
                <View style={styles.socialRow}>
                  <Text style={styles.socialScoreValue}>{stats.socialScore}</Text>
                  {stats.socialTier && (
                    <View style={styles.socialTierBadge}>
                      <Text style={styles.socialTierText}>{stats.socialTier}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.hint}>
                  Based on your recent AI-evaluated practice sessions.
                </Text>
              </>
            )}
          </View>

          {/* Recent Social Scores */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Recent Social Scores</Text>
            {recentSessions.length === 0 ? (
              <Text style={styles.value}>No recent sessions yet.</Text>
            ) : (
              recentSessions.map((s, idx) => (
                <View key={`${s.createdAt}-${idx}`} style={styles.rowBetween}>
                  <Text style={styles.valueSmall}>
                    {s.createdAt.slice(0, 10)}
                  </Text>
                  <Text style={styles.valueSmall}>
                    Score: {s.charismaIndex ?? s.score ?? '—'}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Trait Averages */}
          {averages && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Trait Averages</Text>
              <Text style={styles.valueSmall}>
                Charisma Index: {averages.avgCharismaIndex ?? '—'}
              </Text>
              <Text style={styles.valueSmall}>
                Confidence: {averages.avgConfidence ?? '—'}
              </Text>
              <Text style={styles.valueSmall}>
                Clarity: {averages.avgClarity ?? '—'}
              </Text>
              <Text style={styles.valueSmall}>
                Humor: {averages.avgHumor ?? '—'}
              </Text>
              <Text style={styles.valueSmall}>
                Tension Control: {averages.avgTension ?? '—'}
              </Text>
              <Text style={styles.valueSmall}>
                Warmth: {averages.avgWarmth ?? '—'}
              </Text>
              <Text style={styles.valueSmall}>
                Dominance: {averages.avgDominance ?? '—'}
              </Text>
              <Text style={styles.valueSmall}>
                Filler Words: {averages.avgFillerWords ?? '—'}
              </Text>
              <Text style={styles.valueSmall}>
                Messages / Session: {averages.avgTotalMessages ?? '—'}
              </Text>
              <Text style={styles.valueSmall}>
                Words / Session: {averages.avgTotalWords ?? '—'}
              </Text>
            </View>
          )}

          {/* Insights – strongest / weakest traits */}
          {(strongestTraits.length > 0 || weakestTraits.length > 0) && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Traits Insight</Text>

              {strongestTraits.length > 0 && (
                <>
                  <Text style={styles.subTitle}>Strongest traits</Text>
                  {strongestTraits.map((t, idx) => (
                    <Text key={`strong-${idx}`} style={styles.valueSmall}>
                      • {t.trait} – {t.score}
                    </Text>
                  ))}
                </>
              )}

              {weakestTraits.length > 0 && (
                <>
                  <Text style={[styles.subTitle, { marginTop: 8 }]}>
                    Weakest traits
                  </Text>
                  {weakestTraits.map((t, idx) => (
                    <Text key={`weak-${idx}`} style={styles.valueSmall}>
                      • {t.trait} – {t.score}
                    </Text>
                  ))}
                </>
              )}
            </View>
          )}

          {/* Trends – improving / declining */}
          {(improvingTraits.length > 0 || decliningTraits.length > 0) && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Trends</Text>

              {improvingTraits.length > 0 && (
                <>
                  <Text style={styles.subTitle}>Improving</Text>
                  <Text style={styles.valueSmall}>
                    {improvingTraits.join(', ')}
                  </Text>
                </>
              )}

              {decliningTraits.length > 0 && (
                <>
                  <Text style={[styles.subTitle, { marginTop: 8 }]}>
                    Declining
                  </Text>
                  <Text style={styles.valueSmall}>
                    {decliningTraits.join(', ')}
                  </Text>
                </>
              )}
            </View>
          )}
        </>
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
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#ddd',
  },
  value: {
    fontSize: 14,
    color: '#eee',
    marginBottom: 4,
  },
  valueSmall: {
    fontSize: 13,
    color: '#ddd',
    marginBottom: 2,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 8,
  },
  // Social score styles (mirroring PracticeHub)
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  socialScoreValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1DB954',
    marginRight: 10,
  },
  socialTierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#1DB954',
  },
  socialTierText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  hint: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
});
