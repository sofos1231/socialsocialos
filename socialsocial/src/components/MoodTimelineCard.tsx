// socialsocial/src/components/MoodTimelineCard.tsx
// Reusable mood timeline card component for mission-specific insights

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { MoodTimelineResponse, MoodState } from '../types/InsightsDTO';

interface MoodTimelineCardProps {
  moodTimeline: MoodTimelineResponse | null;
  loading?: boolean;
  error?: string | null;
}

export default function MoodTimelineCard({ moodTimeline, loading = false, error = null }: MoodTimelineCardProps) {
  const renderMoodChart = (snapshots: Array<{ turnIndex: number; smoothedMoodScore: number; moodState: MoodState }>) => {
    if (!snapshots || snapshots.length === 0) return null;

    const width = 300;
    const height = 60;
    const padding = 8;

    const scores = snapshots.map(s => s.smoothedMoodScore);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min || 1;

    // Color mapping for mood states
    const getMoodColor = (state: MoodState): string => {
      switch (state) {
        case 'COLD': return '#3b82f6'; // blue
        case 'NEUTRAL': return '#9ca3af'; // gray
        case 'WARM': return '#f97316'; // orange
        case 'TENSE': return '#ef4444'; // red
        case 'FLOW': return '#22c55e'; // green
        default: return '#9ca3af';
      }
    };

    // Generate points for polyline
    const points = snapshots.map((snapshot, index) => {
      const x = padding + (index / (snapshots.length - 1 || 1)) * (width - 2 * padding);
      const y = height - padding - ((snapshot.smoothedMoodScore - min) / range) * (height - 2 * padding);
      return { x, y, color: getMoodColor(snapshot.moodState) };
    });

    const svgPoints = points.map(p => `${p.x},${p.y}`).join(' ');

    return (
      <View style={styles.moodChartWrapper}>
        <Svg width={width} height={height}>
          <Polyline
            points={svgPoints}
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
          />
        </Svg>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mood Timeline</Text>
        <ActivityIndicator size="small" color="#22c55e" />
        <Text style={styles.cardTextMuted}>Loading mood timeline...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mood Timeline</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!moodTimeline) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mood Timeline</Text>
        <Text style={styles.cardSubtitle}>How the AI's mood shifted during this mission</Text>
        <Text style={styles.cardTextMuted}>Mood timeline is not available for this mission yet.</Text>
      </View>
    );
  }

  // Defensive access to nested properties
  const snapshots = moodTimeline?.payload?.snapshots ?? [];
  const insights = moodTimeline?.insights ?? [];
  const current = moodTimeline?.current ?? { moodState: 'NEUTRAL' as MoodState, moodPercent: 50 };

  if (snapshots.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mood Timeline</Text>
        <Text style={styles.cardSubtitle}>How the AI's mood shifted during this mission</Text>
        <Text style={styles.cardTextMuted}>No mood changes were tracked for this mission.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Mood Timeline</Text>
      <Text style={styles.cardSubtitle}>How the AI's mood shifted during this mission</Text>
      <Text style={styles.currentMoodText}>
        Current: {current.moodState} ({current.moodPercent}%)
      </Text>
      
      {/* Simple line chart */}
      <View style={styles.moodChartContainer}>
        {renderMoodChart(snapshots)}
      </View>

      {/* Top mood insights */}
      {insights.length > 0 && (
        <>
          <Text style={styles.insightsTitle}>Mood Insights</Text>
          {insights.slice(0, 3).map((insight, idx) => (
            <View key={insight.id || idx} style={styles.insightRow}>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightBody}>{insight.body}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: '#111827',
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#F9FAFB',
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  cardTextMuted: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  currentMoodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 12,
  },
  moodChartContainer: {
    marginVertical: 12,
    alignItems: 'center',
  },
  moodChartWrapper: {
    width: 300,
    height: 60,
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
    marginTop: 12,
    marginBottom: 8,
  },
  insightRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 4,
  },
  insightBody: {
    fontSize: 13,
    color: '#93C5FD',
  },
});

