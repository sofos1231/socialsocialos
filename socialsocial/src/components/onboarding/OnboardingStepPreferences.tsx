// FILE: socialsocial/src/components/onboarding/OnboardingStepPreferences.tsx

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';

type OnboardingStepPreferencesProps = {
  preferredStyles: string[];
  interestTags: string[];
  onChangePreferredStyles: (styles: string[]) => void;
  onChangeInterestTags: (tags: string[]) => void;
};

const STYLE_OPTIONS = [
  'CHILL',
  'PLAYFUL',
  'DIRECT',
  'FLIRTY',
  'PROFESSIONAL',
  'FRIENDLY',
  'CONFIDENT',
  'HUMOROUS',
];

export function OnboardingStepPreferences({
  preferredStyles,
  interestTags,
  onChangePreferredStyles,
  onChangeInterestTags,
}: OnboardingStepPreferencesProps) {
  const [tagInput, setTagInput] = useState('');

  const toggleStyle = (style: string) => {
    if (preferredStyles.includes(style)) {
      onChangePreferredStyles(preferredStyles.filter((s) => s !== style));
    } else {
      onChangePreferredStyles([...preferredStyles, style]);
    }
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !interestTags.includes(trimmed)) {
      onChangeInterestTags([...interestTags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    onChangeInterestTags(interestTags.filter((t) => t !== tag));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Personalize Your Experience</Text>
      <Text style={styles.subtitle}>Choose your preferred styles and interests</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferred Styles</Text>
        <View style={styles.styleGrid}>
          {STYLE_OPTIONS.map((style) => (
            <TouchableOpacity
              key={style}
              style={[
                styles.styleChip,
                preferredStyles.includes(style) && styles.styleChipSelected,
              ]}
              onPress={() => toggleStyle(style)}
            >
              <Text
                style={[
                  styles.styleChipText,
                  preferredStyles.includes(style) && styles.styleChipTextSelected,
                ]}
              >
                {style}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Interest Tags</Text>
        <View style={styles.tagInputContainer}>
          <TextInput
            style={styles.tagInput}
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="Add interest (e.g., tinder, networking)"
            placeholderTextColor="#666"
            onSubmitEditing={addTag}
          />
          <TouchableOpacity style={styles.tagAddButton} onPress={addTag}>
            <Text style={styles.tagAddButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        {interestTags.length > 0 && (
          <View style={styles.tagsContainer}>
            {interestTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.tagChip}
                onPress={() => removeTag(tag)}
              >
                <Text style={styles.tagChipText}>{tag}</Text>
                <Text style={styles.tagChipRemove}>×</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.hint}>
        {preferredStyles.length === 0
          ? 'Select at least one preferred style'
          : 'You can skip interest tags if you prefer'}
      </Text>
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
  section: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    fontWeight: '500',
  },
  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#111',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#333',
  },
  styleChipSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#1a3a2a',
  },
  styleChipText: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '500',
  },
  styleChipTextSelected: {
    color: '#22c55e',
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
  },
  tagAddButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#22c55e',
    borderRadius: 8,
    justifyContent: 'center',
  },
  tagAddButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#222',
    borderRadius: 16,
    gap: 6,
  },
  tagChipText: {
    fontSize: 14,
    color: '#fff',
  },
  tagChipRemove: {
    fontSize: 18,
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  hint: {
    marginTop: 8,
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
  },
});

