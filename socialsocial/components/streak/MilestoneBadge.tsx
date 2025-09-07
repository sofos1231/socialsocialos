import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

export default function MilestoneBadge({ label }: { label: string }) {
  const scale = useRef(new Animated.Value(0.9)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.05, duration: 160, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ transform: [{ scale }], alignSelf: 'flex-start' }}>
      <View style={styles.badge}>
        <Text style={styles.text}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: tokens.colors.gold,
    borderRadius: tokens.radii.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
  },
  text: { color: '#1a1a1a', fontWeight: '800', fontSize: tokens.text.sm },
});


