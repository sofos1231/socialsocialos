import { tagGoldMilestones } from '../milestones';

const make = (n, { withVideo = false } = {}) => {
  const missions = [];
  for (let i = 0; i < n; i++) {
    missions.push({ id: i + 1, status: 'completed', type: withVideo && i % 2 === 0 ? 'video' : 'standard', completedAt: i + 1 });
  }
  return missions;
};

describe('tagGoldMilestones', () => {
  it('0,1,4 completed => 0 gold', () => {
    expect(tagGoldMilestones(make(0))).toEqual([]);
    const one = tagGoldMilestones(make(1));
    expect(one.filter(m => m._isGoldMilestone).length).toBe(0);
    const four = tagGoldMilestones(make(4));
    expect(four.filter(m => m._isGoldMilestone).length).toBe(0);
  });

  it('5,6,9 => first 5 gold', () => {
    const five = tagGoldMilestones(make(5));
    expect(five.filter(m => m._isGoldMilestone).length).toBe(5);
    const six = tagGoldMilestones(make(6));
    expect(six.filter(m => m._isGoldMilestone).length).toBe(5);
    const nine = tagGoldMilestones(make(9));
    expect(nine.filter(m => m._isGoldMilestone).length).toBe(5);
  });

  it('10 => first 10 gold', () => {
    const ten = tagGoldMilestones(make(10));
    expect(ten.filter(m => m._isGoldMilestone).length).toBe(10);
  });

  it('mixed video/non-video still index by completedAt', () => {
    const mixed = tagGoldMilestones(make(7, { withVideo: true }));
    const gold = mixed.filter(m => m._isGoldMilestone);
    expect(gold.length).toBe(5);
    // earliest by completedAt are ids 1..5
    expect(gold.map(m => m.id)).toEqual([1,2,3,4,5]);
  });
});


