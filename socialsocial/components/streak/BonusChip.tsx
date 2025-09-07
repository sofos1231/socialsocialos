import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '../../theme/tokens';

export default function BonusChip({ text }: { text: string }) {
  return (
    <View style={styles.chip} accessibilityLabel={text}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.colors.surfaceStrong,
    borderRadius: tokens.radii.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.colors.divider,
  },
  text: {
    color: tokens.colors.text,
    fontWeight: '700',
    fontSize: tokens.text.sm,
  },
});


