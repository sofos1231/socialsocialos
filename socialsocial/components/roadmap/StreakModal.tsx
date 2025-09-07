import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onClose: () => void;
  currentDay?: number; // 1..7
  bonusPct?: number;   // e.g., 10
};

export default function StreakModal({ visible, onClose, currentDay = 5, bonusPct = 10 }: Props) {
  const days = ['M','T','W','T','F','S','S'];
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Your streak</Text>
          <Text style={styles.subtitle}>Day {currentDay}  •  +{bonusPct}% XP today</Text>
          <Text style={styles.caption}>Keep training daily. From day 4 you earn +10% XP on all missions.</Text>

          <View style={styles.weekRow}>
            {days.map((d, i) => {
              const done = i < currentDay;
              return (
                <View key={i} style={styles.day}>
                  <View style={[styles.dayCircle, done ? styles.dayCircleDone : styles.dayCircleIdle]}>
                    {done ? <Ionicons name="checkmark" size={16} color="#22c55e" /> : <View style={styles.dot} />}
                  </View>
                  <Text style={styles.dayLabel}>{d}</Text>
                </View>
              );
            })}
          </View>

          <Pressable onPress={onClose} style={({ pressed }) => [styles.close, { opacity: pressed ? 0.8 : 1 }]} accessibilityRole="button" accessibilityLabel="Close streak dialog">
            <LinearGradient colors={["#374151", "#1f2937"]} style={styles.closeGrad}>
              <Text style={styles.closeText}>Close</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', borderRadius: 16, backgroundColor: '#0b0f17', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  subtitle: { color: '#e5e7eb', marginTop: 6, fontWeight: '600' },
  caption: { color: 'rgba(255,255,255,0.7)', marginTop: 6, lineHeight: 18 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 12 },
  day: { alignItems: 'center', width: 34 },
  dayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dayCircleDone: { backgroundColor: 'rgba(34,197,94,0.25)', borderColor: 'rgba(34,197,94,0.6)' },
  dayCircleIdle: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.18)' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.18)' },
  dayLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 6 },
  close: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  closeGrad: { paddingVertical: 10, alignItems: 'center' },
  closeText: { color: '#fff', fontWeight: '700' },
});


