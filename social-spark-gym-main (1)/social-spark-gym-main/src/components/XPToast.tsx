import { useEffect, useState } from 'react';

interface XPToastProps {
  xp: number;
  onComplete: () => void;
  showStreak?: boolean;
  streakCount?: number;
}

const XPToast = ({ xp, onComplete, showStreak = false, streakCount = 0 }: XPToastProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-card rounded-xl p-6 shadow-elevation mx-4 text-center animate-scale-in">
        <div className="mb-3">
          <div className="text-4xl mb-2 animate-bounce-subtle">🎉</div>
          <h3 className="text-lg font-semibold mb-1">Great job!</h3>
          <div className="xp-badge text-lg font-bold animate-xp-pop">
            +{xp} XP Earned!
          </div>
        </div>
        
        {showStreak && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-warning text-lg animate-pulse">🔥</span>
            <span className="text-sm font-medium">
              {streakCount} Day Streak Bonus!
            </span>
          </div>
        )}
        
        <div className="mt-4 text-xs text-muted-foreground">
          Tap anywhere to continue
        </div>
      </div>
    </div>
  );
};

export default XPToast;