import { ICON_COMPLETED_GREEN, ICON_NEXT_MISSION_GREEN, ICON_VIDEO_COMPLETED_GREEN, ICON_COMPLETED_GOLD, ICON_VIDEO_NEXT_GREEN, ICON_VIDEO_LOCKED, ICON_VIDEO_COMPLETED_GOLD, ICON_MISSION_LOCKED_GRAY } from './assets';

export const getCompletedIcon = (mission) => {
  if (!mission) return null;
  // YAML: mission.completed && mission.type != 'video' && !isGold(mission)
  if (
    mission.status === 'completed' &&
    mission.type !== 'video' &&
    mission._isGoldMilestone !== true
  ) {
    return ICON_COMPLETED_GREEN || null;
  }
  return null;
};

export const getNextIcon = (mission) => {
  // YAML: mission.id == user.nextMissionId && !mission.completed
  // Existing app uses mission.isNext; respect both for compatibility
  const isNext = mission?.isNext === true || mission?.isNextMission === true;
  if (
    isNext &&
    mission?.status !== 'completed' &&
    mission?.type !== 'video' &&
    mission?.locked !== true
  ) {
    return ICON_NEXT_MISSION_GREEN || null;
  }
  return null;
};

export const isNextDisabled = (mission) => {
  return mission?.isNext === true && (mission?.locked === true || mission?.unlockable === false);
};

export const getVideoCompletedIcon = (mission) => {
  if (
    mission?.status === 'completed' &&
    mission?.type === 'video' &&
    mission?._isGoldMilestone !== true
  ) {
    return ICON_VIDEO_COMPLETED_GREEN || null;
  }
  return null;
};

export const getCompletedGoldIcon = (mission) => {
  if (
    mission?.status === 'completed' &&
    mission?.type !== 'video' &&
    mission?._isGoldMilestone === true
  ) {
    return ICON_COMPLETED_GOLD || null;
  }
  return null;
};

export const getVideoCompletedGoldIcon = (mission) => {
  if (
    mission?.status === 'completed' &&
    mission?.type === 'video' &&
    mission?._isGoldMilestone === true
  ) {
    return ICON_VIDEO_COMPLETED_GOLD || null;
  }
  return null;
};

export const getVideoNextIcon = (mission) => {
  const isNext = mission?.isNext === true || mission?.isNextMission === true;
  if (
    isNext &&
    mission?.status !== 'completed' &&
    mission?.type === 'video' &&
    mission?.locked !== true
  ) {
    return ICON_VIDEO_NEXT_GREEN || null;
  }
  return null;
};

export const getVideoLockedIcon = (mission) => {
  if (mission?.type === 'video' && mission?.locked === true) {
    return ICON_VIDEO_LOCKED || null;
  }
  return null;
};

export const getMissionLockedIcon = (mission) => {
  if (mission?.locked === true && mission?.type !== 'video') {
    return ICON_MISSION_LOCKED_GRAY || null;
  }
  return null;
};

export const resolveMissionIcon = (mission) => {
  // YAML resolver priority: video-gold > checkmark-gold > video-completed > mission-completed > next-mission
  const vGold = getVideoCompletedGoldIcon?.(mission); if (vGold) return vGold;
  const gold = getCompletedGoldIcon?.(mission); if (gold) return gold;
  const vDone = getVideoCompletedIcon?.(mission); if (vDone) return vDone;
  const done = getCompletedIcon?.(mission); if (done) return done;
  const vNext = getVideoNextIcon?.(mission); if (vNext) return vNext;
  const next = getNextIcon?.(mission); if (next) return next;
  return null;
};
