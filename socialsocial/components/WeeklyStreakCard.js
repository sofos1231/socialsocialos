import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const Day = ({ label, done }) => (
  <View style={styles.day}>
    <View style={[styles.dayCircle, done ? styles.dayCircleDone : styles.dayCircleIdle]}>
      {done ? (
        <Ionicons name="checkmark" size={16} color="#22c55e" />
      ) : (
        <View style={styles.dot} />
      )}
    </View>
    <Text style={styles.dayLabel}>{label}</Text>
  </View>
);

const WeeklyStreakCard = () => {
  const week = [
    { label: 'M', done: true },
    { label: 'T', done: true },
    { label: 'W', done: true },
    { label: 'T', done: true },
    { label: 'F', done: true },
    { label: 'S', done: false },
    { label: 'S', done: false },
  ];

  return (
    <LinearGradient
      colors={[
        'rgba(255,255,255,0.08)',
        'rgba(255,255,255,0.04)'
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.headerRow}>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>5 Day Streak</Text>
            <Text style={styles.flame}>🔥</Text>
          </View>
          <Text style={styles.subtitle}>Keep it up!</Text>
        </View>
        <Text style={styles.weekText}>This Week</Text>
      </View>

      <View style={styles.daysRow}>
        {week.map((d, i) => (
          <Day key={i} label={d.label} done={d.done} />
        ))}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
    marginBottom: 18,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '800', color: '#fff', marginRight: 8 },
  flame: { fontSize: 12, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  weekText: { color: 'rgba(255,255,255,0.55)', fontWeight: '700' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', width: 34 },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dayCircleDone: { backgroundColor: 'rgba(34,197,94,0.25)', borderColor: 'rgba(34,197,94,0.6)' },
  dayCircleIdle: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.18)' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.18)' },
  dayLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 6 },
});

export default WeeklyStreakCard;


