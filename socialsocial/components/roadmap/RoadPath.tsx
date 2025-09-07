import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Point = { x: number; y: number };

type Props = {
  width: number;
  height: number;
  mainAnchors: Point[];
  branchAnchors?: Point[] | null;
  mainColor: string;
  branchColor: string;
  scrollY?: number; // parallax input
};

function toBezier(points: Point[]) {
  if (points.length < 2) return '';
  const d: string[] = [];
  d.push(`M ${points[0].x} ${points[0].y}`);
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const c1x = p0.x + (p1.x - p0.x) * 0.4;
    const c1y = p0.y + (p1.y - p0.y) * 0.4;
    const c2x = p1.x - (p1.x - p0.x) * 0.4;
    const c2y = p1.y - (p1.y - p0.y) * 0.4;
    d.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`);
  }
  return d.join(' ');
}

export default function RoadPath({ width, height, mainAnchors, branchAnchors, mainColor, branchColor, scrollY = 0 }: Props) {
  const mainD = toBezier(mainAnchors);
  const branchD = branchAnchors && branchAnchors.length > 1 ? toBezier(branchAnchors) : '';
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateY: scrollY * 0.6 }] }}>
      {mainD !== '' && (
        <Path d={mainD} stroke={mainColor} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {branchD !== '' && (
        <Path d={branchD} stroke={branchColor} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </Svg>
  );
}


