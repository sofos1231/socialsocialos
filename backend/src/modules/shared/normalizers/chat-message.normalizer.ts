// backend/src/modules/shared/normalizers/chat-message.normalizer.ts
// ✅ Step 5.5: Shared normalizers (no service-to-service dependencies)

import { MessageRole } from '@prisma/client';

/**
 * Normalize role enum from any input (defensive normalization)
 */
function normalizeRole(role: any): MessageRole {
  if (role === 'USER' || role === MessageRole.USER) return MessageRole.USER;
  if (role === 'AI' || role === MessageRole.AI) return MessageRole.AI;
  if (role === 'SYSTEM' || role === MessageRole.SYSTEM) return MessageRole.SYSTEM;
  // default: treat unknown as SYSTEM (safer than AI)
  return MessageRole.SYSTEM;
}

/**
 * Normalize traitData from DB (defensive normalization)
 * Handles null, undefined, malformed objects, and ensures consistent shape.
 */
function normalizeTraitData(v: any): { traits: Record<string, any>; flags: string[]; label: string | null } {
  const okObj = v && typeof v === 'object' && !Array.isArray(v);
  const traits = okObj && typeof v.traits === 'object' && v.traits ? v.traits : {};
  const flags = okObj && Array.isArray(v.flags) ? v.flags : [];
  const label = okObj && typeof v.label === 'string' ? v.label : null;
  return { traits, flags, label };
}

/**
 * ✅ Step 5.4: Normalize ChatMessage fields on READ (defensive normalization)
 * Ensures turnIndex and score are properly normalized before returning to FE.
 * @param m Raw message object from DB (may have undefined/null/invalid values)
 * @param fallbackIndex Required fallback if m.turnIndex is missing/invalid
 * @returns Normalized message matching ApiChatMessage contract
 */
export function normalizeChatMessageRead(
  m: any,
  fallbackIndex: number,
): {
  turnIndex: number;
  role: MessageRole;
  content: string;
  score: number | null;
  traitData: { traits: Record<string, any>; flags: string[]; label: string | null };
} {
  // Normalize turnIndex: if m.turnIndex is a finite number >= 0 → Math.trunc(m.turnIndex)
  // else → Math.trunc(fallbackIndex) (always provided)
  let normalizedTurnIndex: number;
  if (
    typeof m.turnIndex === 'number' &&
    Number.isFinite(m.turnIndex) &&
    m.turnIndex >= 0
  ) {
    normalizedTurnIndex = Math.trunc(m.turnIndex);
  } else {
    normalizedTurnIndex = Math.trunc(fallbackIndex);
  }

  // Normalize score: if m.score is a finite number AND 0 <= score <= 100 → Math.trunc(m.score)
  // else → null (No clamping. Invalid/out-of-range becomes null.)
  let normalizedScore: number | null = null;
  if (
    typeof m.score === 'number' &&
    Number.isFinite(m.score) &&
    m.score >= 0 &&
    m.score <= 100
  ) {
    normalizedScore = Math.trunc(m.score);
  }

  // Normalize role
  const normalizedRole = normalizeRole(m.role);

  // Normalize content: ensure it's a string (fallback '' if somehow nullish)
  const normalizedContent = typeof m.content === 'string' ? m.content : '';

  // Normalize traitData: must use existing normalizeTraitData
  const normalizedTraitData = normalizeTraitData(m.traitData);

  return {
    turnIndex: normalizedTurnIndex,
    role: normalizedRole,
    content: normalizedContent,
    score: normalizedScore,
    traitData: normalizedTraitData,
  };
}

