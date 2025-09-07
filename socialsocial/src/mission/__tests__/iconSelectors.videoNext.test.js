jest.mock('../assets', () => ({
  ICON_COMPLETED_GOLD: 1,
  ICON_VIDEO_COMPLETED_GREEN: 2,
  ICON_COMPLETED_GREEN: 3,
  ICON_VIDEO_NEXT_GREEN: 4,
  ICON_NEXT_MISSION_GREEN: 5,
}));

import { getVideoNextIcon, resolveMissionIcon } from '../iconSelectors';

describe('getVideoNextIcon', () => {
  it('returns asset for next=true, not completed, type=video, unlocked', () => {
    const m = { isNext: true, status: 'pending', type: 'video', locked: false };
    expect(getVideoNextIcon(m)).toBe(4);
  });
  it('returns null for completed', () => {
    const m = { isNext: true, status: 'completed', type: 'video', locked: false };
    expect(getVideoNextIcon(m)).toBeNull();
  });
  it('returns null for non-video', () => {
    const m = { isNext: true, status: 'pending', type: 'standard', locked: false };
    expect(getVideoNextIcon(m)).toBeNull();
  });
  it('returns null for locked=true', () => {
    const m = { isNext: true, status: 'pending', type: 'video', locked: true };
    expect(getVideoNextIcon(m)).toBeNull();
  });
});

describe('resolveMissionIcon precedence for next video', () => {
  it('completed-gold over all', () => {
    const m = { status: 'completed', type: 'standard', _isGoldMilestone: true };
    expect(resolveMissionIcon(m)).toBe(1);
  });
  it('video-completed-green over others', () => {
    const m = { status: 'completed', type: 'video', _isGoldMilestone: false };
    expect(resolveMissionIcon(m)).toBe(2);
  });
  it('completed-green over nexts', () => {
    const m = { status: 'completed', type: 'standard', _isGoldMilestone: false };
    expect(resolveMissionIcon(m)).toBe(3);
  });
  it('video-next-green over next non-video', () => {
    const m = { isNext: true, status: 'pending', type: 'video', locked: false };
    expect(resolveMissionIcon(m)).toBe(4);
  });
  it('next non-video last', () => {
    const m = { isNext: true, status: 'pending', type: 'standard', locked: false };
    expect(resolveMissionIcon(m)).toBe(5);
  });
});


