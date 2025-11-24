// FILE: socialsocial/src/screens/PracticeHubScreen.tsx

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PracticeStackParamList } from '../navigation/types';
import { useDashboardLoop } from '../hooks/useDashboardLoop';
import DashboardMiniStatsCard from '../app/components/DashboardMiniStatsCard';

type Props = NativeStackScreenProps<PracticeStackParamList, 'PracticeHub'>;

export default function PracticeHubScreen({ navigation }: Props) {
  const { summary, isLoading, error, reload } = useDashboardLoop();

  const stats: any = (summary as any)?.stats ?? {};
  const latest = stats.latest ?? null;

  const handleTextPractice = () =>
    navigation.navigate('TextPractice' as never);
  const handleVoicePractice = () =>
    navigation.navigate('VoicePractice' as never);
  const handleABPractice = () =>
    navigation.navigate('ABPractice' as never);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Practice Hub</Text>

      {/* Top mini dashboard – XP, streak, coins, gems, last session score */}
      <DashboardMiniStatsCard />

      {isLoading && (
        <Text style={styles.muted}>Loading dashboard…</Text>
      )}

      {error && !isLoading && (
        <Text style={styles.errorText} onPress={reload}>
          Failed to load dashboard – tap to retry
        </Text>
      )}

      {latest && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last session</Text>
          <Text style={styles.cardText}>Score: {latest.score ?? '-'}</Text>
          <Text style={styles.cardText}>
            XP gained: {latest.totalXp ?? '-'}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose a practice mode</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleTextPractice}
        >
          <Text style={styles.buttonTitle}>Text mission</Text>
          <Text style={styles.buttonSubtitle}>
            Chat-based practice with AI
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleVoicePractice}
        >
          <Text style={styles.buttonTitle}>Voice mission</Text>
          <Text style={styles.buttonSubtitle}>
            Speak and get instant feedback
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleABPractice}
        >
          <Text style={styles.buttonTitle}>A/B mission</Text>
          <Text style={styles.buttonSubtitle}>
            Compare two different approaches
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  muted: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#FCA5A5',
    marginBottom: 8,
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#111827',
    padding: 12,
    marginBottom: 16,
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
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  button: {
    borderRadius: 12,
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  buttonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  buttonSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
