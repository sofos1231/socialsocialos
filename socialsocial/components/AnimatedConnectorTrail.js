import React, { useMemo, useRef, useEffect } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path } from 'react-native-svg';

// Animated SVG Path for shimmer
const AnimatedPath = Animated.createAnimatedComponent(Path);

const AnimatedConnectorTrail = ({ missions = [], pathPoints = [], style }) => {
  const totalHeight = pathPoints[pathPoints.length - 1]?.y + 100 || 400;

  // Build path up to the last completed mission (plus the next connection)
  const completedPath = useMemo(() => {
    if (pathPoints.length < 2) return '';

    const lastCompletedIndex = missions.reduce((lastIndex, mission, index) => {
      return mission.status === 'completed' ? index : lastIndex;
    }, -1);

    const endIndex = Math.min(lastCompletedIndex + 1, pathPoints.length - 1);
    if (endIndex < 1) return '';

    let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
    for (let i = 1; i <= endIndex; i++) {
      const prev = pathPoints[i - 1];
      const curr = pathPoints[i];
      const cpX1 = prev.x;
      const cpY1 = prev.y + (curr.y - prev.y) * 0.3;
      const cpX2 = curr.x;
      const cpY2 = curr.y - (curr.y - prev.y) * 0.3;
      path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
    }
    return path;
  }, [missions, pathPoints]);

  // Shimmer animation along the completed path
  const dashOffset = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(dashOffset, {
        toValue: 60,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [dashOffset]);                                                                                                             

  const hasCurrent = missions.some(m => m.status === 'current');

  return null; // Trail disabled per request
};

export default AnimatedConnectorTrail;


