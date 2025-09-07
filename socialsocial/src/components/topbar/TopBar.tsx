import React, { useEffect, useMemo, useRef, useState } from 'react';
import { I18nManager, Platform, Pressable, StyleSheet, Text, View, useColorScheme, Animated, Image, Easing, ScrollView } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  level?: number;
  currentXP?: number; // 0..nextLevelXP
  nextLevelXP?: number;
  coins?: number;
  diamonds?: number;
  streak?: number;
  inStreak?: boolean; // greys out if false
  coinImage?: ImageSourcePropType; // optional custom coin image
  diamondImage?: ImageSourcePropType; // optional custom diamond image
  streakImage?: ImageSourcePropType; // optional custom streak image
  onPressLevel?: () => void;
  onPressCoins?: () => void;
  onPressDiamonds?: () => void;
  onPressStreak?: () => void;
  userName?: string;
  userBio?: string;
  avatarImage?: ImageSourcePropType;
  onPressMembership?: () => void;
};

const tokens = {
  colors: {
    surface: 'transparent',
    divider: 'rgba(255,255,255,0.06)',
    text: '#FFFFFF',
    textMuted: 'rgba(255,255,255,0.8)',
    coin: '#F59E0B',
    diamond: '#7DD3FC',
    streak: '#FB923C',
    progressBg: 'rgba(255,255,255,0.14)',
    progressFill: '#A78BFA',
    level: '#FDE68A',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
  radius: { sm: 8, md: 10, lg: 12 },
  text: { sm: 12, md: 13, lg: 14 },
};

export default function TopBar({
  level = 5,
  currentXP = 1250,
  nextLevelXP = 2000,
  coins = 1250,
  diamonds = 8,
  streak = 7,
  inStreak = true,
  coinImage,
  diamondImage,
  streakImage,
  onPressLevel,
  onPressCoins,
  onPressDiamonds,
  onPressStreak,
  userName = 'Username',
  userBio = 'Short bio about the player…',
  avatarImage,
  onPressMembership,
}: Props) {
  const { top } = useSafeAreaInsets();
  const isRTL = I18nManager.isRTL;
  const scheme = useColorScheme();

  const progress = Math.max(0, Math.min(1, nextLevelXP > 0 ? currentXP / nextLevelXP : 0));

  const xpAnim = useRef(new Animated.Value(progress)).current;
  const coinAnim = useRef(new Animated.Value(0)).current;
  const diamondAnim = useRef(new Animated.Value(0)).current;
  const streakGlow = useRef(new Animated.Value(0)).current;
  const coinScale = coinAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const diamondScale = diamondAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const coinIconSource = coinImage ?? require('../../../assets/icons/gold-coin.png');
  const diamondIconSource = diamondImage ?? require('../../../assets/icons/diamond.png');
  const streakIconSource = streakImage ?? require('../../../assets/icons/streak-coin.png');

  // Dropdown state
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const toggleMenu = () => {
    const to = menuOpen ? 0 : 1;
    setMenuOpen(!menuOpen);
    Animated.timing(dropdownAnim, { toValue: to, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  const translateY = dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] });
  const opacity = dropdownAnim;

  useEffect(() => {
    Animated.timing(xpAnim, { toValue: progress, duration: 650, useNativeDriver: false }).start();
  }, [progress]);

  // Bounce when values update
  const prevCoins = useRef<number>(coins);
  const prevDiamonds = useRef<number>(diamonds);
  useEffect(() => {
    if (coins !== prevCoins.current) {
      prevCoins.current = coins;
      coinAnim.setValue(0);
      Animated.sequence([
        Animated.timing(coinAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(coinAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [coins]);
  useEffect(() => {
    if (diamonds !== prevDiamonds.current) {
      prevDiamonds.current = diamonds;
      diamondAnim.setValue(0);
      Animated.sequence([
        Animated.timing(diamondAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(diamondAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [diamonds]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(streakGlow, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(streakGlow, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const xpWidth = xpAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const streakScale = streakGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;

  return (
    <View style={[styles.container, { paddingTop: top + tokens.spacing.xs }]}>
      <View style={[styles.inner, rowDir]}>
        {/* Left cluster: avatar + flag + name + membership */}
        <Pressable onPress={toggleMenu} style={({ pressed }) => [styles.leftCluster, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel="Open profile menu">
          <View style={styles.avatarWrap}>
            {avatarImage ? (
              <Image source={avatarImage} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <View style={styles.avatarImg} />
            )}
            {/* Flag badge (using emoji inside small tag) */}
            <View style={styles.flagBadge}>
              <Text style={styles.flagText}>🇮🇱</Text>
            </View>
          </View>
          <Text style={styles.nameText} numberOfLines={1}>{userName}</Text>
          <Pressable onPress={onPressMembership} style={({ pressed }) => [styles.memberPill, pressed && { opacity: 0.95 }]} accessibilityRole="button" accessibilityLabel="Get Membership">
            <Text style={styles.memberText}>Get Membership</Text>
            <View style={styles.memberArrowCircle}>
              <Ionicons name="chevron-forward" size={12} color="#fff" />
            </View>
          </Pressable>
        </Pressable>

        {/* Center groups */}
        <View style={styles.groups}>
          {/* Coins */}
          <Pressable
            onPress={onPressCoins}
            accessibilityRole="button"
            accessibilityLabel={`Coins: ${coins}`}
            style={styles.inline}
          >
            <Animated.View style={{ transform: [{ scale: coinScale }] }}>
              <Image source={coinIconSource} style={{ width: 21.16, height: 21.16, marginEnd: 6 }} resizeMode="contain" />
            </Animated.View>
            <Text style={styles.text}>{coins}</Text>
          </Pressable>

          {/* Diamonds */}
          <Pressable
            onPress={onPressDiamonds}
            accessibilityRole="button"
            accessibilityLabel={`Diamonds: ${diamonds}`}
            style={styles.inline}
          >
            <Animated.View style={{ transform: [{ scale: diamondScale }] }}>
              <Image source={diamondIconSource} style={{ width: 21.16, height: 21.16, marginEnd: 6 }} resizeMode="contain" />
            </Animated.View>
            <Text style={styles.text}>{diamonds}</Text>
          </Pressable>

          {/* Streak */}
          <View style={inStreak ? undefined : styles.streakMuted}>
            <Pressable
              onPress={onPressStreak}
              accessibilityRole="button"
              accessibilityLabel={`Streak: ${streak}`}
              style={styles.inline}
            >
              <Animated.View style={{ transform: [{ scale: streakScale }] }}>
                <Image source={streakIconSource} style={{ width: 21.16, height: 21.16, marginEnd: 6 }} resizeMode="contain" />
              </Animated.View>
              <Text style={styles.text}>{streak}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Animated dropdown */}
      <Animated.View pointerEvents={menuOpen ? 'auto' : 'none'} style={[styles.dropdown, { opacity, transform: [{ translateY }] }]}>
        <View style={styles.userCard}>
          <View style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.userBio}>{userBio}</Text>
            <Text style={styles.userMeta}>{`Level ${level} • 5 badges`}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeRow}>
              <View style={styles.badge} />
              <View style={styles.badge} />
              <View style={styles.badge} />
              <View style={styles.badge} />
              <View style={styles.badge} />
            </ScrollView>
          </View>
        </View>
      </Animated.View>
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xs,
    backgroundColor: tokens.colors.surface,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.md,
  },
  leftCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)' },
  flagBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.15)'
  },
  flagText: { fontSize: 10 },
  nameText: { color: '#fff', fontWeight: '800', fontSize: 16, marginRight: 6, maxWidth: 80 },
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  memberText: { color: '#e5e7eb', fontWeight: '800', marginRight: 6, fontSize: 12 },
  memberArrowCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groups: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.lg, marginLeft: 'auto' },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 999,
  },
  text: {
    color: tokens.colors.text,
    fontWeight: '800',
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: tokens.colors.divider,
    marginTop: tokens.spacing.xs,
  },
  menuButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuGlyph: { width: 16, height: 16, borderRadius: 4, backgroundColor: '#22d3ee' },
  dropdown: { position: 'absolute', top: 60, left: 12, right: 12 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(17,24,39,0.96)',
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)' },
  userName: { color: '#fff', fontWeight: '800' },
  userBio: { color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  userMeta: { color: 'rgba(255,255,255,0.7)', marginTop: 4, fontSize: 12 },
  streakMuted: { opacity: 0.5 },
  badgeRow: { marginTop: 8, gap: 8 },
  badge: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.14)' },
});
