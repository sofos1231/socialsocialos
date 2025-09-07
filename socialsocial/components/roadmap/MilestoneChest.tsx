import React, { useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = { visible: boolean; text: string };

export default function MilestoneChest({ visible, text }: Props) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);
  return (
    <Animated.View style={{ position: 'absolute', top: 96, left: 16, right: 16, opacity, transform: [{ scale }], zIndex: 40 }} pointerEvents="none">
      <LinearGradient colors={["#f59e0b", "#fbbf24"]} style={{ padding: 12, borderRadius: 12, alignItems: 'center' }}>
        <Text style={{ color: '#111827', fontWeight: '800' }}>{text}</Text>
      </LinearGradient>
    </Animated.View>
  );
}


