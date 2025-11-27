// FILE: socialsocial/src/api/missionsService.ts

import apiClient from './apiClient';

export async function fetchMissionRoad() {
  const res = await apiClient.get('/missions/road');
  return res.data;
}

export async function startMission(templateId: string) {
  const res = await apiClient.post(`/missions/${templateId}/start`, {});
  return res.data;
}
