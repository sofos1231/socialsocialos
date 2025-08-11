import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import MissionInputBarStyles from './MissionInputBarStyles';

const MissionInputBar = ({ 
  value, 
  onChangeText, 
  onSend, 
  disabled, 
  messagesLeft 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    // Slide up animation on mount
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSendPress = async () => {
    if (disabled) return;

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Button press animation
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

    // Glow animation
    Animated.sequence([
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();

    onSend();
  };

  const getSendButtonColors = () => {
    if (disabled) {
      return ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'];
    }
    return ['#6366f1', '#8b5cf6'];
  };

  const getSendButtonIcon = () => {
    if (disabled) return 'send-outline';
    return 'send';
  };

  return (
    <Animated.View
      style={[
        MissionInputBarStyles.container,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <BlurView intensity={30} style={MissionInputBarStyles.blurContainer}>
        {/* Messages Left Indicator */}
        {messagesLeft <= 3 && (
          <View style={MissionInputBarStyles.messagesLeftContainer}>
            <LinearGradient
              colors={['rgba(239, 68, 68, 0.2)', 'rgba(220, 38, 38, 0.1)']}
              style={MissionInputBarStyles.messagesLeftGradient}
            >
              <Ionicons name="warning-outline" size={12} color="#ef4444" />
              <Text style={MissionInputBarStyles.messagesLeftText}>
                {messagesLeft} left
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Text Input */}
        <View style={MissionInputBarStyles.inputContainer}>
          <TextInput
            style={MissionInputBarStyles.textInput}
            value={value}
            onChangeText={onChangeText}
            placeholder="Type your message..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            multiline
            maxLength={200}
            textAlignVertical="center"
            selectionColor="#6366f1"
          />
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={MissionInputBarStyles.sendButtonContainer}
          onPress={handleSendPress}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              MissionInputBarStyles.sendButton,
              {
                transform: [{ scale: scaleAnim }],
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
              colors={getSendButtonColors()}
              style={MissionInputBarStyles.sendButtonGradient}
            >
              <Ionicons 
                name={getSendButtonIcon()} 
                size={20} 
                color={disabled ? "rgba(255, 255, 255, 0.5)" : "#ffffff"} 
              />
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </BlurView>
    </Animated.View>
  );
};

export default MissionInputBar; 