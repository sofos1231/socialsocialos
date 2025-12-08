// FILE: socialsocial/src/components/onboarding/OnboardingStepAssessment.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type OnboardingStepAssessmentProps = {
  selfRatedLevel: number | null;
  wantsHarshFeedback: boolean | null;
  onChangeSelfRatedLevel: (value: number) => void;
  onChangeWantsHarshFeedback: (value: boolean) => void;
};

export function OnboardingStepAssessment({
  selfRatedLevel,
  wantsHarshFeedback,
  onChangeSelfRatedLevel,
  onChangeWantsHarshFeedback,
}: OnboardingStepAssessmentProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where are you now?</Text>
      <Text style={styles.subtitle}>Rate your current social skills level</Text>

      <View style={styles.levelSection}>
        <Text style={styles.levelLabel}>Skill Level (1-10)</Text>
        <View style={styles.levelButtons}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.levelButton,
                selfRatedLevel === level && styles.levelButtonSelected,
              ]}
              onPress={() => onChangeSelfRatedLevel(level)}
            >
              <Text
                style={[
                  styles.levelButtonText,
                  selfRatedLevel === level && styles.levelButtonTextSelected,
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.levelHint}>
          {selfRatedLevel
            ? `You selected level ${selfRatedLevel}`
            : 'Select your current skill level'}
        </Text>
      </View>

      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackLabel}>Feedback Style</Text>
        <View style={styles.feedbackOptions}>
          <TouchableOpacity
            style={[
              styles.feedbackOption,
              wantsHarshFeedback === false && styles.feedbackOptionSelected,
            ]}
            onPress={() => onChangeWantsHarshFeedback(false)}
          >
            <Text
              style={[
                styles.feedbackOptionText,
                wantsHarshFeedback === false && styles.feedbackOptionTextSelected,
              ]}
            >
              Gentle & Encouraging
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.feedbackOption,
              wantsHarshFeedback === true && styles.feedbackOptionSelected,
            ]}
            onPress={() => onChangeWantsHarshFeedback(true)}
          >
            <Text
              style={[
                styles.feedbackOptionText,
                wantsHarshFeedback === true && styles.feedbackOptionTextSelected,
              ]}
            >
              Direct & Honest
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {(!selfRatedLevel || wantsHarshFeedback === null) && (
        <Text style={styles.hint}>Please select your skill level and feedback preference</Text>
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
  levelSection: {
    marginBottom: 32,
  },
  levelLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    fontWeight: '500',
  },
  levelButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  levelButton: {
    width: 50,
    height: 50,
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelButtonSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#1a3a2a',
  },
  levelButtonText: {
    fontSize: 18,
    color: '#ccc',
    fontWeight: '600',
  },
  levelButtonTextSelected: {
    color: '#22c55e',
  },
  levelHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  feedbackSection: {
    marginTop: 16,
  },
  feedbackLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    fontWeight: '500',
  },
  feedbackOptions: {
    gap: 12,
  },
  feedbackOption: {
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
  },
  feedbackOptionSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#1a3a2a',
  },
  feedbackOptionText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    fontWeight: '500',
  },
  feedbackOptionTextSelected: {
    color: '#22c55e',
  },
  hint: {
    marginTop: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    fontSize: 14,
  },
});

