import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { PracticeStackParamList } from '../navigation/types';
import { useDashboardLoop } from '../hooks/useDashboardLoop';

type Props = NativeStackScreenProps<PracticeStackParamList, 'PracticeHub'>;

export default function PracticeHubScreen({ navigation }: Props) {
  const {
    summary,
    lastRewards,
    loadingSummary,
    loadingPractice,
    error,
    reloadSummary,
    runDebugPractice,
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {loadingSummary && (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading summary…</Text>
        </View>
      )}

      {summary && !loadingSummary && (
        <>
          {/* User + wallet */}
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
          </View>

          {/* Practice + social score */}
          {stats && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Practice Stats</Text>
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
              <Text style={styles.value}>
                Social Score:{' '}
                {stats.socialScore != null ? Math.round(stats.socialScore) : '—'}
              </Text>
              <Text style={styles.value}>
                Tier: {stats.socialTier ?? '—'}
              </Text>
            </View>
          )}

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

          {/* Strongest / weakest traits from insights */}
          {insights && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>AI Insights (Latest)</Text>

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
                      Weakest traits
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
                    <View style={styles.separator} />
                    <Text style={[styles.value, styles.subtitleNeutral]}>
                      Flags noticed
                    </Text>
                    <Text style={styles.value}>
                      {insights.flagsSample.join(', ')}
                    </Text>
                  </>
                )}
            </View>
          )}
        </>
      )}

      {!summary && !loadingSummary && (
        <Text style={styles.emptyText}>
          No dashboard data yet. Run a practice session to generate stats.
        </Text>
      )}

      <TouchableOpacity
        style={[styles.button, styles.primaryButton, loadingPractice && styles.buttonDisabled]}
        onPress={runDebugPractice}
        disabled={loadingPractice}
      >
        <Text style={styles.buttonText}>
          {loadingPractice ? 'Running…' : 'Run Debug Practice'}
        </Text>
      </TouchableOpacity>

      {lastRewards && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Last Rewards</Text>
          <Text style={styles.value}>Score: {lastRewards.score}</Text>
          <Text style={styles.value}>XP gained: {lastRewards.xpGained}</Text>
          <Text style={styles.value}>Coins: {lastRewards.coinsGained}</Text>
          <Text style={styles.value}>Gems: {lastRewards.gemsGained}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={() => navigation.navigate('PracticeSession')}
      >
        <Text style={styles.buttonText}>Go to Practice</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          styles.secondaryButton,
          loadingSummary && styles.buttonDisabled,
        ]}
        onPress={reloadSummary}
        disabled={loadingSummary}
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
