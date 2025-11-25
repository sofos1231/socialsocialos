// FILE: socialsocial/src/screens/MissionRoadScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PracticeStackParamList } from '../navigation/types';
import { fetchMissionRoad, MissionRoadMission, MissionRoadResponse, startMission } from '../api/missionsService';

type Props = NativeStackScreenProps<PracticeStackParamList, 'MissionRoad'>;

const { height: SCREEN_H } = Dimensions.get('window');

export default function MissionRoadScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [road, setRoad] = useState<MissionRoadResponse | null>(null);

  const [selected, setSelected] = useState<MissionRoadMission | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const sheetY = useRef(new Animated.Value(SCREEN_H)).current;

  const lanes = useMemo(() => road?.lanes ?? [], [road]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMissionRoad();
      setRoad(data);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error?.message ||
        e?.message ||
        'Failed to load mission road';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openMission = (m: MissionRoadMission) => {
    setSelected(m);
    setModalOpen(true);
    Animated.timing(sheetY, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(sheetY, {
      toValue: SCREEN_H,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setModalOpen(false);
        setSelected(null);
      }
    });
  };

  const handleStart = async () => {
    if (!selected) return;
    try {
      // Validate server-side unlocked state + get latest mission payload
      const res = await startMission(selected.id);

      const mission = res?.mission ?? selected;
      navigation.navigate('PracticeSession', {
        missionId: mission.id,
        templateId: mission.id,
        personaId: mission?.persona?.id ?? undefined,
        title: mission.title,
      });

      closeModal();
    } catch (e: any) {
      const msg =
        e?.response?.data?.error?.message ||
        e?.message ||
        'Failed to start mission';
      setError(String(msg));
      closeModal();
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mission Road</Text>
        <TouchableOpacity onPress={load} style={styles.reloadBtn}>
          <Text style={styles.reloadText}>Reload</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading missions…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Couldn’t load Mission Road</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={load}>
            <Text style={styles.primaryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.summaryBar}>
            <Text style={styles.summaryText}>
              {road?.summary?.completedCount ?? 0}/{road?.summary?.totalMissions ?? 0} completed •{' '}
              {road?.summary?.completionPercent ?? 0}%
            </Text>
          </View>

          <ScrollView horizontal contentContainerStyle={styles.lanesWrap} showsHorizontalScrollIndicator={false}>
            {lanes.map((lane) => (
              <View key={`lane-${lane.laneIndex}`} style={styles.laneCol}>
                <Text style={styles.laneTitle}>{lane.title}</Text>

                {lane.missions.map((m) => {
                  const state = m.visualState;
                  const locked = state === 'locked';
                  const completed = state === 'completed';
                  const current = state === 'current';

                  return (
                    <TouchableOpacity
                      key={m.id}
                      activeOpacity={0.9}
                      onPress={() => openMission(m)}
                      style={[
                        styles.missionCard,
                        locked && styles.cardLocked,
                        current && styles.cardCurrent,
                        completed && styles.cardCompleted,
                      ]}
                    >
                      <Text style={styles.missionTitle} numberOfLines={1}>
                        {m.title}
                      </Text>

                      <Text style={styles.missionDesc} numberOfLines={2}>
                        {m.description ?? '—'}
                      </Text>

                      <View style={styles.tagsRow}>
                        {m.category?.code ? (
                          <View style={styles.tag}>
                            <Text style={styles.tagText}>{m.category.code}</Text>
                          </View>
                        ) : null}

                        <View style={styles.tag}>
                          <Text style={styles.tagText}>{m.difficulty}</Text>
                        </View>

                        {m.persona?.code ? (
                          <View style={styles.tag}>
                            <Text style={styles.tagText}>{m.persona.code}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.footerRow}>
                        <Text style={styles.footerText}>
                          +{m.rewards.xp} XP • +{m.rewards.coins} coins
                        </Text>
                        <Text style={[styles.statePill, locked && styles.stateLocked, current && styles.stateCurrent, completed && styles.stateCompleted]}>
                          {state.toUpperCase()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          {/* Slide-up preview modal */}
          <Modal visible={modalOpen} transparent animationType="none" onRequestClose={closeModal}>
            <Pressable style={styles.overlay} onPress={closeModal} />
            <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
              {selected ? (
                <>
                  <View style={styles.sheetHandle} />
                  <Text style={styles.sheetTitle}>{selected.title}</Text>
                  <Text style={styles.sheetDesc}>{selected.description ?? '—'}</Text>

                  <View style={styles.sheetMetaRow}>
                    <Text style={styles.sheetMeta}>Difficulty: {selected.difficulty}</Text>
                    <Text style={styles.sheetMeta}>Time: {selected.timeLimitSec}s/msg</Text>
                  </View>
                  <View style={styles.sheetMetaRow}>
                    <Text style={styles.sheetMeta}>Max msgs: {selected.maxMessages ?? '—'}</Text>
                    <Text style={styles.sheetMeta}>Word limit: {selected.wordLimit ?? '—'}</Text>
                  </View>

                  <View style={styles.sheetMetaRow}>
                    <Text style={styles.sheetMeta}>
                      Rewards: {selected.rewards.xp} XP • {selected.rewards.coins} coins • {selected.rewards.gems} gems
                    </Text>
                  </View>

                  {selected.persona ? (
                    <View style={styles.personaBox}>
                      <Text style={styles.personaTitle}>Persona</Text>
                      <Text style={styles.personaText}>
                        {selected.persona.name} ({selected.persona.code})
                      </Text>
                      {selected.persona.description ? (
                        <Text style={styles.personaDesc}>{selected.persona.description}</Text>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.sheetBtns}>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={closeModal}>
                      <Text style={styles.secondaryBtnText}>Close</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.primaryBtn,
                        !selected.isUnlocked && { opacity: 0.45 },
                      ]}
                      disabled={!selected.isUnlocked}
                      onPress={handleStart}
                    >
                      <Text style={styles.primaryBtnText}>
                        {selected.isUnlocked ? 'Start Mission' : 'Locked'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </Animated.View>
          </Modal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050505' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2937',
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  backText: { color: '#9ca3af', fontSize: 16 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#f9fafb' },
  reloadBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  reloadText: { color: '#22c55e', fontSize: 14, fontWeight: '700' },

  summaryBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f2937',
    backgroundColor: '#020617',
  },
  summaryText: { color: '#d1d5db', fontSize: 13, fontWeight: '600' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 18 },
  muted: { color: '#9ca3af' },
  errorTitle: { color: '#fca5a5', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  errorBody: { color: '#fecaca', textAlign: 'center' },

  lanesWrap: { padding: 16, gap: 14 },
  laneCol: { width: 300, gap: 10 },
  laneTitle: { color: '#e5e7eb', fontSize: 14, fontWeight: '800', marginBottom: 2 },

  missionCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#111827',
  },
  cardLocked: { opacity: 0.55 },
  cardCurrent: { borderColor: '#22c55e' },
  cardCompleted: { borderColor: '#60a5fa' },

  missionTitle: { color: '#f9fafb', fontSize: 14, fontWeight: '800' },
  missionDesc: { color: '#9ca3af', fontSize: 12, marginTop: 6, minHeight: 32 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#0b1120', borderWidth: 1, borderColor: '#1f2937' },
  tagText: { color: '#d1d5db', fontSize: 10, fontWeight: '700' },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  footerText: { color: '#d1d5db', fontSize: 11, fontWeight: '700' },

  statePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, fontSize: 10, fontWeight: '900', overflow: 'hidden', color: '#e5e7eb' },
  stateLocked: { backgroundColor: '#111827' },
  stateCurrent: { backgroundColor: '#16a34a' },
  stateCompleted: { backgroundColor: '#2563eb' },

  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#0b1120',
    borderTopWidth: 1,
    borderColor: '#1f2937',
    padding: 16,
    paddingBottom: 22,
  },
  sheetHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#334155', alignSelf: 'center', marginBottom: 10 },
  sheetTitle: { color: '#f9fafb', fontSize: 18, fontWeight: '900' },
  sheetDesc: { color: '#9ca3af', marginTop: 8, fontSize: 13, lineHeight: 18 },

  sheetMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  sheetMeta: { color: '#d1d5db', fontSize: 12, fontWeight: '700' },

  personaBox: { marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: '#020617', borderWidth: 1, borderColor: '#1f2937' },
  personaTitle: { color: '#e5e7eb', fontSize: 12, fontWeight: '900' },
  personaText: { color: '#d1d5db', marginTop: 4, fontWeight: '800' },
  personaDesc: { color: '#9ca3af', marginTop: 6, fontSize: 12 },

  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryBtn: { flex: 1, backgroundColor: '#22c55e', paddingVertical: 12, borderRadius: 999, alignItems: 'center' },
  primaryBtnText: { color: '#052e16', fontWeight: '900' },
  secondaryBtn: { flex: 1, backgroundColor: '#111827', paddingVertical: 12, borderRadius: 999, alignItems: 'center', borderWidth: 1, borderColor: '#1f2937' },
  secondaryBtnText: { color: '#e5e7eb', fontWeight: '900' },
});
