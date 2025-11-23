// socialsocial/src/screens/PracticeHubScreen.tsx

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

      {/* Wallet + streak */}
      {summary && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Streak</Text>
          <Text style={styles.value}>
            Current streak: {summary.streak.current} day
            {summary.streak.current === 1 ? '' : 's'}
          </Text>

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>Wallet</Text>
          <Text style={styles.value}>XP: {summary.wallet.xp}</Text>
          <Text style={styles.value}>Level: {summary.wallet.level}</Text>
          <Text style={styles.value}>Coins: {summary.wallet.coins}</Text>
          <Text style={styles.value}>Gems: {summary.wallet.gems}</Text>
        </View>
      )}

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

      {/* AI insights */}
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

      {/* Quick mission launchers */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Start Practice</Text>

        {/* Text mission */}
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => navigation.navigate('PracticeSession')}
        >
          <Text style={styles.buttonText}>Text Mission</Text>
        </TouchableOpacity>

        {/* Voice mission */}
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('VoicePracticeSession')}
        >
          <Text style={styles.buttonText}>Voice Mission</Text>
        </TouchableOpacity>

        {/* A/B mission */}
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('ABPracticeSession')}
        >
          <Text style={styles.buttonText}>A/B Mission</Text>
        </TouchableOpacity>
      </View>

      {/* Debug button */}
      <TouchableOpacity
        style={[
          styles.button,
          styles.primaryButton,
          loadingPractice && styles.buttonDisabled,
        ]}
        onPress={runDebugPractice}
        disabled={loadingPractice}
      >
        <Text style={styles.buttonText}>
          {loadingPractice ? 'Running…' : 'Run Debug Practice'}
        </Text>
      </TouchableOpacity>

      {/* Last rewards from debug / future quick session */}
      {lastRewards && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Last Rewards</Text>
          <Text style={styles.value}>Score: {lastRewards.score}</Text>
          <Text style={styles.value}>XP gained: {lastRewards.xpGained}</Text>
          <Text style={styles.value}>
            Coins: {lastRewards.coinsGained}
          </Text>
          <Text style={styles.value}>
            Gems: {lastRewards.gemsGained}
          </Text>
        </View>
      )}

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
    marginBottom: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#1f2937',
    marginVertical: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#22c55e',
  },
  secondaryButton: {
    backgroundColor: '#1f2937',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#f9fafb',
    fontWeight: '600',
  },
});
