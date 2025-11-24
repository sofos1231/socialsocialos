// FILE: socialsocial/src/app/components/DashboardMiniStatsCard.tsx

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { getMiniStats } from '../../api/dashboardService';


type Props = {
  /**
   * השארתי accessToken כתאימות לאחור.
   * אם מעבירים אותו – נשתמש בו.
   * אם לא – getMiniStats כבר יודע לשלוף מה-AsyncStorage.
   */
  accessToken?: string | null;
};

const DashboardMiniStatsCard: React.FC<Props> = ({ accessToken }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const dashboard = await getMiniStats(accessToken ?? undefined);

        if (!isMounted) return;

        setStats(dashboard);
        setLoading(false);
      } catch (err: any) {
        if (!isMounted) return;

        console.log('[DashboardMiniStatsCard] error loading mini stats', err);
        setError(err?.message || 'Failed to load stats');
        setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  // לוגיקה גמישה להוצאת שדות – כי המבנה המדויק של dashboard נמצא בבקאנד
  const wallet = stats?.wallet ?? {};
  const progression = stats?.progression ?? {};
  const lastSession = stats?.lastSession ?? stats?.latestSession ?? {};

  const xp = wallet.xp ?? wallet.totalXp ?? 0;
  const coins = wallet.coins ?? wallet.totalCoins ?? 0;
  const gems = wallet.gems ?? wallet.totalGems ?? 0;
  const streak = progression.streakCurrent ?? stats?.streakCurrent ?? 0;
  const lastScore = lastSession.score ?? lastSession.finalScore ?? null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Today&apos;s Progress</Text>

      {loading && (
        <View style={styles.row}>
          <ActivityIndicator />
          <Text style={styles.subtle}>Loading dashboard…</Text>
        </View>
      )}

      {!loading && error && (
        <Text style={styles.errorText}>Failed to load stats</Text>
      )}

      {!loading && !error && (
        <>
          <View style={styles.row}>
            <View style={styles.statBox}>
              <Text style={styles.label}>XP</Text>
              <Text style={styles.value}>{xp}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.label}>Streak</Text>
              <Text style={styles.value}>{streak}🔥</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.statBox}>
              <Text style={styles.label}>Coins</Text>
              <Text style={styles.value}>{coins}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.label}>Gems</Text>
              <Text style={styles.value}>{gems}</Text>
            </View>
          </View>

          {lastScore !== null && (
            <View style={styles.lastSessionBox}>
              <Text style={styles.lastSessionLabel}>Last session score</Text>
              <Text style={styles.lastSessionValue}>{lastScore}</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

export default DashboardMiniStatsCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: '#111827',
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    marginRight: 8,
  },
  label: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  subtle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#FCA5A5',
  },
  lastSessionBox: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#020617',
  },
  lastSessionLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  lastSessionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E5E7EB',
  },
});
