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
import JourneyFlashcards from './JourneyFlashcards';
import styles from './PracticeHubStyles';
import theme from '../theme.js';
import ProfileTopBar from '../src/components/ProfileTopBar';
import { usePlayerProgress } from '../src/state/playerProgress';
import registry from '../data/practiceRegistry.json';
import { usePracticeStore } from '../src/state/practiceStore';

const { width, height } = Dimensions.get('window');

const PracticeHub = ({ onShowPracticeRoad, onShowEnhancedRoadmap, onShowStreak, onOpenMission }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerScaleAnim = useRef(new Animated.Value(0.8)).current;
  // Subtle animated shift between two deep blues for premium feel
  const blueShift = useRef(new Animated.Value(0)).current;
  const { bottom: safeBottomInset, top: safeTopInset } = useSafeAreaInsets();
  const progress = usePlayerProgress();

  // Categories now loaded from JSON registry at ../data/practiceRegistry.json
  // TODO: Future migration - Load categories from backend endpoint (e.g. /v1/practice/hub)
  // instead of hardcoded JSON registry. This will enable dynamic category management
  // via the Practice Hub Designer admin dashboard.
  const practiceCategories = (registry.categories || []);

  const store = usePracticeStore();
  useEffect(() => {
    store.fetchHub().catch(() => {});
  }, []);

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

  const handleShowStreak = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onShowStreak) onShowStreak();
  };

  const handleShowEnhancedRoadmap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onShowEnhancedRoadmap) {
      onShowEnhancedRoadmap();
    }
  };

  const scrollY = useRef(new Animated.Value(0)).current;

  const topBarPadding = safeTopInset + 56; // spacing below TopBar

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Global TopBar */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <ProfileTopBar
          userName={'Username'}
          coins={progress.coins}
          gems={progress.diamonds}
          streak={progress.streakDays}
          inStreak={progress.streakDays > 0}
          onPressMembership={() => {}}
          onPressCoins={() => {}}
          onPressGems={() => {}}
          onPressStreak={handleShowStreak}
        />
      </View>
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
        {/* Weekly Streak Card removed; now shown on StreakScreen */}
        {/* Minimal logic-only debug: show hub balances if available */}
        {store.hub && (
          <View style={{ padding: 12 }}>
            <Text style={{ color: '#9ca3af' }}>Level: {store.hub.user.level} XP: {store.hub.user.xp}</Text>
            <Text style={{ color: '#9ca3af' }}>Streak: {store.hub.user.streak.current}</Text>
            {store.hub.activeSession && (
              <Text style={{ color: '#9ca3af' }}>Active Session: {store.hub.activeSession.id}</Text>
            )}
            <TouchableOpacity
              onPress={async () => {
                try {
                  await store.startQuickDrill();
                  if (onOpenMission) onOpenMission();
                } catch {}
              }}
              style={{ marginTop: 8, padding: 10, backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: 8 }}
            >
              <Text style={{ color: '#c7d2fe', fontWeight: '700', textAlign: 'center' }}>Start Quick Drill</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {/* Minimal counts from hub */}
        {store.hub && (
          <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
            {store.hub.categories.map((c) => (
              <Text key={c.key} style={{ color: '#6b7280' }}>{c.title}: {c.completed}/{c.total}</Text>
            ))}
            {store.hub.activeSession && (
              <TouchableOpacity
                onPress={() => onOpenMission && onOpenMission()}
                style={{ marginTop: 8, padding: 10, backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 8 }}
              >
                <Text style={{ color: '#a7f3d0', fontWeight: '700', textAlign: 'center' }}>Continue Session</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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

        {/* Enhanced Roadmap Button */}
        <View style={{ marginTop: 10, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={handleShowEnhancedRoadmap}
            style={{
              backgroundColor: 'rgba(236, 72, 153, 0.15)',
              borderWidth: 1,
              borderColor: 'rgba(236, 72, 153, 0.35)',
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="trail-sign" size={22} color="#ec4899" style={{ marginRight: 12 }} />
            <Text style={{ color: '#ec4899', fontSize: 18, fontWeight: '700' }}>
              View Enhanced Roadmap
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#ec4899" style={{ marginLeft: 8 }} />
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
      {null}

      {null}
    </SafeAreaView>
  );
};

export default PracticeHub; 