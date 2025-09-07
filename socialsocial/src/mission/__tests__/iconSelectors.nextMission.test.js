jest.mock('../assets', () => ({
  ICON_NEXT_MISSION_GREEN: 1,
}));

import { getNextIcon, isNextDisabled } from '../iconSelectors';

describe('getNextIcon (next-mission-green)', () => {
  it('returns asset for next, not completed, not video, unlocked', () => {
    const m = { isNext: true, status: 'pending', type: 'standard', locked: false };
    expect(getNextIcon(m)).toBeTruthy();
  });

  it('returns null for video missions', () => {
    const m = { isNext: true, status: 'pending', type: 'video', locked: false };
    expect(getNextIcon(m)).toBeNull();
  });

  it('returns null for completed missions', () => {
    const m = { isNext: true, status: 'completed', type: 'standard', locked: false };
    expect(getNextIcon(m)).toBeNull();
  });

  it('returns null when isNext is false', () => {
    const m = { isNext: false, status: 'pending', type: 'standard', locked: false };
    expect(getNextIcon(m)).toBeNull();
  });
});

describe('isNextDisabled', () => {
  it('true for isNext:true and locked:true', () => {
    const m = { isNext: true, locked: true };
    expect(isNextDisabled(m)).toBe(true);
  });
  it('true for isNext:true and unlockable:false', () => {
    const m = { isNext: true, unlockable: false };
    expect(isNextDisabled(m)).toBe(true);
  });
  it('false when isNext:false', () => {
    const m = { isNext: false, locked: true };
    expect(isNextDisabled(m)).toBe(false);
  });
});


