import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function PurchaseAnimation({ visible, onComplete, currency = 'coins', amount = 0 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 6, speed: 16 }),
      ]).start();

      const id = setTimeout(() => onComplete && onComplete(), 1600);
      return () => clearTimeout(id);
    } else {
      opacity.setValue(0);
      scale.setValue(0.9);
    }
  }, [visible]);

  const icon = currency === 'coins' ? '🪙' : '💎';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onComplete}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', opacity, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Animated.View style={{ transform: [{ scale }], width: 260, borderRadius: 18, overflow: 'hidden' }}>
          <LinearGradient colors={['#0f172a', '#0b1020']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>🎉</Text>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18, marginBottom: 6 }}>Purchase Successful!</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, marginRight: 6 }}>{icon}</Text>
              <Text style={{ color: '#60a5fa', fontWeight: '900', fontSize: 20 }}>+{amount}</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

