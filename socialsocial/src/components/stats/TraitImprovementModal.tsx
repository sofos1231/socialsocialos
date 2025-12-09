// socialsocial/src/components/stats/TraitImprovementModal.tsx
// Step 5.5: Modal for trait improvement suggestions

import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { TraitKey, TraitLabels } from '../../logic/traitKeys';
import { TraitImprovement } from '../../api/statsService';

interface TraitImprovementModalProps {
  visible: boolean;
  traitKey: TraitKey;
  improvement: TraitImprovement;
  onClose: () => void;
  onNavigateToFreePlay: () => void;
  onNavigateToMissionRoad: () => void;
}

export default function TraitImprovementModal({
  visible,
  traitKey,
  improvement,
  onClose,
  onNavigateToFreePlay,
  onNavigateToMissionRoad,
}: TraitImprovementModalProps) {
  const label = TraitLabels[traitKey];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Improve {label}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {/* Tip */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tip</Text>
              <Text style={styles.tipText}>{improvement.tip}</Text>
            </View>

            {/* FreePlay suggestion */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Practice Suggestion</Text>
              <Text style={styles.suggestionText}>{improvement.freePlaySuggestion}</Text>
            </View>
          </ScrollView>

          {/* CTAs */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaSecondary]}
              onPress={onNavigateToFreePlay}
            >
              <Text style={styles.ctaSecondaryText}>Try FreePlay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctaButton, styles.ctaPrimary]}
              onPress={onNavigateToMissionRoad}
            >
              <Text style={styles.ctaPrimaryText}>Browse Missions</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#1F2937',
  },
  closeText: {
    fontSize: 18,
    color: '#F9FAFB',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#E5E7EB',
  },
  suggestionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#9CA3AF',
  },
  ctaContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  ctaButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaSecondary: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  ctaSecondaryText: {
    color: '#F9FAFB',
    fontSize: 15,
    fontWeight: '600',
  },
  ctaPrimary: {
    backgroundColor: '#22c55e',
  },
  ctaPrimaryText: {
    color: '#0B1220',
    fontSize: 15,
    fontWeight: '600',
  },
});

