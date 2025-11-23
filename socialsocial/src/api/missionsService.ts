// src/api/missionsService.ts
// Stubs used by src/hooks/queries.ts and src/hooks/mutations.ts

export interface MissionSummary {
  id: string;
  title: string;
  completed: boolean;
}

/**
 * Return a fake mission list (empty for now).
 */
export async function list(): Promise<MissionSummary[]> {
  console.warn(
    '[missionsService] list() stub called – returning empty mission list',
  );

  return [];
}

/**
 * Claim a mission reward.
 * Signature matches usage: claim(id, { score }, { idempotencyKey })
 */
export async function claim(
  missionId: string,
  payload?: any,
  options?: any,
): Promise<{ ok: boolean }> {
  console.warn('[missionsService] claim() stub called', {
    missionId,
    payload,
    options,
  });

  return { ok: true };
}
