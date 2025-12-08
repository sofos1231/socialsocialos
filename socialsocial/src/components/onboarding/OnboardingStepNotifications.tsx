// FILE: socialsocial/src/components/onboarding/OnboardingStepNotifications.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';

type OnboardingStepNotificationsProps = {
  notificationsEnabled: boolean;
  preferredReminderTime: string | null;
  onChangeNotificationsEnabled: (value: boolean) => void;
  onChangePreferredReminderTime: (value: string) => void;
};

const TIME_OPTIONS = [
  '08:00',
  '09:00',
  '12:00',
  '17:00',
  '20:00',
  '21:00',
];

export function OnboardingStepNotifications({
  notificationsEnabled,
  preferredReminderTime,
  onChangeNotificationsEnabled,
  onChangePreferredReminderTime,
}: OnboardingStepNotificationsProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stay on Track</Text>
      <Text style={styles.subtitle}>Enable notifications to keep your practice consistent</Text>

      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Enable Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={onChangeNotificationsEnabled}
            trackColor={{ false: '#333', true: '#22c55e' }}
            thumbColor={notificationsEnabled ? '#fff' : '#ccc'}
          />
        </View>
      </View>

      {notificationsEnabled && (
        <View style={styles.section}>
          <Text style={styles.timeLabel}>Preferred Reminder Time</Text>
          <View style={styles.timeGrid}>
            {TIME_OPTIONS.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeButton,
                  preferredReminderTime === time && styles.timeButtonSelected,
                ]}
                onPress={() => onChangePreferredReminderTime(time)}
              >
                <Text
                  style={[
                    styles.timeButtonText,
                    preferredReminderTime === time && styles.timeButtonTextSelected,
                  ]}
                >
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {!notificationsEnabled && (
        <Text style={styles.hint}>You can enable notifications later in settings</Text>
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
  section: {
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111',
    borderRadius: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  timeLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    fontWeight: '500',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#111',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
  },
  timeButtonSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#1a3a2a',
  },
  timeButtonText: {
    fontSize: 16,
    color: '#ccc',
    fontWeight: '500',
  },
  timeButtonTextSelected: {
    color: '#22c55e',
  },
  hint: {
    marginTop: 16,
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
  },
});

