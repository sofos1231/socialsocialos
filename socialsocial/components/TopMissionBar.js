import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

import TopMissionBarStyles from './TopMissionBarStyles';

const TopMissionBar = ({ 
  character, 
  timeRemaining, 
  messagesLeft, 
  streak, 
  streakAnim, 
  onBack 
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Pulse animation for timer
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return ['#22c55e', '#16a34a'];
      case 'medium':
        return ['#f59e0b', '#d97706'];
      case 'hard':
        return ['#ef4444', '#dc2626'];
      default:
        return ['#6366f1', '#8b5cf6'];
    }
  };

  const getDifficultyIcon = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return '💖';
      case 'medium':
        return '⚡';
      case 'hard':
        return '🔥';
      default:
        return '⭐';
    }
  };

  return (
    <Animated.View 
      style={[
        TopMissionBarStyles.container,
        { transform: [{ translateX: slideAnim }] }
      ]}
    >
      <BlurView intensity={30} style={TopMissionBarStyles.blurContainer}>
        {/* Back Button */}
        <TouchableOpacity 
          style={TopMissionBarStyles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
            style={TopMissionBarStyles.backButtonGradient}
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Character Info */}
        <View style={TopMissionBarStyles.characterContainer}>
          <View style={TopMissionBarStyles.avatarContainer}>
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              style={TopMissionBarStyles.avatarGradient}
            >
              <Text style={TopMissionBarStyles.avatarText}>
                {character.avatar}
              </Text>
            </LinearGradient>
          </View>
          
          <View style={TopMissionBarStyles.characterInfo}>
            <Text style={TopMissionBarStyles.characterName}>
              {character.name}
            </Text>
            <View style={TopMissionBarStyles.difficultyContainer}>
              <LinearGradient
                colors={getDifficultyColor(character.difficulty)}
                style={TopMissionBarStyles.difficultyGradient}
              >
                <Text style={TopMissionBarStyles.difficultyIcon}>
                  {getDifficultyIcon(character.difficulty)}
                </Text>
                <Text style={TopMissionBarStyles.difficultyText}>
                  {character.level.split(' ')[1]}
                </Text>
              </LinearGradient>
            </View>
          </View>
        </View>

        {/* Timer and Stats */}
        <View style={TopMissionBarStyles.statsContainer}>
          {/* Timer */}
          <Animated.View 
            style={[
              TopMissionBarStyles.timerContainer,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <LinearGradient
              colors={['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.1)']}
              style={TopMissionBarStyles.timerGradient}
            >
              <Ionicons name="time-outline" size={14} color="#ef4444" />
              <Text style={TopMissionBarStyles.timerText}>
                {timeRemaining}
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* Messages Left */}
          <View style={TopMissionBarStyles.messagesContainer}>
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.2)', 'rgba(37, 99, 235, 0.1)']}
              style={TopMissionBarStyles.messagesGradient}
            >
              <Ionicons name="chatbubble-outline" size={14} color="#3b82f6" />
              <Text style={TopMissionBarStyles.messagesText}>
                {messagesLeft}
              </Text>
            </LinearGradient>
          </View>

          {/* Streak */}
          {streak > 0 && (
            <Animated.View 
              style={[
                TopMissionBarStyles.streakContainer,
                { 
                  transform: [{ 
                    scale: streakAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.3],
                    })
                  }] 
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(251, 191, 36, 0.3)', 'rgba(245, 158, 11, 0.2)']}
                style={TopMissionBarStyles.streakGradient}
              >
                <Text style={TopMissionBarStyles.streakIcon}>🔥</Text>
                <Text style={TopMissionBarStyles.streakText}>
                  x{streak}
                </Text>
              </LinearGradient>
            </Animated.View>
          )}
        </View>
      </BlurView>
    </Animated.View>
  );
};

export default TopMissionBar; 