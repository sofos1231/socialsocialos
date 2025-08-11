import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PracticeSessionCard from './PracticeSessionCard';
import styles from './PracticeCategoryCarouselStyles';
import theme from '../theme.js';

const { width } = Dimensions.get('window');
// 2025 scaling: slightly larger posters for immersive look
const CARD_WIDTH = Math.round(width * 0.82);
const CARD_SPACING = 16;
const GUTTER = 20;

const PracticeCategoryCarousel = ({ category, onSessionPress, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleScaleAnim = useRef(new Animated.Value(0.8)).current;
  const flatListRef = useRef(null);

  // Enhanced entrance animation with delay
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.spring(titleScaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const renderSessionCard = ({ item, index }) => (
    <PracticeSessionCard
      session={item}
      onPress={() => onSessionPress(category.id, item.id)}
      delay={delay + (index * 100)}
    />
  );

  const getItemLayout = (data, index) => ({
    length: CARD_WIDTH + CARD_SPACING,
    offset: (CARD_WIDTH + CARD_SPACING) * index,
    index,
  });

  const handlePrevious = () => {
    if (flatListRef.current) {
      // Scroll to previous item
      const currentIndex = Math.floor(
        (flatListRef.current._contentOffset || 0) / (CARD_WIDTH + CARD_SPACING)
      );
      const targetIndex = Math.max(0, currentIndex - 1);
      flatListRef.current.scrollToIndex({
        index: targetIndex,
        animated: true,
      });
    }
  };

  const handleNext = () => {
    if (flatListRef.current) {
      // Scroll to next item
      const currentIndex = Math.floor(
        (flatListRef.current._contentOffset || 0) / (CARD_WIDTH + CARD_SPACING)
      );
      const targetIndex = Math.min(
        category.sessions.length - 1,
        currentIndex + 1
      );
      flatListRef.current.scrollToIndex({
        index: targetIndex,
        animated: true,
      });
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Category Header */}
      <Animated.View
        style={[
          styles.categoryHeader,
          {
            transform: [{ scale: titleScaleAnim }],
          },
        ]}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${category.title}. ${category.subtitle}.`}
      >
        <View style={styles.categoryTitleContainer}>
          <View style={styles.categoryIconContainer}>
            <Ionicons
              name={category.icon}
              size={24}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.categoryTextContainer}>
            <Text style={styles.categoryTitle}>{category.title}</Text>
            <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Netflix-Style Carousel */}
      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={category.sessions}
          renderItem={renderSessionCard}
          keyExtractor={(item) => item.id}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_SPACING}
          snapToAlignment="start"
          decelerationRate="fast"
          contentInset={{ left: GUTTER, right: GUTTER }}
          contentContainerStyle={[styles.carouselContent, { paddingRight: GUTTER }]} // peek next card
          bounces={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={3}
          windowSize={5}
          initialNumToRender={2}
          getItemLayout={getItemLayout}
          // Ensure gesture hygiene
          directionalLockEnabled
          accessible
          accessibilityRole="list"
          accessibilityLabel={`Horizontal list of ${category.sessions.length} items. Swipe left or right to browse.`}
          ItemSeparatorComponent={() => <View style={{ width: CARD_SPACING }} />}
        />

        {/* Remove overlay arrows per spec; swipe + snap only */}
      </View>
    </Animated.View>
  );
};

export default PracticeCategoryCarousel; 