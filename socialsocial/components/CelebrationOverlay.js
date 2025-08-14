import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme.js';

const { width, height } = Dimensions.get('window');

const CelebrationOverlay = ({
  isVisible,
  type = 'mission',
  onComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
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
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate text after a delay
      setTimeout(() => {
        Animated.timing(textAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 300);

      // Auto close after 3 seconds
      setTimeout(() => {
        handleClose();
      }, 3000);
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const handleClose = () => {
    onComplete();
  };

  const getCelebrationContent = () => {
    switch (type) {
      case 'chapter':
        return {
          title: 'Chapter Complete! 🎉',
          subtitle: 'Amazing work! You\'ve mastered this chapter.',
          icon: 'trophy',
          colors: ['#fbbf24', '#f59e0b', '#d97706'],
          emoji: '🏆',
        };
      case 'milestone':
        return {
          title: 'Milestone Reached! ⭐',
          subtitle: 'You\'ve hit an important milestone in your journey.',
          icon: 'star',
          colors: ['#a855f7', '#9333ea', '#7c3aed'],
          emoji: '⭐',
        };
      case 'mission':
      default:
        return {
          title: 'Mission Accomplished! 🚀',
          subtitle: 'Great job completing this mission!',
          icon: 'checkmark-circle',
          colors: ['#10b981', '#059669', '#047857'],
          emoji: '🚀',
        };
    }
  };

  const content = getCelebrationContent();

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
          {/* Confetti Background */}
          <Animated.View
            style={[
              styles.confettiContainer,
              {
                opacity: confettiAnim,
              },
            ]}
          >
            {[...Array(20)].map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.confetti,
                  {
                    left: Math.random() * width,
                    top: Math.random() * height,
                    backgroundColor: ['#fbbf24', '#ef4444', '#3b82f6', '#10b981', '#a855f7'][Math.floor(Math.random() * 5)],
                    transform: [
                      {
                        rotate: `${Math.random() * 360}deg`,
                      },
                    ],
                  },
                ]}
              />
            ))}
          </Animated.View>

          {/* Main Celebration Content */}
          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Celebration Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={content.colors}
                style={styles.iconGradient}
              >
                <Text style={styles.emoji}>{content.emoji}</Text>
                <Ionicons name={content.icon} size={40} color="#ffffff" />
              </LinearGradient>
            </View>

            {/* Celebration Text */}
            <Animated.View
              style={[
                styles.textContainer,
                {
                  opacity: textAnim,
                  transform: [
                    {
                      translateY: textAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.title}>{content.title}</Text>
              <Text style={styles.subtitle}>{content.subtitle}</Text>
            </Animated.View>

            {/* Sparkles Effect */}
            <Animated.View
              style={[
                styles.sparklesContainer,
                {
                  opacity: confettiAnim,
                },
              ]}
            >
              <Ionicons name="sparkles" size={24} color="#fbbf24" style={styles.sparkle1} />
              <Ionicons name="sparkles" size={20} color="#fbbf24" style={styles.sparkle2} />
              <Ionicons name="sparkles" size={16} color="#fbbf24" style={styles.sparkle3} />
              <Ionicons name="sparkles" size={22} color="#fbbf24" style={styles.sparkle4} />
              <Ionicons name="sparkles" size={18} color="#fbbf24" style={styles.sparkle5} />
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contentContainer: {
    alignItems: 'center',
    padding: 40,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sparklesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkle1: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  sparkle2: {
    position: 'absolute',
    top: 40,
    right: 30,
  },
  sparkle3: {
    position: 'absolute',
    bottom: 60,
    left: 40,
  },
  sparkle4: {
    position: 'absolute',
    bottom: 40,
    right: 20,
  },
  sparkle5: {
    position: 'absolute',
    top: 60,
    left: '50%',
    transform: [{ translateX: -9 }],
  },
};

export default CelebrationOverlay;
