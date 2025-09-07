import React, { useMemo } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import styles from './ProfileTopBarStyles';

type Props = {
  userName: string;
  avatarImage?: ImageSourcePropType;
  coins: number;
  gems: number;
  streak: number;
  inStreak?: boolean;
  subscribed?: boolean;
  membershipLabel?: string;
  onPressMembership?: () => void;
  onPressCoins?: () => void;
  onPressGems?: () => void;
  onPressStreak?: () => void;
};

function CounterPill({
  iconSource,
  value,
  onPress,
  label,
}: {
  iconSource: any;
  value: number;
  onPress?: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.pill, pressed && { opacity: 0.9 }]}
      hitSlop={6}
    >
      <Image source={iconSource} style={styles.pillIcon} resizeMode="contain" />
      <Text style={styles.pillText}>{value}</Text>
    </Pressable>
  );
}

export default function ProfileTopBar({
  userName,
  avatarImage,
  coins,
  gems,
  streak,
  inStreak = true,
  subscribed = false,
  membershipLabel,
  onPressMembership,
  onPressCoins,
  onPressGems,
  onPressStreak,
}: Props) {
  const insets = useSafeAreaInsets();
  const coinIcon = useMemo(() => require('../../assets/icons/gold-coin.png'), []);
  const gemIcon = useMemo(() => require('../../assets/icons/diamond.png'), []);
  const flameIcon = useMemo(() => require('../../assets/icons/streak-coin.png'), []);

  const label = membershipLabel ?? (subscribed ? 'Premium' : 'Get Membership');

  const handleMembership = () => {
    Haptics.selectionAsync();
    onPressMembership && onPressMembership();
  };

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]} edges={['top']}>
      <View style={styles.row}>
        {/* LEFT: avatar + stacked name and membership */}
        <View style={styles.left}>
          {avatarImage ? (
            <Image source={avatarImage} style={styles.avatar} />
          ) : (
            <View style={styles.avatar} />
          )}
          <View style={styles.textCol}>
            <Text
              style={styles.userName}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.9}
            >
              {userName}
            </Text>
            <Pressable
              onPress={handleMembership}
              accessibilityRole="button"
              accessibilityLabel={label}
              style={({ pressed }) => [styles.memberPressable, pressed && { opacity: 0.96 }]}
              hitSlop={6}
            >
              <LinearGradient
                colors={[ '#E5E7EB', '#9CA3AF' ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.memberPill}
              >
                <Text
                  style={styles.memberText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {label}
                </Text>
                <View style={styles.memberArrowCircle}>
                  <Ionicons name="chevron-forward" size={12} color="#fff" />
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* RIGHT: currency pills */}
        <View style={styles.right}>
          <CounterPill iconSource={coinIcon} value={coins} onPress={onPressCoins} label="Coins" />
          <CounterPill iconSource={gemIcon} value={gems} onPress={onPressGems} label="Gems" />
          <View style={!inStreak ? { opacity: 0.5 } : undefined}>
            <CounterPill iconSource={flameIcon} value={streak} onPress={onPressStreak} label="Streak" />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}


