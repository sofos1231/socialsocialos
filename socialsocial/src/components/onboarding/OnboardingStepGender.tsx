// FILE: socialsocial/src/components/onboarding/OnboardingStepGender.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Gender, AttractionPreference } from '../../api/onboardingService';

type OnboardingStepGenderProps = {
  gender?: Gender;
  attractedTo?: AttractionPreference;
  onChangeGender: (value: Gender) => void;
  onChangeAttractedTo: (value: AttractionPreference) => void;
};

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE', label: 'Man' },
  { value: 'FEMALE', label: 'Woman' },
  { value: 'OTHER', label: 'Other / Prefer not to say' },
];

const ATTRACTION_OPTIONS: { value: AttractionPreference; label: string }[] = [
  { value: 'WOMEN', label: 'Women' },
  { value: 'MEN', label: 'Men' },
  { value: 'BOTH', label: 'Both' },
  { value: 'OTHER', label: "I'm not here for dating" },
];

export function OnboardingStepGender({
  gender,
  attractedTo,
  onChangeGender,
  onChangeAttractedTo,
}: OnboardingStepGenderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tell us about yourself</Text>
      <Text style={styles.subtitle}>This helps us personalize your experience</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gender</Text>
        <View style={styles.options}>
          {GENDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                gender === option.value && styles.optionSelected,
              ]}
              onPress={() => onChangeGender(option.value)}
            >
              <Text
                style={[
                  styles.optionLabel,
                  gender === option.value && styles.optionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attraction Preference</Text>
        <View style={styles.options}>
          {ATTRACTION_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                attractedTo === option.value && styles.optionSelected,
              ]}
              onPress={() => onChangeAttractedTo(option.value)}
            >
              <Text
                style={[
                  styles.optionLabel,
                  attractedTo === option.value && styles.optionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
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
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  options: {
    gap: 12,
  },
  option: {
    backgroundColor: '#1b1b1b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2a2a2a',
  },
  optionSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#1a3a2a',
  },
  optionLabel: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: '#22c55e',
    fontWeight: '600',
  },
});

