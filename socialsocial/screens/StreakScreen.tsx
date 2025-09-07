import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, Share, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

type Props = {
  dayCount?: number; // e.g., 5
  week?: { label: string; done: boolean }[];
  onClose?: () => void;
};

export default function StreakScreen({ dayCount = 5, week, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const wobble = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(height)).current;
  // Week starts on Sunday; hardcoded 5 days completed (S..Th)
  const data = week ?? [
    { label: 'S', done: true },
    { label: 'M', done: true },
    { label: 'T', done: true },
    { label: 'W', done: true },
    { label: 'T', done: true },
    { label: 'F', done: false },
    { label: 'S', done: false },
  ];

  const startWobble = () => {
    wobble.setValue(0);
    Animated.sequence([
      Animated.timing(wobble, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(wobble, { toValue: -1, duration: 120, useNativeDriver: true }),
      Animated.timing(wobble, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const share = async () => {
    try {
      await Share.share({ message: `I’m on a ${dayCount}-day streak on SocialGym! 🔥` });
      startWobble();
    } catch {}
  };

  const rotate = wobble.interpolate({ inputRange: [-1, 1], outputRange: ['-6deg', '6deg'] });

  useEffect(() => {
    Animated.timing(slideY, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const handleClose = () => {
    Animated.timing(slideY, {
      toValue: height,
      duration: 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      onClose?.();
    });
  };

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateY: slideY }] }}>
      <LinearGradient colors={[ '#0B0F17', '#0B0F17' ]} style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }] }>
      <View style={styles.header}>
        <Pressable onPress={handleClose} accessibilityRole="button" accessibilityLabel="Back" style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Your Streak</Text>
        <Pressable onPress={share} accessibilityRole="button" accessibilityLabel="Share streak" style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="share-outline" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Big flame + count */}
      <View style={styles.flameSection}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="flame" size={64} color="#FB923C" />
        </Animated.View>
        <Text style={styles.countText}>{dayCount} Day Streak</Text>
        <Text style={styles.helperText}>Keep it up!</Text>
      </View>

      {/* Weekly chart */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>{dayCount} Day Streak 🔥</Text>
          <Text style={styles.weekLabel}>This Week</Text>
        </View>
        <Text style={styles.cardSubtitle}>Keep it up!</Text>

        <View style={styles.weekRow}>
          {data.map((d, i) => (
            <View key={i} style={styles.day}> 
              <View style={[styles.dayCircle, d.done ? styles.dayDone : styles.dayIdle]}>
                {d.done ? <Ionicons name="checkmark" size={16} color="#22c55e" /> : <View style={styles.dot} />}
              </View>
              <Text style={styles.dayLabel}>{d.label}</Text>
            </View>
          ))}
        </View>
      </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  flameSection: { alignItems: 'center', marginTop: 12, marginBottom: 8 },
  countText: { color: '#fff', fontWeight: '800', fontSize: 22, marginTop: 6 },
  helperText: { color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  card: { marginTop: 12, marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 16, backgroundColor: 'rgba(255,255,255,0.04)' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  weekLabel: { color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  cardSubtitle: { color: 'rgba(255,255,255,0.75)', marginTop: 6 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  day: { alignItems: 'center', width: 34 },
  dayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dayDone: { backgroundColor: 'rgba(34,197,94,0.22)', borderColor: 'rgba(34,197,94,0.55)' },
  dayIdle: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.18)' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.18)' },
  dayLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 6 },
});


