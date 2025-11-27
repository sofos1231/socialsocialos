// FILE: socialsocial/src/screens/PracticeScreen.tsx

import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PracticeStackParamList } from '../navigation/types';
import {
  createPracticeSession,
  PracticeSessionRequest,
} from '../api/practice';

type Props = NativeStackScreenProps<PracticeStackParamList, 'PracticeSession'>;

type ChatMsg = { role: 'USER' | 'AI'; content: string };

// We don't know the exact API response type shape here, so we normalize safely.
function extractAiReply(res: any): string {
  const maybe =
    res?.aiReply ??
    res?.reply ??
    res?.message ??
    res?.aiPayload?.reply ??
    res?.aiPayload?.message;

  if (typeof maybe === 'string' && maybe.trim().length > 0) return maybe;
  return '...';
}

export default function PracticeScreen({ route }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const missionTitle = route.params?.title ?? 'Practice Mission';
  const templateId = route.params?.templateId;
  const personaId = route.params?.personaId;

  const canSend = useMemo(
    () => !isSending && input.trim().length > 0,
    [isSending, input],
  );

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const sendMessage = async () => {
    if (!canSend) return;

    const text = input.trim();
    setInput('');

    // Add user message locally (typed)
    const nextMessages: ChatMsg[] = [
      ...messages,
      { role: 'USER', content: text },
    ];
    setMessages(nextMessages);
    scrollToBottom();

    const payload: PracticeSessionRequest = {
      topic: missionTitle,
      messages: nextMessages,
      templateId, // mission template
      personaId, // persona context
    };

    try {
      setIsSending(true);

      const res = await createPracticeSession(payload);
      const aiReply = extractAiReply(res);

      const updated: ChatMsg[] = [
        ...nextMessages,
        { role: 'AI', content: aiReply },
      ];

      setMessages(updated);
      scrollToBottom();
    } catch (err) {
      console.error('Practice session error:', err);
      // keep UX simple and consistent
      setMessages((prev) => [
        ...prev,
        {
          role: 'AI',
          content: 'Sorry — something went wrong. Try again.',
        },
      ]);
      scrollToBottom();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Text style={styles.title}>{missionTitle}</Text>

      <ScrollView
        ref={scrollRef}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((m, i) => (
          <View
            key={i}
            style={[
              styles.msgBubble,
              m.role === 'USER' ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <Text style={styles.msgText}>{m.content}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          placeholderTextColor="#777"
          value={input}
          onChangeText={setInput}
          editable={!isSending}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />

        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!canSend}
        >
          <Text style={styles.sendBtnText}>{isSending ? '...' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, backgroundColor: '#0a0a0a' },
  title: {
    fontSize: 22,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  chat: { flex: 1, paddingHorizontal: 10 },
  chatContent: { paddingBottom: 10 },
  msgBubble: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: '#4ade80',
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: '#222',
    alignSelf: 'flex-start',
  },
  msgText: { color: '#fff' },
  inputRow: {
    flexDirection: 'row',
    padding: 10,
    borderTopColor: '#333',
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#111',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: { color: '#fff' },
});
