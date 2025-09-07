import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = { x: number; y: number; label?: string };

export default function SideQuestBadge({ x, y, label = 'Side Quest' }: Props) {
  return (
    <View style={{ position: 'absolute', left: x - 18, top: y - 18, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(168,85,247,0.25)', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="sparkles" size={16} color="#a78bfa" />
      <Text style={{ position: 'absolute', top: 36, color: '#c4b5fd', fontSize: 10 }}>{label}</Text>
    </View>
  );
}


