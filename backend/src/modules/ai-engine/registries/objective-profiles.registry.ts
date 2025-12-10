// FILE: backend/src/modules/ai-engine/registries/objective-profiles.registry.ts
// Step 6.0: Centralized Objective Profiles Registry

import { MissionObjectiveKind } from '../../missions-admin/mission-config-v1.schema';

export interface ObjectiveProfile {
  kind: MissionObjectiveKind;
  name: string;
  description: string;
  successCriteria: string[];
  failCriteria: string[];
  hints?: string[];
}

/**
 * Centralized registry of objective profiles.
 * Maps MissionObjectiveKind to objective-specific rules and success criteria.
 */
export const AI_OBJECTIVE_PROFILES: Record<MissionObjectiveKind, ObjectiveProfile> = {
  GET_NUMBER: {
    kind: 'GET_NUMBER',
    name: 'Get Phone Number',
    description: 'Successfully obtain the persona\'s phone number',
    successCriteria: [
      'Persona explicitly provides phone number',
      'Persona agrees to exchange numbers',
      'Number is provided in a natural, non-forced way',
    ],
    failCriteria: [
      'Persona refuses or deflects',
      'Persona becomes uncomfortable',
      'User is too pushy or inappropriate',
    ],
    hints: [
      'Build rapport first',
      'Make it feel natural and mutual',
      'Don\'t ask too early in conversation',
    ],
  },

  GET_INSTAGRAM: {
    kind: 'GET_INSTAGRAM',
    name: 'Get Instagram',
    description: 'Successfully obtain the persona\'s Instagram handle',
    successCriteria: [
      'Persona provides Instagram handle',
      'Persona agrees to connect on Instagram',
      'Handle is provided naturally',
    ],
    failCriteria: [
      'Persona refuses or deflects',
      'Persona becomes uncomfortable',
      'User is too pushy',
    ],
    hints: [
      'Show genuine interest in their content',
      'Make it feel like a natural next step',
      'Don\'t ask immediately',
    ],
  },

  GET_DATE_AGREEMENT: {
    kind: 'GET_DATE_AGREEMENT',
    name: 'Get Date Agreement',
    description: 'Successfully get the persona to agree to a date',
    successCriteria: [
      'Persona explicitly agrees to a date',
      'Persona suggests a time/place',
      'Date is confirmed with mutual enthusiasm',
    ],
    failCriteria: [
      'Persona refuses or deflects',
      'Persona becomes uncomfortable',
      'User is too pushy or inappropriate',
    ],
    hints: [
      'Build connection and rapport first',
      'Make it feel natural and exciting',
      'Be specific about plans',
    ],
  },

  FIX_AWKWARD_MOMENT: {
    kind: 'FIX_AWKWARD_MOMENT',
    name: 'Fix Awkward Moment',
    description: 'Recover from an awkward moment and restore positive conversation flow',
    successCriteria: [
      'Awkward moment is acknowledged and addressed',
      'Conversation flow is restored',
      'Persona shows positive response to recovery',
    ],
    failCriteria: [
      'Awkwardness persists or worsens',
      'Persona becomes uncomfortable',
      'User makes situation worse',
    ],
    hints: [
      'Acknowledge the awkwardness with humor',
      'Don\'t over-apologize',
      'Redirect to positive topic',
    ],
  },

  HOLD_BOUNDARY: {
    kind: 'HOLD_BOUNDARY',
    name: 'Hold Boundary',
    description: 'Maintain personal boundaries when persona pushes or tests limits',
    successCriteria: [
      'Boundary is clearly communicated',
      'Boundary is maintained despite pressure',
      'Persona respects the boundary',
    ],
    failCriteria: [
      'Boundary is violated',
      'User gives in to pressure',
      'Persona becomes disrespectful',
    ],
    hints: [
      'Be clear and firm but respectful',
      'Don\'t be defensive or aggressive',
      'Maintain confidence',
    ],
  },

  PRACTICE_OPENING: {
    kind: 'PRACTICE_OPENING',
    name: 'Practice Opening',
    description: 'Practice creating engaging conversation openers',
    successCriteria: [
      'Opening is engaging and natural',
      'Persona responds positively',
      'Conversation flows from opening',
    ],
    failCriteria: [
      'Opening is generic or boring',
      'Persona doesn\'t engage',
      'Opening is inappropriate',
    ],
    hints: [
      'Be specific and genuine',
      'Show interest in them',
      'Avoid generic pick-up lines',
    ],
  },

  FREE_EXPLORATION: {
    kind: 'FREE_EXPLORATION',
    name: 'Free Exploration',
    description: 'Open-ended practice with no specific objective',
    successCriteria: [
      'Conversation flows naturally',
      'Both parties are engaged',
      'Positive interaction throughout',
    ],
    failCriteria: [
      'Conversation stalls',
      'Persona becomes disengaged',
      'Inappropriate behavior',
    ],
    hints: [
      'Follow natural conversation flow',
      'Be present and engaged',
      'Adapt to persona\'s responses',
    ],
  },

  CUSTOM: {
    kind: 'CUSTOM',
    name: 'Custom Objective',
    description: 'Custom objective defined by mission creator',
    successCriteria: [],
    failCriteria: [],
    hints: [],
  },
};

/**
 * Get an objective profile by kind
 */
export function getObjectiveProfile(kind: MissionObjectiveKind): ObjectiveProfile {
  return AI_OBJECTIVE_PROFILES[kind];
}

/**
 * Get all objective profile kinds
 */
export function getAllObjectiveKinds(): MissionObjectiveKind[] {
  return Object.keys(AI_OBJECTIVE_PROFILES) as MissionObjectiveKind[];
}

/**
 * Check if an objective kind is valid
 */
export function isValidObjectiveKind(kind: string): kind is MissionObjectiveKind {
  return kind in AI_OBJECTIVE_PROFILES;
}

