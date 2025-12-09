// backend/src/modules/badges/badges.service.ts
// Step 5.4: Badge engine - server-authoritative badge progress tracking

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { BadgeLedgerKind, MissionStatus, RewardLedgerKind } from '@prisma/client';
import { badgeRegistry } from './badge-registry';
import { BadgeDefinition, BadgeTier } from './badges.types';
import { loadSessionAnalyticsSnapshot } from '../shared/helpers/session-snapshot.helper';
import { getCategoryForHook, getCategoryForPattern, getCategoryForTrait } from '../analytics/category-taxonomy';

const logger = new Logger('BadgesService');

@Injectable()
export class BadgesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Step 5.4: Update badge progress for a finalized session
   * Called from sessions.service.ts finalize pipeline
   * 
   * Idempotency: Uses BadgeLedgerEntry to prevent double processing
   * Gating: Skips disqualified/aborted sessions
   */
  async updateBadgesForSession(sessionId: string): Promise<void> {
    try {
      // 1. Load session status and check gating
      const session = await this.prisma.practiceSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          userId: true,
          status: true,
          endReasonCode: true,
        },
      });

      if (!session) {
        logger.warn(`[BadgesService] Session ${sessionId} not found`);
        return;
      }

      // Skip disqualified/aborted sessions
      if (
        session.endReasonCode === 'ABORT_DISQUALIFIED' ||
        session.status === MissionStatus.ABORTED
      ) {
        logger.debug(`[BadgesService] Skipping badge update for disqualified/aborted session ${sessionId}`);
        return;
      }

      // Only process finalized sessions (SUCCESS/FAIL)
      if (
        session.status !== MissionStatus.SUCCESS &&
        session.status !== MissionStatus.FAIL
      ) {
        logger.debug(`[BadgesService] Skipping badge update for non-finalized session ${sessionId} (status: ${session.status})`);
        return;
      }

      // 2. Load analytics snapshot and derive signals
      const snapshot = await loadSessionAnalyticsSnapshot(this.prisma, sessionId);

      // Load hook triggers and gate outcomes
      const [hookTriggers, gateOutcomes] = await Promise.all([
        this.prisma.promptHookTrigger.findMany({
          where: { sessionId },
          include: { hook: true },
        }),
        this.prisma.gateOutcome.findMany({
          where: { sessionId },
        }),
      ]);

      // Extract matched hook keys
      const matchedHookKeys = new Set<string>();
      for (const trigger of hookTriggers) {
        if (trigger.hook.id) {
          matchedHookKeys.add(trigger.hook.id);
        }
      }
      // Fallback to message traitData.hooks
      for (const msg of snapshot.messages) {
        if (msg.role === 'USER' && msg.traitData.hooks) {
          for (const hookKey of msg.traitData.hooks) {
            matchedHookKeys.add(hookKey);
          }
        }
      }

      // Extract matched pattern keys (from messages)
      const matchedPatternKeys = new Set<string>();
      for (const msg of snapshot.messages) {
        if (msg.role === 'USER' && msg.traitData.patterns) {
          for (const patternKey of msg.traitData.patterns) {
            matchedPatternKeys.add(patternKey);
          }
        }
      }

      // Extract trait keys present (for trait-based badges)
      const traitKeysPresent = new Set<string>();
      const traitKeys = ['confidence', 'clarity', 'humor', 'tensionControl', 'emotionalWarmth', 'dominance'];
      for (const msg of snapshot.messages) {
        if (msg.role === 'USER' && msg.traitData.traits) {
          for (const key of traitKeys) {
            if (typeof msg.traitData.traits[key] === 'number' && msg.traitData.traits[key] > 0) {
              traitKeysPresent.add(key);
            }
          }
        }
      }

      // 3. Process each badge definition
      const allBadges = badgeRegistry.getAll();

      // Use transaction for atomic badge updates
      // CRITICAL FIX: Collect all wallet deltas first, then apply once at the end
      // This prevents RewardLedgerEntry unique constraint conflicts (multiple badge upgrades per session)
      // and ensures correct wallet totals (single update instead of multiple reads/updates)
      await this.prisma.$transaction(async (tx) => {
        const walletDeltas = { xp: 0, coins: 0, gems: 0 };
        
        for (const badge of allBadges) {
          // Compute delta points for this badge
          const deltaPoints = this.computeBadgeDelta(
            badge,
            matchedHookKeys,
            matchedPatternKeys,
            traitKeysPresent,
          );

          if (deltaPoints <= 0) {
            continue; // No progress for this badge
          }

          // Enforce idempotency: check if progress already applied for this session
          const existingProgressEntry = await tx.badgeLedgerEntry.findUnique({
            where: {
              sessionId_badgeKey_kind: {
                sessionId,
                badgeKey: badge.badgeKey,
                kind: BadgeLedgerKind.PROGRESS_APPLY,
              },
            },
          });

          if (existingProgressEntry) {
            logger.debug(`[BadgesService] Badge ${badge.badgeKey} already processed for session ${sessionId}, skipping`);
            continue; // Already processed
          }

          // Create progress ledger entry (idempotency guard)
          await tx.badgeLedgerEntry.create({
            data: {
              userId: session.userId,
              sessionId,
              badgeKey: badge.badgeKey,
              kind: BadgeLedgerKind.PROGRESS_APPLY,
            },
          });

          // Upsert UserBadgeProgress and add deltaPoints
          const currentProgress = await tx.userBadgeProgress.findUnique({
            where: {
              userId_badgeKey: {
                userId: session.userId,
                badgeKey: badge.badgeKey,
              },
            },
          });

          const currentPoints = currentProgress?.points ?? 0;
          const currentTier = (currentProgress?.tier ?? 0) as BadgeTier;
          const newPoints = currentPoints + deltaPoints;

          // Recompute tier based on thresholds
          const newTier = this.computeTierFromPoints(badge, newPoints);

          // Upsert progress
          await tx.userBadgeProgress.upsert({
            where: {
              userId_badgeKey: {
                userId: session.userId,
                badgeKey: badge.badgeKey,
              },
            },
            create: {
              userId: session.userId,
              badgeKey: badge.badgeKey,
              categoryKey: badge.categoryKey,
              tier: newTier,
              points: newPoints,
            },
            update: {
              tier: newTier,
              points: newPoints,
            },
          });

          // Check for tier upgrade
          if (newTier > currentTier) {
            logger.log(`[BadgesService] Badge ${badge.badgeKey} upgraded from tier ${currentTier} to ${newTier} for user ${session.userId}`);

            // Enforce idempotency for tier upgrade rewards
            const existingUpgradeEntry = await tx.badgeLedgerEntry.findUnique({
              where: {
                sessionId_badgeKey_kind: {
                  sessionId,
                  badgeKey: badge.badgeKey,
                  kind: BadgeLedgerKind.TIER_UPGRADE,
                },
              },
            });

            if (!existingUpgradeEntry) {
              const rewards = badge.rewardsByTier[newTier];
              
              // Create upgrade ledger entry with reward deltas in meta
              // This enables idempotent wallet updates without RewardLedgerEntry unique constraint conflicts
              await tx.badgeLedgerEntry.create({
                data: {
                  userId: session.userId,
                  sessionId,
                  badgeKey: badge.badgeKey,
                  kind: BadgeLedgerKind.TIER_UPGRADE,
                  meta: {
                    fromTier: currentTier,
                    toTier: newTier,
                    xpDelta: rewards?.xp ?? 0,
                    coinsDelta: rewards?.coins ?? 0,
                    gemsDelta: rewards?.gems ?? 0,
                  },
                },
              });

              // Create UserBadgeEvent
              await tx.userBadgeEvent.create({
                data: {
                  userId: session.userId,
                  badgeKey: badge.badgeKey,
                  fromTier: currentTier,
                  toTier: newTier,
                  sessionId,
                },
              });

              // Accumulate wallet deltas (apply at end of transaction)
              if (rewards) {
                walletDeltas.xp += rewards.xp ?? 0;
                walletDeltas.coins += rewards.coins ?? 0;
                walletDeltas.gems += (rewards.gems ?? 0);
              }
            } else {
              logger.debug(`[BadgesService] Badge ${badge.badgeKey} upgrade rewards already applied for session ${sessionId}, skipping`);
            }
          }
        }

        // Apply accumulated wallet deltas once (idempotent check)
        if (walletDeltas.xp > 0 || walletDeltas.coins > 0 || walletDeltas.gems > 0) {
          await this.applyBadgeWalletRewards(tx, session.userId, sessionId, walletDeltas);
        }
      });
    } catch (error: any) {
      logger.error(`[BadgesService] Failed to update badges for session ${sessionId}: ${error.message}`, error.stack);
      // Don't throw - badge updates should not block session finalization
    }
  }

  /**
   * Compute progress delta for a badge based on session signals
   */
  private computeBadgeDelta(
    badge: BadgeDefinition,
    matchedHookKeys: Set<string>,
    matchedPatternKeys: Set<string>,
    traitKeysPresent: Set<string>,
  ): number {
    let delta = 0;

    // Check hook matches
    if (badge.progressRules.hookKeys && badge.progressRules.hookKeys.length > 0) {
      for (const hookKey of badge.progressRules.hookKeys) {
        if (matchedHookKeys.has(hookKey)) {
          delta += 1; // 1 point per matching hook
        }
      }
    }

    // Check pattern avoidance (avoiding bad patterns counts as progress)
    if (badge.progressRules.patternKeys && badge.progressRules.patternKeys.length > 0) {
      let patternsAvoided = 0;
      for (const patternKey of badge.progressRules.patternKeys) {
        if (!matchedPatternKeys.has(patternKey)) {
          patternsAvoided += 1; // Not having this pattern counts
        }
      }
      if (patternsAvoided > 0) {
        delta += 1; // 1 point if any patterns were avoided
      }
    }

    // Check trait presence (for trait-based badges)
    if (badge.progressRules.traitKeys && badge.progressRules.traitKeys.length > 0) {
      for (const traitKey of badge.progressRules.traitKeys) {
        if (traitKeysPresent.has(traitKey)) {
          delta += 1; // 1 point per present trait
        }
      }
    }

    // Clamp delta to 0-5 range per session
    return Math.max(0, Math.min(5, delta));
  }

  /**
   * Compute tier from points using badge thresholds
   */
  private computeTierFromPoints(badge: BadgeDefinition, points: number): BadgeTier {
    const thresholds = badge.tierThresholds;
    if (points >= thresholds[4]) return 4;
    if (points >= thresholds[3]) return 3;
    if (points >= thresholds[2]) return 2;
    if (points >= thresholds[1]) return 1;
    return 0;
  }

  /**
   * Apply accumulated badge wallet rewards (idempotent via BadgeLedgerEntry check)
   * 
   * CRITICAL FIX: Checks if ANY BadgeLedgerEntry TIER_UPGRADE exists for this session
   * and if wallet was already updated. This supports multiple badge upgrades per session
   * by accumulating deltas and applying once.
   * 
   * This avoids RewardLedgerEntry unique constraint conflict: RewardLedgerEntry has
   * @@unique([sessionId, kind]) which prevents multiple BADGE_TIER_UPGRADE entries.
   * 
   * ATOMIC UPDATE: Uses Prisma increment() for database-level atomic wallet updates,
   * preventing race conditions from concurrent finalize calls.
   */
  private async applyBadgeWalletRewards(
    tx: any,
    userId: string,
    sessionId: string,
    deltas: { xp: number; coins: number; gems: number },
  ): Promise<void> {
    // Safety guard: Skip if no deltas (avoid unnecessary writes)
    if (deltas.xp === 0 && deltas.coins === 0 && deltas.gems === 0) {
      logger.debug(`[BadgesService] No wallet deltas to apply for session ${sessionId}`);
      return;
    }

    // Check if wallet was already updated for this session's badge upgrades
    // We use a special BadgeLedgerEntry with a sentinel badgeKey to mark wallet update
    const walletUpdateMarker = await tx.badgeLedgerEntry.findUnique({
      where: {
        sessionId_badgeKey_kind: {
          sessionId,
          badgeKey: '__WALLET_UPDATED__', // Sentinel marker
          kind: BadgeLedgerKind.TIER_UPGRADE, // Reuse TIER_UPGRADE kind
        },
      },
    });

    if (walletUpdateMarker) {
      logger.debug(`[BadgesService] Wallet already updated for badge upgrades in session ${sessionId}`);
      return;
    }

    // Create sentinel BadgeLedgerEntry FIRST to "lock" the wallet update operation
    // This ensures idempotency: if sentinel creation fails (P2002), we know another transaction
    // is handling it, so we skip wallet update entirely
    try {
      await tx.badgeLedgerEntry.create({
        data: {
          userId,
          sessionId,
          badgeKey: '__WALLET_UPDATED__', // Sentinel marker (not a real badge)
          kind: BadgeLedgerKind.TIER_UPGRADE,
          meta: {
            totalXpDelta: deltas.xp,
            totalCoinsDelta: deltas.coins,
            totalGemsDelta: deltas.gems,
          },
        },
      });

      // Update UserWallet using atomic Prisma increments (database-level atomicity)
      // This happens AFTER sentinel creation, ensuring transactional safety
      await tx.userWallet.update({
        where: { userId },
        data: {
          xp: { increment: deltas.xp },
          lifetimeXp: { increment: deltas.xp },
          coins: { increment: deltas.coins },
          gems: { increment: deltas.gems },
        },
      });
    } catch (error: any) {
      // Handle P2002 unique constraint violation (concurrent sentinel insert)
      // If sentinel creation fails, another transaction already claimed this operation
      // Return early without updating wallet (idempotency)
      if (error?.code === 'P2002') {
        logger.debug(`[BadgesService] Wallet update marker already exists for session ${sessionId} (concurrent finalize), skipping wallet update`);
        return;
      }
      // P2025 (record not found for wallet update) and other errors: re-throw
      // Transaction will rollback, ensuring all-or-nothing semantics
      throw error;
    }
  }
}

