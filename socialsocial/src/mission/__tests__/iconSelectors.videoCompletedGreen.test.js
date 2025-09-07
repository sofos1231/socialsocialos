jest.mock('../assets', () => ({
  ICON_VIDEO_COMPLETED_GREEN: 1,
  ICON_COMPLETED_GREEN: 2,
  ICON_NEXT_MISSION_GREEN: 3,
}));

import { getVideoCompletedIcon, resolveMissionIcon } from '../iconSelectors';

describe('getVideoCompletedIcon (video-completed-green)', () => {
  it('returns asset for completed, video, not milestone', () => {
    const m = { status: 'completed', type: 'video', _isGoldMilestone: false };
    expect(getVideoCompletedIcon(m)).toBeTruthy();
  });

  it('returns null for non-video', () => {
    const m = { status: 'completed', type: 'standard', _isGoldMilestone: false };
    expect(getVideoCompletedIcon(m)).toBeNull();
  });

  it('returns null for non-completed statuses or milestone', () => {
    expect(getVideoCompletedIcon({ status: 'pending', type: 'video', _isGoldMilestone: false })).toBeNull();
    expect(getVideoCompletedIcon({ status: 'failed', type: 'video', _isGoldMilestone: false })).toBeNull();
    expect(getVideoCompletedIcon({ status: 'completed', type: 'video', _isGoldMilestone: true })).toBeNull();
  });
});

describe('resolveMissionIcon priority', () => {
  it('prefers video-completed over completed and next when flags collide', () => {
    const m = { status: 'completed', type: 'video', _isGoldMilestone: false, isNext: true, locked: false };
    expect(resolveMissionIcon(m)).toBe(1);
  });

  it('falls back to completed (non-video) when appropriate', () => {
    const m = { status: 'completed', type: 'standard', _isGoldMilestone: false };
    expect(resolveMissionIcon(m)).toBe(2);
  });

  it('falls back to next non-video if not completed', () => {
    const m = { isNext: true, status: 'pending', type: 'standard', locked: false };
    expect(resolveMissionIcon(m)).toBe(3);
  });
});


