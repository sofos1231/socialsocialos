import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MissionPreviewModal from './MissionPreviewModal';
import theme from '../theme.js';

const MissionPreviewDemo = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentMission, setCurrentMission] = useState(null);

  const demoMissions = [
    {
      id: 1,
      title: 'Flirt Like a Pro',
      subtitle: 'Learn how to deliver a bold line under pressure',
      difficulty: 'Beginner',
      timeEstimate: '2 min',
      xpReward: 20,
      isLocked: false,
    },
    {
      id: 2,
      title: 'Confidence Boost',
      subtitle: 'Master the art of confident body language',
      difficulty: 'Intermediate',
      timeEstimate: '5 min',
      xpReward: 35,
      isLocked: false,
    },
    {
      id: 3,
      title: 'Advanced Charisma',
      subtitle: 'Unlock your natural charisma and charm',
      difficulty: 'Advanced',
      timeEstimate: '8 min',
      xpReward: 50,
      isLocked: true,
      lockMessage: 'Complete 5 intermediate missions to unlock',
    },
    {
      id: 4,
      title: 'Social Butterfly',
      subtitle: 'Navigate group conversations with ease',
      difficulty: 'Intermediate',
      timeEstimate: '6 min',
      xpReward: 40,
      isLocked: false,
    },
  ];

  const handleMissionPress = (mission) => {
    setCurrentMission(mission);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setCurrentMission(null);
  };

  const handleStartMission = () => {
    console.log('Starting mission:', currentMission?.title);
    // Here you would typically navigate to the mission screen
    handleCloseModal();
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return theme.colors.success;
      case 'intermediate':
        return theme.colors.warning;
      case 'advanced':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const getDifficultyGradient = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return ['#22c55e', '#16a34a'];
      case 'intermediate':
        return ['#f59e0b', '#d97706'];
      case 'advanced':
        return ['#ef4444', '#dc2626'];
      default:
        return [theme.colors.primary, '#8b5cf6'];
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mission Preview Demo</Text>
        <Text style={styles.headerSubtitle}>Tap any mission to see the modal</Text>
      </View>

      {/* Mission Cards */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.missionsContainer}>
          {demoMissions.map((mission) => (
            <TouchableOpacity
              key={mission.id}
              style={styles.missionCard}
              onPress={() => handleMissionPress(mission)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={mission.isLocked 
                  ? ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']
                  : ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                }
                style={styles.cardGradient}
              >
                {/* Mission Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.titleContainer}>
                    <Text style={[
                      styles.missionTitle,
                      mission.isLocked && styles.lockedTitle
                    ]}>
                      {mission.title}
                    </Text>
                    <Text style={[
                      styles.missionSubtitle,
                      mission.isLocked && styles.lockedSubtitle
                    ]}>
                      {mission.subtitle}
                    </Text>
                  </View>
                  
                  {mission.isLocked ? (
                    <View style={styles.lockIcon}>
                      <Ionicons name="lock-closed" size={24} color={theme.colors.textMuted} />
                    </View>
                  ) : (
                    <View style={styles.playIcon}>
                      <Ionicons name="play-circle" size={32} color={theme.colors.primary} />
                    </View>
                  )}
                </View>

                {/* Mission Tags */}
                <View style={styles.cardTags}>
                  <LinearGradient
                    colors={getDifficultyGradient(mission.difficulty)}
                    style={styles.difficultyTag}
                  >
                    <Text style={styles.difficultyText}>{mission.difficulty}</Text>
                  </LinearGradient>
                  
                  <View style={styles.timeTag}>
                    <Ionicons name="time-outline" size={14} color={theme.colors.textMuted} />
                    <Text style={styles.timeText}>{mission.timeEstimate}</Text>
                  </View>
                  
                  <View style={styles.xpTag}>
                    <Ionicons name="star" size={14} color={theme.colors.textSecondary} />
                    <Text style={styles.xpText}>+{mission.xpReward} XP</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Mission Preview Modal */}
      <MissionPreviewModal
        visible={modalVisible}
        mission={currentMission}
        onClose={handleCloseModal}
        onStartMission={handleStartMission}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  header: {
    padding: theme.spacing.xxl,
    paddingTop: theme.spacing.xxxl,
    alignItems: 'center',
  },
  
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  
  scrollView: {
    flex: 1,
  },
  
  missionsContainer: {
    padding: theme.spacing.xxl,
    gap: theme.spacing.lg,
  },
  
  missionCard: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.primary,
  },
  
  cardGradient: {
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  
  titleContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  
  missionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  
  lockedTitle: {
    color: theme.colors.textMuted,
  },
  
  missionSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  
  lockedSubtitle: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  
  lockIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  playIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  
  difficultyTag: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    minWidth: 70,
    alignItems: 'center',
  },
  
  difficultyText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: theme.spacing.xs,
  },
  
  timeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.text,
  },
  
  xpTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    gap: theme.spacing.xs,
  },
  
  xpText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
});

export default MissionPreviewDemo; 