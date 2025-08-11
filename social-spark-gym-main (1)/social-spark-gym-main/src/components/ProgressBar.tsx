import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  label?: string;
  showNumbers?: boolean;
  size?: 'sm' | 'md' | 'lg';
  intense?: boolean;
  progress?: number;
  height?: number;
  className?: string;
}

const ProgressBar = ({ 
  current, 
  max, 
  label, 
  showNumbers = true, 
  size = 'md',
  intense = false,
  progress,
  height,
  className = ''
}: ProgressBarProps) => {
  const percentage = progress !== undefined ? progress : Math.min((current / max) * 100, 100);
  
  const getHeight = () => {
    if (height) return height;
    switch (size) {
      case 'sm': return 8;
      case 'md': return 12;
      case 'lg': return 16;
      default: return 12;
    }
  };

  const barHeight = getHeight();

  return (
    <div className={`w-full ${className}`}>
      {(label || showNumbers) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-white">
              {label}
            </span>
          )}
          {showNumbers && (
            <span className="text-xs text-white/70">
              {current}/{max}
            </span>
          )}
        </div>
      )}
      
      <div 
        className="bg-white/20 rounded-full overflow-hidden"
        style={{ height: barHeight }}
      >
        <div 
          className={`h-full rounded-full transition-all duration-300 ${
            intense ? 'bg-emerald-500' : 'bg-white/80'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {percentage >= 100 && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs">🎉</span>
          <span className="text-xs text-emerald-500 font-medium">
            Complete!
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;