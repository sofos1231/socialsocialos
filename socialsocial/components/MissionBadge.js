import React from 'react';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, G, Circle, Path, Rect, Polygon, Polyline } from 'react-native-svg';
import { Image, View } from 'react-native';
import { lockedBadgeSource, currentBadgeSource, completedBadgeSource, premiumBadgeSource, availableBadgeSource, bossBadgeSource, videoBadgeSource } from '../config/badges';

// Badge types: completed (gold check), inProgress (gold with purple rim star),
// locked (silver lock), premium (diamond), available (neutral star)
const MissionBadge = ({ type = 'available', size = 64 }) => {
  const s = size;
  const center = s / 2;

  // Image overrides first (if provided)
  const wrapImage = (src) => (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: 'transparent' }}>
      <Image source={src} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </View>
  );
  if (type === 'inProgress' && currentBadgeSource) return wrapImage(currentBadgeSource);
  if (type === 'completed' && completedBadgeSource) return wrapImage(completedBadgeSource);
  if (type === 'premium' && premiumBadgeSource) return wrapImage(premiumBadgeSource);
  if (type === 'locked' && lockedBadgeSource) return wrapImage(lockedBadgeSource);
  if (type === 'available' && availableBadgeSource) return wrapImage(availableBadgeSource);
  if (type === 'boss' && bossBadgeSource) return wrapImage(bossBadgeSource);
  if (type === 'video' && videoBadgeSource) return wrapImage(videoBadgeSource);

  if (type === 'premium') {
    // Diamond badge (vector fallback)
    return (
      <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
        <Defs>
          <LinearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#9ae6ff" />
            <Stop offset="50%" stopColor="#79befe" />
            <Stop offset="100%" stopColor="#a78bfa" />
          </LinearGradient>
          <RadialGradient id="shine" cx="20%" cy="20%" r="80%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <G>
          <Polygon
            points={`${center},${s*0.15} ${s*0.85},${center} ${center},${s*0.85} ${s*0.15},${center}`}
            fill="url(#diamondGrad)"
          />
          <Polygon
            points={`${center},${s*0.15} ${s*0.6},${center} ${center},${s*0.85} ${s*0.4},${center}`}
            fill="url(#shine)"
          />
        </G>
      </Svg>
    );
  }

  // Coin-like base for completed/inProgress/available/locked (vector fallback)
  const rimColor = type === 'locked' ? '#c7cbd1' : '#f8c33c';
  const coinInnerStart = type === 'locked' ? '#eef0f3' : '#ffeb99';
  const coinInnerMid = type === 'locked' ? '#d7dbe0' : '#ffd768';
  const coinInnerEnd = type === 'locked' ? '#aab0b8' : '#f59e0b';

  const showPurpleRim = type === 'inProgress';

  // Helper: 5-point star
  const starPoints = (cx, cy, outer, inner) => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    return pts.join(' ');
  };

  const drawGlow = () => {
    if (type === 'completed') {
      return <Circle cx={center} cy={center} r={s*0.5} fill="#fbbf2444" />;
    }
    if (type === 'inProgress') {
      return <Circle cx={center} cy={center} r={s*0.5} fill="#7c3aed33" />;
    }
    return null;
  };

  return (
    <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <Defs>
        <RadialGradient id="coinGrad" cx="38%" cy="32%" r="70%">
          <Stop offset="0%" stopColor={coinInnerStart} />
          <Stop offset="55%" stopColor={coinInnerMid} />
          <Stop offset="100%" stopColor={coinInnerEnd} />
        </RadialGradient>
        <LinearGradient id="rimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={rimColor} />
          <Stop offset="100%" stopColor={type === 'locked' ? '#6b7280' : '#f59e0b'} />
        </LinearGradient>
        <LinearGradient id="purpleRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#a855f7" />
          <Stop offset="50%" stopColor="#7c3aed" />
          <Stop offset="100%" stopColor="#5b21b6" />
        </LinearGradient>
        <RadialGradient id="highlight" cx="28%" cy="28%" r="60%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Soft outer glow */}
      {drawGlow()}

      {/* Optional purple rim for in-progress */}
      {showPurpleRim && (
        <Circle cx={center} cy={center} r={s*0.48} fill="url(#purpleRim)" opacity={0.95} />
      )}

      {/* Rim */}
      <Circle cx={center} cy={center} r={s*0.44} fill="url(#rimGrad)" />

      {/* Coin face */}
      <Circle cx={center} cy={center} r={s*0.36} fill="url(#coinGrad)" />

      {/* Inner bevel ring */}
      <Circle cx={center} cy={center} r={s*0.36} stroke={type === 'locked' ? '#c7cbd1' : '#f59e0b'} strokeWidth={s*0.025} fill="transparent" opacity={0.35} />

      {/* Top-left highlight */}
      <Circle cx={center - s*0.12} cy={center - s*0.12} r={s*0.18} fill="url(#highlight)" />

      {/* Glyphs */}
      {type === 'completed' && (
        <>
          <Path
            d={`M ${center - s*0.12} ${center} l ${s*0.07} ${s*0.07} l ${s*0.16} ${-s*0.16}`}
            stroke="#b45309"
            strokeWidth={s*0.08}
            strokeLinecap="round"
            fill="none"
            opacity={0.9}
          />
          <Path
            d={`M ${center - s*0.12} ${center} l ${s*0.07} ${s*0.07} l ${s*0.16} ${-s*0.16}`}
            stroke="#fff"
            strokeWidth={s*0.035}
            strokeLinecap="round"
            fill="none"
            opacity={0.5}
          />
        </>
      )}
      {type === 'inProgress' && (
        <Polyline
          points={starPoints(center, center, s*0.14, s*0.06)}
          fill="#f59e0b"
        />
      )}
      {type === 'available' && (
        <Polyline points={starPoints(center, center, s*0.14, s*0.06)} fill="#cbd5e1" />
      )}
      {type === 'locked' && (
        <G>
          <Rect x={center - s*0.12} y={center} width={s*0.24} height={s*0.16} rx={s*0.03} fill="#6b7280" />
          <Path d={`M ${center - s*0.08} ${center} v ${-s*0.08} a ${s*0.12} ${s*0.12} 0 0 1 ${s*0.24} 0 v ${s*0.08}`} stroke="#6b7280" strokeWidth={s*0.06} fill="none" />
          <Circle cx={center} cy={center + s*0.08} r={s*0.02} fill="#374151" />
        </G>
      )}
    </Svg>
  );
};

export default MissionBadge;


