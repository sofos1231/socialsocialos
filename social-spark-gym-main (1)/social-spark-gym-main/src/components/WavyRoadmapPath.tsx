import React from 'react';

interface WavyRoadmapPathProps {
  missionCount: number;
  className?: string;
}

const WavyRoadmapPath: React.FC<WavyRoadmapPathProps> = ({ missionCount, className = "" }) => {
  const generateWavyPath = () => {
    const points: { x: number; y: number }[] = [];
    const centerX = 50; // Center of container in percentage
    const amplitude = 30; // How far left/right the wave goes
    const frequency = 0.8; // How tight the waves are
    const stepY = 140; // Vertical spacing between missions
    
    for (let i = 0; i < missionCount; i++) {
      const y = i * stepY + 80; // Start offset from top
      const waveOffset = Math.sin(i * frequency) * amplitude;
      const x = centerX + waveOffset;
      points.push({ x, y });
    }
    
    return points;
  };

  const pathPoints = generateWavyPath();
  const totalHeight = pathPoints[pathPoints.length - 1]?.y + 100 || 400;

  // Generate SVG path string for smooth curves
  const generateSmoothPath = () => {
    if (pathPoints.length < 2) return '';
    
    let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    
    for (let i = 1; i < pathPoints.length; i++) {
      const prev = pathPoints[i - 1];
      const curr = pathPoints[i];
      
      // Control points for smooth curves
      const cpX1 = prev.x;
      const cpY1 = prev.y + (curr.y - prev.y) * 0.3;
      const cpX2 = curr.x;
      const cpY2 = curr.y - (curr.y - prev.y) * 0.3;
      
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }
    
    return path;
  };

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <svg 
        className="w-full h-full" 
        style={{ height: `${totalHeight}px` }}
        preserveAspectRatio="none"
      >
        {/* Background path removed */}
        
        {/* Completed path overlay will be added via props */}
        <defs>
          <linearGradient id="completedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>
      
      {/* Position indicators for missions */}
      {pathPoints.map((point, index) => (
        <div
          key={index}
          className="absolute w-2 h-2 pointer-events-none"
          style={{
            left: `${point.x}%`,
            top: `${point.y}px`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}
    </div>
  );
};

export default WavyRoadmapPath;