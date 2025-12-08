// FILE: socialsocial/src/components/onboarding/OnboardingStepGoal.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MainGoal } from '../../api/onboardingService';

type OnboardingStepGoalProps = {
  mainGoal?: MainGoal;
  goalTags: string[];
  onChangeMainGoal: (value: MainGoal) => void;
  onChangeGoalTags: (tags: string[]) => void;
};

const GOAL_OPTIONS: { value: MainGoal; label: string; emoji: string }[] = [
  { value: 'DATING', label: 'Dating', emoji: '💕' },
  { value: 'SOCIAL', label: 'Social Skills', emoji: '👥' },
  { value: 'CAREER', label: 'Career', emoji: '💼' },
  { value: 'ALL', label: 'All of the Above', emoji: '🌟' },
];

export function OnboardingStepGoal({
  mainGoal,
  goalTags,
  onChangeMainGoal,
  onChangeGoalTags,
}: OnboardingStepGoalProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>What brings you here?</Text>
      <Text style={styles.subtitle}>Choose your main focus area</Text>

      <View style={styles.options}>
        {GOAL_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              mainGoal === option.value && styles.optionSelected,
            ]}
            onPress={() => onChangeMainGoal(option.value)}
          >
            <Text style={styles.optionEmoji}>{option.emoji}</Text>
            <Text
              style={[
                styles.optionLabel,
                mainGoal === option.value && styles.optionLabelSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!mainGoal && (
        <Text style={styles.hint}>Please select a goal to continue</Text>
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
    gap: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
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
  optionEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 18,
    color: '#ccc',
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: '#22c55e',
  },
  hint: {
    marginTop: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    fontSize: 14,
  },
});

