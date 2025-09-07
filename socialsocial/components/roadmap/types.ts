import type { Ionicons } from '@expo/vector-icons';

export type Tier = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';

export type NodeState =
  | 'LOCKED'
  | 'AVAILABLE'
  | 'ACTIVE'
  | 'COMPLETED_BRONZE'
  | 'COMPLETED_SILVER'
  | 'COMPLETED_GOLD'
  | 'COMPLETED_DIAMOND'
  | 'BOSS'
  | 'SIDE_QUEST';

export type Mission = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  state: NodeState;
  order: number; // 1..N along main path
  branchOf?: string; // id of node that spawns this as side quest
  reconnectTo?: string; // id where branch rejoins
  progress?: number; // 0..1 partial star fill
  xpYield: { confidence: number; humor: number; empathy: number };
  tier?: Tier;
};

export type RoadmapTheme = {
  bgGradient: [string, string];
  node: { base: string; glow: string; locked: string };
  tiers: { bronze: string; silver: string; gold: string; diamond: string };
  path: { main: string; branch: string };
};

export type CompletionScore = number; // 0..100

export type PersistedState = {
  missions: Record<string, { state: NodeState; tier?: Tier }>;
};


