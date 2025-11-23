// socialsocial/src/screens/VoicePracticeScreen.tsx

import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  PracticeStackParamList,
  VoicePracticeRequest,
  VoicePracticeResponse,
  SessionRewards,
} from '../navigation/types';
import { createVoicePracticeSession } from '../api/practice';

type Props = NativeStackScreenProps<
  PracticeStackParamList,
  'VoicePracticeSession'
>;

async function readAccessToken(): Promise<string | null> {
  try {
    const direct = await AsyncStorage.getItem('accessToken');
    if (direct) return direct;
    const legacy = await AsyncStorage.getItem('token');
    return legacy;
  } catch (e) {
    console.log('[VoicePracticeScreen] failed to read token', e);
    return null;
  }
}

const SAMPLE_TRANSCRIPT =
  "So, I have a fun question: if we could teleport anywhere for coffee right now, where would we go?";

export default function VoicePracticeScreen({ navigation }: Props) {
  const [topic, setTopic] = useState('First date opener – voice');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] =
    useState<VoicePracticeResponse | null>(null);

  const runMission = async () => {
    const trimmed = transcript.trim();
    if (!trimmed) {
      Alert.alert('Missing transcript', 'Paste or type a short transcript first.');
      return;
    }

    setLoading(true);

    try {
      const token = await readAccessToken();
      if (!token) {
        Alert.alert('Not logged in', 'Please log in again first.');
        setLoading(false);
        return;
      }

      const payload: VoicePracticeRequest = {
        topic,
        transcript: trimmed,
      };

      console.log('[UI][VOICE] sending payload', payload);

      const res = await createVoicePracticeSession(token, payload);
      console.log('[UI][VOICE] response', res);

      setLastResponse(res);
    } catch (err: any) {
      const payload = err?.response?.data || String(err);
      console.log('[VoicePracticeScreen] error', payload);
      Alert.alert('Error', 'Failed to run voice mission.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseSample = () => {
    setTranscript(SAMPLE_TRANSCRIPT);
  };

  const handleViewStats = () => {
    const parent = navigation.getParent();
    parent?.navigate('StatsTab');
  };

  const handleBackToMissions = () => {
    navigation.navigate('PracticeHub');
  };

  const rewards: SessionRewards | null = lastResponse?.rewards ?? null;

  const microFeedback: string | undefined =
    lastResponse?.ai?.perMessage?.[0]?.microFeedback ??
    'Transcript scored. Check the mission summary below.';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Voice Mission</Text>
        <Text style={styles.subtitle}>
          Imagine you just recorded a voice note. Paste the transcript here and
          we’ll score it like a real opener.
        </Text>

        <View style={styles.topicCard}>
          <Text style={styles.label}>Topic</Text>
          <TextInput
            style={styles.topicInput}
            value={topic}
            onChangeText={setTopic}
            placeholder="Mission topic"
            placeholderTextColor="#777"
          />
        </View>

        <View style={styles.transcriptCard}>
          <View style={styles.transcriptHeader}>
            <Text style={styles.label}>Transcript</Text>
            <TouchableOpacity
              style={styles.sampleButton}
              onPress={handleUseSample}
            >
              <Text style={styles.sampleText}>Use sample</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.transcriptScroll}>
            <TextInput
              style={styles.transcriptInput}
              value={transcript}
              onChangeText={setTranscript}
              placeholder="Paste the speech-to-text output here…"
              placeholderTextColor="#777"
              multiline
            />
          </ScrollView>
        </View>

        {!!lastResponse && (
          <View style={styles.feedbackBubble}>
            <Text style={styles.feedbackMeta}>Coach</Text>
            <Text style={styles.feedbackText}>{microFeedback}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.runButton,
            loading && styles.buttonDisabled,
          ]}
          onPress={runMission}
          disabled={loading}
        >
          <Text style={styles.runButtonText}>
            {loading ? 'Scoring…' : 'Run voice mission'}
          </Text>
        </TouchableOpacity>

        {rewards && (
          <MissionCompleteCard
            rewards={rewards}
            onViewStats={handleViewStats}
            onBackToHub={handleBackToMissions}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function MissionCompleteCard(props: {
  rewards: SessionRewards;
  onViewStats: () => void;
  onBackToHub: () => void;
}) {
  const { rewards, onViewStats, onBackToHub } = props;

  return (
    <View style={styles.missionCard}>
      <Text style={styles.missionTitle}>Mission complete</Text>
      <Text style={styles.missionLine}>
        Score: <Text style={styles.highlight}>{rewards.score}</Text> · Message
        score: <Text style={styles.highlight}>{rewards.messageScore}</Text>
      </Text>
      <Text style={styles.missionLine}>
        XP: <Text style={styles.highlight}>{rewards.xpGained}</Text> · Coins:{' '}
        <Text style={styles.highlight}>{rewards.coinsGained}</Text> · Gems:{' '}
        <Text style={styles.highlight}>{rewards.gemsGained}</Text>
      </Text>

      <View style={styles.missionButtonsRow}>
        <TouchableOpacity
          style={[styles.missionButton, styles.primaryButton]}
          onPress={onViewStats}
        >
          <Text style={styles.missionButtonText}>View updated stats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.missionButton, styles.secondaryButton]}
          onPress={onBackToHub}
        >
          <Text style={styles.missionButtonText}>Back to missions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#111',
  },
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#bbb',
    marginBottom: 16,
  },
  topicCard: {
    backgroundColor: '#1b1b1b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  label: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  topicInput: {
    color: '#fff',
    fontSize: 14,
  },
  transcriptCard: {
    flex: 1,
    backgroundColor: '#1b1b1b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sampleButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#555',
  },
  sampleText: {
    color: '#e5e5e5',
    fontSize: 11,
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptInput: {
    minHeight: 80,
    color: '#fff',
    fontSize: 14,
  },
  feedbackBubble: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#222',
  },
  feedbackMeta: {
    fontSize: 11,
    color: '#ddd',
    marginBottom: 2,
  },
  feedbackText: {
    color: '#fff',
    fontSize: 14,
  },
  runButton: {
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#1DB954',
    alignItems: 'center',
    marginBottom: 8,
  },
  runButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  missionCard: {
    marginTop: 4,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#18181b',
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  missionLine: {
    fontSize: 13,
    color: '#ddd',
    marginBottom: 2,
  },
  highlight: {
    color: '#4ade80',
    fontWeight: '600',
  },
  missionButtonsRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  missionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#22c55e',
  },
  secondaryButton: {
    backgroundColor: '#333',
  },
  missionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
