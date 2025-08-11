import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import ChatBubbleStyles from './ChatBubbleStyles';
import XPFeedback from './XPFeedback';

const ChatBubble = ({ message, character, isLast }) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const isUser = message.sender === 'user';
  const hasXP = message.xp && message.xp > 0;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
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
    ]).start();

    // Glow animation for good messages
    if (hasXP && isUser) {
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ]).start();
      }, 300);
    }
  }, []);

  const getBubbleColors = () => {
    if (isUser) {
      return hasXP 
        ? ['#6366f1', '#8b5cf6'] 
        : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'];
    } else {
      return ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)'];
    }
  };

  const getAIReaction = (xp) => {
    if (!xp) return null;
    
    const reactions = {
      low: ['👍', '😊'],
      medium: ['💯', '😍', '🔥'],
      high: ['🎉', '💎', '⭐'],
    };
    
    let category = 'low';
    if (xp > 25) category = 'high';
    else if (xp > 20) category = 'medium';
    
    const reactionList = reactions[category];
    return reactionList[Math.floor(Math.random() * reactionList.length)];
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <Animated.View
      style={[
        ChatBubbleStyles.container,
        {
          transform: [
            { 
              translateX: slideAnim.interpolate({
                inputRange: [0, 50],
                outputRange: [0, isUser ? 50 : -50],
              })
            },
            { scale: scaleAnim }
          ],
          opacity: fadeAnim,
        }
      ]}
    >
      {/* AI Avatar */}
      {!isUser && (
        <View style={ChatBubbleStyles.avatarContainer}>
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={ChatBubbleStyles.avatarGradient}
          >
            <Text style={ChatBubbleStyles.avatarText}>
              {character.avatar}
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Message Bubble */}
      <View style={[
        ChatBubbleStyles.bubbleContainer,
        isUser ? ChatBubbleStyles.userBubble : ChatBubbleStyles.aiBubble
      ]}>
        <Animated.View
          style={[
            ChatBubbleStyles.bubble,
            {
              shadowOpacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.6],
              }),
              shadowRadius: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 15],
              }),
            }
          ]}
        >
          <LinearGradient
            colors={getBubbleColors()}
            style={ChatBubbleStyles.bubbleGradient}
          >
            <Text style={[
              ChatBubbleStyles.messageText,
              isUser ? ChatBubbleStyles.userText : ChatBubbleStyles.aiText
            ]}>
              {message.text}
            </Text>
            
            {/* AI Reaction */}
            {!isUser && hasXP && (
              <Animated.View
                style={[
                  ChatBubbleStyles.reactionContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }]
                  }
                ]}
              >
                <Text style={ChatBubbleStyles.reactionText}>
                  {getAIReaction(message.xp)}
                </Text>
              </Animated.View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Timestamp */}
        <Text style={[
          ChatBubbleStyles.timestamp,
          isUser ? ChatBubbleStyles.userTimestamp : ChatBubbleStyles.aiTimestamp
        ]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>

      {/* XP Feedback */}
      {hasXP && isUser && (
        <XPFeedback xp={message.xp} />
      )}
    </Animated.View>
  );
};

export default ChatBubble; 