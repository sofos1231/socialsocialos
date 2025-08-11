import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import styles from './PracticeSessionCardStyles';
import theme from '../theme.js';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

const PracticeSessionCard = ({ session, onPress, delay = 0 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const xpBounceAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Enhanced entrance animation with delay
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.spring(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  // Progress animation for in-progress sessions
  useEffect(() => {
    if (session.progress > 0) {
      Animated.spring(progressAnim, {
        toValue: session.progress,
        duration: 1200,
        useNativeDriver: false,
        tension: 40,
        friction: 7,
      }).start();
    }
  }, [session.progress]);

  // Shimmer effect for completed sessions
  useEffect(() => {
    if (session.status === 'completed') {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        })
      ).start();
    }
  }, [session.status]);

  // XP pill micro-pulse on mount to feel premium but subtle
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.timing(xpBounceAnim, { toValue: 1.06, duration: 120, useNativeDriver: true }),
        Animated.spring(xpBounceAnim, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true })
      ]).start();
    }, delay + 220);
    return () => clearTimeout(timer);
  }, [delay]);

  const handlePress = () => {
    if (session.status === 'locked') {
      // Lock bounce animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    // Enhanced haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Enhanced scale animation with bounce
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();

    // XP bounce animation
    Animated.sequence([
      Animated.timing(xpBounceAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(xpBounceAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();

    if (onPress) {
      onPress();
    }
  };

  const getStatusColors = () => {
    switch (session.status) {
      case 'locked':
        return {
          background: ['rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.02)'],
          overlay: 'rgba(0, 0, 0, 0.6)',
          textColor: 'rgba(255, 255, 255, 0.6)',
          subtitleColor: 'rgba(255, 255, 255, 0.4)',
        };
      case 'unlocked':
        return {
          background: ['rgba(99, 102, 241, 0.15)', 'rgba(139, 92, 246, 0.1)'],
          overlay: 'transparent',
          textColor: '#ffffff',
          subtitleColor: 'rgba(255, 255, 255, 0.8)',
        };
      case 'completed':
        return {
          background: ['rgba(34, 197, 94, 0.12)', 'rgba(22, 163, 74, 0.08)'],
          overlay: 'transparent',
          textColor: '#ffffff',
          subtitleColor: 'rgba(255, 255, 255, 0.7)',
        };
      case 'in-progress':
        return {
          background: ['rgba(251, 191, 36, 0.15)', 'rgba(245, 158, 11, 0.1)'],
          overlay: 'transparent',
          textColor: '#ffffff',
          subtitleColor: 'rgba(255, 255, 255, 0.8)',
        };
      default:
        return {
          background: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.03)'],
          overlay: 'transparent',
          textColor: '#ffffff',
          subtitleColor: 'rgba(255, 255, 255, 0.7)',
        };
    }
  };

  const getTagColor = (tag) => {
    if (tag.includes('🔥')) return '#FF4D4D'; // richer red
    if (tag.includes('⚡')) return '#22c55e';
    if (tag.includes('⭐')) return '#F5C542'; // richer gold
    if (tag.includes('⏱')) return 'rgba(255,255,255,0.12)'; // neutral chip
    return '#6366f1';
  };

  const colors = getStatusColors();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.touchable}
        onPress={handlePress}
        activeOpacity={session.status === 'locked' ? 1 : 0.85}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${session.title}. ${session.time}. ${session.status === 'locked' ? 'Locked' : session.status === 'completed' ? 'Completed' : session.status === 'in-progress' ? 'In Progress' : 'Ready'}.`}
        accessibilityHint={session.status === 'locked' ? 'This session is locked and cannot be accessed yet' : 'Tap to start or continue practice'}
        accessibilityState={{ disabled: session.status === 'locked' }}
      >
        {/* Shimmer effect for completed sessions */}
        {session.status === 'completed' && (
          <Animated.View
            style={[
              styles.shimmerEffect,
              {
                opacity: shimmerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.2, 0.6],
                }),
                shadowColor: '#22c55e',
                shadowOpacity: shimmerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.3, 0.8],
                }),
              },
            ]}
          />
        )}

        <LinearGradient
          colors={colors.background}
          style={styles.cardBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Cover Image with overlays and reserved top badge lane */}
          <View style={styles.coverContainer}>
            <Text style={styles.coverImage}>{session.coverImage}</Text>
            {/* Top gradient overlay */}
            <LinearGradient
              colors={["rgba(0,0,0,0.4)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.topOverlay}
            />

            {/* Bottom gradient overlay */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.4)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.bottomOverlay}
            />

            {/* Top badge row: Trending | Duration | +XP */}
            <View style={styles.badgeRow}>
              <View style={styles.tagsContainer}>
                {/* Trending pill (if present) */}
                {session.tags.some(t => t.includes('Trending')) && (
                  <View style={[styles.pillBase, styles.pillTrending]}
                    accessibilityLabel="Trending"
                  >
                    <Ionicons name="flame" size={16} color="#ffffff" />
                    <Text style={styles.pillTextLight} numberOfLines={1}>Trending</Text>
                  </View>
                )}

                {/* Duration pill */}
                <View style={[styles.pillBase, styles.pillDuration, { marginLeft: session.tags.some(t => t.includes('Trending')) ? 8 : 0 }]}>
                  <Ionicons name="time" size={16} color="#ffffff" />
                  <Text style={styles.pillTextLight} numberOfLines={1}>{session.time}</Text>
                </View>
              </View>

              {/* +XP pill (premium gold) */}
              <Animated.View
                style={[
                  styles.xpBadge,
                  { transform: [{ scale: xpBounceAnim }] },
                ]}
                accessibilityLabel={`Plus ${session.xp} XP`}
              >
                <Ionicons name="star" size={16} color="#2A1E0C" />
                <Text style={styles.pillTextDark}>+{session.xp} XP</Text>
              </Animated.View>
            </View>

            {/* Locked Overlay */}
            {session.status === 'locked' && (
              <View style={[styles.lockedOverlay, { backgroundColor: colors.overlay }]}>
                <Ionicons name="lock-closed" size={32} color="rgba(255, 255, 255, 0.8)" />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            <Text style={[styles.title, { color: colors.textColor }]} numberOfLines={2}>
              {session.title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.subtitleColor }]}>
              {session.subtitle}
            </Text>

            {/* Progress Bar for in-progress sessions */}
            {session.status === 'in-progress' && session.progress > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{Math.round(session.progress)}%</Text>
              </View>
            )}

            {/* Time and Status */}
            <View style={styles.bottomRow}>
              <Text style={styles.timeText}>{session.time}</Text>
              <View style={styles.statusContainer}>
                <Text style={styles.statusText}>
                  {session.status === 'locked' ? 'LOCKED' : 
                   session.status === 'completed' ? 'COMPLETED' :
                   session.status === 'in-progress' ? 'IN PROGRESS' : 'READY'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default PracticeSessionCard; 