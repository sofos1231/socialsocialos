// socialsocial/src/screens/stats/StatsTipsScreen.tsx
// Full-screen Tips / Message Analyzer view

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatsStackParamList } from '../../navigation/types';
import SocialTipsTab from './SocialTipsTab';
import { fetchStatsSummary, StatsSummaryResponse } from '../../api/statsService';

type NavigationProp = NativeStackNavigationProp<StatsStackParamList>;

export default function StatsTipsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [isPremium, setIsPremium] = useState(false);

  // Fetch premium status on mount (same logic as old StatsScreen)
  useEffect(() => {
    fetchStatsSummary()
      .then((stats: StatsSummaryResponse) => {
        setIsPremium(stats.isPremium);
      })
      .catch((err) => {
        console.warn('[StatsTipsScreen] Failed to load premium status:', err);
        setIsPremium(false);
      });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tips</Text>
        <View style={styles.headerSpacer} />
      </View>
      <SocialTipsTab isPremium={isPremium} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  headerSpacer: {
    width: 60, // Balance the back button width
  },
});

