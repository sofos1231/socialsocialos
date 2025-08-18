import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const Particle = ({ delay }) => {
  const translateY = useRef(new Animated.Value(height)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -40,
            duration: 18000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.18,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 6000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(translateY, {
          toValue: height + 20,
          duration: 1,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, opacity, scale, translateY]);

  const left = useMemo(() => Math.random() * width, []);
  const size = useMemo(() => 1.5 + Math.random() * 2.0, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        width: size,
        height: size,
        backgroundColor: 'rgba(124,58,237,0.7)',
        borderRadius: size / 2,
        transform: [{ translateY }, { scale }],
        opacity,
      }}
    />
  );
};

const BackgroundParticles = ({ count = 18 }) => {
  const delays = useMemo(() => Array.from({ length: count }, (_, i) => i * 800 + Math.random() * 1500), [count]);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {delays.map((d, idx) => (
        <Particle key={idx} delay={d} />
      ))}
      {/* Occasional twinkles */}
      <View style={{ position: 'absolute', left: '20%', top: '30%', width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(236,72,153,0.45)' }} />
      <View style={{ position: 'absolute', right: '18%', bottom: '25%', width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(168,85,247,0.45)' }} />
    </View>
  );
};

export default BackgroundParticles;


