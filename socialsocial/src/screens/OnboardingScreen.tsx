// FILE: socialsocial/src/screens/OnboardingScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppState } from '../store/appState';
import { AppState } from '../api/meService';
import {
  updateOnboardingPreferences,
  skipOnboarding,
  completeOnboarding,
  MainGoal,
  CommitmentLevel,
  Gender,
  AttractionPreference,
  OnboardingPreferencesPayload,
} from '../api/onboardingService';
import { OnboardingStepGender } from '../components/onboarding/OnboardingStepGender';
import { OnboardingStepGoal } from '../components/onboarding/OnboardingStepGoal';
import { OnboardingStepCommitment } from '../components/onboarding/OnboardingStepCommitment';
import { OnboardingStepAssessment } from '../components/onboarding/OnboardingStepAssessment';
import { OnboardingStepPreferences } from '../components/onboarding/OnboardingStepPreferences';
import { OnboardingStepNotifications } from '../components/onboarding/OnboardingStepNotifications';
import { OnboardingStepSummary } from '../components/onboarding/OnboardingStepSummary';

type OnboardingDraft = {
  gender?: Gender;
  attractedTo?: AttractionPreference;
  mainGoal?: MainGoal;
  goalTags?: string[];
  dailyEffortMinutes?: number;
  commitmentLevel?: CommitmentLevel;
  selfRatedLevel?: number;
  wantsHarshFeedback?: boolean;
  preferredStyles?: string[];
  interestTags?: string[];
  notificationsEnabled?: boolean;
  preferredReminderTime?: string;
  language?: string;
};

function getInitialStep(appState: AppState | null): number {
  if (!appState) return 1;
  const step = appState.user.onboardingStep ?? 0;

  if (step <= 0) return 1;
  if (step >= 7) return 7; // If somehow > 6, clamp to summary
  return step;
}

export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const appState = useAppState((s) => s.appState);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<OnboardingDraft>({});

  // Initialize step and draft from appState
  useEffect(() => {
    if (appState) {
      const initialStep = getInitialStep(appState);
      setCurrentStep(initialStep);

      // Initialize draft from appState.preferences
      setDraft({
        gender: (appState.preferences.gender as Gender) || undefined,
        attractedTo: (appState.preferences.attractedTo as AttractionPreference) || undefined,
        mainGoal: (appState.preferences.mainGoal as MainGoal) || undefined,
        goalTags: appState.preferences.interestTags || [],
        dailyEffortMinutes: appState.preferences.dailyEffortMinutes || undefined,
        commitmentLevel: (appState.preferences.commitmentLevel as CommitmentLevel) || undefined,
        selfRatedLevel: appState.preferences.selfRatedLevel || undefined,
        wantsHarshFeedback: appState.preferences.wantsHarshFeedback ?? undefined,
        preferredStyles: appState.preferences.preferredStyles || [],
        interestTags: appState.preferences.interestTags || [],
        notificationsEnabled: appState.preferences.notificationsEnabled || false,
        preferredReminderTime: appState.preferences.preferredReminderTime || undefined,
      });
    }
  }, [appState]);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!draft.gender && !!draft.attractedTo;
      case 2:
        return !!draft.mainGoal;
      case 3:
        return !!draft.commitmentLevel && !!draft.dailyEffortMinutes && draft.dailyEffortMinutes >= 1;
      case 4:
        return draft.selfRatedLevel !== null && draft.selfRatedLevel !== undefined && draft.wantsHarshFeedback !== null && draft.wantsHarshFeedback !== undefined;
      case 5:
        return draft.preferredStyles && draft.preferredStyles.length > 0;
      case 6:
        // Notifications are optional
        return true;
      default:
        return true;
    }
  };

  const buildPayloadForStep = (step: number): OnboardingPreferencesPayload => {
    const base: OnboardingPreferencesPayload = { stepNumber: step };

    switch (step) {
      case 1:
        if (draft.gender) base.gender = draft.gender;
        if (draft.attractedTo) base.attractedTo = draft.attractedTo;
        break;
      case 2:
        if (draft.mainGoal) base.mainGoal = draft.mainGoal;
        if (draft.goalTags && draft.goalTags.length > 0) base.goalTags = draft.goalTags;
        break;
      case 3:
        if (draft.commitmentLevel) base.commitmentLevel = draft.commitmentLevel;
        if (draft.dailyEffortMinutes) base.dailyEffortMinutes = draft.dailyEffortMinutes;
        break;
      case 4:
        if (draft.selfRatedLevel !== undefined) base.selfRatedLevel = draft.selfRatedLevel;
        if (draft.wantsHarshFeedback !== undefined) base.wantsHarshFeedback = draft.wantsHarshFeedback;
        break;
      case 5:
        if (draft.preferredStyles) base.preferredStyles = draft.preferredStyles;
        if (draft.interestTags) base.interestTags = draft.interestTags;
        break;
      case 6:
        base.notificationsEnabled = draft.notificationsEnabled ?? false;
        if (draft.preferredReminderTime) base.preferredReminderTime = draft.preferredReminderTime;
        break;
    }

    return base;
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      setError('Please complete all required fields');
      return;
    }

    if (currentStep >= 7) return; // Already at summary

    setIsSaving(true);
    setError(null);

    try {
      const payload = buildPayloadForStep(currentStep);
      await updateOnboardingPreferences(payload);
      await useAppState.getState().fetchAppState();

      if (currentStep < 7) {
        setCurrentStep(currentStep + 1);
      }
    } catch (e: any) {
      console.log('[OnboardingScreen] handleNext error', e);
      const backendMsg =
        e?.response?.data?.error?.message || e?.message || 'Failed to save. Please try again.';
      setError(backendMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip onboarding?',
      'We will use default settings. You can personalize later.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', style: 'destructive', onPress: handleConfirmSkip },
      ],
    );
  };

  const handleConfirmSkip = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await skipOnboarding();
      await useAppState.getState().fetchAppState();

      // Read fresh state from store after fetch
      const nextState = useAppState.getState().appState;

      if (!nextState) {
        setError('Failed to refresh state. Please try again.');
        setIsSaving(false);
        return;
      }

      // Navigation only happens here, inside try block, after successful API call
      if (!nextState.user.profileCompleted) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ProfileSetup' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      }
    } catch (e: any) {
      console.log('[OnboardingScreen] handleConfirmSkip error', e);
      const backendMsg =
        e?.response?.data?.error?.message || e?.message || 'Failed to skip. Please try again.';
      setError(backendMsg);
      // NO navigation in catch block
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await completeOnboarding();
      await useAppState.getState().fetchAppState();

      // Read fresh state from store after fetch
      const nextState = useAppState.getState().appState;

      if (!nextState) {
        setError('Failed to refresh state. Please try again.');
        setIsSaving(false);
        return;
      }

      // Navigation only happens here, inside try block, after successful API call
      if (!nextState.user.profileCompleted) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ProfileSetup' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      }
    } catch (e: any) {
      console.log('[OnboardingScreen] handleComplete error', e);
      const backendMsg =
        e?.response?.data?.error?.message || e?.message || 'Failed to complete. Please try again.';
      setError(backendMsg);
      // NO navigation in catch block
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep = () => {
    if (!appState) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <OnboardingStepGender
            gender={draft.gender}
            attractedTo={draft.attractedTo}
            onChangeGender={(value) => setDraft({ ...draft, gender: value })}
            onChangeAttractedTo={(value) => setDraft({ ...draft, attractedTo: value })}
          />
        );
      case 2:
        return (
          <OnboardingStepGoal
            mainGoal={draft.mainGoal}
            goalTags={draft.goalTags || []}
            onChangeMainGoal={(value) => setDraft({ ...draft, mainGoal: value })}
            onChangeGoalTags={(tags) => setDraft({ ...draft, goalTags: tags })}
          />
        );
      case 3:
        return (
          <OnboardingStepCommitment
            commitmentLevel={draft.commitmentLevel}
            dailyEffortMinutes={draft.dailyEffortMinutes || null}
            onChangeCommitmentLevel={(value) => setDraft({ ...draft, commitmentLevel: value })}
            onChangeDailyEffortMinutes={(value) => setDraft({ ...draft, dailyEffortMinutes: value })}
          />
        );
      case 4:
        return (
          <OnboardingStepAssessment
            selfRatedLevel={draft.selfRatedLevel || null}
            wantsHarshFeedback={draft.wantsHarshFeedback ?? null}
            onChangeSelfRatedLevel={(value) => setDraft({ ...draft, selfRatedLevel: value })}
            onChangeWantsHarshFeedback={(value) => setDraft({ ...draft, wantsHarshFeedback: value })}
          />
        );
      case 5:
        return (
          <OnboardingStepPreferences
            preferredStyles={draft.preferredStyles || []}
            interestTags={draft.interestTags || []}
            onChangePreferredStyles={(styles) => setDraft({ ...draft, preferredStyles: styles })}
            onChangeInterestTags={(tags) => setDraft({ ...draft, interestTags: tags })}
          />
        );
      case 6:
        return (
          <OnboardingStepNotifications
            notificationsEnabled={draft.notificationsEnabled ?? false}
            preferredReminderTime={draft.preferredReminderTime || null}
            onChangeNotificationsEnabled={(value) => setDraft({ ...draft, notificationsEnabled: value })}
            onChangePreferredReminderTime={(value) => setDraft({ ...draft, preferredReminderTime: value })}
          />
        );
      case 7:
        return <OnboardingStepSummary appState={appState} />;
      default:
        return null;
    }
  };

  const progress = (currentStep / 7) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.stepText}>Step {currentStep} of 7</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>{renderStep()}</View>

      {/* Error message */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Footer buttons */}
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, currentStep === 1 && styles.buttonDisabled]}
            disabled={currentStep === 1 || isSaving}
            onPress={handleBack}
          >
            <Text style={styles.buttonTextSecondary}>Back</Text>
          </TouchableOpacity>

          {currentStep < 7 ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.buttonSkip]}
                disabled={isSaving}
                onPress={handleSkip}
              >
                <Text style={styles.buttonTextSkip}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary, isSaving && styles.buttonDisabled]}
                disabled={isSaving}
                onPress={handleNext}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonTextPrimary}>Next</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary, styles.buttonFinish, isSaving && styles.buttonDisabled]}
              disabled={isSaving}
              onPress={handleComplete}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonTextPrimary}>Finish</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  stepText: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  body: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#aaa',
  },
  errorText: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    color: '#ff6b6b',
    textAlign: 'center',
    fontSize: 14,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonPrimary: {
    backgroundColor: '#22c55e',
  },
  buttonSecondary: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
  },
  buttonSkip: {
    backgroundColor: 'transparent',
  },
  buttonFinish: {
    flex: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonTextSkip: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
