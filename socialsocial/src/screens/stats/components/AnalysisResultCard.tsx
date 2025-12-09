// socialsocial/src/screens/stats/components/AnalysisResultCard.tsx
// Step 5.7: Analysis result card component

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MessageBreakdownDTO, DeepParagraphDTO } from '../../../api/analyzerService';
import DeepParagraphCard from './DeepParagraphCard';

interface AnalysisResultCardProps {
  breakdown: MessageBreakdownDTO;
  paragraphs: DeepParagraphDTO[];
}

const TRAIT_LABELS: Record<string, string> = {
  confidence: 'Confidence',
  clarity: 'Clarity',
  humor: 'Humor',
  tensionControl: 'Tension Control',
  emotionalWarmth: 'Emotional Warmth',
  dominance: 'Dominance',
};

export default function AnalysisResultCard({ breakdown, paragraphs }: AnalysisResultCardProps) {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Score */}
      <View style={styles.scoreSection}>
        <Text style={styles.scoreLabel}>Message Score</Text>
        <Text style={styles.scoreValue}>{breakdown.score}</Text>
      </View>

      {/* Traits */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Traits</Text>
        <View style={styles.traitsGrid}>
          {Object.entries(breakdown.traits).map(([key, value]) => (
            <View key={key} style={styles.traitItem}>
              <Text style={styles.traitLabel}>{TRAIT_LABELS[key] || key}:</Text>
              <Text style={styles.traitValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Why It Worked */}
      {breakdown.whyItWorked.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why This Works</Text>
          {breakdown.whyItWorked.map((reason, idx) => (
            <View key={idx} style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{reason}</Text>
            </View>
          ))}
        </View>
      )}

      {/* What To Improve */}
      {breakdown.whatToImprove.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What To Improve</Text>
          {breakdown.whatToImprove.map((suggestion, idx) => (
            <View key={idx} style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{suggestion}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Deep Paragraphs */}
      {paragraphs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deep Insights</Text>
          {paragraphs.map((paragraph) => (
            <DeepParagraphCard key={paragraph.id} paragraph={paragraph} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scoreSection: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#22c55e',
  },
  section: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  traitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  traitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '45%',
  },
  traitLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginRight: 8,
  },
  traitValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#22c55e',
    marginRight: 8,
    width: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
});

