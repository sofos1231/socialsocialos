// socialsocial/src/components/stats/TraitBarCard.tsx
// Step 5.5: Trait bar card component

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TraitKey, TraitLabels } from '../../logic/traitKeys';
import TraitMiniChart from './TraitMiniChart';
import { TraitImprovement } from '../../api/statsService';

interface TraitBarCardProps {
  traitKey: TraitKey;
  current: number; // 0-100
  weeklyDelta: number | null;
  historyPoints: number[]; // Trait values over time for sparkline
  improvement?: TraitImprovement;
  onImprovePress: () => void;
}

export default function TraitBarCard({
  traitKey,
  current,
  weeklyDelta,
  historyPoints,
  onImprovePress,
}: TraitBarCardProps) {
  const label = TraitLabels[traitKey];
  
  // Format weekly delta
  const deltaDisplay = weeklyDelta !== null 
    ? (weeklyDelta > 0 ? `+${weeklyDelta.toFixed(1)}` : weeklyDelta.toFixed(1))
    : '—';

  const deltaColor = weeklyDelta !== null
    ? (weeklyDelta > 0 ? '#22c55e' : weeklyDelta < 0 ? '#ef4444' : '#9CA3AF')
    : '#9CA3AF';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.traitLabel}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{Math.round(current)}</Text>
          <Text style={styles.delta} testID={`delta-${traitKey}`}>
            {deltaDisplay}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${current}%`, backgroundColor: deltaColor }]} />
      </View>

      {/* Mini chart */}
      <View style={styles.chartContainer}>
        <TraitMiniChart points={historyPoints} />
      </View>

      {/* How to improve button */}
      <TouchableOpacity style={styles.improveButton} onPress={onImprovePress}>
        <Text style={styles.improveButtonText}>How to Improve</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  traitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  delta: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    minWidth: 40,
    textAlign: 'right',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#1F2937',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartContainer: {
    height: 40,
    marginBottom: 12,
  },
  improveButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  improveButtonText: {
    color: '#0B1220',
    fontWeight: '600',
    fontSize: 14,
  },
});

