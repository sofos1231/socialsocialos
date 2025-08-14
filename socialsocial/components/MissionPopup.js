import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme.js';

const { width, height } = Dimensions.get('window');

const MissionPopup = ({
  isVisible,
  onClose,
  mission,
  onStartMission,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  if (!mission) return null;

  const getDifficultyColor = () => {
    switch (mission.difficulty) {
      case 'easy':
        return ['#10b981', '#059669'];
      case 'medium':
        return ['#f59e0b', '#d97706'];
      case 'hard':
        return ['#ef4444', '#dc2626'];
      default:
        return ['#6b7280', '#4b5563'];
    }
  };

  const getTypeIcon = () => {
    switch (mission.type) {
      case 'boss':
        return 'flame';
      case 'premium':
        return 'diamond';
      case 'video':
        return 'play-circle';
      default:
        return 'chatbubble';
    }
  };

  const getTypeColor = () => {
    switch (mission.type) {
      case 'boss':
        return ['#f97316', '#ea580c'];
      case 'premium':
        return ['#a855f7', '#9333ea'];
      case 'video':
        return ['#3b82f6', '#2563eb'];
      default:
        return [theme.colors.primary, theme.colors.primaryGlow];
    }
  };

  const handleStartPress = () => {
    onStartMission(mission);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.popupContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    { scale: scaleAnim },
                    { translateY: slideAnim },
                  ],
                },
              ]}
            >
              {/* Background Gradient */}
              <LinearGradient
                colors={['rgba(0, 0, 0, 0.9)', 'rgba(0, 0, 0, 0.8)']}
                style={styles.popupBackground}
              />

              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <View style={styles.closeButtonBackground}>
                  <Ionicons name="close" size={24} color="#ffffff" />
                </View>
              </TouchableOpacity>

              {/* Mission Icon */}
              <View style={styles.missionIconContainer}>
                <LinearGradient
                  colors={getTypeColor()}
                  style={styles.missionIconGradient}
                >
                  <Ionicons name={getTypeIcon()} size={32} color="#ffffff" />
                </LinearGradient>
              </View>

              {/* Mission Title */}
              <Text style={styles.missionTitle} numberOfLines={2}>
                {mission.title}
              </Text>

              {/* Mission Description */}
              <Text style={styles.missionDescription} numberOfLines={3}>
                {mission.description}
              </Text>

              {/* Mission Stats */}
              <View style={styles.statsContainer}>
                {/* Duration */}
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="time" size={16} color={theme.colors.muted} />
                  </View>
                  <Text style={styles.statText}>{mission.duration}</Text>
                </View>

                {/* XP Reward */}
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="star" size={16} color="#fbbf24" />
                  </View>
                  <Text style={styles.statText}>{mission.xpReward} XP</Text>
                </View>

                {/* Difficulty */}
                <View style={styles.statItem}>
                  <LinearGradient
                    colors={getDifficultyColor()}
                    style={styles.difficultyBadge}
                  >
                    <Text style={styles.difficultyText}>
                      {mission.difficulty.toUpperCase()}
                    </Text>
                  </LinearGradient>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionContainer}>
                {mission.type === 'premium' ? (
                  <TouchableOpacity
                    style={styles.premiumButton}
                    onPress={handleStartPress}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#a855f7', '#9333ea']}
                      style={styles.premiumButtonGradient}
                    >
                      <Ionicons name="diamond" size={20} color="#ffffff" />
                      <Text style={styles.premiumButtonText}>
                        Upgrade to Unlock
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={handleStartPress}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[theme.colors.primary, theme.colors.primaryGlow]}
                      style={styles.startButtonGradient}
                    >
                      <Ionicons name="play" size={20} color="#ffffff" />
                      <Text style={styles.startButtonText}>
                        Start Mission
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  popupContainer: {
    width: width - 40,
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  popupBackground: {
    padding: 32,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  closeButtonBackground: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  missionIconContainer: {
    marginBottom: 24,
  },
  missionIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  missionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 28,
  },
  missionDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  difficultyText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  actionContainer: {
    width: '100%',
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  premiumButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  premiumButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  premiumButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
};

export default MissionPopup;
