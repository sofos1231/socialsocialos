// src/api/statsService.ts
// Stub used by src/hooks/queries.ts

export interface StatsUser {
  id: string;
  email: string;
}

/**
 * Return a fake stats user.
 * Signature matches usage: getStatsUser(userId)
 */
export async function getUser(userId?: string): Promise<StatsUser> {
  console.warn(
    '[statsService] getUser() stub called – returning fake stats user. userId:',
    userId ?? 'none',
  );

  return {
    id: userId || 'stub-user',
    email: 'stub@example.com',
  };
}
