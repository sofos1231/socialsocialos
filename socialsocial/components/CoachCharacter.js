import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme.js';

const CoachCharacter = ({
  message,
  mood = 'encouraging',
  position = 'corner',
  onTap,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle bounce animation
    const bounceInterval = setInterval(() => {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }, 3000);

    return () => clearInterval(bounceInterval);
  }, []);

  const getMoodIcon = () => {
    switch (mood) {
      case 'celebrating':
        return 'trophy';
      case 'excited':
        return 'star';
      case 'encouraging':
      default:
        return 'heart';
    }
  };

  const getMoodColors = () => {
    switch (mood) {
      case 'celebrating':
        return ['#fbbf24', '#f59e0b', '#d97706'];
      case 'excited':
        return ['#a855f7', '#9333ea', '#7c3aed'];
      case 'encouraging':
      default:
        return ['#3b82f6', '#2563eb', '#1d4ed8'];
    }
  };

  const getPositionStyle = () => {
    switch (position) {
      case 'center':
        return {
          position: 'absolute',
          bottom: 100,
          alignSelf: 'center',
        };
      case 'corner':
      default:
        return {
          position: 'absolute',
          bottom: 120,
          right: 20,
        };
    }
  };

  const handlePress = () => {
    if (onTap) {
      onTap();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        getPositionStyle(),
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: bounceAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.coachButton}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={getMoodColors()}
          style={styles.coachGradient}
        >
          {/* Coach Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={getMoodIcon()} size={24} color="#ffffff" />
          </View>

          {/* Message Bubble */}
          <View style={styles.messageContainer}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.9)']}
              style={styles.messageBubble}
            >
              <Text style={styles.messageText} numberOfLines={2}>
                {message}
              </Text>
              
              {/* Message Arrow */}
              <View style={styles.messageArrow} />
            </LinearGradient>
          </View>
        </LinearGradient>

        {/* Glow Effect */}
        <View style={[styles.glowEffect, { backgroundColor: getMoodColors()[0] }]} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = {
  container: {
    zIndex: 100,
  },
  coachButton: {
    alignItems: 'center',
  },
  coachGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageContainer: {
    position: 'relative',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 18,
  },
  messageArrow: {
    position: 'absolute',
    left: -6,
    top: '50%',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.95)',
    transform: [{ translateY: -4 }],
  },
  glowEffect: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 28,
    opacity: 0.3,
    zIndex: -1,
  },
};

export default CoachCharacter;
