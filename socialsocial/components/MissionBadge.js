import React from 'react';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, G, Circle, Path, Rect, Polygon, Polyline } from 'react-native-svg';
import { Image, View, Pressable, Animated } from 'react-native';
import { lockedBadgeSource, currentBadgeSource, completedBadgeSource, premiumBadgeSource, availableBadgeSource, bossBadgeSource, videoBadgeSource } from '../config/badges';
import { resolveMissionIcon, getNextIcon, getVideoNextIcon, isNextDisabled } from '../src/mission/iconSelectors';
import { ICON_MISSION_LOCKED_GRAY, ICON_VIDEO_LOCKED } from '../src/mission/assets';
import * as Haptics from 'expo-haptics';

// Badge types: completed (gold check), inProgress (gold with purple rim star),
// locked (silver lock), premium (diamond), available (neutral star)
const MissionBadge = ({ type = 'available', size = 64, mission = null, onNextPress = null }) => {
  const s = size;
  const center = s / 2;

  // NEXT MISSION (video/non-video) and COMPLETED badges
  if (mission) {
    // Locked handling first
    if (mission.locked === true) {
      // Video locked: non-interactive image
      if (mission.type === 'video') {
        return (
          <View pointerEvents="none" style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            {ICON_VIDEO_LOCKED ? (
              <View style={{ width: size, height: size, borderRadius: size/2, overflow: 'hidden' }}>
                <Image source={ICON_VIDEO_LOCKED} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
            ) : (
              <Svg width={80} height={80} viewBox="0 0 80 80">
                <Rect x={16} y={26} width={36} height={28} rx={6} fill="#6A6A6A" />
                <Circle cx={34} cy={40} r={8} fill="#4b4b4b" />
                <Polygon points="52,30 66,40 52,50" fill="#6A6A6A" />
              </Svg>
            )}
          </View>
        );
      }

      // Non-video locked: pressable with shake + warning haptic
      const pressScale = React.useRef(new Animated.Value(1)).current;
      const shake = React.useRef(new Animated.Value(0)).current;
      const onPressIn = () => Animated.spring(pressScale, { toValue: 0.96, useNativeDriver: true }).start();
      const onPressOut = () => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true }).start();
      const handleLockedPress = async () => {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
        shake.setValue(0);
        Animated.sequence([
          Animated.timing(shake, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(shake, { toValue: 0, duration: 1, useNativeDriver: true }),
        ]).start();
        // optional modal handler at parent
        if (typeof onNextPress === 'function') {
          // reuse handler to avoid new prop; parent can branch on mission.locked
          onNextPress(mission);
        }
      };
      const tx = shake.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -4, 4, -2, 0] });
      return (
        <Animated.View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', transform: [{ scale: pressScale }, { translateX: tx }] }}>
          <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={handleLockedPress} accessibilityLabel="Locked mission" accessibilityRole="button" style={{ justifyContent: 'center', alignItems: 'center' }}>
            {ICON_MISSION_LOCKED_GRAY ? (
              <View style={{ width: size, height: size, borderRadius: size/2, overflow: 'hidden' }}>
                <Image source={ICON_MISSION_LOCKED_GRAY} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
            ) : (
              <Svg width={80} height={80} viewBox="0 0 80 80">
                <Rect x={28} y={44} width={44} height={28} rx={6} fill="#6A6A6A" />
                <Path d={`M 36 44 v -10 a 16 16 0 0 1 32 0 v 10`} stroke="#6A6A6A" strokeWidth={8} fill="none" />
                <Path d={`M 50 58 v 10`} stroke="#4b4b4b" strokeWidth={6} strokeLinecap="round" />
              </Svg>
            )}
          </Pressable>
        </Animated.View>
      );
    }
    const resolved = resolveMissionIcon(mission);
    const isCompletedState = mission?.status === 'completed';
    const qualifiesVideoNext = mission?.isNext === true && mission?.status !== 'completed' && mission?.type === 'video' && mission?.locked !== true;
    const qualifiesNextNonVideo = mission?.isNext === true && mission?.status !== 'completed' && mission?.type !== 'video' && mission?.locked !== true;

    // Interactive NEXT (video/non-video)
    if (qualifiesVideoNext || qualifiesNextNonVideo) {
      const pressScale = React.useRef(new Animated.Value(1)).current;
      React.useEffect(() => {
        const pulse = Animated.sequence([
          Animated.timing(pressScale, { toValue: 1.08, duration: 300, useNativeDriver: true }),
          Animated.timing(pressScale, { toValue: 1.0, duration: 500, useNativeDriver: true }),
        ]);
        Animated.sequence([pulse, pulse]).start();
      }, []);

      const handlePressIn = () => {
        Animated.spring(pressScale, { toValue: 0.96, useNativeDriver: true, tension: 120, friction: 8 }).start();
      };
      const handlePressOut = () => {
        Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
      };
      const handlePress = async () => {
        try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
        try { console.log(qualifiesVideoNext ? 'video_next_pressed' : 'next_mission_pressed', mission?.id); } catch {}
        if (typeof onNextPress === 'function') {
          onNextPress(mission);
        }
      };

      // Disabled handling only applies to non-video next (video-locked is handled elsewhere)
      if (qualifiesNextNonVideo && isNextDisabled(mission)) {
        return (
          <View pointerEvents="none" style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', opacity: 0.6 }}>
            {getNextIcon(mission) ? (
              <View style={{ width: size, height: size, borderRadius: size/2, overflow: 'hidden' }}>
                <Image source={getNextIcon(mission)} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessible accessibilityLabel="Next mission" />
              </View>
            ) : (
              <Svg width={80} height={80} viewBox="0 0 80 80" accessibilityLabel="Next mission">
                <Polygon points="24,18 64,40 24,62" fill="#ffffff" />
              </Svg>
            )}
          </View>
        );
      }

      return (
        <Animated.View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', transform: [{ scale: pressScale }] }}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            accessibilityLabel={qualifiesVideoNext ? 'Start video mission' : 'Next mission'}
            accessibilityRole="button"
            style={{ justifyContent: 'center', alignItems: 'center' }}
          >
            {qualifiesVideoNext ? (
              getVideoNextIcon(mission) ? (
                <View style={{ width: size, height: size, borderRadius: size/2, overflow: 'hidden' }}>
                  <Image source={getVideoNextIcon(mission)} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              ) : (
                <Svg width={80} height={80} viewBox="0 0 80 80">
                  <Rect x={16} y={26} width={36} height={28} rx={6} fill="#ffffff" />
                  <Circle cx={34} cy={40} r={8} fill="#1f2937" />
                  <Polygon points="52,30 66,40 52,50" fill="#ffffff" />
                </Svg>
              )
            ) : qualifiesNextNonVideo ? (
              getNextIcon(mission) ? (
                <View style={{ width: size, height: size, borderRadius: size/2, overflow: 'hidden' }}>
                  <Image source={getNextIcon(mission)} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              ) : (
                <Svg width={80} height={80} viewBox="0 0 80 80">
                  <Polygon points="24,18 64,40 24,62" fill="#ffffff" />
                </Svg>
              )
            ) : resolved ? (
              <View style={{ width: size, height: size, borderRadius: size/2, overflow: 'hidden' }}>
                <Image source={resolved} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
            ) : (
              <Svg width={80} height={80} viewBox="0 0 80 80">
                <Polygon points="24,18 64,40 24,62" fill="#ffffff" />
              </Svg>
            )}
          </Pressable>
        </Animated.View>
      );
    }

    // Non-interactive COMPLETED badges (gold/video/completed green)
    if (resolved || isCompletedState) {
      const isCompleted = true;
      return (
        <View pointerEvents="none" style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          {resolved ? (
            <View style={{ width: size, height: size, borderRadius: size/2, overflow: 'hidden' }}>
              <Image source={resolved} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessible accessibilityLabel="Completed mission" />
            </View>
          ) : mission?.type === 'video' ? (
            <Svg width={80} height={80} viewBox="0 0 80 80">
              <Rect x={16} y={26} width={36} height={28} rx={6} fill="#ffffff" />
              <Circle cx={34} cy={40} r={8} fill="#1f2937" />
              <Polygon points="52,30 66,40 52,50" fill="#ffffff" />
            </Svg>
          ) : (
            <Svg width={80} height={80} viewBox="0 0 80 80">
              <Path d="M 20 42 l 10 10 l 30 -30" stroke="#f59e0b" strokeWidth={8} strokeLinecap="round" fill="none" />
            </Svg>
          )}
        </View>
      );
    }
    const qualifiesNext =
      mission?.isNext === true &&
      mission?.status !== 'completed' &&
      mission?.type !== 'video' &&
      mission?.locked !== true;

    // old next handling removed; now handled above via resolver + get*NextIcon
  }

  // Resolver-based PNG override (video-completed > completed > next); non-interactive
  if (mission) {
    const resolved = resolveMissionIcon(mission);
    if (resolved) {
      const isCompleted = mission.status === 'completed';
      return (
        <View pointerEvents="none" style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <Image
            source={resolved}
            style={{ width: 96, height: 96 }}
            resizeMode="contain"
            accessible
            accessibilityLabel={isCompleted ? 'Completed mission' : 'Mission icon'}
          />
        </View>
      );
    }
    // Fallbacks: video camera for completed video; checkmark for completed non-video
    if (mission.status === 'completed' && mission._isGoldMilestone !== true) {
      if (mission.type === 'video') {
        return (
          <View pointerEvents="none" style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={80} height={80} viewBox="0 0 80 80">
              {/* Camera body */}
              <Rect x={16} y={26} width={36} height={28} rx={6} fill="#ffffff" />
              {/* Lens */}
              <Circle cx={34} cy={40} r={8} fill="#1f2937" />
              {/* Right-facing triangle to suggest video */}
              <Polygon points="52,30 66,40 52,50" fill="#ffffff" />
            </Svg>
          </View>
        );
      }
      if (mission.type !== 'video') {
        return (
          <View pointerEvents="none" style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={80} height={80} viewBox="0 0 80 80">
              <Path d="M 20 42 l 10 10 l 30 -30" stroke="#ffffff" strokeWidth={8} strokeLinecap="round" fill="none" />
            </Svg>
          </View>
        );
      }
    }
  }

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


