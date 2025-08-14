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

const { width } = Dimensions.get('window');

const RewardPopup = ({
  isVisible,
  onClose,
  xpGained,
  missionTitle,
  streakBonus = 0,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

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
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate XP counter
      Animated.timing(xpAnim, {
        toValue: xpGained,
        duration: 1500,
        useNativeDriver: false,
      }).start();
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
      ]).start();
    }
  }, [isVisible, xpGained]);

  const totalXP = xpGained + streakBonus;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
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
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Background Gradient */}
              <LinearGradient
                colors={['rgba(0, 0, 0, 0.9)', 'rgba(0, 0, 0, 0.8)']}
                style={styles.popupBackground}
              />

              {/* Confetti Effect */}
              <Animated.View
                style={[
                  styles.confettiContainer,
                  {
                    opacity: confettiAnim,
                  },
                ]}
              >
                <Ionicons name="sparkles" size={24} color="#fbbf24" style={styles.confetti1} />
                <Ionicons name="sparkles" size={20} color="#fbbf24" style={styles.confetti2} />
                <Ionicons name="sparkles" size={16} color="#fbbf24" style={styles.confetti3} />
                <Ionicons name="sparkles" size={22} color="#fbbf24" style={styles.confetti4} />
              </Animated.View>

              {/* Success Icon */}
              <View style={styles.successIconContainer}>
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.successIconGradient}
                >
                  <Ionicons name="checkmark" size={40} color="#ffffff" />
                </LinearGradient>
              </View>

              {/* Mission Completed Text */}
              <Text style={styles.completedText}>Mission Completed!</Text>

              {/* Mission Title */}
              <Text style={styles.missionTitle} numberOfLines={2}>
                {missionTitle}
              </Text>

              {/* XP Reward */}
              <View style={styles.xpContainer}>
                <LinearGradient
                  colors={['#fbbf24', '#f59e0b', '#d97706']}
                  style={styles.xpGradient}
                >
                  <Ionicons name="star" size={32} color="#ffffff" />
                  <Animated.Text style={styles.xpText}>
                    +{xpAnim}
                  </Animated.Text>
                </LinearGradient>
              </View>

              {/* Streak Bonus */}
              {streakBonus > 0 && (
                <View style={styles.streakContainer}>
                  <LinearGradient
                    colors={['#ef4444', '#dc2626']}
                    style={styles.streakGradient}
                  >
                    <Ionicons name="flame" size={20} color="#ffffff" />
                    <Text style={styles.streakText}>
                      +{streakBonus} Streak Bonus!
                    </Text>
                  </LinearGradient>
                </View>
              )}

              {/* Total XP */}
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total Earned</Text>
                <Text style={styles.totalXP}>+{totalXP} XP</Text>
              </View>

              {/* Continue Button */}
              <TouchableOpacity
                style={styles.continueButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryGlow]}
                  style={styles.continueButtonGradient}
                >
                  <Text style={styles.continueButtonText}>
                    Continue
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
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
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confetti1: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  confetti2: {
    position: 'absolute',
    top: 40,
    right: 30,
  },
  confetti3: {
    position: 'absolute',
    bottom: 60,
    left: 40,
  },
  confetti4: {
    position: 'absolute',
    bottom: 40,
    right: 20,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  completedText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  missionTitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  xpContainer: {
    marginBottom: 16,
  },
  xpGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  xpText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  streakContainer: {
    marginBottom: 24,
  },
  streakGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  streakText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  totalContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  totalXP: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fbbf24',
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  continueButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
};

export default RewardPopup;
