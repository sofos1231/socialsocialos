import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';

export type PlayerProgress = {
  level: number;
  xp: number;
  xpToNext: number;
  coins: number;
  diamonds: number;
  streakDays: number;
  streakBonusPct: number; // e.g., 10 for +10% XP
};

type Ctx = PlayerProgress & {
  addXP: (amount: number) => void;
  addCoins: (n: number) => void;
  addDiamonds: (n: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
};

const PlayerProgressContext = createContext<Ctx | null>(null);

export function PlayerProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerProgress>({
    level: 3,
    xp: 240,
    xpToNext: 400,
    coins: 1280,
    diamonds: 24,
    streakDays: 5,
    streakBonusPct: 10,
  });

  const api: Ctx = useMemo(() => ({
    ...state,
    addXP: (amount) => {
      setState((prev) => {
        let xp = prev.xp + amount;
        let level = prev.level;
        let xpToNext = prev.xpToNext;
        while (xp >= xpToNext) {
          xp -= xpToNext;
          level += 1;
          xpToNext = Math.round(xpToNext * 1.15);
        }
        return { ...prev, xp, level, xpToNext };
      });
    },
    addCoins: (n) => setState((p) => ({ ...p, coins: p.coins + n })),
    addDiamonds: (n) => setState((p) => ({ ...p, diamonds: p.diamonds + n })),
    incrementStreak: () => setState((p) => {
      const days = p.streakDays + 1;
      const bonus = days >= 4 ? 10 : 0;
      return { ...p, streakDays: days, streakBonusPct: bonus };
    }),
    resetStreak: () => setState((p) => ({ ...p, streakDays: 0, streakBonusPct: 0 })),
  }), [state]);

  return (
    <PlayerProgressContext.Provider value={api}>{children}</PlayerProgressContext.Provider>
  );
}

export function usePlayerProgress() {
  const ctx = useContext(PlayerProgressContext);
  if (!ctx) throw new Error('usePlayerProgress must be used within PlayerProgressProvider');
  return ctx;
}


