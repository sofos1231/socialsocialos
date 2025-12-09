// socialsocial/src/screens/stats/PlaceholderTab.tsx
// Step 5.4: Reusable placeholder tab component

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PlaceholderTabProps {
  title: string;
  subtitle?: string;
}

export default function PlaceholderTab({ title, subtitle }: PlaceholderTabProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      <Text style={styles.text}>Coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    color: '#F9FAFB',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 16,
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});

