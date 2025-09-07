import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

export default function ContinueButton({ text = 'Continue Training', onPress }: { text?: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.85 : 1 }]}>
      <Text style={styles.text}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: tokens.colors.accent,
    borderRadius: tokens.radii.pill,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
  },
  text: { color: tokens.colors.text, fontWeight: '800', fontSize: tokens.text.md },
});


