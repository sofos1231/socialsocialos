import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Modal,
  Dimensions,
  Vibration,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import styles from './MissionPreviewModalStyles';
import theme from '../theme.js';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MissionPreviewModal = ({
  visible = false,
  mission = {},
  onClose,
  onStartMission,
  style,
}) => {
  const {
    title = 'Flirt Like a Pro',
    subtitle = 'Learn how to deliver a bold line under pressure',
    difficulty = 'Intermediate',
    timeEstimate = '2 min',
    xpReward = 20,
    isLocked = false,
    lockMessage = 'Complete previous missions to unlock',
  } = mission;

  // Animation refs
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const xpStarScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // State for button press feedback
  const [isButtonPressed, setIsButtonPressed] = useState(false);

  // Modal open animation
  useEffect(() => {
    if (visible) {
      // Haptic feedback on open
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Vibration.vibrate(100);
      }

      // Background fade in
      Animated.timing(backgroundOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Modal scale and fade in
      Animated.parallel([
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(modalScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Start XP star pulse animation
      startXpStarAnimation();
    } else {
      // Reset animations
      modalScale.setValue(0.8);
      modalOpacity.setValue(0);
      backgroundOpacity.setValue(0);
      xpStarScale.setValue(1);
      buttonScale.setValue(1);
      glowAnim.setValue(0);
    }
  }, [visible]);

  // XP star pulsing animation
  const startXpStarAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(xpStarScale, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(xpStarScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Glow animation for unlocked missions
  useEffect(() => {
    if (!isLocked) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [isLocked]);

  const handleClose = () => {
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Vibration.vibrate(50);
    }

    // Close animation
    Animated.parallel([
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onClose) onClose();
    });
  };

  const handleStartMission = () => {
    if (isLocked) return;

    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else {
      Vibration.vibrate(150);
    }

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (onStartMission) {
      onStartMission();
    }
  };

  const handleBackdropPress = () => {
    handleClose();
  };

  const getDifficultyColor = () => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return theme.colors.success;
      case 'intermediate':
        return theme.colors.warning;
      case 'advanced':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const getDifficultyGradient = () => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return ['#22c55e', '#16a34a'];
      case 'intermediate':
        return ['#f59e0b', '#d97706'];
      case 'advanced':
        return ['#ef4444', '#dc2626'];
      default:
        return [theme.colors.primary, '#8b5cf6'];
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backgroundOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleBackdropPress}
        >
          {/* Modal Content */}
          <Animated.View
            style={[
              styles.modalContainer,
              {
                opacity: modalOpacity,
                transform: [{ scale: modalScale }],
              },
              style,
            ]}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}} // Prevent closing when tapping modal content
            >
              {/* Glassmorphism Background */}
              <BlurView intensity={20} style={styles.glassBackground}>
                {/* Glow Outline */}
                <Animated.View
                  style={[
                    styles.glowOutline,
                    {
                      opacity: glowAnim,
                    },
                  ]}
                />
                
                {/* Close Button */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>

                {/* Content */}
                <View style={styles.content}>
                  {/* Title */}
                  <Text style={styles.title}>{title}</Text>
                  
                  {/* Subtitle */}
                  <Text style={styles.subtitle}>{subtitle}</Text>

                  {/* Tags Row */}
                  <View style={styles.tagsContainer}>
                    {/* Difficulty Badge */}
                    <LinearGradient
                      colors={getDifficultyGradient()}
                      style={styles.difficultyBadge}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.difficultyText}>{difficulty}</Text>
                    </LinearGradient>

                    {/* Time Estimate */}
                    <View style={styles.timeBadge}>
                      <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
                      <Text style={styles.timeText}>{timeEstimate}</Text>
                    </View>

                    {/* XP Reward */}
                    <View style={styles.xpBadge}>
                      <Animated.View
                        style={[
                          styles.xpStarContainer,
                          {
                            transform: [{ scale: xpStarScale }],
                          },
                        ]}
                      >
                        <Ionicons name="star" size={18} color={theme.colors.textSecondary} />
                      </Animated.View>
                      <Text style={styles.xpText}>+{xpReward} XP</Text>
                    </View>
                  </View>

                  {/* Action Button */}
                  <View style={styles.buttonContainer}>
                    {isLocked ? (
                      <View style={styles.lockedButton}>
                        <Ionicons name="lock-closed" size={24} color={theme.colors.textMuted} />
                        <Text style={styles.lockedText}>{lockMessage}</Text>
                      </View>
                    ) : (
                      <Animated.View
                        style={[
                          styles.buttonWrapper,
                          {
                            transform: [{ scale: buttonScale }],
                          },
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.startButton}
                          onPress={handleStartMission}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={['#6366f1', '#8b5cf6']}
                            style={styles.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Ionicons name="play" size={20} color={theme.colors.primaryForeground} />
                            <Text style={styles.buttonText}>Start Mission</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </Animated.View>
                    )}
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

export default MissionPreviewModal; 