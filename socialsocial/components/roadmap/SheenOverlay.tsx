import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type SheenVariant = 'sweep' | 'ambient';

type SheenProps = {
  size: number;
  variant?: SheenVariant;
  intervalMs?: number;
  durationMs?: number;
  doubleLines?: boolean;
  angleDeg?: number;
  opacity?: number;
};

export default function SheenOverlay({
  size,
  variant = 'sweep',
  intervalMs = 4200,
  durationMs = 1200,
  doubleLines = false,
  angleDeg = 22,
  opacity = 0.35,
}: SheenProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (variant === 'sweep') {
      const run = () => {
        progress.setValue(0);
        Animated.sequence([
          Animated.timing(progress, { toValue: 1, duration: durationMs, useNativeDriver: true }),
          Animated.delay(intervalMs + Math.floor(Math.random() * 800)),
        ]).start(({ finished }) => {
          if (finished) run();
        });
      };
      run();
    } else {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(progress, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(progress, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [variant, durationMs, intervalMs]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-size, size] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

  const Beam = ({ offset = 0, localOpacity = opacity }: { offset?: number; localOpacity?: number }) => (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          transform: [
            { translateX: variant === 'sweep' ? Animated.add(translateX, new Animated.Value(offset)) : new Animated.Value(0) },
            { rotate: `${angleDeg}deg` },
            ...(variant === 'ambient' ? [{ scale }] : []),
          ],
          alignItems: 'center',
          justifyContent: 'center',
          opacity: localOpacity,
        },
      ]}
    >
      <View
        style={{
          width: size * 0.35,
          height: size * 1.6,
        }}
      >
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.9)',
            'rgba(255,255,255,0)',
          ]}
          locations={[0.2, 0.5, 0.8]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, borderRadius: size / 2 }}
        />
      </View>
    </Animated.View>
  );

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: size / 2, overflow: 'hidden' }]}>
      <Beam />
      {doubleLines && variant === 'sweep' && <Beam offset={size * 0.25} localOpacity={opacity * 0.7} />}
    </View>
  );
}


