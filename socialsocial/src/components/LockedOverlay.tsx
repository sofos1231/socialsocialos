// socialsocial/src/components/LockedOverlay.tsx
// Step 5.12: Overlay component for locked charts/maps

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UpsellMeta } from '../api/types';

interface LockedOverlayProps {
  upsell?: UpsellMeta;
  onUpgrade?: () => void;
  previewText?: string; // Optional preview text to show
}

export default function LockedOverlay({
  upsell,
  onUpgrade,
  previewText,
}: LockedOverlayProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        {previewText && <Text style={styles.previewText}>{previewText}</Text>}
        {upsell && (
          <>
            <Text style={styles.upsellTitle}>{upsell.title}</Text>
            <Text style={styles.upsellBody}>{upsell.body}</Text>
            {onUpgrade && (
              <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
                <Text style={styles.upgradeButtonText}>{upsell.ctaLabel}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  content: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 20,
    maxWidth: '80%',
    alignItems: 'center',
  },
  previewText: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  upsellTitle: {
    color: '#fbbf24',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  upsellBody: {
    color: '#d1d5db',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

