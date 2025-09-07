import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SheenOverlay from './SheenOverlay';
import { Mission, NodeState } from './types';
import theme from '../../theme';
import * as H from './Haptics';

type Props = {
  mission: Mission;
  x: number;
  y: number;
  size?: number;
  onPress?: (m: Mission) => void;
  goldSheen?: { variant?: 'sweep'|'ambient'; doubleLines?: boolean; intervalMs?: number };
};

const stateToColor = (state: NodeState) => {
  switch (state) {
    case 'LOCKED': return 'rgba(148,163,184,0.5)';
    case 'AVAILABLE': return 'rgba(34,197,94,0.25)';
    case 'ACTIVE': return 'rgba(34,197,94,0.45)';
    case 'COMPLETED_BRONZE': return '#CD7F32';
    case 'COMPLETED_SILVER': return '#C0C0C0';
    case 'COMPLETED_GOLD': return '#FFD700';
    case 'COMPLETED_DIAMOND': return '#7FDBFF';
    case 'BOSS': return '#a78bfa';
    default: return '#cbd5e1';
  }
};

export default function RoadNode({ mission, x, y, size = 72, onPress, goldSheen }: Props) {
  const press = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ])
    );
    if (mission.state === 'ACTIVE') loop.start();
    return () => loop.stop();
  }, [mission.state]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });

  const tierStars = useMemo(() => {
    if (!mission.state.startsWith('COMPLETED')) return 0;
    switch (mission.tier) {
      case 'BRONZE': return 1;
      case 'SILVER': return 2;
      case 'GOLD': return 3;
      case 'DIAMOND': return 4;
      default: return 1;
    }
  }, [mission.state, mission.tier]);

  const accessibilityLabel = `Node ${mission.order} '${mission.title}', ${mission.tier ?? 'no tier'}, ${mission.state.toLowerCase()}`;

  const iconColor = mission.state === 'LOCKED' ? '#9ca3af' : '#111827';
  const ringColor = stateToColor(mission.state);

  const showSheen = mission.state === 'COMPLETED_GOLD';

  return (
    <Animated.View
      style={{ position: 'absolute', left: x - size/2, top: y - size/2, transform: [{ translateY }, { scale }] }}
      accessibilityLabel={accessibilityLabel}
    >
      <Pressable
        onPressIn={() => Animated.spring(press, { toValue: 1, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 0, useNativeDriver: true }).start()}
        onPress={async () => { await H.light(); onPress?.(mission); }}
        disabled={mission.state === 'LOCKED'}
        style={{ width: size, height: size, borderRadius: size/2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}
      >
        <View style={{ position: 'absolute', inset: 0, borderRadius: size/2, borderWidth: 3, borderColor: ringColor }} />
        <View style={{ width: size*0.88, height: size*0.88, borderRadius: size*0.44, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>
          <Ionicons name={mission.icon} size={size*0.42} color={iconColor} />
          {showSheen && (
            <SheenOverlay size={size*0.88} variant={goldSheen?.variant ?? 'sweep'} doubleLines={goldSheen?.doubleLines} intervalMs={goldSheen?.intervalMs} />
          )}
        </View>
        {/* progress stars under title */}
        {tierStars > 0 && (
          <View style={{ position: 'absolute', bottom: -10, flexDirection: 'row' }}>
            {Array.from({ length: tierStars }).map((_, i) => (
              <Ionicons key={i} name="star" size={12} color={ringColor} style={{ marginHorizontal: 2 }} />
            ))}
          </View>
        )}
        {mission.state === 'LOCKED' && (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(148,163,184,0.35)', borderRadius: size/2, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="lock-closed" size={18} color="#6b7280" />
          </View>
        )}
      </Pressable>
      <View style={{ marginTop: 8, width: size * 1.6 }}>
        <Text numberOfLines={1} style={{ color: 'white', fontWeight: '600', fontSize: 12, textAlign: 'center' }}>{mission.title}</Text>
      </View>
    </Animated.View>
  );
}


