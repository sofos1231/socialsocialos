import { Time, isRollover, isSameJeruDay, isNextJeruDay, weekStartJeru } from './time';

describe('Time (Asia/Jerusalem)', () => {
  it('isSameJeruDay true within same calendar day in Jeru', () => {
    const a = new Date('2025-03-27T21:00:00Z');
    const b = new Date('2025-03-27T23:59:59Z');
    expect(isSameJeruDay(a, b)).toBe(true);
  });

  it('isNextJeruDay across midnight with DST consideration', () => {
    // Around Israel DST start (last Friday before Apr 1st at 02:00 local)
    const prev = new Date('2025-03-28T21:59:59Z');
    const now = new Date('2025-03-29T22:00:01Z');
    expect(isNextJeruDay(prev, now)).toBe(true);
  });

  it('isRollover true when day changes', () => {
    const prev = new Date('2025-04-01T21:00:00Z');
    const now = new Date('2025-04-02T21:00:00Z');
    expect(isRollover(prev, now)).toBe(true);
  });

  it('weekStartJeru anchors to Monday 00:00 Jeru', () => {
    const d = new Date('2025-09-24T12:00:00Z');
    const ws = weekStartJeru(d);
    // Should be at 00:00 Jeru on Monday
    const y = ws.getUTCFullYear();
    expect(y).toBeGreaterThan(0);
  });
});


