import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const rarityBorder = {
  common: 'rgba(209,213,219,0.6)',
  uncommon: 'rgba(16,185,129,0.6)',
  rare: 'rgba(59,130,246,0.6)',
  epic: 'rgba(147,51,234,0.6)',
  legendary: 'rgba(250,204,21,0.8)',
};

export default function LockedEffectCard({ title, description, unlockCost, unlockCurrency, rarity = 'common', onPress }) {
  const borderColor = rarityBorder[rarity] || rarityBorder.common;
  const isDiamond = unlockCurrency === 'diamonds';

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{ borderRadius: 14, overflow: 'hidden' }}>
      <View
        style={{
          borderRadius: 14,
          borderWidth: 1,
          borderColor,
          backgroundColor: 'rgba(30,30,30,0.95)',
          padding: 14,
          height: 140,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ position: 'absolute', top: 10, right: 10 }}>
          <Text style={{ fontSize: 16, opacity: 0.9 }}>🔒</Text>
        </View>

        <View>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, marginBottom: 6 }}>{title}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{description}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 16 }}>{isDiamond ? '💎' : '🪙'}</Text>
          <Text style={{ color: '#fff', fontWeight: '800', marginLeft: 6 }}>{unlockCost}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

