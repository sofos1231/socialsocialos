// socialsocial/src/screens/stats/StatsHubScreen.tsx
// Stats Hub with 2×2 grid of category cards

import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useDashboardLoop } from '../../hooks/useDashboardLoop';
import TopBarWalletStrip from '../../app/components/TopBarWalletStrip';
import StatCategoryCard from '../../components/stats/StatCategoryCard';
import { StatsStackParamList } from '../../navigation/types';

type NavigationProp = NativeStackNavigationProp<StatsStackParamList>;

export default function StatsHubScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { summary, isLoading, error, reload } = useDashboardLoop();

  // ✅ Refresh stats when screen gains focus
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const dashboard: any = summary || {};
  const wallet = dashboard.wallet || {};
  const streak = dashboard.streak || {};

  const xp = wallet.xp ?? wallet.lifetimeXp ?? 0;
  const level = wallet.level ?? 1;
  const coins = wallet.coins ?? 0;
  const gems = wallet.gems ?? 0;
  const currentStreak = streak.current ?? 0;

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

            {/* 2×2 Grid of Stat Category Cards */}
            <View style={styles.gridContainer}>
              <View style={styles.gridRow}>
                <StatCategoryCard
                  label="Badges"
                  icon="🏆"
                  onPress={() => navigation.navigate('StatsBadges')}
                />
                <StatCategoryCard
                  label="Performance"
                  icon="📊"
                  onPress={() => navigation.navigate('StatsPerformance')}
                />
              </View>
              <View style={styles.gridRow}>
                <StatCategoryCard
                  label="Advanced"
                  icon="⚡"
                  onPress={() => navigation.navigate('StatsAdvanced')}
                />
                <StatCategoryCard
                  label="Tips"
                  icon="💡"
                  onPress={() => navigation.navigate('StatsTips')}
                />
              </View>
            </View>
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
  cardTextMuted: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
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
  gridContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
});

