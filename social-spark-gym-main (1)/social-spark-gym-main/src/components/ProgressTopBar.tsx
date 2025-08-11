import React from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ProgressTopBarProps {
  title: string;
  chapterNumber: number;
  completedMissions: number;
  totalMissions: number;
  totalXP: number;
  icon: React.ComponentType<{ className?: string }>;
  onBack: () => void;
  className?: string;
}

const ProgressTopBar: React.FC<ProgressTopBarProps> = ({
  title,
  chapterNumber,
  completedMissions,
  totalMissions,
  totalXP,
  icon: CategoryIcon,
  onBack,
  className = ""
}) => {
  const progressPercentage = (completedMissions / totalMissions) * 100;

  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 z-40 px-4 pt-4 pb-6",
        "bg-gradient-to-b from-background via-background/95 to-background/80",
        "backdrop-blur-sm border-b border-border/20",
        className
      )}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </Button>
        
        {/* Chapter Info */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CategoryIcon className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-display font-bold text-foreground">
              {title}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Chapter {chapterNumber}
          </p>
        </div>
        
        <div className="w-16" />
      </div>

      {/* Progress Section */}
      <div className="space-y-3">
        {/* Stats Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Circular Progress Ring */}
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                {/* Background circle */}
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="4"
                />
                {/* Progress circle */}
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="hsl(var(--success))"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - progressPercentage / 100)}`}
                  className="transition-all duration-500 ease-out drop-shadow-sm"
                  style={{ filter: progressPercentage > 0 ? 'drop-shadow(0 0 6px hsl(var(--success) / 0.4))' : 'none' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-foreground">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
            </div>
            
            {/* Mission Count */}
            <div>
              <div className="text-sm font-bold text-foreground">
                {completedMissions}/{totalMissions} Missions
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {totalMissions - completedMissions} remaining
              </div>
            </div>
          </div>
          
          {/* XP Display */}
          <div className="flex items-center gap-1 px-3 py-2 bg-primary/10 rounded-full border border-primary/20">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-primary">
              {totalXP} XP
            </span>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="space-y-2">
          <Progress 
            value={progressPercentage} 
            className="h-2 bg-muted"
          />
          
          {/* Milestone Indicators */}
          <div className="flex justify-between text-xs text-muted-foreground font-mono">
            <span>Start</span>
            <span className={cn(
              "transition-colors duration-300",
              progressPercentage >= 50 ? "text-success font-medium" : ""
            )}>
              Halfway
            </span>
            <span className={cn(
              "transition-colors duration-300",
              progressPercentage === 100 ? "text-success font-bold" : ""
            )}>
              Complete
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressTopBar;