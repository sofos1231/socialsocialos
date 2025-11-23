// src/api/subscriptionsService.ts
// Stubs used by src/hooks/queries.ts and src/hooks/mutations.ts

export interface Entitlements {
  hasPro: boolean;
  expiresAt: string | null;
}

/**
 * Return fake entitlements – user is free-only by default.
 */
export async function getEntitlements(): Promise<Entitlements> {
  console.warn(
    '[subscriptionsService] getEntitlements() stub called – returning free-only entitlements',
  );

  return {
    hasPro: false,
    expiresAt: null,
  };
}

/**
 * Pretend to send a purchase receipt to backend.
 * Signature matches usage: sendReceipt(input, { idempotencyKey })
 */
export async function sendReceipt(
  receipt: unknown,
  options?: any,
): Promise<{ ok: boolean }> {
  console.warn('[subscriptionsService] sendReceipt() stub called', {
    receipt,
    options,
  });

  return { ok: true };
}
