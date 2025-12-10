// socialsocial/src/components/LockedCard.tsx
// Step 5.12: Reusable locked card component for premium features

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UpsellMeta } from '../api/types';

interface LockedCardProps {
  title: string;
  description?: string;
  upsell?: UpsellMeta;
  onUpgrade?: () => void;
  children?: React.ReactNode; // Optional preview content
}

export default function LockedCard({
  title,
  description,
  upsell,
  onUpgrade,
  children,
}: LockedCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      
      {children && (
        <View style={styles.previewContainer}>
          {children}
        </View>
      )}
      
      {upsell && (
        <View style={styles.upsellContainer}>
          <Text style={styles.upsellTitle}>{upsell.title}</Text>
          <Text style={styles.upsellBody}>{upsell.body}</Text>
          {onUpgrade && (
            <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
              <Text style={styles.upgradeButtonText}>{upsell.ctaLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  title: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 12,
  },
  previewContainer: {
    opacity: 0.5,
    marginBottom: 12,
  },
  upsellContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  upsellTitle: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  upsellBody: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

