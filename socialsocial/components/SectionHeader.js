import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import styles from './SectionHeaderStyles';

const SectionHeader = ({ 
  title, 
  subtitle, 
  icon, 
  onPress,
  isActive = false 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(1)).current;

  // Subtle glow animation
  useEffect(() => {
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    );
    glowAnimation.start();

    return () => glowAnimation.stop();
  }, []);

  const handlePress = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Icon bounce animation
    Animated.sequence([
      Animated.timing(iconScaleAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(iconScaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    if (onPress) {
      onPress();
    }
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.touchable}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)']}
          style={styles.background}
        >
          <View style={styles.content}>
            {/* Icon Section */}
            <View style={styles.iconContainer}>
              <Animated.View 
                style={[
                  styles.glowContainer,
                  { opacity: glowOpacity }
                ]}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.glowBackground}
                />
              </Animated.View>
              
              <Animated.View 
                style={[
                  styles.iconWrapper,
                  { transform: [{ scale: iconScaleAnim }] }
                ]}
              >
                <LinearGradient
                  colors={isActive ? ['#22c55e', '#16a34a'] : ['#6366f1', '#8b5cf6']}
                  style={styles.iconBackground}
                >
                  <Ionicons 
                    name={icon} 
                    size={20} 
                    color="#ffffff" 
                  />
                </LinearGradient>
              </Animated.View>
            </View>

            {/* Text Section */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            {/* Arrow Icon */}
            <View style={styles.arrowContainer}>
              <Ionicons 
                name="chevron-forward" 
                size={16} 
                color="rgba(255, 255, 255, 0.4)" 
              />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default SectionHeader; 