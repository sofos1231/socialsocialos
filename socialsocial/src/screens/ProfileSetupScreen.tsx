// FILE: socialsocial/src/screens/ProfileSetupScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppState } from '../store/appState';
import { setupProfile } from '../api/profileService';

const DEFAULT_AVATARS = [
  { id: 'default_01', label: '🔥' },
  { id: 'default_02', label: '😎' },
  { id: 'default_03', label: '🧠' },
  { id: 'default_04', label: '🧩' },
  { id: 'default_05', label: '⚡' },
  { id: 'default_06', label: '🎯' },
];

export default function ProfileSetupScreen() {
  const navigation = useNavigation<any>();
  const appState = useAppState((s) => s.appState);
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from appState if available
  useEffect(() => {
    if (!appState) return;

    if (appState.profile?.displayName && typeof appState.profile.displayName === 'string' && appState.profile.displayName.length > 0) {
      setDisplayName(appState.profile.displayName);
    }

    if (appState.profile?.avatarId) {
      setSelectedAvatarId(appState.profile.avatarId);
    }
  }, [appState]);

  async function handleSave() {
    if (isSaving) return;

    setError(null);

    const trimmed = displayName.trim();

    // Validation
    if (trimmed.length < 2 || trimmed.length > 16) {
      setError('Display name must be between 2 and 16 characters.');
      return;
    }

    if (!selectedAvatarId) {
      setError('Please choose an avatar.');
      return;
    }

    setIsSaving(true);

    try {
      await setupProfile({
        displayName: trimmed,
        avatarType: 'DEFAULT',
        avatarId: selectedAvatarId,
      });

      // Refresh appState from backend
      await useAppState.getState().fetchAppState();

      // Read fresh state from store after fetch
      const nextState = useAppState.getState().appState;

      if (!nextState) {
        // Treat as failure to be safe
        setError('Profile updated, but we could not refresh your app state. Please try again.');
        setIsSaving(false);
        return;
      }

      if (!nextState.user.profileCompleted) {
        // Safety check: backend did not mark profile as completed
        setError('Profile not marked as completed. Please try again.');
        setIsSaving(false);
        return;
      }

      // Navigation only happens here, inside try block, after successful API call and fresh state check
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    } catch (e: any) {
      console.log('[ProfileSetupScreen] save error', e);
      
      // Decode known backend errors
      const backendErrorCode = e?.response?.data?.error?.code;
      let errorMessage = 'Could not save your profile. Please check your connection and try again.';

      if (backendErrorCode === 'INVALID_DISPLAY_NAME') {
        errorMessage = e?.response?.data?.error?.message || 'Display name must be between 2 and 16 characters.';
      } else if (backendErrorCode === 'MISSING_AVATAR_URL') {
        errorMessage = e?.response?.data?.error?.message || 'Avatar URL is required for uploaded avatars.';
      } else if (e?.response?.data?.error?.message) {
        errorMessage = e.response.data.error.message;
      } else if (e?.message) {
        errorMessage = e.message;
      }

      setError(errorMessage);
      // NO navigation in catch block
    } finally {
      setIsSaving(false);
    }
  }

  // Compute disabled state to match validation rules (2-16 chars)
  const trimmed = displayName.trim();
  const isNameValidLength = trimmed.length >= 2 && trimmed.length <= 16;
  const isSaveDisabled = !isNameValidLength || !selectedAvatarId || isSaving;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set up your profile</Text>
      <Text style={styles.subtitle}>Choose how you appear in SocialGym</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Enter your display name"
          placeholderTextColor="#666"
          autoCapitalize="words"
          maxLength={16}
        />
        <Text style={styles.hint}>
          {displayName.length}/16 characters
        </Text>
      </View>

      <View style={styles.avatarSection}>
        <Text style={styles.label}>Choose Avatar</Text>
        <View style={styles.avatarGrid}>
          {DEFAULT_AVATARS.map((avatar) => (
            <TouchableOpacity
              key={avatar.id}
              style={[
                styles.avatarOption,
                selectedAvatarId === avatar.id && styles.avatarOptionSelected,
              ]}
              onPress={() => setSelectedAvatarId(avatar.id)}
            >
              <Text style={styles.avatarEmoji}>{avatar.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.btn, isSaveDisabled && styles.btnDisabled]}
        disabled={isSaveDisabled}
        onPress={handleSave}
      >
        {isSaving ? (
          <View style={styles.savingContainer}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.btnText}>Saving…</Text>
          </View>
        ) : (
          <Text style={styles.btnText}>Save Profile</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 60,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 40,
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#111',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  avatarSection: {
    marginBottom: 32,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  avatarOption: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOptionSelected: {
    borderColor: '#22c55e',
    backgroundColor: '#1a3a2a',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  errorText: {
    marginBottom: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    fontSize: 14,
  },
  btn: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 'auto',
  },
  btnDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
