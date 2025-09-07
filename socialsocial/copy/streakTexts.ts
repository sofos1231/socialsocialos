export const streakTexts = {
  title: (n: number) => `${n} Day Streak`,
  sub: (percent: number) => `You're in the top ${percent}% this week. Don’t break it.`,
  bonus: (bonus: number) => `Bonus: +${bonus}% XP on all missions today`,
  encouragements: [
    'Small steps, big wins.',
    'Momentum is your superpower.',
    'Consistency compounds progress.',
  ],
  nextReward: (k: number) => `Next reward in ${k} day${k === 1 ? '' : 's'}`,
};

export function pickEncouragement(seed: number = Date.now()): string {
  const arr = streakTexts.encouragements;
  return arr[Math.abs(seed) % arr.length];
}


