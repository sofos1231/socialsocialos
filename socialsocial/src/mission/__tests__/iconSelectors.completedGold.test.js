jest.mock('../assets', () => ({
  ICON_COMPLETED_GOLD: 1,
  ICON_VIDEO_COMPLETED_GREEN: 2,
  ICON_COMPLETED_GREEN: 3,
  ICON_NEXT_MISSION_GREEN: 4,
}));

import { getCompletedGoldIcon, resolveMissionIcon } from '../iconSelectors';

describe('getCompletedGoldIcon', () => {
  it('returns asset for completed, non-video, gold=true', () => {
    const m = { status: 'completed', type: 'standard', _isGoldMilestone: true };
    expect(getCompletedGoldIcon(m)).toBe(1);
  });
  it('returns null for video', () => {
    const m = { status: 'completed', type: 'video', _isGoldMilestone: true };
    expect(getCompletedGoldIcon(m)).toBeNull();
  });
  it('returns null when not completed or gold not true', () => {
    expect(getCompletedGoldIcon({ status: 'pending', type: 'standard', _isGoldMilestone: true })).toBeNull();
    expect(getCompletedGoldIcon({ status: 'completed', type: 'standard', _isGoldMilestone: false })).toBeNull();
  });
});

describe('resolveMissionIcon gold priority', () => {
  it('prefers gold over video-completed and completed and next', () => {
    const m = { status: 'completed', type: 'standard', _isGoldMilestone: true, isNext: true };
    expect(resolveMissionIcon(m)).toBe(1);
  });
});


