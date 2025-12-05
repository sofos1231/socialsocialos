// FILE: socialsocial/src/screens/StatsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDashboardLoop } from '../hooks/useDashboardLoop';
import TopBarWalletStrip from '../app/components/TopBarWalletStrip';

export default function StatsScreen() {
  const { summary, isLoading, error, reload } = useDashboardLoop();
  const [showRaw, setShowRaw] = useState(false);

  // ✅ Step 6: Refresh stats when screen gains focus (e.g., after completing a session)
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const dashboard: any = summary || {};
  const wallet = dashboard.wallet || {};
  const streak = dashboard.streak || {};
  const stats = dashboard.stats || {};
  const latest = stats.latest || {};
  const averages = stats.averages || {};
  const recentSessions: any[] = stats.recentSessions || [];

  const aiLatest = stats.insights?.latest || null;
  const strongestTraits: any[] = aiLatest?.strongestTraits || [];
  const weakestTraits: any[] = aiLatest?.weakestTraits || [];

  const xp = wallet.xp ?? wallet.lifetimeXp ?? 0;
  const level = wallet.level ?? 1;
  const coins = wallet.coins ?? 0;
  const gems = wallet.gems ?? 0;
  const currentStreak = streak.current ?? stats.streakCurrent ?? 0;
  const sessionsCount = stats.sessionsCount ?? 0;
  const successCount = stats.successCount ?? 0;
  const failCount = stats.failCount ?? 0;
  const avgScore = stats.averageScore ?? null;
  const avgMsgScore = stats.averageMessageScore ?? null;
  const socialScore = stats.socialScore ?? null;
  const socialTier = stats.socialTier ?? null;

  const lastScore = latest.score ?? latest.charismaIndex ?? null;
  const lastXp = (latest as any)?.totalXp ?? null;
  const lastAt = stats.lastSessionAt || null;

  const renderTraitList = (items: any[]) => {
    if (!items || !items.length) {
      return <Text style={styles.cardTextMuted}>No data yet.</Text>;
    }
    return (
      <>
        {items.map((t, idx) => {
          const trait = t.trait ?? t.name ?? 'Trait';
          const score = t.score ?? t.value ?? null;
          return (
            <Text key={idx.toString()} style={styles.cardText}>
              • {trait}
              {score !== null ? ` – ${Math.round(score)}` : ''}
            </Text>
          );
        })}
      </>
    );
  };

  return (
    <View style={styles.root}>
      <TopBarWalletStrip dashboard={summary} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Stats</Text>

        {isLoading && (
          <View style={styles.centerRow}>
            <ActivityIndicator />
            <Text style={styles.label}>Loading dashboard…</Text>
          </View>
        )}

        {error && !isLoading && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Failed to load</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={reload}>
              <Text style={styles.reloadHint}>Tap here to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && !error && summary && (
          <>
            {/* Wallet / Progress summary */}
            <View style={styles.cardRow}>
              <View style={styles.miniCard}>
                <Text style={styles.cardLabel}>XP</Text>
                <Text style={styles.cardValue}>{xp}</Text>
                <Text style={styles.cardTextMuted}>Level {level}</Text>
              </View>
              <View style={styles.miniCard}>
                <Text style={styles.cardLabel}>Streak</Text>
                <Text style={styles.cardValue}>{currentStreak}🔥</Text>
                <Text style={styles.cardTextMuted}>Days in a row</Text>
              </View>
            </View>

            <View style={styles.cardRow}>
              <View style={styles.miniCard}>
                <Text style={styles.cardLabel}>Coins</Text>
                <Text style={styles.cardValue}>{coins}</Text>
              </View>
              <View style={styles.miniCard}>
                <Text style={styles.cardLabel}>Gems</Text>
                <Text style={styles.cardValue}>{gems}</Text>
              </View>
            </View>

            {/* Session stats */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Session stats</Text>
              <Text style={styles.cardText}>
                Sessions: {sessionsCount} ({successCount} success / {failCount} fail)
              </Text>
              <Text style={styles.cardText}>
                Avg score: {avgScore ?? '-'} | Avg message score: {avgMsgScore ?? '-'}
              </Text>
              {socialScore !== null && (
                <Text style={styles.cardText}>
                  Social score: {Math.round(socialScore)} ({socialTier || 'Unknown tier'})
                </Text>
              )}
            </View>

            {/* Latest session */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Latest session</Text>
              <Text style={styles.cardText}>Score: {lastScore ?? '-'}</Text>
              <Text style={styles.cardText}>XP gained: {lastXp ?? '-'}</Text>
              {lastAt && (
                <Text style={styles.cardTextMuted}>
                  Last session at: {new Date(lastAt).toLocaleString()}
                </Text>
              )}
            </View>

            {/* AI trait snapshot */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Strongest traits</Text>
              {renderTraitList(strongestTraits)}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Weakest traits</Text>
              {renderTraitList(weakestTraits)}
            </View>

            {/* Averages summary */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Averages (last sessions)</Text>
              <Text style={styles.cardText}>
                Charisma: {averages.avgCharismaIndex ?? '-'}
              </Text>
              <Text style={styles.cardText}>
                Confidence: {averages.avgConfidence ?? '-'}
              </Text>
              <Text style={styles.cardText}>
                Clarity: {averages.avgClarity ?? '-'}
              </Text>
              <Text style={styles.cardText}>
                Humor: {averages.avgHumor ?? '-'}
              </Text>
              <Text style={styles.cardText}>
                Tension: {averages.avgTension ?? '-'}
              </Text>
              <Text style={styles.cardText}>
                Warmth: {averages.avgWarmth ?? '-'}
              </Text>
              <Text style={styles.cardText}>
                Dominance: {averages.avgDominance ?? '-'}
              </Text>
            </View>

            {/* Recent sessions list */}
            {!!recentSessions.length && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Recent sessions</Text>
                {recentSessions.map((s, idx) => (
                  <View key={idx.toString()} style={styles.sessionRow}>
                    <Text style={styles.sessionDate}>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={styles.sessionScore}>
                      Score: {s.score ?? '-'} | Charisma: {s.charismaIndex ?? '-'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Raw JSON debug toggle */}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setShowRaw((prev) => !prev)}
            >
              <Text style={styles.toggleText}>
                {showRaw ? 'Hide raw JSON' : 'Show raw JSON (debug)'}
              </Text>
            </TouchableOpacity>

            {showRaw && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Raw dashboard</Text>
                <Text style={styles.mono}>{JSON.stringify(summary, null, 2)}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginLeft: 8,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  miniCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#111827',
    padding: 12,
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#111827',
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#F9FAFB',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  cardText: {
    fontSize: 14,
    color: '#E5E7EB',
    marginBottom: 2,
  },
  cardTextMuted: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  mono: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#9CA3AF',
  },
  errorBox: {
    borderRadius: 12,
    backgroundColor: '#7F1D1D',
    padding: 12,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#FCA5A5',
  },
  reloadHint: {
    marginTop: 8,
    fontSize: 14,
    color: '#93C5FD',
    textDecorationLine: 'underline',
  },
  sessionRow: {
    marginTop: 4,
    marginBottom: 2,
  },
  sessionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sessionScore: {
    fontSize: 13,
    color: '#E5E7EB',
  },
  toggleButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1F2937',
  },
  toggleText: {
    fontSize: 12,
    color: '#E5E7EB',
  },
});
