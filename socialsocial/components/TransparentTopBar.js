import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import styles from './TransparentTopBarStyles';

/**
 * TransparentTopBar
 * - Transparent, safe-area aware premium top bar
 * - Left: Avatar image + stacked Level label over slim XP pill
 * - Right: Coins + Gems pills (pressable with light haptic)
 * - Subtle bottom gradient increases slightly with scroll
 */
const TransparentTopBar = ({
  level = 5,
  currentXP = 750,
  nextLevelXP = 1000,
  coins = 1250,
  gems = 8,
  avatar, // Image source (require(...) or { uri })
  onPressCoins,
  onPressGems,
  onPressAvatar,
  scrollY, // Animated.Value or number (0..)
  coinImage, // optional custom coin image
  diamondImage, // optional custom diamond image
}) => {
  const insets = useSafeAreaInsets();

  // Mount fade-in
  const mountOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(mountOpacity, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mountOpacity]);

  // XP progress animation
  const targetProgress = useMemo(() => {
    if (!nextLevelXP) return 0;
    return Math.max(0, Math.min(1, currentXP / nextLevelXP));
  }, [currentXP, nextLevelXP]);

  const [pillWidth, setPillWidth] = useState(0);
  const animatedFillWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const toWidth = (pillWidth || 0) * targetProgress;
    Animated.timing(animatedFillWidth, {
      toValue: toWidth,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [targetProgress, pillWidth, animatedFillWidth]);

  const [accessibilityLabelLevel, setAccessibilityLabelLevel] = useState('');
  useEffect(() => {
    setAccessibilityLabelLevel(`Level ${level}, ${Math.round(targetProgress * 100)} percent to next level`);
  }, [level, targetProgress]);

  // Bottom gradient/shadow intensity based on scroll
  const shadowOpacity = useMemo(() => {
    if (typeof scrollY === 'number') {
      const clamped = Math.max(0, Math.min(80, scrollY));
      return clamped / 80 * 0.6; // 0..0.6
    }
    if (scrollY && typeof scrollY.interpolate === 'function') {
      return scrollY.interpolate({ inputRange: [0, 80], outputRange: [0, 0.6], extrapolate: 'clamp' });
    }
    return 0;
  }, [scrollY]);

  const handlePressGems = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (typeof onPressGems === 'function') onPressGems();
  };
  const handlePressCoins = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (typeof onPressCoins === 'function') onPressCoins();
  };
  const handlePressAvatar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (typeof onPressAvatar === 'function') onPressAvatar();
  };

  const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };
  const coinIconSource = coinImage || require('../assets/icons/gold-coin.png');
  const diamondIconSource = diamondImage || require('../assets/icons/diamond.png');

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { paddingTop: insets.top + 8, opacity: mountOpacity },
      ]}
    >
      {/* Content Row */}
      <View style={styles.row}>
        {/* Left: Avatar + Level text + Slim XP pill */}
        <View style={styles.leftSection}>
          <TouchableOpacity
            onPress={handlePressAvatar}
            accessibilityRole="imagebutton"
            accessibilityLabel="Open profile"
            hitSlop={hitSlop}
            activeOpacity={0.85}
          >
            <View style={styles.avatarRing}>
              {avatar ? (
                <Image source={avatar} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <View style={[styles.avatarImage, styles.avatarFallback]}>
                  <Ionicons name="person" size={16} color="#fff" />
                </View>
              )}
              <View style={styles.levelChip}>
                <Ionicons name="trophy" size={10} color="#fff" />
                <Text style={styles.levelChipText}>{level}</Text>
              </View>
            </View>
          </TouchableOpacity>
          <View style={styles.leftInfo}>
            <Text
              style={styles.levelText}
              numberOfLines={1}
              accessibilityRole="header"
              accessible
            >
              {`Level ${level}`}
            </Text>
            <View
              style={styles.pillTrack}
              onLayout={(e) => setPillWidth(e.nativeEvent.layout.width)}
              accessibilityRole="progressbar"
              accessibilityValue={{ now: Math.round(targetProgress * 100), min: 0, max: 100 }}
            >
              <Animated.View
                style={[
                  styles.pillFillContainer,
                  { width: animatedFillWidth },
                ]}
              >
                <LinearGradient
                  colors={[ '#3EE577', '#2BD272' ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.pillFill}
                />
              </Animated.View>
            </View>
          </View>
        </View>

        {/* Right: Coins + Gems */}
        <View style={styles.rightSection}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open Coins"
            hitSlop={hitSlop}
            onPress={handlePressCoins}
            style={styles.currencyPill}
            activeOpacity={0.85}
          >
            <View style={[styles.currencyBadge, styles.coinBadgeBg]}>
              <Image source={coinIconSource} style={{ width: 17.1925, height: 17.1925 }} resizeMode="contain" />
            </View>
            <Text style={styles.currencyText}>{coins.toLocaleString()}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open Shop"
            hitSlop={hitSlop}
            onPress={handlePressGems}
            style={[styles.currencyPill, { marginLeft: 8 }]}
            activeOpacity={0.85}
          >
            <View style={[styles.currencyBadge, styles.gemBadgeBg]}>
              <Image source={diamondIconSource} style={{ width: 17.1925, height: 17.1925 }} resizeMode="contain" />
            </View>
            <Text style={styles.currencyText}>{gems}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom subtle gradient/shadow for separation */}
      <Animated.View pointerEvents="none" style={[styles.bottomShadow, { opacity: shadowOpacity }]}>
        <LinearGradient
          colors={[ 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.0)' ]}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={styles.bottomShadowGradient}
        />
      </Animated.View>
    </Animated.View>
  );
};

export default TransparentTopBar;


