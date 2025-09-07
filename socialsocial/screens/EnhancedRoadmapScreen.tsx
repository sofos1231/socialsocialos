/**
 * EnhancedRoadmapScreen
 * Usage:
 *   import EnhancedRoadmapScreen, { createRoadmapScreen } from './EnhancedRoadmapScreen';
 *   // Use default demo:
 *   <EnhancedRoadmapScreen />
 *   // Or with custom data:
 *   const CustomRoadmap = createRoadmapScreen(customMissions);
 *   <CustomRoadmap />
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, useWindowDimensions, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import RoadPath from '../components/roadmap/RoadPath';
import RoadNode from '../components/roadmap/RoadNode';
import BossNode from '../components/roadmap/BossNode';
import CheckpointFlag from '../components/roadmap/CheckpointFlag';
import SideQuestBadge from '../components/roadmap/SideQuestBadge';
// Removed local ProgressHeader in favor of global TopBar
import RewardToast from '../components/roadmap/RewardToast';
import MilestoneChest from '../components/roadmap/MilestoneChest';
import StreakModal from '../components/roadmap/StreakModal';
import { Mission, NodeState, Tier } from '../components/roadmap/types';
import roadmapTheme, { roadmapTheme as namedRoadmapTheme } from '../theme/roadmapTheme';
import { mockMissions } from '../components/roadmap/mockData';
import * as H from '../components/roadmap/Haptics';
import Sound from '../components/roadmap/SoundManager';
import ProfileTopBar from '../src/components/ProfileTopBar';
import { usePlayerProgress } from '../src/state/playerProgress';

type ScreenProps = { initial?: Mission[] };

const STORAGE_KEY = 'enhanced_roadmap_state_v1';

function scoreToTier(score: number): Tier {
  if (score >= 95) return 'DIAMOND';
  if (score >= 80) return 'GOLD';
  if (score >= 60) return 'SILVER';
  return 'BRONZE';
}

function computeProgress(missions: Mission[]) {
  const boss = missions.find(m => m.state === 'BOSS');
  const totalWeight = missions.length + (boss ? 1 : 0);
  const completedCount = missions.filter(m => m.state.startsWith('COMPLETED')).length;
  const bossCompleted = boss && boss.tier ? 1 : 0;
  return ((completedCount + bossCompleted) / totalWeight) * 100;
}

function useAnchors(missions: Mission[], width: number) {
  const leftX = width * 0.3;
  const rightX = width * 0.7;
  const stepY = 140;
  const anchors = missions
    .filter(m => !m.branchOf)
    .sort((a, b) => a.order - b.order)
    .map((m, i) => ({ id: m.id, x: i % 2 === 0 ? leftX : rightX, y: 160 + i * stepY }));
  const branch = missions.filter(m => !!m.branchOf).map((m, i) => ({ id: m.id, x: rightX + 90, y: 160 + (m.order - 1) * stepY + (i * 60) }));
  return { anchors, branch };
}

function ScreenImpl({ initial, onShowStreak }: ScreenProps & { onShowStreak?: () => void }) {
  const progress = usePlayerProgress();
  const { width, height } = useWindowDimensions();
  const [missions, setMissions] = useState<Mission[]>(() => initial ?? mockMissions);
  const [toast, setToast] = useState<string | null>(null);
  const [chest, setChest] = useState<string | null>(null);
  const [showStreak, setShowStreak] = useState(false);

  // Load persisted state
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Record<string, { state: NodeState; tier?: Tier }>;
          setMissions(prev => prev.map(m => ({ ...m, ...saved[m.id] ? { state: saved[m.id].state, tier: saved[m.id].tier } : {} })));
        }
      } catch {}
    })();
  }, []);

  // Save on change
  useEffect(() => {
    const save = async () => {
      const map: Record<string, { state: NodeState; tier?: Tier }> = {};
      missions.forEach(m => { map[m.id] = { state: m.state, tier: m.tier }; });
      try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch {}
    };
    save();
  }, [missions]);

  const { anchors, branch } = useAnchors(missions, width);
  const mainAnchors = anchors.map(a => ({ x: a.x, y: a.y }));
  const branchAnchors = branch.length ? branch.map(b => ({ x: b.x, y: b.y })) : undefined;

  const handleStart = useCallback(async (m: Mission) => {
    await H.light();
    Sound.play('tap');
    // Simulate completion with random score
    const score = 60 + Math.floor(Math.random() * 45);
    const tier = scoreToTier(score);
    setMissions(prev => prev.map(x => x.id === m.id ? { ...x, state: (`COMPLETED_${tier}` as NodeState), tier } : x));
    // Unlock next main node
    const nextOrder = m.order + 1;
    setMissions(prev => prev.map(x => x.order === nextOrder && !x.branchOf ? { ...x, state: x.state === 'LOCKED' ? 'AVAILABLE' : x.state } : x));
    // Unlock branch from order 5
    if (m.order === 5) {
      setMissions(prev => prev.map(x => x.branchOf === m.id ? { ...x, state: 'AVAILABLE' } : x));
      setChest('Milestone reached! Branch unlocked');
      Sound.play('milestone');
    }
    setToast(`+${m.xpYield.confidence} Confidence, +${m.xpYield.humor} Humor, +${m.xpYield.empathy} Empathy (${tier} tier!)`);
    Sound.play('complete');
    await H.success();
  }, []);

  const count = `${missions.filter(m => m.state.startsWith('COMPLETED')).length}/${missions.filter(m => !m.branchOf).length}`;
  const percent = computeProgress(missions);
  const nextReward = percent < 80 ? 'Diamond Frame at 80%' : 'Boss Chest at 100%';

  const byId = (id: string) => anchors.find(a => a.id === id);

  const totalHeight = mainAnchors[mainAnchors.length - 1]?.y + 260 || height * 2;

  return (
    <LinearGradient colors={roadmapTheme.bgGradient} style={{ flex: 1 }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <ProfileTopBar
          userName={'Username'}
          coins={progress.coins}
          gems={progress.diamonds}
          streak={progress.streakDays}
          inStreak={progress.streakDays > 0}
          onPressMembership={() => {}}
          onPressCoins={() => {}}
          onPressGems={() => {}}
          onPressStreak={() => {
            if (onShowStreak) {
              onShowStreak();
            } else {
              setShowStreak(true);
            }
          }}
        />
      </View>
      {null}
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ height: totalHeight, paddingTop: 64 }} showsVerticalScrollIndicator={false}>
          <RoadPath width={width} height={totalHeight} mainAnchors={mainAnchors} branchAnchors={branchAnchors} mainColor={roadmapTheme.path.main} branchColor={roadmapTheme.path.branch} />
          {/* Test-out CTA */}
          {anchors[3] && (
            <View style={{ position: 'absolute', left: width*0.5 - 70, top: anchors[3].y - 80, backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.5)', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="play-forward" size={16} color="#10b981" />
              <Text style={{ color: '#10b981', fontWeight: '700', marginLeft: 6 }}>JUMP HERE?</Text>
            </View>
          )}
          {missions.map(m => {
            if (m.state === 'BOSS') {
              const pos = byId(m.id) || { x: width * 0.5, y: totalHeight - 120 };
              return <BossNode key={m.id} x={pos.x} y={pos.y} onPress={() => handleStart(m)} />;
            }
            const pos = m.branchOf ? branch.find(b => b.id === m.id) : anchors.find(a => a.id === m.id);
            if (!pos) return null;
            return (
              <RoadNode
                key={m.id}
                mission={m}
                x={pos.x}
                y={pos.y}
                size={72}
                onPress={handleStart}
                goldSheen={{ variant: 'sweep', doubleLines: true, intervalMs: 4800 }}
              />
            );
          })}
          {/* Checkpoints after every 3 nodes on main path */}
          {anchors.filter((_, i) => (i + 1) % 3 === 0).map((a, idx) => (
            <CheckpointFlag key={`cp-${idx}`} x={a.x} y={a.y - 50} label={`Milestone ${idx + 1}/${Math.ceil(anchors.length / 3)}`} />
          ))}
          {/* Side quest badges near branch nodes */}
          {branch.map(b => (
            <SideQuestBadge key={`sq-${b.id}`} x={b.x} y={b.y - 40} />
          ))}
          <MilestoneChest visible={!!chest} text={chest || ''} />
          <RewardToast visible={!!toast} text={toast || ''} onHide={() => setToast(null)} />
          <StreakModal visible={showStreak} onClose={() => setShowStreak(false)} currentDay={5} bonusPct={10} />
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

export default function EnhancedRoadmapScreen(props: { onShowStreak?: () => void }) {
  return <ScreenImpl onShowStreak={props.onShowStreak} />;
}

export function createRoadmapScreen(missions?: Mission[], onShowStreak?: () => void) {
  return function RoadmapFactory() {
    return <ScreenImpl initial={missions} onShowStreak={onShowStreak} />;
  };
}


