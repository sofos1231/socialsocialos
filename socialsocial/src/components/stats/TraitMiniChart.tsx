// socialsocial/src/components/stats/TraitMiniChart.tsx
// Step 5.5: Mini sparkline chart for trait history

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline, Line } from 'react-native-svg';

interface TraitMiniChartProps {
  points: number[]; // Trait values (0-100)
}

export default function TraitMiniChart({ points }: TraitMiniChartProps) {
  if (points.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No history yet</Text>
      </View>
    );
  }

  if (points.length === 1) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Need more sessions</Text>
      </View>
    );
  }

  // Calculate chart dimensions
  const width = 200;
  const height = 40;
  const padding = 4;

  // Find min/max for scaling
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1; // Avoid division by zero

  // Generate SVG polyline points
  const svgPoints = points.map((value, index) => {
    const x = padding + (index / (points.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} style={styles.svg}>
        {/* Optional: Grid line at midpoint */}
        <Line
          x1={padding}
          y1={height / 2}
          x2={width - padding}
          y2={height / 2}
          stroke="#1F2937"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
        {/* Trait value line */}
        <Polyline
          points={svgPoints}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    width: 200,
    height: 40,
  },
  emptyContainer: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

