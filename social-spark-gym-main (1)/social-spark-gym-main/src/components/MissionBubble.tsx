import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Mission {
  id: number;
  title: string;
  description: string;
  type: 'chat' | 'video' | 'boss' | 'premium';
  duration: string;
  xpReward: number;
  status: 'locked' | 'available' | 'completed' | 'current';
  difficulty: 'easy' | 'medium' | 'hard';
}

interface MissionBubbleProps {
  mission: Mission;
  icon: LucideIcon;
  position: { x: number; y: number };
  onTap: (mission: Mission) => void;
  showNewTag?: boolean;
  streakBonus?: boolean;
}

const MissionBubble: React.FC<MissionBubbleProps> = ({
  mission,
  icon: Icon,
  position,
  onTap,
  showNewTag = false,
  streakBonus = false
}) => {
  const getBubbleStyles = () => {
    const baseClasses = "relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer transform hover:scale-110 active:scale-95";
    
    switch (mission.status) {
      case 'completed':
        return cn(
          baseClasses,
          "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-400/30",
          "after:content-[''] after:absolute after:inset-0 after:rounded-full after:bg-emerald-400/20 after:animate-pulse after:scale-110"
        );
      case 'current':
        return cn(
          baseClasses,
          "bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/40",
          "animate-pulse",
          streakBonus && "after:content-[''] after:absolute after:-inset-2 after:rounded-full after:bg-gradient-to-r after:from-yellow-400 after:to-orange-400 after:opacity-30 after:animate-spin after:duration-3000"
        );
      case 'available':
        return cn(
          baseClasses,
          "bg-gradient-to-br from-slate-600 to-slate-700 shadow-md shadow-slate-500/20",
          "hover:shadow-primary/20 hover:from-slate-500 hover:to-slate-600"
        );
      case 'locked':
      default:
        return cn(
          baseClasses,
          "bg-gradient-to-br from-slate-700 to-slate-800 shadow-sm opacity-60 cursor-not-allowed",
          "hover:scale-100" // Override hover scale for locked
        );
    }
  };

  const getBossStyles = () => {
    if (mission.type === 'boss') {
      return "after:content-[''] after:absolute after:-inset-1 after:rounded-full after:bg-gradient-to-r after:from-yellow-400 after:to-orange-500 after:p-1 after:-z-10 after:animate-pulse";
    }
    return "";
  };

  const getPremiumStyles = () => {
    if (mission.type === 'premium') {
      return "after:content-[''] after:absolute after:-inset-1 after:rounded-full after:bg-gradient-to-r after:from-purple-400 after:to-pink-500 after:p-1 after:-z-10";
    }
    return "";
  };

  const getTrendingAnimation = () => {
    // Add trending animation for current missions
    if (mission.status === 'current' && Math.random() > 0.5) {
      return "before:content-['🔥'] before:absolute before:-top-2 before:-right-2 before:text-xs before:animate-bounce";
    }
    return "";
  };

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: `${position.x}%`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Mission Bubble */}
      <div
        className={cn(
          getBubbleStyles(),
          getBossStyles(),
          getPremiumStyles(),
          getTrendingAnimation()
        )}
        onClick={() => onTap(mission)}
      >
        <Icon className="w-7 h-7 text-white drop-shadow-sm" />
        
        {/* Completion Checkmark Overlay */}
        {mission.status === 'completed' && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}
        
        {/* Lock Overlay */}
        {mission.status === 'locked' && (
          <div className="absolute inset-0 rounded-full bg-slate-900/50 flex items-center justify-center">
            <div className="w-4 h-4 bg-slate-400 rounded-sm opacity-80" />
          </div>
        )}
        
        {/* New Tag */}
        {showNewTag && mission.status === 'available' && (
          <div className="absolute -top-3 -right-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg animate-bounce">
            NEW!
          </div>
        )}
      </div>

      {/* Mission Title */}
      <div className="mt-3 text-center max-w-[100px]">
        <h3 className="text-sm font-bold text-foreground leading-tight font-display">
          {mission.title}
        </h3>
        
        {/* XP and Duration (visible on tap/hover) */}
        <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <span>⚡{mission.xpReward}</span>
            <span>•</span>
            <span>{mission.duration}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionBubble;