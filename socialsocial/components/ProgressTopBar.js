import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme.js';

const { width } = Dimensions.get('window');

const ProgressTopBar = ({
  title,
  chapterNumber,
  completedMissions,
  totalMissions,
  totalXP,
  icon,
  onBack,
}) => {
  const progressPercentage = (completedMissions / totalMissions) * 100;

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.6)', 'transparent']}
        style={styles.backgroundGradient}
      />
      
      {/* Content */}
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
            style={styles.backButtonGradient}
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Center Content */}
        <View style={styles.centerContent}>
          {/* Chapter Icon */}
          <View style={styles.chapterIconContainer}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryGlow]}
              style={styles.chapterIconGradient}
            >
              <Ionicons name={icon} size={20} color="#ffffff" />
            </LinearGradient>
          </View>

          {/* Title and Chapter */}
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.chapterText}>
              Chapter {chapterNumber}
            </Text>
          </View>
        </View>

        {/* Progress Stats */}
        <View style={styles.statsContainer}>
          {/* XP Display */}
          <View style={styles.xpContainer}>
            <LinearGradient
              colors={['#fbbf24', '#f59e0b']}
              style={styles.xpGradient}
            >
              <Ionicons name="star" size={16} color="#ffffff" />
              <Text style={styles.xpText}>{totalXP}</Text>
            </LinearGradient>
          </View>

          {/* Progress Display */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {completedMissions}/{totalMissions}
            </Text>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercentage}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Border */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.1)', 'transparent']}
        style={styles.bottomBorder}
      />
    </View>
  );
};

const styles = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: 50, // Safe area
    paddingBottom: 16,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 80,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  centerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chapterIconContainer: {
    marginRight: 12,
  },
  chapterIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  chapterText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  xpContainer: {
    marginBottom: 8,
  },
  xpGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  xpText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    marginBottom: 4,
  },
  progressBarContainer: {
    width: 60,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  bottomBorder: {
    height: 1,
    marginTop: 16,
  },
};

export default ProgressTopBar;
