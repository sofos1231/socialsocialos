import React, { useEffect, useState } from 'react';
import { Trophy, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RewardPopupProps {
  isOpen: boolean;
  onClose: () => void;
  xpGained: number;
  missionTitle: string;
  streakBonus?: number;
  className?: string;
}

const RewardPopup: React.FC<RewardPopupProps> = ({
  isOpen,
  onClose,
  xpGained,
  missionTitle,
  streakBonus = 0,
  className = ""
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'celebrate' | 'exit'>('enter');

  useEffect(() => {
    if (isOpen) {
      setAnimationPhase('enter');
      setShowConfetti(true);
      
      // Celebration phase
      const celebrateTimer = setTimeout(() => {
        setAnimationPhase('celebrate');
      }, 300);
      
      // Auto close after celebration
      const closeTimer = setTimeout(() => {
        setAnimationPhase('exit');
        setTimeout(onClose, 300);
      }, 2500);
      
      // Stop confetti
      const confettiTimer = setTimeout(() => {
        setShowConfetti(false);
      }, 1500);

      return () => {
        clearTimeout(celebrateTimer);
        clearTimeout(closeTimer);
        clearTimeout(confettiTimer);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalXP = xpGained + streakBonus;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center p-4",
      "bg-black/50 backdrop-blur-sm",
      className
    )}>
      {/* Confetti Background */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Main Popup */}
      <div className={cn(
        "relative bg-background border border-border rounded-2xl p-8 text-center max-w-sm w-full",
        "shadow-2xl transform transition-all duration-500",
        animationPhase === 'enter' && "scale-50 opacity-0 rotate-12",
        animationPhase === 'celebrate' && "scale-100 opacity-100 rotate-0",
        animationPhase === 'exit' && "scale-110 opacity-0 -rotate-6"
      )}>
        {/* Trophy Icon */}
        <div className="relative mb-6">
          <div className={cn(
            "w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500",
            "flex items-center justify-center shadow-lg transform transition-transform duration-700",
            animationPhase === 'celebrate' && "scale-110 animate-pulse"
          )}>
            <Trophy className="w-10 h-10 text-white" />
          </div>
          
          {/* Sparkle effects */}
          <div className="absolute -top-2 -right-2 animate-spin">
            <Star className="w-6 h-6 text-yellow-400" />
          </div>
          <div className="absolute -bottom-1 -left-2 animate-bounce">
            <Star className="w-4 h-4 text-orange-400" />
          </div>
        </div>

        {/* Mission Complete Text */}
        <h2 className="text-xl font-display font-bold text-foreground mb-2">
          Mission Complete! 🎉
        </h2>
        
        <p className="text-sm text-muted-foreground mb-6">
          {missionTitle}
        </p>

        {/* XP Reward */}
        <div className="space-y-3">
          <div className={cn(
            "flex items-center justify-center gap-2 p-4 rounded-xl",
            "bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20",
            "transform transition-all duration-500",
            animationPhase === 'celebrate' && "scale-105"
          )}>
            <Zap className="w-6 h-6 text-primary" />
            <span className="text-2xl font-bold text-primary">
              +{xpGained} XP
            </span>
          </div>
          
          {/* Streak Bonus */}
          {streakBonus > 0 && (
            <div className={cn(
              "flex items-center justify-center gap-2 p-3 rounded-lg",
              "bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20",
              "transform transition-all duration-700",
              animationPhase === 'celebrate' && "scale-105"
            )}>
              <div className="flex items-center gap-1">
                <span className="text-orange-500">🔥</span>
                <span className="text-sm font-medium text-orange-500">
                  Streak Bonus: +{streakBonus} XP
                </span>
              </div>
            </div>
          )}
          
          {/* Total */}
          {streakBonus > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-bold text-foreground">
                  Total: {totalXP} XP
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Progress indicator */}
        <div className="mt-6 text-xs text-muted-foreground">
          Keep going! You're making great progress! 💪
        </div>
      </div>
    </div>
  );
};

export default RewardPopup;