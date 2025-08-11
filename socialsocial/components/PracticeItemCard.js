import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import styles from './PracticeItemCardStyles';
import theme from '../theme.js';

const PracticeItemCard = ({
  title,
  subtitle,
  status = 'locked', // 'locked', 'unlocked', 'completed', 'in-progress'
  icon = 'lock-closed',
  xp = 0,
  progress = 0, // 0-100 for in-progress state
  onPress,
  style,
  delay = 0,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const xpBounceAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Enhanced entrance animation with staggered delay
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

  // Enhanced glow animation for unlocked cards
  useEffect(() => {
    if (status === 'unlocked') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.4,
            duration: 2500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [status]);

  // Enhanced progress animation for in-progress cards
  useEffect(() => {
    if (status === 'in-progress') {
      Animated.spring(progressAnim, {
        toValue: progress,
        duration: 1200,
        useNativeDriver: false,
        tension: 40,
        friction: 7,
      }).start();
    }
  }, [progress, status]);

  // Shimmer effect for completed cards
  useEffect(() => {
    if (status === 'completed') {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        })
      ).start();
    }
  }, [status]);

  const handlePress = () => {
    if (status === 'locked') {
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
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Vibration.vibrate(80);
    }

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
    switch (status) {
      case 'locked':
        return {
          background: ['rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.02)'],
          iconBg: 'rgba(255, 255, 255, 0.12)',
          iconColor: 'rgba(255, 255, 255, 0.5)',
          textColor: 'rgba(255, 255, 255, 0.6)',
          subtitleColor: 'rgba(255, 255, 255, 0.4)',
        };
      case 'unlocked':
        return {
          background: ['rgba(99, 102, 241, 0.18)', 'rgba(139, 92, 246, 0.12)'],
          iconBg: 'rgba(99, 102, 241, 0.35)',
          iconColor: '#ffffff',
          textColor: '#ffffff',
          subtitleColor: 'rgba(255, 255, 255, 0.8)',
        };
      case 'completed':
        return {
          background: ['rgba(34, 197, 94, 0.12)', 'rgba(22, 163, 74, 0.08)'],
          iconBg: 'rgba(34, 197, 94, 0.35)',
          iconColor: '#22c55e',
          textColor: '#ffffff',
          subtitleColor: 'rgba(255, 255, 255, 0.7)',
        };
      case 'in-progress':
        return {
          background: ['rgba(251, 191, 36, 0.18)', 'rgba(245, 158, 11, 0.12)'],
          iconBg: 'rgba(251, 191, 36, 0.35)',
          iconColor: '#fbbf24',
          textColor: '#ffffff',
          subtitleColor: 'rgba(255, 255, 255, 0.8)',
        };
      default:
        return {
          background: ['rgba(255, 255, 255, 0.06)', 'rgba(255, 255, 255, 0.03)'],
          iconBg: 'rgba(255, 255, 255, 0.12)',
          iconColor: '#ffffff',
          textColor: '#ffffff',
          subtitleColor: 'rgba(255, 255, 255, 0.7)',
        };
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'locked':
        return 'Locked';
      case 'unlocked':
        return 'Ready';
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'locked':
        return 'lock-closed';
      case 'unlocked':
        return 'play-circle';
      case 'completed':
        return 'checkmark-circle';
      case 'in-progress':
        return 'time';
      default:
        return icon;
    }
  };

  const colors = getStatusColors();

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.touchable}
        onPress={handlePress}
        activeOpacity={status === 'locked' ? 1 : 0.85}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Practice Item: ${title}, Status: ${status}`}
        accessibilityHint={status === 'locked' ? 'This item is locked and cannot be accessed yet' : 'Tap to start or continue practice'}
        accessibilityState={{ disabled: status === 'locked' }}
      >
        {/* Enhanced glow effect for unlocked cards */}
        {status === 'unlocked' && (
          <Animated.View
            style={[
              styles.glowEffect,
              {
                opacity: glowAnim,
                shadowColor: theme.colors.primary,
                shadowOpacity: glowAnim,
              },
            ]}
          />
        )}

        {/* Shimmer effect for completed cards */}
        {status === 'completed' && (
          <Animated.View
            style={[
              styles.glowEffect,
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
          {/* Enhanced Icon Container */}
          <View style={[styles.iconContainer, { backgroundColor: colors.iconBg }]}>
            <Ionicons
              name={getStatusIcon()}
              size={26}
              color={colors.iconColor}
              style={styles.icon}
            />
          </View>

          {/* Content Container */}
          <View style={styles.contentContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.textColor }]}>
                {title}
              </Text>
              {xp > 0 && (
                <Animated.View 
                  style={[
                    styles.xpContainer,
                    { transform: [{ scale: xpBounceAnim }] }
                  ]}
                >
                  <Ionicons name="star" size={14} color="#fbbf24" />
                  <Text style={styles.xpText}>{xp} XP</Text>
                </Animated.View>
              )}
            </View>

            {subtitle && (
              <Text style={[styles.subtitle, { color: colors.subtitleColor }]}>
                {subtitle}
              </Text>
            )}

            {/* Enhanced Progress bar for in-progress state */}
            {status === 'in-progress' && (
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
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
              </View>
            )}

            {/* Status indicator */}
            <View style={styles.statusContainer}>
              <Text style={[styles.statusText, { color: colors.iconColor }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>

          {/* Enhanced Right arrow for unlocked/completed cards */}
          {(status === 'unlocked' || status === 'completed') && (
            <View style={styles.arrowContainer}>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={colors.iconColor}
              />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default PracticeItemCard; 