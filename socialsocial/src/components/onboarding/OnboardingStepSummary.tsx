// FILE: socialsocial/src/components/onboarding/OnboardingStepSummary.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppState } from '../../api/meService';

type OnboardingStepSummaryProps = {
  appState: AppState;
};

export function OnboardingStepSummary({ appState }: OnboardingStepSummaryProps) {
  const prefs = appState.preferences;

  const getGoalLabel = (goal: string | null) => {
    switch (goal) {
      case 'DATING':
        return 'Dating';
      case 'SOCIAL':
        return 'Social Skills';
      case 'CAREER':
        return 'Career';
      case 'ALL':
        return 'All of the Above';
      default:
        return 'Not set';
    }
  };

  const getCommitmentLabel = (level: string | null) => {
    switch (level) {
      case 'LOW':
        return 'Low';
      case 'MEDIUM':
        return 'Medium';
      case 'HIGH':
        return 'High';
      case 'EXTREME':
        return 'Extreme';
      default:
        return 'Not set';
    }
  };

  const getGenderLabel = (gender: string | null) => {
    switch (gender) {
      case 'MALE':
        return 'Man';
      case 'FEMALE':
        return 'Woman';
      case 'OTHER':
        return 'Other';
      default:
        return 'Not set';
    }
  };

  const getAttractionLabel = (attractedTo: string | null) => {
    switch (attractedTo) {
      case 'WOMEN':
        return 'Women';
      case 'MEN':
        return 'Men';
      case 'BOTH':
        return 'Both';
      case 'OTHER':
        return "Not here for dating";
      default:
        return 'Not set';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Review Your Preferences</Text>
      <Text style={styles.subtitle}>Make sure everything looks good before finishing</Text>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Gender:</Text>
          <Text style={styles.summaryValue}>{getGenderLabel(prefs.gender)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Attraction:</Text>
          <Text style={styles.summaryValue}>{getAttractionLabel(prefs.attractedTo)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Main Goal:</Text>
          <Text style={styles.summaryValue}>{getGoalLabel(prefs.mainGoal)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Commitment:</Text>
          <Text style={styles.summaryValue}>{getCommitmentLabel(prefs.commitmentLevel)}</Text>
        </View>

        {prefs.dailyEffortMinutes && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Daily Minutes:</Text>
            <Text style={styles.summaryValue}>{prefs.dailyEffortMinutes} min</Text>
          </View>
        )}

        {prefs.selfRatedLevel && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Skill Level:</Text>
            <Text style={styles.summaryValue}>{prefs.selfRatedLevel}/10</Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Feedback Style:</Text>
          <Text style={styles.summaryValue}>
            {prefs.wantsHarshFeedback ? 'Direct & Honest' : 'Gentle & Encouraging'}
          </Text>
        </View>

        {prefs.preferredStyles && prefs.preferredStyles.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Preferred Styles:</Text>
            <Text style={styles.summaryValue}>{prefs.preferredStyles.join(', ')}</Text>
          </View>
        )}

        {prefs.interestTags && prefs.interestTags.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Interests:</Text>
            <Text style={styles.summaryValue}>{prefs.interestTags.join(', ')}</Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Notifications:</Text>
          <Text style={styles.summaryValue}>
            {prefs.notificationsEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>

        {prefs.notificationsEnabled && prefs.preferredReminderTime && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Reminder Time:</Text>
            <Text style={styles.summaryValue}>{prefs.preferredReminderTime}</Text>
          </View>
        )}
      </View>

      <Text style={styles.footer}>Ready to start your journey!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 32,
    textAlign: 'center',
  },
  summary: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#aaa',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  footer: {
    marginTop: 32,
    fontSize: 18,
    color: '#22c55e',
    textAlign: 'center',
    fontWeight: '600',
  },
});

