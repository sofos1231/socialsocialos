jest.mock('../assets', () => ({
  ICON_COMPLETED_GREEN: 1,
}));

import { getCompletedIcon } from '../iconSelectors';

describe('getCompletedIcon (completed-green)', () => {
  it('returns asset for completed, non-video, not gold milestone', () => {
    const m = { status: 'completed', type: 'practice', _isGoldMilestone: false };
    expect(getCompletedIcon(m)).toBeTruthy();
  });

  it('returns null for video missions', () => {
    const m = { status: 'completed', type: 'video', _isGoldMilestone: false };
    expect(getCompletedIcon(m)).toBeNull();
  });

  it('returns null for non-completed statuses', () => {
    ['pending', 'current', 'available', 'locked', 'failed'].forEach((status) => {
      const m = { status, type: 'practice', _isGoldMilestone: false };
      expect(getCompletedIcon(m)).toBeNull();
    });
  });

  it('returns null for gold milestone missions', () => {
    const m = { status: 'completed', type: 'practice', _isGoldMilestone: true };
    expect(getCompletedIcon(m)).toBeNull();
  });
});
