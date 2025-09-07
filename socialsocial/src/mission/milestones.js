export function tagGoldMilestones(missions) {
  const completed = missions
    ?.filter(m => m?.status === 'completed')
    ?.sort((a, b) => (a?.completedAt ?? 0) - (b?.completedAt ?? 0)) ?? [];

  const goldCount = Math.floor(completed.length / 5) * 5;

  completed.forEach((m, idx) => {
    m._isGoldMilestone = idx < goldCount;
  });

  missions?.forEach(m => {
    if (m?.status !== 'completed') m._isGoldMilestone = false;
  });

  return missions;
}


