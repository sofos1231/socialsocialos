import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../theme.js';
import MissionBadge from './MissionBadge';

// Global sizing for mission nodes
const BUBBLE_SIZE = 92; // 15% larger than previous 80
const BADGE_SIZE = 84; // scaled with bubble

const { width } = Dimensions.get('window');

const EnhancedMissionBubble = ({
  mission,
  position,
  onTap,
  showNewTag = false,
  streakBonus = false,
  isUnlocking = false,
  showCelebration = false
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (showCelebration) {
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showCelebration]);

  const handlePressIn = () => {
    if (mission.status === 'locked') return;
    
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (mission.status === 'locked') return;
    
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (mission.status === 'locked') return;
    onTap(mission);
  };

  // Map mission state to badge type
  const getBadgeType = () => {
    if (mission.status === 'completed') return 'completed';
    if (mission.status === 'current') return 'inProgress';
    if (mission.type === 'premium') return 'premium';
    if (mission.status === 'locked') return 'locked';
    return 'available';
  };

  const getBubbleColors = () => {
    switch (mission.status) {
      case 'current':
        return ['#f59e0b', '#d97706', '#b45309'];
      case 'completed':
        return ['#fbbf24', '#f59e0b', '#d97706'];
      case 'available':
        return ['#64748b', '#475569', '#334155'];
      case 'locked':
      default:
        return ['#475569', '#374151', '#1f2937'];
    }
  };

  // No longer using icon font; MissionBadge handles the glyphs

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: position.x - BUBBLE_SIZE / 2,
          top: position.y - BUBBLE_SIZE / 2,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Current mission pulsing ring */}
      {/* Current halo disabled per request (no purple thin line) */}
      {/* Unlock Animation */}
      {isUnlocking && (
        <View style={styles.unlockAnimation}>
          <Animated.View
            style={[
              styles.unlockRing,
              {
                opacity: glowAnim,
              },
            ]}
          />
        </View>
      )}
      
      {/* Type Enhancement Ring (disabled to avoid heavy background shades) */}
      
      {/* Main Mission Badge (no background gradient to avoid extra rings) */}
      <TouchableOpacity
        style={[styles.bubble, mission.status === 'locked' && styles.lockedBubble]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={mission.status === 'locked' ? 1 : 0.8}
        disabled={mission.status === 'locked'}
      >
        <View style={styles.badgeContainer}>
          <MissionBadge type={getBadgeType()} size={BADGE_SIZE} />
          {/* Locked teaser icon (subtle) */}
          {mission.status === 'locked' && (
            <View style={{ position: 'absolute', opacity: 0.18 }}>
              <View style={{ width: BADGE_SIZE * 0.6, height: BADGE_SIZE * 0.6, borderRadius: (BADGE_SIZE * 0.6)/2, backgroundColor: 'rgba(255,255,255,0.05)' }} />
            </View>
          )}
        </View>
        
        {/* NEW Tag */}
        {showNewTag && mission.status === 'available' && (
          <View style={styles.newTag}>
            <LinearGradient
              colors={['#ec4899', '#f43f5e']}
              style={styles.newTagGradient}
            >
              <Text style={styles.newTagText}>NEW!</Text>
            </LinearGradient>
          </View>
        )}
        {/* Streak ring disabled for cleaner look */}
      </TouchableOpacity>

      {/* Mission Title */}
      <View style={styles.titleContainer}>
        <Text 
          style={[
            styles.title,
            mission.status === 'current' && styles.currentTitle,
            mission.status === 'available' && styles.availableTitle,
            mission.status === 'locked' && styles.lockedTitle,
          ]}
          numberOfLines={2}
        >
          {mission.title}
        </Text>
      </View>
      
      {/* Remove base shadow bar for cleaner look */}
    </Animated.View>
  );
};

const styles = {
  container: {
    position: 'absolute',
    alignItems: 'center',
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  badgeContainer: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerOverlay: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  icon: {
    zIndex: 10,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockPlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: '#6b7280',
    borderRadius: 4,
    opacity: 0.8,
  },
  lockedBubble: {
    opacity: 0.6,
  },
  completedBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  completedGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Halo behind bubble to mimic Lovable glow
  halo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -20,
    left: -20,
    opacity: 0.35,
  },
  haloGold: {
    backgroundColor: 'rgba(251, 191, 36, 0.28)',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 12,
  },
  haloAmber: {
    backgroundColor: 'rgba(168, 85, 247, 0.28)',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 12,
  },
  completedIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparklesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle1: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  sparkle2: {
    position: 'absolute',
    bottom: 15,
    left: 15,
  },
  sparkle3: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  unlockAnimation: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 46,
  },
  unlockRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 46,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
  },
  typeRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 48,
  },
  bossRing: {
    backgroundColor: 'rgba(251, 146, 60, 0.4)',
  },
  premiumRing: {
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
  },
  streakRing: {
    position: 'absolute',
    top: -12,
    left: -12,
    right: -12,
    bottom: -12,
    borderRadius: 52,
  },
  streakGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 52,
    opacity: 0.6,
  },
  newTag: {
    position: 'absolute',
    top: -16,
    right: -16,
    borderRadius: 12,
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  newTagGradient: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newTagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  titleContainer: {
    marginTop: 16,
    maxWidth: 120,
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  currentTitle: {
    color: '#22c55e',
  },
  availableTitle: {
    color: theme.colors.foreground,
  },
  lockedTitle: {
    color: theme.colors.muted,
  },
  completedTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.success,
    textAlign: 'center',
    lineHeight: 16,
  },
  shadow: {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: [{ translateX: -32 }],
    marginTop: 8,
    width: 64,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
};

export default EnhancedMissionBubble;
