// FILE: backend/src/modules/ai-engine/reward-release.service.ts
// Step 6.4: Reward Release Service - Determines if rewards are allowed based on gate state

import { Injectable } from '@nestjs/common';
import type { MissionStateV1, GateState } from './mission-state-v1.schema';
import type { MissionConfigV1Objective } from '../missions-admin/mission-config-v1.schema';

export type RewardType =
  | 'PHONE_NUMBER'
  | 'INSTAGRAM'
  | 'DATE_AGREEMENT'
  | 'PASS'
  | 'SUCCESS';

export interface RewardPermissions {
  phoneNumber: 'FORBIDDEN' | 'ALLOWED' | 'NOT_APPLICABLE';
  instagram: 'FORBIDDEN' | 'ALLOWED' | 'NOT_APPLICABLE';
  dateAgreement: 'FORBIDDEN' | 'ALLOWED' | 'NOT_APPLICABLE';
  pass: 'FORBIDDEN' | 'ALLOWED' | 'NOT_APPLICABLE';
  success: 'FORBIDDEN' | 'ALLOWED' | 'NOT_APPLICABLE';
  allGatesMet: boolean;
  unmetGates: string[];
  reason?: string; // Why rewards are forbidden/allowed
}

@Injectable()
export class RewardReleaseService {
  /**
   * Step 6.4: Get reward permissions for current mission state
   * Determines which rewards (phone number, Instagram, date, etc.) are allowed or forbidden
   * based on gate state and objective
   */
  getRewardPermissionsForState(
    missionState: MissionStateV1,
    objective: MissionConfigV1Objective | null,
  ): RewardPermissions {
    // If no objective, no rewards are applicable
    if (!objective) {
      return {
        phoneNumber: 'NOT_APPLICABLE',
        instagram: 'NOT_APPLICABLE',
        dateAgreement: 'NOT_APPLICABLE',
        pass: 'NOT_APPLICABLE',
        success: 'NOT_APPLICABLE',
        allGatesMet: false,
        unmetGates: [],
        reason: 'No objective set for this mission',
      };
    }

    // If no gate state, assume gates are not met
    const gateState = missionState.gateState;
    if (!gateState) {
      return this.createForbiddenPermissions(objective, 'Gate state not initialized');
    }

    // Check if all required gates are met
    const allGatesMet = gateState.allRequiredGatesMet;
    const unmetGates = gateState.unmetGates;

    // Map objective kind to reward types
    const rewardType = this.mapObjectiveToRewardType(objective.kind);

    // If gates are not met, all rewards are forbidden
    if (!allGatesMet) {
      return this.createForbiddenPermissions(
        objective,
        `Required gates not met: ${unmetGates.join(', ')}`,
        unmetGates,
      );
    }

    // Gates are met - determine which rewards are allowed based on objective
    return this.createAllowedPermissions(objective, rewardType, unmetGates);
  }

  /**
   * Map objective kind to primary reward type
   */
  private mapObjectiveToRewardType(objectiveKind: MissionConfigV1Objective['kind']): RewardType {
    switch (objectiveKind) {
      case 'GET_NUMBER':
        return 'PHONE_NUMBER';
      case 'GET_INSTAGRAM':
        return 'INSTAGRAM';
      case 'GET_DATE_AGREEMENT':
        return 'DATE_AGREEMENT';
      case 'FIX_AWKWARD_MOMENT':
      case 'HOLD_BOUNDARY':
      case 'PRACTICE_OPENING':
        return 'PASS'; // These objectives don't have specific rewards, just "pass"
      case 'FREE_EXPLORATION':
      case 'CUSTOM':
        return 'SUCCESS'; // Generic success
      default:
        return 'SUCCESS';
    }
  }

  /**
   * Create forbidden permissions (gates not met)
   */
  private createForbiddenPermissions(
    objective: MissionConfigV1Objective,
    reason: string,
    unmetGates: string[] = [],
  ): RewardPermissions {
    const rewardType = this.mapObjectiveToRewardType(objective.kind);

    const permissions: RewardPermissions = {
      phoneNumber: rewardType === 'PHONE_NUMBER' ? 'FORBIDDEN' : 'NOT_APPLICABLE',
      instagram: rewardType === 'INSTAGRAM' ? 'FORBIDDEN' : 'NOT_APPLICABLE',
      dateAgreement: rewardType === 'DATE_AGREEMENT' ? 'FORBIDDEN' : 'NOT_APPLICABLE',
      pass: rewardType === 'PASS' ? 'FORBIDDEN' : 'NOT_APPLICABLE',
      success: rewardType === 'SUCCESS' ? 'FORBIDDEN' : 'NOT_APPLICABLE',
      allGatesMet: false,
      unmetGates,
      reason,
    };

    return permissions;
  }

  /**
   * Create allowed permissions (gates met)
   */
  private createAllowedPermissions(
    objective: MissionConfigV1Objective,
    rewardType: RewardType,
    unmetGates: string[] = [],
  ): RewardPermissions {
    const permissions: RewardPermissions = {
      phoneNumber: rewardType === 'PHONE_NUMBER' ? 'ALLOWED' : 'NOT_APPLICABLE',
      instagram: rewardType === 'INSTAGRAM' ? 'ALLOWED' : 'NOT_APPLICABLE',
      dateAgreement: rewardType === 'DATE_AGREEMENT' ? 'ALLOWED' : 'NOT_APPLICABLE',
      pass: rewardType === 'PASS' ? 'ALLOWED' : 'NOT_APPLICABLE',
      success: rewardType === 'SUCCESS' ? 'ALLOWED' : 'NOT_APPLICABLE',
      allGatesMet: true,
      unmetGates,
      reason: 'All required gates are met. You may now provide the reward when appropriate.',
    };

    return permissions;
  }

  /**
   * Check if a specific reward type is allowed
   */
  isRewardAllowed(
    permissions: RewardPermissions,
    rewardType: RewardType,
  ): boolean {
    switch (rewardType) {
      case 'PHONE_NUMBER':
        return permissions.phoneNumber === 'ALLOWED';
      case 'INSTAGRAM':
        return permissions.instagram === 'ALLOWED';
      case 'DATE_AGREEMENT':
        return permissions.dateAgreement === 'ALLOWED';
      case 'PASS':
        return permissions.pass === 'ALLOWED';
      case 'SUCCESS':
        return permissions.success === 'ALLOWED';
      default:
        return false;
    }
  }
}

