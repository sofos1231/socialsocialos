import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import XPFeedbackStyles from './XPFeedbackStyles';

const XPFeedback = ({ xp }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // XP popup animation sequence
    Animated.sequence([
      // Initial popup
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -40,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          tension: 200,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      
      // Settle
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
      ]),
      
      // Hold
      Animated.delay(800),
      
      // Fade out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, []);

  const getXPColor = (xp) => {
    if (xp >= 25) return ['#22c55e', '#16a34a']; // Green for high XP
    if (xp >= 20) return ['#f59e0b', '#d97706']; // Orange for medium XP
    return ['#6366f1', '#8b5cf6']; // Purple for low XP
  };

  const getXPIcon = (xp) => {
    if (xp >= 25) return 'star';
    if (xp >= 20) return 'flash';
    return 'trending-up';
  };

  const getXPText = (xp) => {
    if (xp >= 25) return 'Perfect!';
    if (xp >= 20) return 'Great!';
    return 'Good!';
  };

  return (
    <Animated.View
      style={[
        XPFeedbackStyles.container,
        {
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ],
          opacity: fadeAnim,
        }
      ]}
    >
      <Animated.View
        style={[
          XPFeedbackStyles.feedbackContainer,
          {
            shadowOpacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.8],
            }),
            shadowRadius: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 20],
            }),
          }
        ]}
      >
        <LinearGradient
          colors={getXPColor(xp)}
          style={XPFeedbackStyles.feedbackGradient}
        >
          <Ionicons 
            name={getXPIcon(xp)} 
            size={16} 
            color="#ffffff" 
            style={XPFeedbackStyles.icon}
          />
          <Text style={XPFeedbackStyles.xpText}>
            +{xp}
          </Text>
          <Text style={XPFeedbackStyles.xpLabel}>
            XP
          </Text>
        </LinearGradient>
        
        {/* Praise text */}
        <View style={XPFeedbackStyles.praiseContainer}>
          <Text style={XPFeedbackStyles.praiseText}>
            {getXPText(xp)}
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default XPFeedback; 