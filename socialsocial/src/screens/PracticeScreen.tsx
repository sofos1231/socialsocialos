// FILE: socialsocial/src/screens/PracticeScreen.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';

import {
  PracticeStackParamList,
  PracticeSessionRequest,
  PracticeSessionResponse,
  RarityTier,
  SessionRewardMessageBreakdown,
  SessionRewards,
  MissionStatePayload,
  MissionStateStatus,
  FreePlayConfig,
} from '../navigation/types';
import { createPracticeSession } from '../api/practice';

type Props = NativeStackScreenProps<PracticeStackParamList, 'PracticeSession'>;

type ChatMsg = {
  id: string;
  role: 'USER' | 'AI';
  content: string;
  // scoring metadata – for USER messages only
  score?: number;
  rarity?: RarityTier;
  xpDelta?: number;
  coinsDelta?: number;
  gemsDelta?: number;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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

function pickErrorText(data: any, fallback: string) {
  const m = data?.message;
  if (typeof m === 'string' && m.trim()) return m;
  if (Array.isArray(m) && m.length) return m.join(' ');
  if (typeof data?.error === 'string' && data.error.trim()) return data.error;
  return fallback;
}

function isEnded(status?: MissionStateStatus | null) {
  return status === 'SUCCESS' || status === 'FAIL';
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

const DEFAULT_SUCCESS_SCORE = 80;
const DEFAULT_FAIL_SCORE = 60;

function formatFreePlaySubtitle(fp?: FreePlayConfig) {
  if (!fp) return 'Free play • Custom scenario';
  const place = fp.place.replace('_', ' ');
  return `Free play • ${place} • ${fp.difficulty}`;
}

export default function PracticeScreen({ route, navigation }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const mood01Anim = useRef(new Animated.Value(0.5)).current;
  const moodOpacityAnim = useRef(new Animated.Value(0)).current;

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [showPersonaCard, setShowPersonaCard] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMsg | null>(null);

  const [isRecording, setIsRecording] = useState(false);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [missionState, setMissionState] = useState<MissionStatePayload | null>(null);

  const [sessionRewards, setSessionRewards] = useState<SessionRewards | null>(null);
  const [isMissionComplete, setIsMissionComplete] = useState(false);
  const [isPreviewOnly, setIsPreviewOnly] = useState(false);

  const freeplay = route.params?.freeplay;
  const isFreePlay = route.params?.mode === 'freeplay' || !!freeplay;

  const missionTitle = route.params?.title ?? (isFreePlay ? 'Free Play' : 'Practice Mission');
  const topicForBackend = route.params?.topic ?? missionTitle;

  const templateId = route.params?.templateId;
  const personaId = route.params?.personaId;
  const missionId = route.params?.missionId;

  const canSend = useMemo(
    () => !isSending && !isMissionComplete && input.trim().length > 0,
    [isSending, isMissionComplete, input],
  );

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const runBounce = () => {
    bounceAnim.setValue(1);
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const resetLocalSession = useCallback(() => {
    setActiveSessionId(null);
    setMissionState(null);
    setSessionRewards(null);
    setIsMissionComplete(false);
    setIsPreviewOnly(false);
    setIsSending(false);
    setInput('');
    setSelectedMessage(null);
    setShowPersonaCard(false);
    setIsRecording(false);
    setMessages([]);
  }, []);

  const appendAiSystemMessage = (text: string) => {
    setMessages((prev) => [...prev, { id: makeId(), role: 'AI', content: text }]);
    scrollToBottom();
  };

  const handleBack = () => {
    if (messages.length === 0) {
      resetLocalSession();
      navigation.goBack();
      return;
    }

    Alert.alert('Quit mission?', 'Are you sure you want to quit this mission?', [
      { text: 'No, stay', style: 'cancel' },
      {
        text: 'Yes, quit',
        style: 'destructive',
        onPress: () => {
          resetLocalSession();
          navigation.goBack();
        },
      },
    ]);
  };

  const handleMicPress = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    setIsRecording(true);
    Alert.alert(
      'Voice input',
      'Speech-to-text is not wired yet. For now, type your message manually.',
      [{ text: 'OK', onPress: () => setIsRecording(false) }],
    );
  };

  const mapRewardsToLatestUserMessage = (
    msgs: ChatMsg[],
    breakdowns: SessionRewardMessageBreakdown[] | undefined,
  ): ChatMsg[] => {
    if (!breakdowns || breakdowns.length === 0) return msgs;

    const lastBreakdown = breakdowns[breakdowns.length - 1];
    if (!lastBreakdown) return msgs;

    const lastUserIndex = [...msgs]
      .map<[ChatMsg, number]>((m, idx) => [m, idx])
      .filter(([m]) => m.role === 'USER')
      .map(([_, idx]) => idx)
      .pop();

    if (lastUserIndex == null) return msgs;

    const updated = [...msgs];
    const target = updated[lastUserIndex];

    updated[lastUserIndex] = {
      ...target,
      score: lastBreakdown.score,
      rarity: lastBreakdown.rarity,
      xpDelta: lastBreakdown.xp,
      coinsDelta: lastBreakdown.coins,
      gemsDelta: lastBreakdown.gems,
    };

    return updated;
  };

  const finalizeMission = (rewards: SessionRewards, state: MissionStatePayload) => {
    setSessionRewards(rewards);
    setMissionState(state);
    setIsMissionComplete(true);
    setActiveSessionId(null);
  };

  const moodTarget = useMemo(() => {
    if (!missionState) return { mood01: 0.5, opacity01: 0 };

    if (missionState.status === 'SUCCESS') return { mood01: 1, opacity01: 0.32 };
    if (missionState.status === 'FAIL') return { mood01: 0, opacity01: 0.34 };

    const avg =
      typeof missionState.averageScore === 'number' && Number.isFinite(missionState.averageScore)
        ? missionState.averageScore
        : 0;

    const denom = Math.max(1, DEFAULT_SUCCESS_SCORE - DEFAULT_FAIL_SCORE);
    const mood01 = clamp01((avg - DEFAULT_FAIL_SCORE) / denom);

    const turns = typeof missionState.totalMessages === 'number' ? missionState.totalMessages : 0;
    const intensity = clamp01((turns + 1) / 4);
    const opacity01 = 0.12 + 0.18 * intensity;

    return { mood01, opacity01 };
  }, [missionState]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mood01Anim, {
        toValue: moodTarget.mood01,
        duration: 420,
        useNativeDriver: false,
      }),
      Animated.timing(moodOpacityAnim, {
        toValue: moodTarget.opacity01,
        duration: 420,
        useNativeDriver: false,
      }),
    ]).start();
  }, [mood01Anim, moodOpacityAnim, moodTarget.mood01, moodTarget.opacity01]);

  const moodColor = useMemo(() => {
    return mood01Anim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [
        'rgba(239,68,68,1)',
        'rgba(234,179,8,1)',
        'rgba(34,197,94,1)',
      ],
    });
  }, [mood01Anim]);

  const sendMessage = async () => {
    if (!canSend || isPreviewOnly) return;

    const text = input.trim();
    setInput('');

    const userMsg: ChatMsg = { id: makeId(), role: 'USER', content: text };
    const nextMessages: ChatMsg[] = [...messages, userMsg];
    setMessages(nextMessages);
    scrollToBottom();

    const payload: PracticeSessionRequest = {
      topic: topicForBackend,
      sessionId: activeSessionId ?? undefined,
      messages: [{ role: 'USER', content: text }],
      templateId,
      personaId,
    };

    try {
      setIsSending(true);

      const res = (await createPracticeSession(payload)) as PracticeSessionResponse;

      if (res?.sessionId) setActiveSessionId(res.sessionId);

      const rewards = res?.rewards;
      const serverState = res?.missionState ?? null;
      if (serverState) setMissionState(serverState);

      let updated: ChatMsg[] = mapRewardsToLatestUserMessage(nextMessages, rewards?.messages);

      const aiReplyText = extractAiReply(res);
      const aiMsg: ChatMsg = { id: makeId(), role: 'AI', content: aiReplyText };

      updated = [...updated, aiMsg];
      setMessages(updated);
      scrollToBottom();

      if (rewards && serverState?.status && isEnded(serverState.status)) {
        finalizeMission(rewards, serverState);
      }
    } catch (err: any) {
      console.error('Practice session error:', err);

      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data as any;
        const msg = pickErrorText(data, err.message || 'Request failed.');

        const code = data?.code;
        const looksLikeNotInProgress =
          code === 'SESSION_NOT_IN_PROGRESS' ||
          (typeof msg === 'string' && msg.toLowerCase().includes('not in_progress')) ||
          (typeof msg === 'string' && msg.toLowerCase().includes('not in progress'));

        if (status === 400 && looksLikeNotInProgress) {
          setIsMissionComplete(true);
          setActiveSessionId(null);
          appendAiSystemMessage('Mission already ended. Start a new mission from the hub.');
          return;
        }

        appendAiSystemMessage(msg || 'Sorry — something went wrong. Try again.');
        return;
      }

      appendAiSystemMessage('Sorry — something went wrong. Try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleMessagePress = (msg: ChatMsg) => {
    if (msg.role !== 'USER') return;
    runBounce();
    setSelectedMessage(msg);
  };

  const closeSelectedMessage = () => setSelectedMessage(null);

  // This now reflects freeplay vs mission more correctly
  const hasPersonaHints = !isFreePlay && !!missionId && !!personaId;

  const topSubtitle = isFreePlay ? formatFreePlaySubtitle(freeplay) : (hasPersonaHints ? 'Guided mission • AI coach' : 'Practice • No hints');

  const renderMessageBubble = (m: ChatMsg, index: number) => {
    const isUser = m.role === 'USER';
    const score = m.score ?? null;

    const rarityStyle: any = {};
    if (isUser && typeof score === 'number') {
      if (score >= 95) {
        rarityStyle.borderColor = '#f97316';
        rarityStyle.borderWidth = 2;
        rarityStyle.shadowOpacity = 0.45;
        rarityStyle.shadowRadius = 10;
      } else if (score >= 90) {
        rarityStyle.borderColor = '#eab308';
        rarityStyle.borderWidth = 2;
        rarityStyle.shadowOpacity = 0.35;
        rarityStyle.shadowRadius = 8;
      } else if (score >= 85) {
        rarityStyle.borderColor = '#4ade80';
        rarityStyle.borderWidth = 1.5;
      }
    }

    const Wrapper = isUser ? TouchableOpacity : View;
    const wrapperProps: any = isUser
      ? { activeOpacity: 0.9, onPress: () => handleMessagePress(m) }
      : {};

    const bubble = (
      <Animated.View
        style={[
          styles.msgBubble,
          isUser ? styles.userBubble : styles.aiBubble,
          isUser && rarityStyle,
          selectedMessage?.id === m.id && { transform: [{ scale: bounceAnim }] },
        ]}
      >
        <Text style={styles.msgText}>{m.content}</Text>

        {isUser && m.rarity && (
          <View style={styles.rarityTag}>
            <Text style={styles.rarityText}>{m.rarity}</Text>
          </View>
        )}
      </Animated.View>
    );

    return (
      <View
        key={m.id || index}
        style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}
      >
        <Wrapper {...wrapperProps}>{bubble}</Wrapper>
      </View>
    );
  };

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent();
      if (parent) {
        parent.setOptions({ tabBarStyle: { display: 'none' } });
      }

      return () => {
        const parentNav = navigation.getParent();
        if (parentNav) {
          parentNav.setOptions({ tabBarStyle: undefined });
        }
        resetLocalSession();
      };
    }, [navigation, resetLocalSession]),
  );

  const handleViewStatsFromModal = () => {
    resetLocalSession();
    const parent = navigation.getParent();
    parent?.navigate('StatsTab');
  };

  const handleBackToHubFromModal = () => {
    resetLocalSession();
    navigation.navigate('PracticeHub');
  };

  const handlePracticeAgainFromModal = () => {
    setIsPreviewOnly(false);
    resetLocalSession();
  };

  const handleCloseMissionEndModal = () => setIsPreviewOnly(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.moodOverlay,
            {
              backgroundColor: moodColor,
              opacity: moodOpacityAnim,
            },
          ]}
        />

        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleBack} style={styles.topBarIconLeft}>
            <Text style={styles.topBarIconText}>{'←'}</Text>
          </TouchableOpacity>

          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {missionTitle}
            </Text>
            <Text style={styles.topBarSubtitle} numberOfLines={1}>
              {topSubtitle}
            </Text>
          </View>

          <View style={styles.topBarRight}>
            <TouchableOpacity
              onPress={() => setShowPersonaCard(true)}
              style={styles.topBarIconButton}
            >
              <Text style={styles.topBarIconText}>i</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                Alert.alert('Video mode', 'Video missions are not wired yet in this build.')
              }
              style={styles.topBarIconButton}
            >
              <Text style={styles.topBarIconText}>📹</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Start the mission</Text>
              <Text style={styles.emptyText}>
                Type your first message below. The AI will reply and score you in real-time.
              </Text>
            </View>
          )}

          {messages.map(renderMessageBubble)}
        </ScrollView>

        {isPreviewOnly ? (
          <View style={styles.previewFooter}>
            <Text
              style={[
                styles.previewFooterStatus,
                sessionRewards?.isSuccess
                  ? styles.previewFooterStatusSuccess
                  : styles.previewFooterStatusFailed,
              ]}
            >
              {sessionRewards?.isSuccess ? 'Mission PASSED' : 'Mission FAILED'}
            </Text>
            <Text style={styles.previewFooterSubtext}>chat is for preview only</Text>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={[styles.micButton, isRecording && styles.micButtonRecording]}
              onPress={handleMicPress}
              disabled={isMissionComplete}
            >
              {isRecording ? <ActivityIndicator color="#fff" /> : <Text style={styles.micIcon}>🎤</Text>}
            </TouchableOpacity>

            <TextInput
              style={[styles.input, isMissionComplete && styles.inputDisabled]}
              placeholder={
                isMissionComplete
                  ? 'Mission complete — start a new one from the hub'
                  : 'Type your message...'
              }
              placeholderTextColor="#777"
              value={input}
              onChangeText={setInput}
              editable={!isSending && !isMissionComplete}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />

            <TouchableOpacity
              style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!canSend}
            >
              {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendBtnText}>Send</Text>}
            </TouchableOpacity>
          </View>
        )}

        <Modal
          visible={!!selectedMessage}
          transparent
          animationType="fade"
          onRequestClose={closeSelectedMessage}
        >
          <View style={styles.detailsOverlay}>
            <View style={styles.detailsCard}>
              <Text style={styles.detailsTitle}>Message details</Text>

              <Text style={styles.detailsLabel}>Your message</Text>
              <Text style={styles.detailsBody}>{selectedMessage?.content}</Text>

              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabelInline}>Score: </Text>
                <Text style={styles.detailsValue}>{selectedMessage?.score ?? '—'}</Text>
              </View>

              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabelInline}>Rarity: </Text>
                <Text style={styles.detailsValue}>{selectedMessage?.rarity ?? '—'}</Text>
              </View>

              <View style={styles.detailsRow}>
                <Text style={styles.detailsLabelInline}>Rewards: </Text>
                <Text style={styles.detailsValue}>
                  {selectedMessage?.xpDelta != null ? `+${selectedMessage.xpDelta} XP` : '—'}
                  {selectedMessage?.coinsDelta != null ? ` · +${selectedMessage.coinsDelta} coins` : ''}
                  {selectedMessage?.gemsDelta != null ? ` · +${selectedMessage.gemsDelta} gems` : ''}
                </Text>
              </View>

              <Text style={styles.detailsHint}>
                Higher scores unlock stronger animations and better rewards. Aim for 85+ and 90+ tiers.
              </Text>

              <TouchableOpacity style={styles.detailsCloseBtn} onPress={closeSelectedMessage}>
                <Text style={styles.detailsCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showPersonaCard}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPersonaCard(false)}
        >
          <View style={styles.personaOverlay}>
            <View style={styles.personaCard}>
              <Text style={styles.personaTitle}>{missionTitle}</Text>

              {isFreePlay ? (
                <>
                  <Text style={styles.personaSubtitle}>Custom FreePlay scenario.</Text>

                  {!!freeplay?.aiStyleName && (
                    <Text style={styles.personaMeta}>
                      Style: <Text style={styles.personaMetaStrong}>{freeplay.aiStyleName}</Text>
                    </Text>
                  )}
                  {!!freeplay?.place && (
                    <Text style={styles.personaMeta}>
                      Place: <Text style={styles.personaMetaStrong}>{freeplay.place}</Text>
                    </Text>
                  )}
                  {!!freeplay?.difficulty && (
                    <Text style={styles.personaMeta}>
                      Difficulty: <Text style={styles.personaMetaStrong}>{freeplay.difficulty}</Text>
                    </Text>
                  )}
                  {!!personaId && (
                    <Text style={styles.personaMeta}>
                      Persona ID: <Text style={styles.personaMetaStrong}>{personaId}</Text>
                    </Text>
                  )}

                  {!!freeplay?.situation && (
                    <>
                      <Text style={[styles.personaMeta, { marginTop: 10 }]}>Situation:</Text>
                      <Text style={styles.personaBody}>{freeplay.situation}</Text>
                    </>
                  )}

                  <Text style={[styles.personaBody, { marginTop: 8 }]}>
                    Note: style/difficulty/place are encoded into the topic in Part 1. True server-side
                    enforcement is done in Part 2.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.personaSubtitle}>
                    {hasPersonaHints
                      ? 'Guided mission based on a specific persona.'
                      : 'Practice mission – no hidden info.'}
                  </Text>

                  {hasPersonaHints ? (
                    <Text style={styles.personaBody}>
                      In partner / known-person missions you'll usually see hints here. For cold approach / boss missions
                      this card stays more mysterious.
                    </Text>
                  ) : (
                    <Text style={styles.personaBody}>
                      This mission has no extra hints. Treat it like a real-world first interaction.
                    </Text>
                  )}

                  {!!missionId && (
                    <Text style={styles.personaMeta}>
                      Mission ID: <Text style={styles.personaMetaStrong}>{missionId}</Text>
                    </Text>
                  )}
                  {!!personaId && (
                    <Text style={styles.personaMeta}>
                      Persona ID: <Text style={styles.personaMetaStrong}>{personaId}</Text>
                    </Text>
                  )}
                </>
              )}

              <TouchableOpacity style={styles.personaCloseBtn} onPress={() => setShowPersonaCard(false)}>
                <Text style={styles.personaCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={isMissionComplete && !!sessionRewards && !isPreviewOnly}
          transparent
          animationType="fade"
          onRequestClose={handleBackToHubFromModal}
        >
          <View style={styles.completeOverlay}>
            <View style={styles.completeCard}>
              <View style={styles.completeCardHeader}>
                <Text style={styles.completeTitle}>
                  {sessionRewards?.isSuccess ? 'Mission complete' : 'Mission ended'}
                </Text>
                <TouchableOpacity style={styles.completeCloseButton} onPress={handleCloseMissionEndModal}>
                  <Text style={styles.completeCloseText}>×</Text>
                </TouchableOpacity>
              </View>

              {!!missionState?.status && (
                <Text style={[styles.completeLine, { marginBottom: 6 }]}>
                  Status: <Text style={styles.completeHighlight}>{missionState.status}</Text> · Progress:{' '}
                  <Text style={styles.completeHighlight}>{missionState.progressPct}%</Text>
                </Text>
              )}

              <Text style={styles.completeLine}>
                Score: <Text style={styles.completeHighlight}>{sessionRewards?.score ?? '—'}</Text> · Message score:{' '}
                <Text style={styles.completeHighlight}>{sessionRewards?.messageScore ?? '—'}</Text>
              </Text>

              <Text style={styles.completeLine}>
                XP: <Text style={styles.completeHighlight}>{sessionRewards?.xpGained ?? 0}</Text> · Coins:{' '}
                <Text style={styles.completeHighlight}>{sessionRewards?.coinsGained ?? 0}</Text> · Gems:{' '}
                <Text style={styles.completeHighlight}>{sessionRewards?.gemsGained ?? 0}</Text>
              </Text>

              <View style={styles.completeButtonsRow}>
                <TouchableOpacity style={[styles.completeButton, styles.completePrimary]} onPress={handleViewStatsFromModal}>
                  <Text style={styles.completeButtonText}>View stats</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.completeButton, styles.completeSecondary]} onPress={handleBackToHubFromModal}>
                  <Text style={styles.completeButtonText}>Back to missions</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.completePracticeAgain} onPress={handlePracticeAgainFromModal}>
                <Text style={styles.completePracticeAgainText}>Practice again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#020617' },
  container: { flex: 1, backgroundColor: '#020617' },

  moodOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomColor: '#111827',
    borderBottomWidth: 1,
  },
  topBarIconLeft: {
    paddingRight: 8,
    paddingVertical: 4,
  },
  topBarIconText: {
    color: '#e5e7eb',
    fontSize: 20,
    fontWeight: '600',
  },
  topBarCenter: {
    flex: 1,
  },
  topBarTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
  },
  topBarSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topBarIconButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  chat: { flex: 1 },
  chatContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  msgRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAi: { justifyContent: 'flex-start' },
  msgBubble: {
    maxWidth: '85%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  userBubble: { backgroundColor: '#22c55e' },
  aiBubble: { backgroundColor: '#111827' },
  msgText: { color: '#f9fafb', fontSize: 15 },
  rarityTag: {
    position: 'absolute',
    top: -8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#0f172a',
  },
  rarityText: { color: '#fbbf24', fontSize: 10, fontWeight: '700' },

  emptyState: {
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 12,
  },
  emptyTitle: { color: '#e5e7eb', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  emptyText: { color: '#9ca3af', fontSize: 13, textAlign: 'center' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopColor: '#111827',
    borderTopWidth: 1,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    marginRight: 8,
  },
  micButtonRecording: { backgroundColor: '#b91c1c' },
  micIcon: { color: '#e5e7eb', fontSize: 20 },
  input: {
    flex: 1,
    backgroundColor: '#020617',
    color: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    fontSize: 14,
  },
  inputDisabled: { opacity: 0.5 },
  sendBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 70,
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#022c22', fontWeight: '700', fontSize: 14 },

  detailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  detailsCard: {
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },
  detailsTitle: { color: '#f9fafb', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  detailsLabel: { color: '#9ca3af', fontSize: 12, marginTop: 4 },
  detailsBody: { color: '#e5e7eb', fontSize: 14, marginTop: 2, marginBottom: 8 },
  detailsRow: { flexDirection: 'row', marginTop: 4 },
  detailsLabelInline: { color: '#9ca3af', fontSize: 13 },
  detailsValue: { color: '#f9fafb', fontSize: 13, fontWeight: '600' },
  detailsHint: { color: '#9ca3af', fontSize: 12, marginTop: 10 },
  detailsCloseBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  detailsCloseText: { color: '#e5e7eb', fontWeight: '600' },

  personaOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  personaCard: {
    backgroundColor: '#020617',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
  },
  personaTitle: { color: '#f9fafb', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  personaSubtitle: { color: '#9ca3af', fontSize: 13, marginBottom: 10 },
  personaBody: { color: '#e5e7eb', fontSize: 13, marginBottom: 10 },
  personaMeta: { color: '#9ca3af', fontSize: 12 },
  personaMetaStrong: { color: '#f9fafb', fontWeight: '600' },
  personaCloseBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  personaCloseText: { color: '#e5e7eb', fontWeight: '600' },

  completeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  completeCard: { width: '100%', backgroundColor: '#020617', borderRadius: 18, padding: 18 },
  completeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  completeTitle: { fontSize: 20, fontWeight: '700', color: '#f9fafb', flex: 1 },
  completeCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  completeCloseText: { color: '#e5e7eb', fontSize: 24, fontWeight: '300', lineHeight: 24 },
  completeLine: { fontSize: 14, color: '#e5e7eb', marginBottom: 4 },
  completeHighlight: { color: '#4ade80', fontWeight: '600' },
  completeButtonsRow: { flexDirection: 'row', marginTop: 14, gap: 8 },
  completeButton: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
  completePrimary: { backgroundColor: '#22c55e' },
  completeSecondary: { backgroundColor: '#111827' },
  completeButtonText: { color: '#f9fafb', fontSize: 14, fontWeight: '600' },
  completePracticeAgain: { marginTop: 10, alignItems: 'center' },
  completePracticeAgainText: { color: '#9ca3af', fontSize: 13, textDecorationLine: 'underline' },

  previewFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopColor: '#111827',
    borderTopWidth: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
  },
  previewFooterStatus: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  previewFooterStatusSuccess: { color: '#4ade80' },
  previewFooterStatusFailed: { color: '#ef4444' },
  previewFooterSubtext: { fontSize: 12, color: '#9ca3af' },
});
