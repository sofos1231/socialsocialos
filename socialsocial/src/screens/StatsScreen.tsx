// FILE: socialsocial/src/screens/StatsScreen.tsx

import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDashboardLoop } from '../hooks/useDashboardLoop';

export default function StatsScreen() {
  const { summary, isLoading, error, reload } = useDashboardLoop();

  const stats: any = (summary as any)?.stats ?? {};
  const latest = stats.latest ?? {};
  const insights: string[] = stats.insights ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Stats</Text>

      {isLoading && (
        <View style={styles.centerRow}>
          <ActivityIndicator />
          <Text style={styles.label}>Loading dashboard…</Text>
        </View>
      )}

      {error && !isLoading && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Failed to load</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.reloadHint} onPress={reload}>
            Tap here to retry
          </Text>
        </View>
      )}

      {!isLoading && !error && summary && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Latest session</Text>
            <Text style={styles.cardText}>
              Score: {latest.score ?? '-'}
            </Text>
            <Text style={styles.cardText}>
              XP gained: {latest.totalXp ?? '-'}
            </Text>
          </View>

          {!!insights?.length && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Insights</Text>
              {insights.map((line, index) => (
                <Text key={index.toString()} style={styles.cardText}>
                  • {line}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Raw dashboard</Text>
            <Text style={styles.mono}>
              {JSON.stringify(summary, null, 2)}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginLeft: 8,
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#111827',
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: '#E5E7EB',
    marginBottom: 2,
  },
  mono: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#9CA3AF',
  },
  errorBox: {
    borderRadius: 12,
    backgroundColor: '#7F1D1D',
    padding: 12,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#FCA5A5',
  },
  reloadHint: {
    marginTop: 8,
    fontSize: 14,
    color: '#93C5FD',
    textDecorationLine: 'underline',
  },
});
