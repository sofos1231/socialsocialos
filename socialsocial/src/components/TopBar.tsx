import React, { memo, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Animated, Easing, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatAbbrev } from '../lib/formatAbbrev';
import { useIconSource } from '../lib/useIconSource';

type Props = {
  coins: number;
  gems: number;
  streak: number;
  inStreak?: boolean; // true makes streak colorful, false greys it out
  onPressCoins?: () => void;
  onPressGems?: () => void;
  onPressStreak?: () => void;
  onPressAddCoins?: () => void;
  onPressAddGems?: () => void;
  onPressAddStreak?: () => void;
};

const ICON_TO_TEXT_RATIO = 1.25; // icon is 1.25x text
const TEXT_SIZE = 13; // slightly smaller for tighter, cleaner look
const ICON_SIZE = Math.round(TEXT_SIZE * ICON_TO_TEXT_RATIO);

const AmountGroup = memo(function AmountGroup({
  kind,
  value,
  onPress,
  onPressAdd,
}: {
  kind: 'coin' | 'diamond' | 'streak';
  value: number;
  onPress?: () => void;
  onPressAdd?: () => void;
}) {
  const icon = useIconSource(kind);
  const formatted = useMemo(() => formatAbbrev(value), [value]);
  const handleAdd = () => {
    Haptics.selectionAsync();
    onPressAdd && onPressAdd();
  };

  return (
    <View style={styles.group}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, pressed && { opacity: 0.92 }]}>
        {icon.type === 'image' ? (
          <Image source={icon.requirePath} style={{ width: ICON_SIZE, height: ICON_SIZE, marginRight: 6 }} resizeMode="contain" />
        ) : icon.spec.library === 'Ionicons' ? (
          <Ionicons name={icon.spec.name as any} size={ICON_SIZE} color="#FDE68A" style={{ marginRight: 6 }} />
        ) : (
          <MaterialCommunityIcons name={icon.spec.name as any} size={ICON_SIZE} color="#FDE68A" style={{ marginRight: 6 }} />
        )}
        <Text style={styles.amountText}>{formatted}</Text>
      </Pressable>
      <Pressable onPress={handleAdd} style={({ pressed }) => [styles.plusPill, pressed && { opacity: 0.92 }]}>
        <Ionicons name="add" size={14} color="#FFFFFF" />
      </Pressable>
    </View>
  );
});

export default function TopBar({
  coins,
  gems,
  streak,
  inStreak = false,
  onPressCoins,
  onPressGems,
  onPressStreak,
  onPressAddCoins,
  onPressAddGems,
  onPressAddStreak,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  const toggleMenu = () => {
    const to = menuOpen ? 0 : 1;
    setMenuOpen(!menuOpen);
    Animated.timing(dropdownAnim, { toValue: to, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };

  const translateY = dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] });
  const opacity = dropdownAnim;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.row}>
        {/* Left button (opens dropdown) */}
        <Pressable onPress={toggleMenu} style={({ pressed }) => [styles.menuButton, pressed && { opacity: 0.85 }]}>
          <View style={styles.menuGlyph} />
        </Pressable>

        {/* Center metric groups */}
        <View style={styles.groups}>
          <AmountGroup kind="coin" value={coins} onPress={onPressCoins} onPressAdd={onPressAddCoins} />
          <AmountGroup kind="diamond" value={gems} onPress={onPressGems} onPressAdd={onPressAddGems} />
          <View style={inStreak ? undefined : styles.streakMuted}>
            <AmountGroup kind="streak" value={streak} onPress={onPressStreak} onPressAdd={onPressAddStreak} />
          </View>
        </View>
      </View>

      {/* Animated dropdown user card (halfway down) */}
      <Animated.View pointerEvents={menuOpen ? 'auto' : 'none'}
        style={[styles.dropdown, { opacity, transform: [{ translateY }] }]}> 
        <View style={styles.userCard}>
          <View style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>Username</Text>
            <Text style={styles.userBio}>Short bio about the player…</Text>
            <Text style={styles.userMeta}>Level 7 • 5 badges</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeRow}>
              <View style={styles.badge}/>
              <View style={styles.badge}/>
              <View style={styles.badge}/>
              <View style={styles.badge}/>
              <View style={styles.badge}/>
            </ScrollView>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: 'transparent',
  },
  row: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groups: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.32)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  amountText: {
    color: '#FAFAFA',
    fontSize: TEXT_SIZE,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  plusPill: {
    marginLeft: 4,
    backgroundColor: 'rgba(16,185,129,0.9)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
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


