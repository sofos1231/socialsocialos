import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as H from './Haptics';

type Props = { x: number; y: number; size?: number; onPress?: () => void };

export default function BossNode({ x, y, size = 96, onPress }: Props) {
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  return (
    <Animated.View style={{ position: 'absolute', left: x - size/2, top: y - size/2, transform: [{ scale }] }}>
      <Pressable
        onPress={async () => { await H.light(); onPress?.(); }}
        style={{ width: size, height: size, borderRadius: size/2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(168,85,247,0.3)', borderWidth: 2, borderColor: '#a78bfa' }}
        accessibilityLabel="Boss node"
      >
        <View style={{ width: size*0.88, height: size*0.88, borderRadius: size*0.44, backgroundColor: 'rgba(217,70,239,0.9)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="trophy" size={32} color="#ffd166" />
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 10, marginTop: 6 }}>Final Challenge</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}


