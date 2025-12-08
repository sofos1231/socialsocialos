// FILE: socialsocial/src/screens/MissionRoadScreen.tsx

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PracticeStackParamList } from '../navigation/types';
import { fetchMissionRoad, startMission } from '../api/missionsService';
import { useRequireOnboardingComplete } from '../hooks/useRequireOnboardingComplete';

type Mission = {
  id: string;
  title?: string;
  description?: string;
  laneIndex?: number;
  orderIndex?: number;
  persona?: { id?: string } | null;
};

type Lane = {
  index: number;
  missions: Mission[];
};

function buildLanesFromAny(data: any): Lane[] {
  if (!data) return [];

  // Case A: backend returns { lanes: [...] }
  if (Array.isArray(data?.lanes)) {
    return (data.lanes as any[])
      .map((l) => ({
        index: Number(l?.index ?? 0),
        missions: Array.isArray(l?.missions) ? l.missions : [],
      }))
      .sort((a, b) => a.index - b.index)
      .map((lane) => ({
        ...lane,
        missions: [...lane.missions].sort(
          (a: any, b: any) => (a?.orderIndex ?? 0) - (b?.orderIndex ?? 0),
        ),
      }));
  }

  // Case B: backend returns a flat array of missions
  const missions: Mission[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.missions)
      ? data.missions
      : [];

  if (!missions.length) return [];

  const map = new Map<number, Mission[]>();
  for (const m of missions) {
    const laneIndex = Number((m as any)?.laneIndex ?? 0);
    if (!map.has(laneIndex)) map.set(laneIndex, []);
    map.get(laneIndex)!.push(m);
  }

  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, ms]) => ({
      index,
      missions: [...ms].sort(
        (a, b) => (a?.orderIndex ?? 0) - (b?.orderIndex ?? 0),
      ),
    }));
}

export default function MissionRoadScreen() {
  useRequireOnboardingComplete();
  const navigation =
    useNavigation<NativeStackNavigationProp<PracticeStackParamList>>();

  const [rawRoad, setRawRoad] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await fetchMissionRoad();
        if (alive) setRawRoad(data);
      } catch (err) {
        console.error('MissionRoad load error:', err);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const lanes = useMemo(() => buildLanesFromAny(rawRoad), [rawRoad]);

  const handleStart = async (mission: Mission) => {
    try {
      const res = await startMission(mission.id);

      // Backend may return { mission: { templateId, aiContract } } (no full mission shape)
      const templateId = res?.mission?.templateId ?? mission.id;

      navigation.navigate('PracticeSession', {
        missionId: mission.id,
        templateId,
        personaId: mission?.persona?.id,
        title: mission.title ?? 'Practice Mission',
      });
    } catch (err) {
      console.error('Start mission failed:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading missions…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mission Road</Text>

      {lanes.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No missions found</Text>
          <Text style={styles.emptyText}>
            Create a mission template in the admin dashboard, then reload.
          </Text>
        </View>
      ) : (
        lanes.map((lane) => (
          <View key={`lane-${lane.index}`} style={styles.laneWrap}>
            <Text style={styles.laneTitle}>Lane {lane.index}</Text>

            {(lane.missions ?? []).map((mission) => (
              <View key={mission.id} style={styles.card}>
                <Text style={styles.cardTitle}>
                  {mission.title || 'Untitled mission'}
                </Text>

                {!!mission.description && (
                  <Text style={styles.cardDesc}>{mission.description}</Text>
                )}

                <TouchableOpacity
                  onPress={() => handleStart(mission)}
                  activeOpacity={0.85}
                  style={styles.startBtn}
                >
                  <Text style={styles.startBtnText}>Start Mission</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 16, paddingBottom: 28 },

  loadingWrap: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { marginTop: 12, color: '#fff' },

  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
    color: '#fff',
  },

  laneWrap: { marginBottom: 24 },
  laneTitle: { color: '#aaa', marginBottom: 8, fontWeight: '600' },

  card: {
    backgroundColor: '#1b1b1b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardDesc: { color: '#bdbdbd', marginTop: 6, marginBottom: 12 },

  startBtn: {
    backgroundColor: '#4ade80',
    paddingVertical: 11,
    borderRadius: 10,
  },
  startBtnText: { textAlign: 'center', color: '#000', fontWeight: '800' },

  emptyWrap: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  emptyTitle: { color: '#fff', fontWeight: '800', marginBottom: 6 },
  emptyText: { color: '#bdbdbd' },
});
