import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../../theme/tokens';

type Props = {
  days: { label: string; done: boolean }[]; // len 7
  todayIndex: number;
};

export default function WeekRow({ days, todayIndex }: Props) {
  return (
    <View style={styles.row}>
      {days.map((d, i) => (
        <DayChip key={i} label={d.label} done={d.done} today={i === todayIndex} />
      ))}
    </View>
  );
}

function DayChip({ label, done, today }: { label: string; done: boolean; today: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (done) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.92, duration: tokens.motion.micro, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true })
      ]).start();
    }
  }, [done]);
  return (
    <View style={styles.day}>
      <Animated.View style={[styles.circle, done ? styles.circleDone : styles.circleIdle, { transform: [{ scale }], borderColor: today ? tokens.colors.ringToday : tokens.colors.chipBorder, borderWidth: today ? 2 : StyleSheet.hairlineWidth }]}>
        {done ? <Ionicons name="checkmark" size={16} color={tokens.colors.success} /> : <View style={styles.dot} />}
      </Animated.View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: tokens.spacing.md },
  day: { alignItems: 'center', width: 34 },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  circleDone: { backgroundColor: 'rgba(34,197,94,0.22)' },
  circleIdle: { backgroundColor: tokens.colors.chipIdle },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: tokens.colors.chipBorder },
  label: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: tokens.spacing.xs },
});


