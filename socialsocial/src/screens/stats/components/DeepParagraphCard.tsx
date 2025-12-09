// socialsocial/src/screens/stats/components/DeepParagraphCard.tsx
// Step 5.7: Deep paragraph card component

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DeepParagraphDTO } from '../../../api/analyzerService';

interface DeepParagraphCardProps {
  paragraph: DeepParagraphDTO;
}

export default function DeepParagraphCard({ paragraph }: DeepParagraphCardProps) {
  return (
    <View style={styles.card}>
      {paragraph.category && (
        <View style={styles.categoryContainer}>
          <Text style={styles.category}>{paragraph.category.toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.title}>{paragraph.title}</Text>
      <Text style={styles.body}>{paragraph.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  categoryContainer: {
    marginBottom: 8,
  },
  category: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22c55e',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
});

