import React from 'react';
import { CheckCircle2, Lock } from 'lucide-react';

interface StepData {
  id: string;
  title: string;
  icon: string;
  status: 'locked' | 'unlocked' | 'completed';
}

interface PracticeStepCardProps {
  step: StepData;
  theme: 'dating' | 'interview' | 'charisma' | 'speaking';
  order: number;
  onPress?: () => void;
  animationDelay?: number;
}

const PracticeStepCard: React.FC<PracticeStepCardProps> = ({
  step,
  theme,
  order,
  onPress,
  animationDelay = 0
}) => {
  const getThemeColors = () => {
    switch (theme) {
      case 'dating':
        return {
          gradient: ['bg-pink-900/80', 'bg-pink-600/80'],
          borderColor: 'border-pink-500',
          shadowColor: 'shadow-pink-500/20',
        };
      case 'interview':
        return {
          gradient: ['bg-blue-900/80', 'bg-blue-600/80'],
          borderColor: 'border-blue-500',
          shadowColor: 'shadow-blue-500/20',
        };
      case 'charisma':
        return {
          gradient: ['bg-emerald-900/80', 'bg-emerald-600/80'],
          borderColor: 'border-emerald-500',
          shadowColor: 'shadow-emerald-500/20',
        };
      case 'speaking':
        return {
          gradient: ['bg-orange-900/80', 'bg-orange-600/80'],
          borderColor: 'border-orange-500',
          shadowColor: 'shadow-orange-500/20',
        };
      default:
        return {
          gradient: ['bg-slate-800/80', 'bg-slate-600/80'],
          borderColor: 'border-slate-500',
          shadowColor: 'shadow-slate-500/20',
        };
    }
  };

  const themeColors = getThemeColors();

  const getStatusStyles = () => {
    switch (step.status) {
      case 'completed':
        return {
          backgroundColor: themeColors.gradient[0],
          borderColor: themeColors.borderColor,
          textColor: 'text-white',
          interactive: true,
          shadow: true
        };
      case 'unlocked':
        return {
          backgroundColor: themeColors.gradient[1],
          borderColor: themeColors.borderColor,
          textColor: 'text-white',
          interactive: true,
          shadow: true
        };
      case 'locked':
        return {
          backgroundColor: 'bg-gray-600/30',
          borderColor: 'border-slate-500/30',
          textColor: 'text-slate-400',
          interactive: false,
          shadow: false
        };
      default:
        return {
          backgroundColor: 'bg-slate-800',
          borderColor: 'border-slate-500',
          textColor: 'text-white',
          interactive: false,
          shadow: false
        };
    }
  };

  const statusStyles = getStatusStyles();

  return (
    <div 
      className={`
        relative mb-3 animate-fade-in
      `}
      style={{ 
        animationDelay: `${animationDelay}ms`,
      }}
    >
      <div
        className={`
          flex items-center p-4 rounded-2xl border-2 backdrop-blur-sm ml-3
          transition-all duration-300 cursor-pointer
          ${statusStyles.backgroundColor} ${statusStyles.borderColor} ${statusStyles.textColor}
          ${statusStyles.interactive ? 'hover:scale-[1.02] hover:shadow-xl' : ''}
          ${statusStyles.shadow ? themeColors.shadowColor : ''}
        `}
        onClick={statusStyles.interactive ? onPress : undefined}
      >
        {/* Step number indicator */}
        <div className={`
          absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full 
          bg-background border-2 flex items-center justify-center
          ${statusStyles.borderColor} ${statusStyles.textColor}
        `}>
          <span className="text-xs font-bold">
            {order}
          </span>
        </div>

        <div className="flex items-center flex-1 ml-4 gap-3">
          {/* Icon area */}
          <div className="flex items-center justify-center w-8 h-8">
            {step.status === 'completed' ? (
              <CheckCircle2 size={24} className="text-emerald-500" />
            ) : step.status === 'locked' ? (
              <Lock size={20} className="text-slate-400" />
            ) : (
              <span className="text-2xl">{step.icon}</span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="font-semibold mb-1">{step.title}</h3>
            <div className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium">
              <span className={`
                px-2 py-1 rounded-lg
                ${step.status === 'completed' 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : step.status === 'unlocked'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-gray-500/20 text-gray-400'
                }
              `}>
                {step.status === 'completed' ? 'Mastered' : step.status === 'unlocked' ? 'Ready' : 'Locked'}
              </span>
            </div>
          </div>

          {/* Status indicator */}
          {step.status === 'completed' && (
            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
          )}
          {step.status === 'unlocked' && (
            <div className="w-3 h-3 bg-amber-500 rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticeStepCard;