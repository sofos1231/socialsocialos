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
            {/* Phase 3: Show tier prominently (preferred over numeric score) */}
            {analyzedMessage.tier ? (
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Tier</Text>
                <View style={styles.tierBadge}>
                  <Text style={styles.tierValue}>{analyzedMessage.tier}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.metric}>
                <Text style={styles.metricLabelSecondary}>Legacy Score</Text>
                <Text style={styles.metricValueSecondary}>{analyzedMessage.score}</Text>
              </View>
            )}
            {topTrait && (
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Top Trait</Text>
                <Text style={styles.metricValue}>{topTrait[0]}</Text>
              </View>
            )}
          </View>
          {/* Phase 3: Show checklist flags */}
          {analyzedMessage.checklistFlags && analyzedMessage.checklistFlags.length > 0 && (
            <View style={styles.checklistFlagsRow}>
              <Text style={styles.checklistLabel}>Checklist:</Text>
              {analyzedMessage.checklistFlags.map((flag, idx) => (
                <View key={idx} style={styles.checklistFlag}>
                  <Text style={styles.checklistFlagText}>
                    {flag === 'POSITIVE_HOOK_HIT' ? '🎯 Hook' :
                     flag === 'OBJECTIVE_PROGRESS' ? '✅ Progress' :
                     flag === 'NO_BOUNDARY_ISSUES' ? '🛡️ Safe' :
                     flag === 'MOMENTUM_MAINTAINED' ? '⚡ Momentum' :
                     flag.replace(/_/g, ' ')}
                  </Text>
                </View>
              ))}
            </View>
          )}
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
  metricLabelSecondary: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  metricValueSecondary: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  tierBadge: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  tierValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fbbf24',
  },
  checklistFlagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  checklistLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginRight: 4,
    fontWeight: '600',
  },
  checklistFlag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  checklistFlagText: {
    fontSize: 10,
    color: '#E5E7EB',
    fontWeight: '500',
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

