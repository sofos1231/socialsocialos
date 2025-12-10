// FILE: socialsocial/src/screens/StatsScreen.tsx
// Step 5.4: Converted to tab shell (Badges + Performance + placeholders)
import React, { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDashboardLoop } from '../hooks/useDashboardLoop';
import TopBarWalletStrip from '../app/components/TopBarWalletStrip';
import BadgesTab from './stats/BadgesTab';
import PerformanceTab from './stats/PerformanceTab';
import AdvancedTab from './stats/AdvancedTab';
import SocialTipsTab from './stats/SocialTipsTab';
import { fetchStatsSummary, StatsSummaryResponse } from '../api/statsService';

type TabName = 'Badges' | 'Performance' | 'Advanced' | 'Tips';

export default function StatsScreen() {
  const { summary, isLoading, error, reload } = useDashboardLoop();
  const [showRaw, setShowRaw] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>('Badges');
  const [isPremium, setIsPremium] = useState(false); // Step 5.5→5.6 glue

  // Fetch premium status on mount (resilient - fallback to false on error)
  useEffect(() => {
    fetchStatsSummary()
      .then((stats: StatsSummaryResponse) => {
        setIsPremium(stats.isPremium);
      })
      .catch((err) => {
        console.warn('[StatsScreen] Failed to load premium status:', err);
        // Fallback: assume not premium, but do NOT show a fatal error card
        // Premium status is a background check, not critical for screen functionality
        setIsPremium(false);
      });
  }, []);

  // ✅ Step 6: Refresh stats when screen gains focus (e.g., after completing a session)
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Badges':
        return <BadgesTab />;
      case 'Performance':
        return <PerformanceTab />;
      case 'Advanced':
        return <AdvancedTab isPremium={isPremium} />;
      case 'Tips':
        return <SocialTipsTab isPremium={isPremium} />;
      default:
        return <BadgesTab />;
    }
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
            {/* Wallet / Progress summary (unchanged, stays at top) */}
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

            {/* Tab navigation (Step 5.4) */}
            <View style={styles.tabContainer}>
              <Pressable
                style={[styles.tab, activeTab === 'Badges' && styles.tabActive]}
                onPress={() => setActiveTab('Badges')}
              >
                <Text style={[styles.tabText, activeTab === 'Badges' && styles.tabTextActive]}>
                  Badges
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, activeTab === 'Performance' && styles.tabActive]}
                onPress={() => setActiveTab('Performance')}
              >
                <Text style={[styles.tabText, activeTab === 'Performance' && styles.tabTextActive]}>
                  Performance
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, activeTab === 'Advanced' && styles.tabActive]}
                onPress={() => setActiveTab('Advanced')}
              >
                <Text style={[styles.tabText, activeTab === 'Advanced' && styles.tabTextActive]}>
                  Advanced
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, activeTab === 'Tips' && styles.tabActive]}
                onPress={() => setActiveTab('Tips')}
              >
                <Text style={[styles.tabText, activeTab === 'Tips' && styles.tabTextActive]}>
                  Tips
                </Text>
              </Pressable>
            </View>

            {/* Tab content */}
            <View style={styles.tabContent}>
              {renderTabContent()}
            </View>

            {/* Raw JSON debug toggle (keep for debugging) */}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#22c55e',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#0B1220',
  },
  tabContent: {
    minHeight: 400,
  },
});
