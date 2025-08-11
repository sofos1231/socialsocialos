import React from 'react';
import { Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const variants = {
  'popular': { colors: ['#3b82f6', '#7c3aed'], text: 'Most Popular' },
  'best-value': { colors: ['#22c55e', '#059669'], text: 'Best Value' },
  'premium': { colors: ['#7c3aed', '#4338ca'], text: 'Premium' },
};

export default function ImprovedBadge({ variant = 'popular', text }) {
  const v = variants[variant] || variants['popular'];
  return (
    <LinearGradient
      colors={v.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        position: 'absolute',
        top: -10,
        right: -10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        transform: [{ rotate: '12deg' }],
        zIndex: 10,
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 11 }}>{text || v.text}</Text>
    </LinearGradient>
  );
}

