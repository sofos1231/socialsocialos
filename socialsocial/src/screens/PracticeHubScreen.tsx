// socialsocial/src/screens/PracticeHubScreen.tsx

import React from 'react';
import {
  ActivityIndicator,
  Alert,
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
          <Text style={styles.value}>
            Last Session: {summary.stats.lastSessionAt || '—'}
          </Text>
        </View>
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
