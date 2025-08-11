import { LucideIcon, Lock, CheckCircle, Flame, Crown, Zap, Brain, Star, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface MissionTag {
  type: 'trending' | 'premium' | 'quick' | 'deep' | 'new';
  label: string;
  icon: LucideIcon;
}

interface MissionCardProps {
  id: string;
  title: string;
  illustration: string;
  category: 'dating' | 'interview' | 'charisma' | 'speaking' | 'humor' | 'power';
  duration: string;
  xpReward: number;
  isLocked?: boolean;
  isCompleted?: boolean;
  progress?: number;
  tags?: MissionTag[];
  onClick?: () => void;
}

const MissionCard = ({
  id,
  title,
  illustration,
  category,
  duration,
  xpReward,
  isLocked = false,
  isCompleted = false,
  progress = 0,
  tags = [],
  onClick
}: MissionCardProps) => {
  const getTagIcon = (type: string) => {
    switch (type) {
      case 'trending': return Flame;
      case 'premium': return Crown;
      case 'quick': return Zap;
      case 'deep': return Brain;
      case 'new': return Star;
      default: return Star;
    }
  };

  const getTagStyle = (type: string) => {
    switch (type) {
      case 'trending': return 'bg-gradient-to-r from-orange-500/90 to-red-500/90 text-white';
      case 'premium': return 'bg-gradient-to-r from-yellow-500/90 to-amber-500/90 text-black';
      case 'quick': return 'bg-gradient-to-r from-green-500/90 to-emerald-500/90 text-white';
      case 'deep': return 'bg-gradient-to-r from-purple-500/90 to-indigo-500/90 text-white';
      case 'new': return 'bg-gradient-to-r from-blue-500/90 to-cyan-500/90 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryGradient = () => {
    switch (category) {
      case 'dating': return 'bg-gradient-dating';
      case 'interview': return 'bg-gradient-interview';
      case 'charisma': return 'bg-gradient-charisma';
      case 'speaking': return 'bg-gradient-speaking';
      default: return 'bg-gradient-primary';
    }
  };

  return (
    <div 
      className={`
        relative w-48 h-64 rounded-xl overflow-hidden cursor-pointer 
        transition-all duration-300 active:scale-95 hover:scale-105
        ${isLocked ? 'opacity-70' : ''}
      `}
      onClick={isLocked ? undefined : onClick}
      style={{
        background: `linear-gradient(145deg, 
          rgba(255, 255, 255, 0.12) 0%, 
          rgba(255, 255, 255, 0.06) 100%
        )`,
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: isLocked 
          ? '0 8px 32px rgba(0, 0, 0, 0.4)' 
          : '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* Background Illustration */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${illustration})`,
          filter: isLocked ? 'blur(2px) brightness(0.3)' : 'brightness(0.7)'
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      
      {/* Lock Overlay */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="text-center">
            <Lock className="w-8 h-8 text-white mx-auto mb-2" />
            <span className="text-xs text-white/80 font-medium">Premium</span>
          </div>
        </div>
      )}

      {/* Completion Indicator */}
      {isCompleted && (
        <div className="absolute top-3 right-3">
          <CheckCircle className="w-6 h-6 text-success drop-shadow-lg" />
        </div>
      )}

      {/* Tags */}
      <div className="absolute top-3 left-3 flex flex-col gap-1">
        {tags.map((tag, index) => {
          const TagIcon = getTagIcon(tag.type);
          return (
            <Badge 
              key={index} 
              className={`px-2 py-1 text-xs font-semibold backdrop-blur-md ${getTagStyle(tag.type)}`}
            >
              <TagIcon className="w-3 h-3 mr-1" />
              {tag.label}
            </Badge>
          );
        })}
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {/* Title */}
        <h3 className="text-white font-bold text-lg leading-tight mb-3 drop-shadow-lg">
          {title}
        </h3>
        
        {/* Progress Bar (if in progress) */}
        {!isCompleted && !isLocked && progress > 0 && (
          <div className="mb-3">
            <Progress value={progress} className="h-1.5 bg-black/40" />
            <span className="text-xs text-white/80 mt-1 block">{progress}% Complete</span>
          </div>
        )}
        
        {/* Stats Row */}
        <div className="flex items-center justify-between">
          {/* Duration & XP */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-white/60" />
              <span className="text-xs text-white/80 font-medium">{duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-secondary">+{xpReward} XP</span>
            </div>
          </div>
          
          {/* Category Indicator */}
          <div className={`w-3 h-3 rounded-full ${getCategoryGradient()}`} />
        </div>
      </div>

      {/* Hover Effect Glow */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
      </div>
    </div>
  );
};

export default MissionCard;