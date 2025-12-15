// socialsocial/src/screens/stats/PerformanceTab.tsx
// Step 5.5: Performance Bars tab with trait bars

import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PracticeStackParamList } from '../../navigation/types';
import { fetchTraitsSummary, fetchTraitHistory, TraitsSummaryResponse, TraitHistoryResponse } from '../../api/statsService';
import { TRAIT_KEYS, TraitKey, TraitLabels } from '../../logic/traitKeys';
import TraitBarCard from '../../components/stats/TraitBarCard';
import TraitImprovementModal from '../../components/stats/TraitImprovementModal';

type NavigationProp = NativeStackNavigationProp<PracticeStackParamList>;

export default function PerformanceTab() {
  const navigation = useNavigation<NavigationProp>();
  const [summary, setSummary] = useState<TraitsSummaryResponse | null>(null);
  const [history, setHistory] = useState<TraitHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrait, setSelectedTrait] = useState<TraitKey | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, historyData] = await Promise.all([
        fetchTraitsSummary(),
        fetchTraitHistory(20),
      ]);
      setSummary(summaryData);
      setHistory(historyData);
    } catch (err: any) {
      setError(err.message || 'Failed to load trait data');
    } finally {
      setLoading(false);
    }
  };

  // Group history by trait key
  const historyByTrait = useMemo(() => {
    if (!history) return new Map<TraitKey, number[]>();
    
    const map = new Map<TraitKey, number[]>();
    
    TRAIT_KEYS.forEach((key) => {
      map.set(key, []);
    });

    // Reverse history points (oldest first for chart)
    const reversedPoints = [...history.points].reverse();
    
    reversedPoints.forEach((point) => {
      TRAIT_KEYS.forEach((key) => {
        const value = point.traits[key] ?? 0;
        map.get(key)!.push(value);
      });
    });

    return map;
  }, [history]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading trait data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Failed to load</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadData} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Week info header */}
      {summary.traits.length > 0 && (
        <View style={styles.weekInfo}>
          <Text style={styles.weekInfoText}>
            Week: {new Date(summary.traits[0].weekRange.startISO).toLocaleDateString()} - {new Date(summary.traits[0].weekRange.endISO).toLocaleDateString()}
          </Text>
          <Text style={styles.weekInfoSubtext}>
            {summary.sessionsThisWeek} session{summary.sessionsThisWeek !== 1 ? 's' : ''} this week
          </Text>
        </View>
      )}

      {/* Phase 3: Checklist metrics this week */}
      {summary.checklist && (
        <View style={styles.checklistCard}>
          <Text style={styles.checklistCardTitle}>This Week's Performance</Text>
          <View style={styles.checklistMetricsGrid}>
            <View style={styles.checklistMetric}>
              <Text style={styles.checklistMetricValue}>{summary.checklist.positiveHooksThisWeek}</Text>
              <Text style={styles.checklistMetricLabel}>Positive Hooks</Text>
            </View>
            <View style={styles.checklistMetric}>
              <Text style={styles.checklistMetricValue}>{summary.checklist.objectiveProgressThisWeek}</Text>
              <Text style={styles.checklistMetricLabel}>Objective Hits</Text>
            </View>
            <View style={styles.checklistMetric}>
              <Text style={styles.checklistMetricValue}>{summary.checklist.boundarySafeRateThisWeek}%</Text>
              <Text style={styles.checklistMetricLabel}>Boundary Safe</Text>
            </View>
            <View style={styles.checklistMetric}>
              <Text style={styles.checklistMetricValue}>{summary.checklist.momentumMaintainedRateThisWeek}%</Text>
              <Text style={styles.checklistMetricLabel}>Momentum</Text>
            </View>
          </View>
          {/* Phase 3: Legacy score shown as secondary */}
          {summary.avgScoreThisWeek !== undefined && (
            <Text style={styles.legacyScoreNote}>Legacy Avg Score: {summary.avgScoreThisWeek}</Text>
          )}
        </View>
      )}

      {/* Trait bars */}
      {summary.traits.map((trait) => (
        <TraitBarCard
          key={trait.traitKey}
          traitKey={trait.traitKey}
          current={trait.current}
          weeklyDelta={trait.weeklyDelta}
          historyPoints={historyByTrait.get(trait.traitKey) ?? []}
          improvement={summary.improvements[trait.traitKey]}
          onImprovePress={() => setSelectedTrait(trait.traitKey)}
        />
      ))}

      {/* Improvement modal */}
      {selectedTrait && summary.improvements[selectedTrait] && (
        <TraitImprovementModal
          visible={selectedTrait !== null}
          traitKey={selectedTrait}
          improvement={summary.improvements[selectedTrait]}
          onClose={() => setSelectedTrait(null)}
          onNavigateToFreePlay={() => {
            navigation.navigate('FreePlayConfig');
            setSelectedTrait(null);
          }}
          onNavigateToMissionRoad={() => {
            navigation.navigate('MissionRoad');
            setSelectedTrait(null);
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  errorBox: {
    borderRadius: 12,
    backgroundColor: '#7F1D1D',
    padding: 16,
    width: '100%',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FCA5A5',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#0B1220',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  weekInfo: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  weekInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  weekInfoSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  // Phase 3: Checklist metrics card
  checklistCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  checklistCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  checklistMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  checklistMetric: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
  },
  checklistMetricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
    marginBottom: 4,
  },
  checklistMetricLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  legacyScoreNote: {
    marginTop: 12,
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
