import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme.js';

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
      toValue: 0.95,
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

  // Show golden coin for completed missions
  if (mission.status === 'completed') {
    return (
      <Animated.View
        style={[
          styles.container,
          {
            left: position.x - 40, // Center the bubble
            top: position.y - 40,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.completedBubble}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#fbbf24', '#f59e0b', '#d97706']}
            style={styles.completedGradient}
          >
            <View style={styles.completedIconContainer}>
              <Ionicons name="checkmark-circle" size={32} color="#ffffff" />
            </View>
            
            {/* Sparkles effect */}
            {showCelebration && (
              <Animated.View
                style={[
                  styles.sparklesContainer,
                  {
                    opacity: glowAnim,
                  },
                ]}
              >
                <Ionicons name="sparkles" size={16} color="#ffffff" style={styles.sparkle1} />
                <Ionicons name="sparkles" size={12} color="#ffffff" style={styles.sparkle2} />
                <Ionicons name="sparkles" size={14} color="#ffffff" style={styles.sparkle3} />
              </Animated.View>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Mission Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.completedTitle} numberOfLines={2}>
            {mission.title}
          </Text>
        </View>
      </Animated.View>
    );
  }

  const getBubbleColors = () => {
    switch (mission.status) {
      case 'current':
        return [theme.colors.primary, theme.colors.primaryGlow];
      case 'available':
        return ['#64748b', '#475569', '#334155'];
      case 'locked':
      default:
        return ['#475569', '#374151', '#1f2937'];
    }
  };

  const getIconName = () => {
    if (mission.status === 'locked') return 'lock-closed';
    if (mission.type === 'boss') return 'flame';
    if (mission.type === 'premium') return 'diamond';
    if (mission.type === 'video') return 'play';
    return 'star';
  };

  const getIconSize = () => {
    if (mission.status === 'current') return 36;
    if (mission.status === 'available') return 32;
    return 28;
  };

  const getIconColor = () => {
    if (mission.status === 'current') return '#ffffff';
    if (mission.status === 'available') return '#ffffff';
    return '#9ca3af';
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: position.x - 40,
          top: position.y - 40,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
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
      
      {/* Type Enhancement Ring */}
      {(mission.type === 'boss' || mission.type === 'premium') && (
        <View style={[
          styles.typeRing,
          mission.type === 'boss' ? styles.bossRing : styles.premiumRing
        ]} />
      )}
      
      {/* Main Mission Bubble */}
      <TouchableOpacity
        style={[
          styles.bubble,
          mission.status === 'locked' && styles.lockedBubble,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={mission.status === 'locked' ? 1 : 0.8}
        disabled={mission.status === 'locked'}
      >
        <LinearGradient
          colors={getBubbleColors()}
          style={styles.bubbleGradient}
        >
          {/* Inner Gradient Overlay */}
          <View style={styles.innerOverlay} />
          
          {/* Mission Icon */}
          <Ionicons
            name={getIconName()}
            size={getIconSize()}
            color={getIconColor()}
            style={styles.icon}
          />
          
          {/* Lock Overlay */}
          {mission.status === 'locked' && (
            <View style={styles.lockOverlay}>
              <View style={styles.lockPlaceholder} />
            </View>
          )}
        </LinearGradient>
        
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
        
        {/* Streak Bonus Ring */}
        {streakBonus && (
          <View style={styles.streakRing}>
            <LinearGradient
              colors={['#fbbf24', '#f59e0b', '#fbbf24']}
              style={styles.streakGradient}
            />
          </View>
        )}
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
      
      {/* Base Shadow */}
      <View style={styles.shadow} />
    </Animated.View>
  );
};

const styles = {
  container: {
    position: 'absolute',
    alignItems: 'center',
  },
  bubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    color: theme.colors.primary,
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
