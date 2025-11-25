// FILE: socialsocial/src/screens/PracticeScreen.tsx
// Chat-style mission screen calling POST /v1/practice/session
import React, { useRef, useState } from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PracticeStackParamList,
  PracticeMessageInput,
  PracticeSessionRequest,
  PracticeSessionResponse,
} from '../navigation/types';
import { createPracticeSession } from '../api/practice';

type Props = NativeStackScreenProps<PracticeStackParamList, 'PracticeSession'>;

async function readAccessToken(): Promise<string | null> {
  try {
    const direct = await AsyncStorage.getItem('accessToken');
    if (direct) return direct;

    const legacy = await AsyncStorage.getItem('token');
    return legacy;
  } catch (e) {
    console.log('[PracticeScreen] failed to read token', e);
    return null;
  }
}

export default function PracticeScreen({ navigation, route }: Props) {
  const [messages, setMessages] = useState<PracticeMessageInput[]>([
    {
      role: 'AI',
      content:
        "Welcome to a real practice mission. Type your opener below and I'll score it – plus give you micro-feedback.",
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [lastResponse, setLastResponse] =
    useState<PracticeSessionResponse | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);

  const missionTitle = route?.params?.title ?? 'Text Mission';

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    try {
      setSending(true);
      const token = await readAccessToken();
      if (!token) {
        Alert.alert('Not logged in', 'Please log in again to run a mission.');
        setSending(false);
        return;
      }

      // Build full history including the new USER message
      const payloadMessages: PracticeMessageInput[] = [
        ...messages,
        { role: 'USER', content: trimmed },
      ];

      const topicBase =
        route?.params?.title ||
        'Free text mission – chat opener';

      const payload: PracticeSessionRequest = {
        topic: topicBase,
        messages: payloadMessages,
      };

      console.log('[UI][PRACTICE] sending payload', payload);

      const res = await createPracticeSession(token, payload);
      console.log('[UI][PRACTICE] response', res);

      // Build coach feedback bubble from ai.perMessage[0].microFeedback if present
      const rawFeedback = res?.ai?.perMessage?.[0]?.microFeedback;
      const coachFeedback: string =
        typeof rawFeedback === 'string' && rawFeedback.trim().length > 0
          ? rawFeedback
          : 'Nice rep. Check the mission summary below for full breakdown.';

      // Append USER message + AI feedback bubble to local chat
      setMessages((prev) => [
        ...prev,
        { role: 'USER', content: trimmed },
        { role: 'AI', content: coachFeedback },
      ]);

      setLastResponse(res);
      setInput('');
      scrollToBottom();
    } catch (err: any) {
      const payload = err?.response?.data || String(err);
      console.log('[PracticeScreen error]', payload);
      Alert.alert('Error', 'Failed to run practice mission.');
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{missionTitle}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.chatContainer}
        onContentSizeChange={scrollToBottom}
      >
        {messages.map((m, idx) => {
          const isUser = m.role === 'USER';
          return (
            <View
              key={`${m.role}-${idx}-${m.content.slice(0, 10)}`}
              style={[
                styles.bubble,
                isUser ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <Text style={styles.bubbleRole}>
                {isUser ? 'You' : 'Coach'}
              </Text>
              <Text style={styles.bubbleText}>{m.content}</Text>
            </View>
          );
        })}

        {lastResponse && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Last Mission Summary</Text>
            <Text style={styles.summaryLine}>
              Score: {lastResponse.rewards.score} (msg score{' '}
              {lastResponse.rewards.messageScore})
            </Text>
            <Text style={styles.summaryLine}>
              XP: {lastResponse.rewards.xpGained} • Coins:{' '}
              {lastResponse.rewards.coinsGained} • Gems:{' '}
              {lastResponse.rewards.gemsGained}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type your opener here…"
          placeholderTextColor="#888"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={sending || !input.trim()}
        >
          <Text style={styles.sendText}>{sending ? '...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050505',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 12,
    paddingLeft: 0,
  },
  backText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginRight: 32,
    fontSize: 18,
    fontWeight: '700',
    color: '#f9fafb',
  },
  chatContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#16a34a',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  bubbleRole: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
    color: '#d1d5db',
  },
  bubbleText: {
    fontSize: 14,
    color: '#f9fafb',
  },
  summaryCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    color: '#e5e7eb',
  },
  summaryLine: {
    fontSize: 13,
    color: '#d1d5db',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f2937',
    backgroundColor: '#020617',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1f2937',
    color: '#f9fafb',
    fontSize: 14,
  },
  sendBtn: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendText: {
    color: '#f9fafb',
    fontWeight: '700',
    fontSize: 14,
  },
});
