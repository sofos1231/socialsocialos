import React, { useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = { percent: number; count: string; nextReward: string };

export default function ProgressHeader({ percent, count, nextReward }: Props) {
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(sweep, { toValue: percent, duration: 600, useNativeDriver: false }).start();
  }, [percent]);
  const angle = sweep.interpolate({ inputRange: [0, 100], outputRange: ['0deg', '360deg'] });
  return (
    <LinearGradient colors={["#3b0764", "#581c87"]} style={{ padding: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#a78bfa', transform: [{ rotate: angle as any }] }} />
          <Text style={{ color: 'white', fontWeight: '800' }}>{Math.round(percent)}%</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>Progress</Text>
          <Text style={{ color: '#fbcfe8', fontSize: 12 }}>{count}</Text>
          <Text style={{ color: '#c4b5fd', fontSize: 12, marginTop: 4 }}>Next: {nextReward}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}


