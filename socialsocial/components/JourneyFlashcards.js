import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Dimensions, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_W = Math.round(width - 40);

const cards = [
  { id: 'insight', title: 'AI Insight', icon: '💡', gradient: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)'], border: 'rgba(255,255,255,0.12)' },
  { id: 'progress', title: 'Weekly XP', icon: '📈', gradient: ['rgba(16,185,129,0.25)', 'rgba(16,185,129,0.12)'], border: 'rgba(16,185,129,0.35)' },
  { id: 'badges', title: '8 Badges', icon: '🎖️', gradient: ['rgba(249,115,22,0.25)', 'rgba(249,115,22,0.12)'], border: 'rgba(249,115,22,0.35)' },
  { id: 'level', title: 'Level 5', icon: '🏆', gradient: ['rgba(99,102,241,0.25)', 'rgba(139,92,246,0.12)'], border: 'rgba(139,92,246,0.35)' },
];

const JourneyFlashcards = () => {
  const scrollRef = useRef(null);
  const [index, setIndex] = useState(0);
  const timer = useRef(null);
  const pulse = useRef(new Animated.Value(1)).current;

  const snapTo = (i) => {
    setIndex(i);
    scrollRef.current?.scrollTo({ x: i * CARD_W, animated: true });
  };

  useEffect(() => {
    timer.current = setInterval(() => {
      const next = (index + 1) % cards.length;
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 120, useNativeDriver: true }),
        Animated.spring(pulse, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
      ]).start();
      snapTo(next);
    }, 5000);
    return () => timer.current && clearInterval(timer.current);
  }, [index]);

  return (
    <View>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_W}
          decelerationRate="fast"
          contentContainerStyle={{ paddingRight: 20 }}
        >
          {cards.map((c) => (
            <TouchableOpacity key={c.id} activeOpacity={0.9} onPress={() => {}} style={{ width: CARD_W, marginRight: 12 }}>
              <LinearGradient colors={c.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
                <Text style={styles.icon}>{c.icon}</Text>
                <Text style={styles.cardTitle}>{c.title}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      <View style={styles.dots}>
        {cards.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => snapTo(i)} style={styles.dotTouch}>
            <View style={[styles.dot, i === index ? styles.dotActive : styles.dotIdle]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 28, marginBottom: 6 },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 16 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  dotTouch: { marginHorizontal: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7c3aed' },
  dotIdle: { backgroundColor: 'rgba(255,255,255,0.4)' },
});

export default JourneyFlashcards;


