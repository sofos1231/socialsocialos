// backend/src/modules/rotation/rotation.policy.ts
// Step 5.11: Rotation quotas and policy configuration

import { RotationSurface, RotationQuotas } from './rotation.types';

/**
 * Step 5.11: Get quotas for a specific surface
 * Defines how many insights of each kind can be selected for a surface
 * 
 * @param surface - Rotation surface
 * @returns RotationQuotas object
 */
export function getQuotasForSurface(surface: RotationSurface): RotationQuotas {
  switch (surface) {
    case 'MISSION_END':
      return {
        gate: 2,
        hook: 2,
        pattern: 1,
        tip: 3,
        mood: 1,
        synergy: 1,
        analyzer: 0,
      };
    case 'ADVANCED_TAB':
      return {
        gate: 1,
        hook: 1,
        pattern: 1,
        tip: 1,
        mood: 1,
        synergy: 1,
        analyzer: 0,
      };
    case 'ANALYZER':
      return {
        gate: 0,
        hook: 0,
        pattern: 0,
        tip: 0,
        mood: 0,
        synergy: 0,
        analyzer: 2,
      };
    case 'SYNERGY_MAP':
      return {
        gate: 0,
        hook: 0,
        pattern: 0,
        tip: 0,
        mood: 0,
        synergy: 3,
        analyzer: 0,
      };
    case 'MOOD_TIMELINE':
      return {
        gate: 0,
        hook: 0,
        pattern: 0,
        tip: 0,
        mood: 3,
        synergy: 0,
        analyzer: 0,
      };
    default:
      return {
        gate: 1,
        hook: 1,
        pattern: 1,
        tip: 1,
      };
  }
}

