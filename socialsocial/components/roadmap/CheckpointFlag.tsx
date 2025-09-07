import React, { useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = { x: number; y: number; label: string };

export default function CheckpointFlag({ x, y, label }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  return (
    <Animated.View style={{ position: 'absolute', left: x - 10, top: y - 40, transform: [{ scale }] }}>
      <LinearGradient colors={["#fde68a", "#fbbf24"]} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
        <Text style={{ color: '#1f2937', fontWeight: '700', fontSize: 10 }}>{label}</Text>
      </LinearGradient>
    </Animated.View>
  );
}


