import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from 'react-native-svg';
import theme from '../theme.js';

const WavyRoadmapPath = ({ missions, pathPoints, style }) => {
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

  // Generate completed path up to current mission
  const generateCompletedPath = () => {
    const lastCompletedIndex = missions.reduce((lastIndex, mission, index) => {
      return mission.status === 'completed' ? index : lastIndex;
    }, -1);
    
    if (lastCompletedIndex < 0) return '';
    
    const endIndex = Math.min(lastCompletedIndex + 1, pathPoints.length - 1);
    const completedPoints = pathPoints.slice(0, endIndex + 1);
    
    if (completedPoints.length < 2) return '';
    
    let path = `M ${completedPoints[0].x} ${completedPoints[0].y}`;
    
    for (let i = 1; i < completedPoints.length; i++) {
      const prev = completedPoints[i - 1];
      const curr = completedPoints[i];
      
      const cpX1 = prev.x;
      const cpY1 = prev.y + (curr.y - prev.y) * 0.3;
      const cpX2 = curr.x;
      const cpY2 = curr.y - (curr.y - prev.y) * 0.3;
      
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }
    
    return path;
  };

  const fullPath = generateSmoothPath();
  const completedPath = generateCompletedPath();

  return (
    <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }, style]}>
      <Svg 
        width="100%" 
        height={totalHeight}
        style={{ position: 'absolute' }}
        preserveAspectRatio="none"
      >
        <Defs>
          {/* Base Path Gradient */}
          <LinearGradient id="basePath" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={theme.colors.muted} />
            <Stop offset="100%" stopColor={`${theme.colors.muted}80`} />
          </LinearGradient>
          
          {/* Completed Path Gradient */}
          <LinearGradient id="completedPath" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={theme.colors.success} />
            <Stop offset="50%" stopColor={theme.colors.successGlow || theme.colors.success} />
            <Stop offset="100%" stopColor={`${theme.colors.success}CC`} />
          </LinearGradient>
          
          {/* Progress Path Gradient */}
          <LinearGradient id="progressPath" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={theme.colors.primary} />
            <Stop offset="50%" stopColor={theme.colors.primaryGlow || theme.colors.primary} />
            <Stop offset="100%" stopColor={`${theme.colors.primary}99`} />
          </LinearGradient>
          
          {/* Glow Filter */}
          <Filter id="pathGlow" x="-50%" y="-50%" width="200%" height="200%">
            <FeGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <FeMerge> 
              <FeMergeNode in="coloredBlur"/>
              <FeMergeNode in="SourceGraphic"/>
            </FeMerge>
          </Filter>
        </Defs>
        
        {/* Base Path (incomplete) */}
        {fullPath && (
          <Path
            d={fullPath}
            stroke="url(#basePath)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            opacity={0.3}
          />
        )}
        
        {/* Completed Path */}
        {completedPath && (
          <Path
            d={completedPath}
            stroke="url(#completedPath)"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            filter="url(#pathGlow)"
          />
        )}
        
        {/* Progress Path (current mission) */}
        {missions.some(m => m.status === 'current') && completedPath && (
          <Path
            d={completedPath}
            stroke="url(#progressPath)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            filter="url(#pathGlow)"
            opacity={0.8}
          />
        )}
      </Svg>
    </View>
  );
};

export default WavyRoadmapPath;
