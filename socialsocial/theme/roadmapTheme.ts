import { RoadmapTheme } from '../components/roadmap/types';

export const roadmapTheme: RoadmapTheme & {
  path: RoadmapTheme['path'] & { width?: number };
  node: RoadmapTheme['node'] & { size?: number; radius?: number };
  text?: { primary: string; secondary: string };
  shadow?: { ios: number; android: number };
} = {
  bgGradient: ['#2B0F33', '#4B1960'],
  path: { main: '#FF79C6', branch: '#B084F5', width: 6 },
  node: {
    size: 64,
    radius: 32,
    base: '#2F2240',
    glow: 'rgba(255,255,255,0.18)',
    locked: '#4A3F57',
  },
  tiers: {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    diamond: '#7FDBFF',
  },
  text: { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.8)' },
  shadow: { ios: 0.3, android: 6 },
};

export default roadmapTheme;


