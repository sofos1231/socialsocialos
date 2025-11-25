// FILE: socialsocial/src/app/components/TopBarWalletStrip.tsx

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fetchDashboardSummary, DashboardSummary } from '../../api/dashboard';

type Props = {
  // אם מסך כבר טען את הדאשבורד (Stats), אפשר להעביר אותו כאן
  dashboard?: DashboardSummary | null;
};

function getDisplayName(email?: string | null): string {
  if (!email) return 'Player';
  const raw = email.split('@')[0];
  if (!raw) return 'Player';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

const TopBarWalletStrip: React.FC<Props> = ({ dashboard }) => {
  const [localDashboard, setLocalDashboard] = useState<DashboardSummary | null>(
    dashboard ?? null,
  );
  const [loading, setLoading] = useState<boolean>(!dashboard);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // אם קיבלנו דאשבורד מהמסך – נשתמש בו ולא נטען שוב
    if (dashboard) {
      setLocalDashboard(dashboard);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDashboardSummary();
        if (cancelled) return;
        setLocalDashboard(data);
      } catch (err: any) {
        if (cancelled) return;
        console.log('[TopBarWalletStrip] error loading dashboard', err);
        setError(err?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [dashboard]);

  const data: any = localDashboard || {};
  const wallet = data.wallet || {};
  const user = data.user || {};

  const name = getDisplayName(user.email);
  const level = wallet.level ?? 1;
  const coins = wallet.coins ?? 0;
  const gems = wallet.gems ?? 0;
  const xp = wallet.xp ?? wallet.lifetimeXp ?? 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        {/* Left – name + level + XP */}
        <View style={styles.left}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.subText}>Level {level} • {xp} XP</Text>
          {loading && !error && (
            <Text style={styles.mutedText}>Updating…</Text>
          )}
          {error && (
            <Text style={styles.errorText}>Offline stats</Text>
          )}
        </View>

        {/* Right – coins & gems */}
        <View style={styles.right}>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>Coins</Text>
            <Text style={styles.pillValue}>{coins}</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>Gems</Text>
            <Text style={styles.pillValue}>{gems}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default TopBarWalletStrip;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#F3F4F6',
  },
  bar: {
    borderRadius: 999,
    backgroundColor: '#020617',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexShrink: 1,
    marginRight: 12,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  subText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  mutedText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  errorText: {
    fontSize: 11,
    color: '#FCA5A5',
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#111827',
    minWidth: 70,
    alignItems: 'center',
  },
  pillLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  pillValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
  },
});
