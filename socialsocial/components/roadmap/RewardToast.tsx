import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = { visible: boolean; text: string; onHide: () => void };

export default function RewardToast({ visible, text, onHide }: Props) {
  const translateY = useRef(new Animated.Value(120)).current;
  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => {
        const t = setTimeout(() => onHide(), 2500);
        return () => clearTimeout(t);
      });
    } else {
      Animated.timing(translateY, { toValue: 120, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  return (
    <Animated.View style={{ position: 'absolute', left: 16, right: 16, bottom: 24, transform: [{ translateY }], zIndex: 50 }}>
      <Pressable onPress={onHide}>
        <LinearGradient colors={["#10b981", "#22c55e"]} style={{ padding: 14, borderRadius: 14, alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>{text}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}


