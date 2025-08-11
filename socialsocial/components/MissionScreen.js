import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import MissionScreenStyles from './MissionScreenStyles';
import TopMissionBar from './TopMissionBar';
import ChatBubble from './ChatBubble';
import XPFeedback from './XPFeedback';
import MissionInputBar from './MissionInputBar';

const { width, height } = Dimensions.get('window');

const MissionScreen = ({ navigation, route }) => {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: 'Hey, what made you swipe on me?', timestamp: Date.now() - 30000 },
    { id: 2, sender: 'user', text: 'You have that mysterious vibe 😏', timestamp: Date.now() - 20000, xp: 25 },
    { id: 3, sender: 'ai', text: 'Mysterious? I like that! What else caught your eye?', timestamp: Date.now() - 10000 },
  ]);
  const [inputText, setInputText] = useState('');
  const [streak, setStreak] = useState(2);
  const [totalXP, setTotalXP] = useState(45);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes
  const [messagesLeft, setMessagesLeft] = useState(5);
  
  const scrollViewRef = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const streakAnim = useRef(new Animated.Value(0)).current;

  // Character data
  const character = {
    name: 'Alex',
    avatar: '👤',
    level: '🔥 Hard',
    difficulty: 'hard',
  };

  useEffect(() => {
    // Fade in animation on mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Timer countdown
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newMessage = {
      id: Date.now(),
      sender: 'user',
      text: inputText.trim(),
      timestamp: Date.now(),
    };

    // Simulate XP gain (random for demo)
    const xpGained = Math.floor(Math.random() * 30) + 15;
    newMessage.xp = xpGained;
    
    setMessages(prev => [...prev, newMessage]);
    setTotalXP(prev => prev + xpGained);
    setMessagesLeft(prev => prev - 1);
    setInputText('');

    // Update streak
    if (xpGained > 20) {
      setStreak(prev => prev + 1);
      // Streak animation
      Animated.sequence([
        Animated.timing(streakAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(streakAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simulate AI response after a delay
    setTimeout(() => {
      const aiResponses = [
        "That's really interesting! Tell me more about yourself.",
        "I love your energy! What do you do for fun?",
        "You seem like someone who knows how to have a good time 😊",
        "I'm curious about your dreams and goals...",
        "You have such a unique perspective on things!",
      ];
      
      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: aiResponses[Math.floor(Math.random() * aiResponses.length)],
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1500);
  };

  const getXPForecast = () => {
    const baseXP = 20;
    const streakBonus = streak * 5;
    const perfectBonus = 15;
    return baseXP + streakBonus + perfectBonus;
  };

  return (
    <SafeAreaView style={MissionScreenStyles.container}>
      <KeyboardAvoidingView 
        style={MissionScreenStyles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View 
          style={[
            MissionScreenStyles.content,
            { opacity: fadeAnim }
          ]}
        >
          {/* Top Mission Bar */}
          <TopMissionBar
            character={character}
            timeRemaining={formatTime(timeRemaining)}
            messagesLeft={messagesLeft}
            streak={streak}
            streakAnim={streakAnim}
            onBack={() => navigation.goBack()}
          />

          {/* XP Progress Bar */}
          <View style={MissionScreenStyles.xpProgressContainer}>
            <LinearGradient
              colors={['#22c55e', '#16a34a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                MissionScreenStyles.xpProgressBar,
                { width: `${Math.min((totalXP / 100) * 100, 100)}%` }
              ]}
            />
            <Text style={MissionScreenStyles.xpProgressText}>
              {totalXP}/100 XP
            </Text>
          </View>

          {/* Chat Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={MissionScreenStyles.chatContainer}
            contentContainerStyle={MissionScreenStyles.chatContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((message, index) => (
              <ChatBubble
                key={message.id}
                message={message}
                character={character}
                isLast={index === messages.length - 1}
              />
            ))}
          </ScrollView>

          {/* XP Forecast */}
          <View style={MissionScreenStyles.xpForecastContainer}>
            <BlurView intensity={20} style={MissionScreenStyles.xpForecast}>
              <Ionicons name="trending-up" size={16} color="#fbbf24" />
              <Text style={MissionScreenStyles.xpForecastText}>
                Perfect reply could earn +{getXPForecast()} XP!
              </Text>
            </BlurView>
          </View>

          {/* Input Bar */}
          <MissionInputBar
            value={inputText}
            onChangeText={setInputText}
            onSend={handleSendMessage}
            disabled={!inputText.trim() || messagesLeft <= 0}
            messagesLeft={messagesLeft}
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default MissionScreen; 