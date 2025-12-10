// socialsocial/src/components/stats/MessageAnalyzerPanel.tsx
// Message Analyzer panel at top of Tips screen

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MessageListItemDTO, AnalyzeMessageResponse } from '../../api/analyzerService';

interface MessageAnalyzerPanelProps {
  analyzedMessage: MessageListItemDTO | null;
  analysis: AnalyzeMessageResponse | null;
  onViewFull: () => void;
}

export default function MessageAnalyzerPanel({
  analyzedMessage,
  analysis,
  onViewFull,
}: MessageAnalyzerPanelProps) {
  if (!analyzedMessage) {
    return (
      <View style={styles.container}>
        <View style={styles.panel}>
          <Text style={styles.title}>Message Analyzer</Text>
          <Text style={styles.subtitle}>Tap 'Analyze' on any message below</Text>
        </View>
      </View>
    );
  }

  // Get top trait if available
  const topTrait = analysis?.breakdown
    ? Object.entries(analysis.breakdown.traits)
        .sort(([, a], [, b]) => (b as number) - (a as number))[0]
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.title}>Message Analyzer</Text>
        <View style={styles.messagePreview}>
          <Text style={styles.messageText} numberOfLines={2}>
            {analyzedMessage.contentSnippet}
          </Text>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Score</Text>
              <Text style={styles.metricValue}>{analyzedMessage.score}</Text>
            </View>
            {topTrait && (
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Top Trait</Text>
                <Text style={styles.metricValue}>{topTrait[0]}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.viewFullButton} onPress={onViewFull}>
            <Text style={styles.viewFullButtonText}>View Full Analysis</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  panel: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#22c55e',
    borderStyle: 'dashed',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  messagePreview: {
    marginTop: 12,
  },
  messageText: {
    fontSize: 14,
    color: '#E5E7EB',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
  },
  viewFullButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewFullButtonText: {
    color: '#0B1220',
    fontWeight: '600',
    fontSize: 14,
  },
});

