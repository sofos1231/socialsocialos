import React from 'react';
import { Modal, Pressable, View, Text } from 'react-native';

type Props = { visible: boolean; onClose: () => void; streakDays: number; bonusPct: number; };

export default function StreakModal({ visible, onClose, streakDays, bonusPct }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ marginTop: 'auto' }}>
          <View style={{ padding: 16, backgroundColor: 'rgba(18,20,28,0.98)', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Your streak</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>Day {streakDays} {bonusPct ? `• +${bonusPct}% XP today` : ''}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)' }}>Keep training daily. From day 4 you earn +10% XP on all missions.</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, marginTop: 14 }] }>
              <View style={{ paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Close</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}


