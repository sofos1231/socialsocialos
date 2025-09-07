import { Mission } from './types';

export const mockMissions: Mission[] = [
  { id: 'n1', title: 'Flirty Hello', icon: 'chatbubble-ellipses', state: 'COMPLETED_GOLD', order: 1, xpYield: { confidence: 8, humor: 4, empathy: 3 }, tier: 'GOLD' },
  { id: 'n2', title: 'Playful Disagreement', icon: 'happy', state: 'COMPLETED_SILVER', order: 2, xpYield: { confidence: 7, humor: 5, empathy: 3 }, tier: 'SILVER' },
  { id: 'n3', title: 'Reading the Room', icon: 'eye', state: 'COMPLETED_BRONZE', order: 3, xpYield: { confidence: 5, humor: 3, empathy: 6 }, tier: 'BRONZE' },
  { id: 'n4', title: 'Storytelling Magic', icon: 'book', state: 'AVAILABLE', order: 4, xpYield: { confidence: 6, humor: 5, empathy: 4 } },
  { id: 'n5', title: 'Confident Compliments', icon: 'sparkles', state: 'ACTIVE', order: 5, xpYield: { confidence: 10, humor: 4, empathy: 5 } },
  // side quests branching from n5
  { id: 'sq5a', title: 'Side Quest: Banter', icon: 'chatbubbles', state: 'LOCKED', order: 5, branchOf: 'n5', reconnectTo: 'n6', xpYield: { confidence: 6, humor: 6, empathy: 2 } },
  { id: 'sq5b', title: 'Side Quest: Humor', icon: 'flame', state: 'LOCKED', order: 5, branchOf: 'n5', reconnectTo: 'n6', xpYield: { confidence: 4, humor: 8, empathy: 2 } },
  { id: 'n6', title: 'Handling Silence', icon: 'mic', state: 'LOCKED', order: 6, xpYield: { confidence: 7, humor: 3, empathy: 6 } },
  { id: 'n7', title: 'Teasing & Timing', icon: 'timer', state: 'LOCKED', order: 7, xpYield: { confidence: 6, humor: 7, empathy: 3 } },
  { id: 'n8', title: 'Deep Connection', icon: 'heart', state: 'LOCKED', order: 8, xpYield: { confidence: 5, humor: 2, empathy: 8 } },
  { id: 'n9', title: 'Graceful Exit', icon: 'arrow-redo', state: 'LOCKED', order: 9, xpYield: { confidence: 7, humor: 2, empathy: 4 } },
  { id: 'n10', title: 'Final Challenge', icon: 'trophy', state: 'BOSS', order: 10, xpYield: { confidence: 12, humor: 6, empathy: 6 } },
];


