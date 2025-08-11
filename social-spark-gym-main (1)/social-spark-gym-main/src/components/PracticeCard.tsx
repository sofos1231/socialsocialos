import React from 'react';
import { LucideIcon } from 'lucide-react';
import ProgressBar from './ProgressBar';

interface PracticeCardProps {
  id: string;
  title: string;
  icon: LucideIcon;
  theme: 'dating' | 'interview' | 'charisma' | 'speaking';
  xp: number;
  streak: number;
  completedMissions: number;
  totalMissions: number;
  onClick?: () => void;
  animationDelay?: number;
}

const PracticeCard: React.FC<PracticeCardProps> = ({
  title,
  icon: Icon,
  theme,
  xp,
  streak,
  completedMissions,
  totalMissions,
  onClick,
  animationDelay = 0
}) => {
  const getThemeClasses = () => {
    switch (theme) {
      case 'dating':
        return {
          gradient: 'from-pink-900/80 to-pink-600/80',
          border: 'border-pink-500/50',
          glow: 'shadow-pink-500/20',
        };
      case 'interview':
        return {
          gradient: 'from-blue-900/80 to-blue-600/80',
          border: 'border-blue-500/50',
          glow: 'shadow-blue-500/20',
        };
      case 'charisma':
        return {
          gradient: 'from-emerald-900/80 to-emerald-600/80',
          border: 'border-emerald-500/50',
          glow: 'shadow-emerald-500/20',
        };
      case 'speaking':
        return {
          gradient: 'from-orange-900/80 to-orange-600/80',
          border: 'border-orange-500/50',
          glow: 'shadow-orange-500/20',
        };
      default:
        return {
          gradient: 'from-slate-800/80 to-slate-600/80',
          border: 'border-slate-500/50',
          glow: 'shadow-slate-500/20',
        };
    }
  };

  const themeClasses = getThemeClasses();

  return (
    <div 
      className={`
        relative p-6 rounded-2xl border-2 backdrop-blur-sm cursor-pointer
        transition-all duration-300 hover:scale-105 hover:shadow-2xl
        bg-gradient-to-br ${themeClasses.gradient} ${themeClasses.border} ${themeClasses.glow}
        animate-fade-in
      `}
      style={{ 
        animationDelay: `${animationDelay}ms`,
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
            <Icon size={24} className="text-white" />
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        
        {/* Streak indicator */}
        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
          <span className="text-sm">🔥</span>
          <span className="text-sm font-semibold text-orange-300">{streak}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{xp.toLocaleString()}</div>
          <div className="text-xs text-white/70">XP Earned</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">{completedMissions}/{totalMissions}</div>
          <div className="text-xs text-white/70">Missions</div>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar
        current={completedMissions}
        max={totalMissions}
        showNumbers={false}
        height={8}
        intense
      />

      {/* Decorative elements */}
      <div className="absolute top-4 right-4 w-2 h-2 bg-white/30 rounded-full animate-pulse" />
      <div className="absolute bottom-4 left-4 w-1 h-1 bg-white/40 rounded-full" />
    </div>
  );
};

export default PracticeCard;