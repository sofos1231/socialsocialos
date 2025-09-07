/**
 * Usage:
 * import YourStreakScreen from './YourStreakScreen';
 * <YourStreakScreen state={mock} onClose={navigation.goBack} onContinue={navigation.goBack} />
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../theme/tokens';
import { streakTexts, pickEncouragement } from '../copy/streakTexts';
import { StreakState, isMilestone, daysToNext } from '../types/streak';
import { useFlameAnimation } from '../hooks/useFlameAnimation';
import { useCelebrate } from '../hooks/useCelebrate';
import WeekRow from '../components/streak/WeekRow';
import BonusChip from '../components/streak/BonusChip';
import MilestoneBadge from '../components/streak/MilestoneBadge';
import ContinueButton from '../components/streak/ContinueButton';
import ShareButton from '../components/streak/ShareButton';

export default function YourStreakScreen({ state, onClose, onContinue }: { state: StreakState; onClose?: () => void; onContinue?: () => void }) {
  const insets = useSafeAreaInsets();
  const { scale } = useFlameAnimation();
  const { scale: popScale } = useCelebrate();
  const n = state.currentStreak;
  const next = daysToNext(n);

  const days = state.daysThisWeek.map((done, i) => ({ label: 'SMTWTFS'[i] as unknown as string, done }));

  const handleShare = async () => {
    const message = `🔥 ${n}-Day Streak on SocialGym. Try to beat me!`;
    try { await Share.share({ message }); } catch {}
  };

  return (
    <LinearGradient colors={[tokens.colors.background, tokens.colors.background]} style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }] }>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Back" style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="chevron-back" size={24} color={tokens.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Your Streak</Text>
        <Pressable onPress={handleShare} accessibilityRole="button" accessibilityLabel="Share streak" style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="share-outline" size={22} color={tokens.colors.text} />
        </Pressable>
      </View>

      {/* Flame + Title */}
      <View style={styles.center}>
        <View style={{ transform: [{ scale }] }}>
          <Ionicons name="flame" size={64} color="#FB923C" accessibilityLabel={`Flame, ${n} day streak`} />
        </View>
        <Text style={styles.title}>{streakTexts.title(n)}</Text>
        <Text style={styles.sub}>{streakTexts.sub(state.percentile)}</Text>
        <BonusChip text={streakTexts.bonus(state.xpBonusPercent)} />
        {isMilestone(n) && <MilestoneBadge label={`Milestone: ${n} days`} />}
        {next !== null && next > 0 && <Text style={styles.next}>{streakTexts.nextReward(next)}</Text>}
      </View>

      {/* Week Row */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>{streakTexts.title(n)} 🔥</Text>
          <Text style={styles.weekLabel}>This Week</Text>
        </View>
        <Text style={styles.cardSubtitle}>{pickEncouragement()}</Text>
        <WeekRow days={days} todayIndex={state.todayIndex} />
      </View>

      {/* CTAs */}
      <View style={styles.ctaRow}>
        <ContinueButton onPress={onContinue} />
        <ShareButton onPress={handleShare} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: tokens.spacing.lg },
  headerTitle: { color: tokens.colors.text, fontWeight: '800', fontSize: tokens.text.lg },
  center: { alignItems: 'center', gap: tokens.spacing.sm, marginTop: tokens.spacing.md },
  title: { color: tokens.colors.text, fontWeight: '800', fontSize: tokens.text.xl },
  sub: { color: tokens.colors.textMuted, fontSize: tokens.text.md },
  next: { color: tokens.colors.textMuted, fontSize: tokens.text.sm, marginTop: tokens.spacing.xs },
  card: { marginTop: tokens.spacing.md, marginHorizontal: tokens.spacing.lg, borderRadius: tokens.radii.card, borderWidth: 1, borderColor: tokens.colors.divider, padding: tokens.spacing.lg, backgroundColor: tokens.colors.surface },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: tokens.colors.text, fontWeight: '800', fontSize: tokens.text.lg },
  weekLabel: { color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  cardSubtitle: { color: tokens.colors.textMuted, marginTop: tokens.spacing.sm },
  ctaRow: { marginTop: tokens.spacing.xl, marginHorizontal: tokens.spacing.lg, flexDirection: 'row', justifyContent: 'space-between', gap: tokens.spacing.md },
});


