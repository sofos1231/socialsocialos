// FILE: socialsocial/src/components/onboarding/OnboardingStepCommitment.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { CommitmentLevel } from '../../api/onboardingService';

type OnboardingStepCommitmentProps = {
  commitmentLevel?: CommitmentLevel;
  dailyEffortMinutes: number | null;
  onChangeCommitmentLevel: (value: CommitmentLevel) => void;
  onChangeDailyEffortMinutes: (value: number) => void;
};

const COMMITMENT_OPTIONS: { value: CommitmentLevel; label: string; hint: string }[] = [
  { value: 'LOW', label: 'Low', hint: '5-10 min/day' },
  { value: 'MEDIUM', label: 'Medium', hint: '15-30 min/day' },
  { value: 'HIGH', label: 'High', hint: '30-60 min/day' },
  { value: 'EXTREME', label: 'Extreme', hint: '60+ min/day' },
];

export function OnboardingStepCommitment({
  commitmentLevel,
  dailyEffortMinutes,
  onChangeCommitmentLevel,
  onChangeDailyEffortMinutes,
}: OnboardingStepCommitmentProps) {
  const minutesStr = dailyEffortMinutes?.toString() || '';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How committed are you?</Text>
      <Text style={styles.subtitle}>Choose your commitment level</Text>

      <View style={styles.options}>
        {COMMITMENT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              commitmentLevel === option.value && styles.optionSelected,
            ]}
            onPress={() => onChangeCommitmentLevel(option.value)}
          >
            <View style={styles.optionContent}>
              <Text
                style={[
                  styles.optionLabel,
                  commitmentLevel === option.value && styles.optionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
              <Text style={styles.optionHint}>{option.hint}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.minutesSection}>
        <Text style={styles.minutesLabel}>Daily practice time (minutes)</Text>
        <TextInput
          style={styles.minutesInput}
          value={minutesStr}
          onChangeText={(text) => {
            const num = parseInt(text, 10);
            if (!isNaN(num) && num >= 1 && num <= 480) {
              onChangeDailyEffortMinutes(num);
            } else if (text === '') {
              onChangeDailyEffortMinutes(0);
            }
          }}
          placeholder="15"
          placeholderTextColor="#666"
          keyboardType="numeric"
        />
        <Text style={styles.minutesHint}>1-480 minutes</Text>
      </View>

      {(!commitmentLevel || !dailyEffortMinutes || dailyEffortMinutes < 1) && (
        <Text style={styles.hint}>Please select commitment level and enter daily minutes</Text>
      )}
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
  options: {
    gap: 12,
    marginBottom: 32,
  },
  option: {
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  optionSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#1a3a2a',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 18,
    color: '#ccc',
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: '#22c55e',
  },
  optionHint: {
    fontSize: 14,
    color: '#666',
  },
  minutesSection: {
    marginTop: 16,
  },
  minutesLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '500',
  },
  minutesInput: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  minutesHint: {
    fontSize: 12,
    color: '#666',
  },
  hint: {
    marginTop: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    fontSize: 14,
  },
});

