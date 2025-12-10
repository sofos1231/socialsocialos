// backend/src/modules/shared/normalizers/end-reason.normalizer.ts
// ✅ Step 5.7: Shared normalizeEndReason (extracted from practice.service.ts)

import { Prisma } from '@prisma/client';
import {
  MissionEndReasonCode,
  MISSION_END_REASON_CODES,
} from '../../missions-admin/mission-config-v1.schema';

// ✅ Step 5.3: Module-level Set for O(1) lookup performance
const VALID_END_REASON_CODES_SET = new Set<string>(MISSION_END_REASON_CODES);

/**
 * ✅ Step 5.3: Normalize endReasonCode/endReasonMeta from DB (defensive normalization)
 * Validates endReasonCode against MissionEndReasonCode enum and ensures meta is plain object or null.
 * Always converts undefined → null. Idempotent.
 */
export function normalizeEndReason(
  code: any,
  meta: any,
): { endReasonCode: MissionEndReasonCode | null; endReasonMeta: Record<string, any> | null } {
  // Normalize code: ensure MissionEndReasonCode | null (never undefined)
  // Must be a valid enum member
  let normalizedCode: MissionEndReasonCode | null = null;
  if (
    code !== null &&
    code !== undefined &&
    code !== Prisma.DbNull &&
    code !== Prisma.JsonNull &&
    typeof code === 'string'
  ) {
    // Validate against enum using Set for O(1) lookup
    if (VALID_END_REASON_CODES_SET.has(code)) {
      normalizedCode = code as MissionEndReasonCode;
    }
    // Invalid code → null (defensive)
  }

  // Normalize meta: ensure plain object | null (handle DbNull/JsonNull/malformed)
  const metaIsNullLike =
    meta === null ||
    meta === undefined ||
    meta === Prisma.DbNull ||
    meta === Prisma.JsonNull;

  const isPlainObject =
    !metaIsNullLike &&
    typeof meta === 'object' &&
    !Array.isArray(meta) &&
    meta !== null &&
    meta.constructor === Object;

  const normalizedMeta = isPlainObject ? meta : null;

  return { endReasonCode: normalizedCode, endReasonMeta: normalizedMeta };
}


