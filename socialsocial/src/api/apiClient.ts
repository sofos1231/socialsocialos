// src/api/apiClient.ts
// Minimal stub used by src/app/Providers.tsx

export type AuthLostHandler = () => void;

let currentHandler: AuthLostHandler | null = null;

/**
 * Register or clear a global "auth lost" handler.
 * The real implementation can later integrate with your API client.
 */
export function setOnAuthLost(handler: AuthLostHandler | null) {
  currentHandler = handler;
  console.log('[apiClient] setOnAuthLost called, handler set?', !!handler);
}

/**
 * Get the current auth lost handler (if any).
 */
export function getOnAuthLost(): AuthLostHandler | null {
  return currentHandler;
}
