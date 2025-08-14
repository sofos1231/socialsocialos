import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import PracticeCategoryCarousel from './PracticeCategoryCarousel';
import WeeklyStreakCard from './WeeklyStreakCard';
import JourneyFlashcards from './JourneyFlashcards';
import styles from './PracticeHubStyles';
import theme from '../theme.js';
import TransparentTopBar from './TransparentTopBar';
import registry from '../data/practiceRegistry.json';

const { width, height } = Dimensions.get('window');

const PracticeHub = ({ onShowPracticeRoad }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerScaleAnim = useRef(new Animated.Value(0.8)).current;
  // Subtle animated shift between two deep blues for premium feel
  const blueShift = useRef(new Animated.Value(0)).current;
  const { bottom: safeBottomInset, top: safeTopInset } = useSafeAreaInsets();

  // Categories now loaded from JSON registry at ../data/practiceRegistry.json
  const practiceCategories = (registry.categories || []);

  // Enhanced entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        tension: 40,
        friction: 8,
      }),
      Animated.spring(headerScaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        tension: 40,
        friction: 8,
      }),
    ]).start();

    // Start infinite slow blue shift (20–30s, <2% perceived brightness)
    Animated.loop(
      Animated.sequence([
        Animated.timing(blueShift, { toValue: 1, duration: 24000, useNativeDriver: false }),
        Animated.timing(blueShift, { toValue: 0, duration: 24000, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const handleSessionPress = (categoryId, sessionId) => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log(`Session pressed: ${categoryId} - ${sessionId}`);
    // Placeholder for navigation logic
  };

  const handleShowPracticeRoad = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onShowPracticeRoad) {
      onShowPracticeRoad();
    }
  };

  const scrollY = useRef(new Animated.Value(0)).current;

  const topBarPadding = safeTopInset + 56; // single source of truth for top spacing under floating bar

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Background Layers */}
      {/* Base: true black to deep navy vertical gradient */}
      <LinearGradient
        colors={[ '#000000', '#0A0F1C' ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.backgroundLayer}
      />

      {/* Animated subtle overlay shifting between two dark blues */}
      <Animated.View style={[styles.backgroundLayer, { opacity: blueShift.interpolate({ inputRange: [0, 1], outputRange: [0.0, 0.08] }) }]}>
        <LinearGradient
          colors={[ '#0A0F1C', '#0D1629' ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backgroundLayer}
        />
      </Animated.View>

      {/* Mid-screen subtle vertical brightening to make cards pop */}
      <LinearGradient
        colors={[ 'rgba(13,22,41,0.10)', 'rgba(13,22,41,0.00)' ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.midHighlight}
      />

      {/* Corner radial glows for depth */}
      <LinearGradient
        colors={[ 'rgba(10,15,28,0.18)', 'rgba(10,15,28,0.0)' ]}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        style={styles.glowTopLeft}
      />
      <LinearGradient
        colors={[ 'rgba(13,22,41,0.16)', 'rgba(13,22,41,0.0)' ]}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 0, y: 0 }}
        style={styles.glowBottomRight}
      />

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topBarPadding, paddingBottom: safeBottomInset + 16, backgroundColor: 'transparent' },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={true}
        decelerationRate="fast"
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Weekly Streak Card */}
        <WeeklyStreakCard />

        {/* Category Carousels */}
        <View style={styles.categoriesContainer}>
          {practiceCategories.map((category, index) => (
            <Animated.View
              key={category.id || category.slug}
              style={[
                styles.categoryWrapper,
                {
                  opacity: fadeAnim,
                  transform: [{
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    })
                  }]
                }
              ]}
            >
              <PracticeCategoryCarousel
                category={category}
                onSessionPress={handleSessionPress}
                delay={index * 160}
              />
            </Animated.View>
          ))}
        </View>

        {/* Your Journey */}
        <View style={{ marginTop: 6 }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 12 }}>Your Journey</Text>
          <JourneyFlashcards />
        </View>

        {/* Road Mission Button */}
        <View style={{ marginTop: 20, marginBottom: 10 }}>
          <TouchableOpacity
            onPress={handleShowPracticeRoad}
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(99, 102, 241, 0.3)',
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="map-outline" size={24} color="#6366f1" style={{ marginRight: 12 }} />
            <Text style={{ color: '#6366f1', fontSize: 18, fontWeight: '700' }}>
              View Road Mission Map
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#6366f1" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>

        {/* Motivational Footer */}
        <View style={{ marginTop: 14 }}>
          <LinearGradient
            colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingVertical: 18,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fbbf24', fontWeight: '700' }}>
              "Every conversation is a chance to level up!" 💪
            </Text>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* Transparent floating top bar */}
      <TransparentTopBar
        level={5}
        currentXP={1250}
        nextLevelXP={2000}
        coins={1250}
        gems={8}
        avatar={null}
        scrollY={scrollY}
        onPressGems={() => {
          // Placeholder for navigation to Shop
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          console.log('Navigate to Shop');
        }}
        onPressCoins={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          console.log('Coins pressed');
        }}
        onPressAvatar={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          console.log('Profile pressed');
        }}
      />
    </SafeAreaView>
  );
};

export default PracticeHub; 