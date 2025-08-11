import React from 'react';

interface Mission {
  id: number;
  status: 'locked' | 'available' | 'completed' | 'current';
}

interface AnimatedConnectorTrailProps {
  missions: Mission[];
  pathPoints: { x: number; y: number }[];
  className?: string;
}

const AnimatedConnectorTrail: React.FC<AnimatedConnectorTrailProps> = ({
  missions,
  pathPoints,
  className = ""
}) => {
  const generateAnimatedPath = () => {
    if (pathPoints.length < 2) return '';
    
    let completedPath = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    let completedLength = 0;
    
    // Find the index of the last completed mission
    const lastCompletedIndex = missions.reduce((lastIndex, mission, index) => {
      return mission.status === 'completed' ? index : lastIndex;
    }, -1);
    
    // Build path up to last completed mission + next connection
    const endIndex = Math.min(lastCompletedIndex + 1, pathPoints.length - 1);
    
    for (let i = 1; i <= endIndex; i++) {
      const prev = pathPoints[i - 1];
      const curr = pathPoints[i];
      
      // Control points for smooth curves
      const cpX1 = prev.x;
      const cpY1 = prev.y + (curr.y - prev.y) * 0.3;
      const cpX2 = curr.x;
      const cpY2 = curr.y - (curr.y - prev.y) * 0.3;
      
      completedPath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
      completedLength++;
    }
    
    return { path: completedPath, hasCompleted: completedLength > 0 };
  };

  const pathData = generateAnimatedPath();
  const completedPath = typeof pathData === 'string' ? '' : pathData.path;
  const hasCompleted = typeof pathData === 'string' ? false : pathData.hasCompleted;
  const totalHeight = pathPoints[pathPoints.length - 1]?.y + 100 || 400;

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <svg 
        className="w-full h-full" 
        style={{ height: `${totalHeight}px` }}
        preserveAspectRatio="none"
      >
        <defs>
          {/* Completed trail gradient */}
          <linearGradient id="completedTrail" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--success))" />
            <stop offset="50%" stopColor="hsl(var(--success) / 0.9)" />
            <stop offset="100%" stopColor="hsl(var(--success) / 0.7)" />
          </linearGradient>
          
          {/* Animated gradient for active progression */}
          <linearGradient id="animatedTrail" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--success))">
              <animate 
                attributeName="stop-opacity" 
                values="1;0.3;1" 
                dur="2s" 
                repeatCount="indefinite" 
              />
            </stop>
            <stop offset="50%" stopColor="hsl(var(--success) / 0.8)">
              <animate 
                attributeName="stop-opacity" 
                values="0.8;0.4;0.8" 
                dur="2s" 
                repeatCount="indefinite" 
              />
            </stop>
            <stop offset="100%" stopColor="hsl(var(--success) / 0.5)">
              <animate 
                attributeName="stop-opacity" 
                values="0.5;0.2;0.5" 
                dur="2s" 
                repeatCount="indefinite" 
              />
            </stop>
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="trailGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Shimmer effect for completed sections */}
          <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              values="-100 0;100 0;-100 0"
              dur="3s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>
        
        {/* Completed trail removed */}
        
        {/* Animated progression indicators removed */}
      </svg>
    </div>
  );
};

export default AnimatedConnectorTrail;