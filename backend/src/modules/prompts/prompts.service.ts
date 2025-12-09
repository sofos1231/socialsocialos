// backend/src/modules/prompts/prompts.service.ts
// Step 5.1: Prompt hook matching and trigger service

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { loadSessionAnalyticsSnapshot } from '../shared/helpers/session-snapshot.helper';
import {
  PromptHookPayload,
  PromptHookConditions,
  TraitCondition,
  MoodCondition,
  MatchedHookContextSnapshot,
} from './prompts.types';
import { MoodState } from '../mood/mood.types';
// Step 5.1: Import normalizeTraitData for defensive normalization
import { normalizeTraitData } from '../shared/normalizers/chat-message.normalizer';

/**
 * Session context for hook matching
 */
interface SessionContext {
  userId: string;
  templateId: string | null;
  traitSnapshot: Record<string, number>;
  moodState: MoodState | null;
  moodPercent: number | null;
  hooksCount: Record<string, number>; // Count of each hook key
  patternsCount: Record<string, number>; // Count of each pattern key
  endReasonCode: string | null;
  userMessageCount: number;
}

/**
 * Maps trait level to numeric range
 */
function traitLevelToRange(level: string): { min: number; max: number } {
  switch (level) {
    case 'VERY_LOW':
      return { min: 0, max: 20 };
    case 'LOW':
      return { min: 20, max: 40 };
    case 'MEDIUM':
      return { min: 40, max: 60 };
    case 'HIGH':
      return { min: 60, max: 80 };
    case 'VERY_HIGH':
      return { min: 80, max: 100 };
    default:
      return { min: 0, max: 100 };
  }
}

/**
 * Evaluates trait condition
 */
function evaluateTraitCondition(
  condition: TraitCondition,
  traitSnapshot: Record<string, number>,
): boolean {
  const traitValue = traitSnapshot[condition.trait];
  if (typeof traitValue !== 'number') {
    return false;
  }

  const range = traitLevelToRange(condition.level);
  const operator = condition.operator || 'gte';

  switch (operator) {
    case 'gte':
      return traitValue >= range.min;
    case 'lte':
      return traitValue <= range.max;
    case 'gt':
      return traitValue > range.min;
    case 'lt':
      return traitValue < range.max;
    case 'eq':
      return traitValue >= range.min && traitValue <= range.max;
    default:
      return false;
  }
}

/**
 * Evaluates mood condition
 */
function evaluateMoodCondition(
  condition: MoodCondition,
  moodState: MoodState | null,
  moodPercent: number | null,
): boolean {
  if (condition.moodState) {
    const requiredStates = Array.isArray(condition.moodState)
      ? condition.moodState
      : [condition.moodState];
    if (!moodState || !requiredStates.includes(moodState)) {
      return false;
    }
  }

  if (condition.moodPercent) {
    if (moodPercent === null) {
      return false;
    }
    if (condition.moodPercent.min !== undefined && moodPercent < condition.moodPercent.min) {
      return false;
    }
    if (condition.moodPercent.max !== undefined && moodPercent > condition.moodPercent.max) {
      return false;
    }
  }

  return true;
}

/**
 * Evaluates all conditions for a hook
 */
function evaluateHookConditions(
  conditions: PromptHookConditions,
  context: SessionContext,
): boolean {
  // Required traits
  if (conditions.requiredTraits && conditions.requiredTraits.length > 0) {
    for (const traitCond of conditions.requiredTraits) {
      if (!evaluateTraitCondition(traitCond, context.traitSnapshot)) {
        return false;
      }
    }
  }

  // Forbidden traits (must NOT match)
  if (conditions.forbiddenTraits && conditions.forbiddenTraits.length > 0) {
    for (const traitCond of conditions.forbiddenTraits) {
      if (evaluateTraitCondition(traitCond, context.traitSnapshot)) {
        return false; // Forbidden trait matched → hook doesn't trigger
      }
    }
  }

  // Required mood
  if (conditions.requiredMoodRange) {
    if (
      !evaluateMoodCondition(
        conditions.requiredMoodRange,
        context.moodState,
        context.moodPercent,
      )
    ) {
      return false;
    }
  }

  // Hook/pattern presence (v1 minimal - just check if count > 0)
  // TODO: Add more sophisticated pattern matching in future

  return true;
}

@Injectable()
export class PromptsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Matches enabled hooks for a session and creates triggers
   * Enforces cooldown using unique constraint (sessionId, hookId)
   * 
   * @param sessionId - Session ID to match hooks for
   */
  async matchAndTriggerHooksForSession(sessionId: string): Promise<void> {
    const snapshot = await loadSessionAnalyticsSnapshot(this.prisma, sessionId);

    // Load enabled hooks
    const enabledHooks = await this.prisma.promptHook.findMany({
      where: { isEnabled: true },
      orderBy: { priority: 'desc' }, // Higher priority first
    });

    if (enabledHooks.length === 0) {
      // No hooks enabled - nothing to do
      return;
    }

    // Build session context for matching
    const userMessages = snapshot.messages.filter((m) => m.role === 'USER');

    // Step 5.1: Normalize traitData defensively (ensures hooks/patterns arrays exist for old sessions)
    const normalizedUserMessages = userMessages.map((msg) => ({
      ...msg,
      traitData: normalizeTraitData(msg.traitData),
    }));

    // Compute trait snapshot (aggregate from USER messages)
    const traitSnapshot: Record<string, number> = {};
    const traitKeys = ['confidence', 'clarity', 'humor', 'tensionControl', 'emotionalWarmth', 'dominance'];
    for (const key of traitKeys) {
      const values = normalizedUserMessages
        .map((m) => m.traitData.traits[key])
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100);
      if (values.length > 0) {
        traitSnapshot[key] = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
      } else {
        traitSnapshot[key] = 0;
      }
    }

    // Get current mood (from MissionMoodTimeline if available)
    const moodTimeline = await this.prisma.missionMoodTimeline.findUnique({
      where: { sessionId },
    });
    const moodState = moodTimeline?.currentMoodState as MoodState | null;
    const moodPercent = moodTimeline?.currentMoodPercent ?? null;

    // Count hooks and patterns (normalized traitData guarantees arrays exist)
    const hooksCount: Record<string, number> = {};
    const patternsCount: Record<string, number> = {};
    for (const msg of normalizedUserMessages) {
      const hooks = msg.traitData.hooks; // ✅ Guaranteed array from normalizeTraitData
      const patterns = msg.traitData.patterns; // ✅ Guaranteed array from normalizeTraitData
      for (const hook of hooks) {
        hooksCount[hook] = (hooksCount[hook] || 0) + 1;
      }
      for (const pattern of patterns) {
        patternsCount[pattern] = (patternsCount[pattern] || 0) + 1;
      }
    }

    const context: SessionContext = {
      userId: snapshot.userId,
      templateId: snapshot.templateId,
      traitSnapshot,
      moodState,
      moodPercent,
      hooksCount,
      patternsCount,
      endReasonCode: snapshot.endReasonCode,
      userMessageCount: userMessages.length,
    };

    // Evaluate each hook
    for (const hookRow of enabledHooks) {
      try {
        // Parse conditions from JSON
        const conditions = hookRow.conditionsJson as any as PromptHookConditions;
        if (!conditions) {
          continue;
        }

        // Check cooldown (query last trigger for this hook+session)
        const lastTrigger = await this.prisma.promptHookTrigger.findFirst({
          where: {
            hookId: hookRow.id,
            sessionId,
          },
          orderBy: { triggeredAt: 'desc' },
        });

        // Parse hook metadata for cooldown
        const meta = (hookRow.metaJson as any) || {};
        const cooldownSeconds = meta.cooldownSeconds ?? 0;

        if (lastTrigger && cooldownSeconds > 0) {
          const secondsSinceTrigger =
            (new Date().getTime() - lastTrigger.triggeredAt.getTime()) / 1000;
          if (secondsSinceTrigger < cooldownSeconds) {
            // Still in cooldown - skip
            continue;
          }
        }

        // Check max triggers per session
        const maxTriggersPerSession = meta.maxTriggersPerSession;
        if (maxTriggersPerSession !== undefined) {
          const triggerCount = await this.prisma.promptHookTrigger.count({
            where: {
              hookId: hookRow.id,
              sessionId,
            },
          });
          if (triggerCount >= maxTriggersPerSession) {
            // Already triggered max times - skip
            continue;
          }
        }

        // Evaluate conditions
        if (!evaluateHookConditions(conditions, context)) {
          continue; // Conditions not met
        }

        // Conditions met - upsert trigger (idempotent by unique constraint)
        const matchedContext: MatchedHookContextSnapshot = {
          sessionSnapshot: {
            moodState: context.moodState ?? undefined,
            moodPercent: context.moodPercent ?? undefined,
            traitProfile: context.traitSnapshot,
          },
        };

        // Upsert ensures idempotency: if (sessionId, hookId) exists, update; otherwise create
        await this.prisma.promptHookTrigger.upsert({
          where: {
            sessionId_hookId: {
              sessionId,
              hookId: hookRow.id,
            },
          },
          create: {
            hookId: hookRow.id,
            sessionId,
            userId: snapshot.userId,
            matchedContext: matchedContext as any,
            triggeredAt: new Date(),
          },
          update: {
            matchedContext: matchedContext as any,
            triggeredAt: new Date(), // Update timestamp on re-trigger
          },
        });
      } catch (error) {
        // Log but continue with other hooks
        console.error(`Error evaluating hook ${hookRow.id}:`, error);
      }
    }
  }
}

