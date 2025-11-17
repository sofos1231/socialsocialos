import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import EnhancedMissionBubble from '../components/EnhancedMissionBubble';
import AnimatedConnectorTrail from '../components/AnimatedConnectorTrail';
import BackgroundParticles from '../components/BackgroundParticles';
import BackgroundChapterArt from '../components/BackgroundChapterArt';
// Removed legacy ProgressTopBar in favor of global TopBar
import MissionPopup from '../components/MissionPopup';
import RewardPopup from '../components/RewardPopup';
import CelebrationOverlay from '../components/CelebrationOverlay';
import CoachCharacter from '../components/CoachCharacter';
import theme from '../theme.js';
import { tagGoldMilestones } from '../src/mission/milestones';
import ProfileTopBar from '../src/components/ProfileTopBar';
import { usePlayerProgress } from '../src/state/playerProgress';

const { width, height } = Dimensions.get('window');

const PracticeRoad = ({ navigation }) => {
  const { category } = navigation?.route?.params || { category: 'dating' };
  
  const [selectedMission, setSelectedMission] = useState(null);
  const [showMissionPopup, setShowMissionPopup] = useState(false);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [rewardData, setRewardData] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState('mission');
  const [showCoach, setShowCoach] = useState(true);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Get mission data based on category
  const getMissionData = () => {
    switch (category) {
      case 'dating':
        return {
          title: 'Dating & Romance',
          chapterNumber: 1,
          icon: 'heart',
          color: ['#ec4899', '#ef4444'],
          missions: [
            {
              id: 1,
              title: "Flirty Hello",
              description: "Master the art of an engaging first impression",
              type: 'chat',
              duration: '3 min',
              xpReward: 50,
              status: 'completed',
              difficulty: 'easy'
            },
            {
              id: 2,
              title: "Playful Disagreement",
              description: "Navigate disagreements with charm and wit",
              type: 'chat',
              duration: '4 min',
              xpReward: 75,
              status: 'completed',
              difficulty: 'easy'
            },
            {
              id: 3,
              title: "Reading the Room",
              description: "Pick up on subtle social cues and respond appropriately",
              type: 'chat',
              duration: '5 min',
              xpReward: 100,
              status: 'completed',
              difficulty: 'medium'
            },
            {
              id: 4,
              title: "Storytelling Magic",
              description: "Captivate with engaging personal anecdotes",
              type: 'chat',
              duration: '6 min',
              xpReward: 125,
              status: 'completed',
              difficulty: 'medium'
            },
            {
              id: 5,
              title: "Confident Compliments",
              description: "Give genuine compliments that create connection",
              type: 'chat',
              duration: '4 min',
              xpReward: 100,
              status: 'completed',
              difficulty: 'medium'
            },
            {
              id: 6,
              title: "Handling Awkward Silence",
              description: "Turn uncomfortable pauses into opportunities",
              type: 'chat',
              duration: '5 min',
              xpReward: 150,
              status: 'completed',
              difficulty: 'hard'
            },
            {
              id: 7,
              title: "Teasing & Banter",
              description: "Master playful conversation dynamics",
              type: 'premium',
              duration: '7 min',
              xpReward: 200,
              status: 'current',
              difficulty: 'hard'
            },
            {
              id: 8,
              title: "Deep Connection",
              description: "Move beyond surface-level conversation",
              type: 'chat',
              duration: '8 min',
              xpReward: 175,
              status: 'locked',
              difficulty: 'hard'
            },
            {
              id: 9,
              title: "The Perfect Exit",
              description: "End conversations memorably and gracefully",
              type: 'chat',
              duration: '4 min',
              xpReward: 125,
              status: 'locked',
              difficulty: 'medium'
            },
            {
              id: 10,
              title: "Video: Convince Her You're Not Boring",
              description: "Put it all together in a real conversation challenge",
              type: 'boss',
              duration: '3 min',
              xpReward: 300,
              status: 'locked',
              difficulty: 'hard'
            }
          ]
        };
      case 'interview':
        return {
          title: 'Job Interviews',
          chapterNumber: 2,
          icon: 'briefcase',
          color: ['#3b82f6', '#6366f1'],
          missions: [
            {
              id: 11,
              title: "Perfect Introduction",
              description: "Make a strong first impression in interviews",
              type: 'chat',
              duration: '4 min',
              xpReward: 60,
              status: 'available',
              difficulty: 'easy'
            },
            {
              id: 12,
              title: "Answering Tough Questions",
              description: "Handle challenging interview questions with confidence",
              type: 'chat',
              duration: '6 min',
              xpReward: 100,
              status: 'locked',
              difficulty: 'medium'
            },
            {
              id: 13,
              title: "Salary Negotiation",
              description: "Get the compensation you deserve",
              type: 'premium',
              duration: '8 min',
              xpReward: 200,
              status: 'locked',
              difficulty: 'hard'
            }
          ]
        };
      case 'charisma':
        return {
          title: 'Charisma & Social Skills',
          chapterNumber: 3,
          icon: 'sparkles',
          color: ['#a855f7', '#ec4899'],
          missions: [
            {
              id: 21,
              title: "Commanding Presence",
              description: "Enter any room with confidence and authority",
              type: 'chat',
              duration: '5 min',
              xpReward: 75,
              status: 'available',
              difficulty: 'medium'
            },
            {
              id: 22,
              title: "Leading Conversations",
              description: "Guide group discussions naturally",
              type: 'chat',
              duration: '7 min',
              xpReward: 125,
              status: 'locked',
              difficulty: 'hard'
            }
          ]
        };
      default:
        return {
          title: 'Practice Road',
          chapterNumber: 1,
          icon: 'people',
          color: ['#64748b', '#475569'],
          missions: []
        };
    }
  };

  const { title, chapterNumber, icon: categoryIcon, color, missions } = getMissionData();
  tagGoldMilestones(missions);

  const completedMissions = missions.filter(m => m.status === 'completed').length;
  const totalMissions = missions.length;
  const progressPercentage = (completedMissions / totalMissions) * 100;
  const totalXP = missions.reduce((sum, m) => m.status === 'completed' ? sum + m.xpReward : sum, 0);

  const generateWavyPositions = () => {
    const centerX = width * 0.5; // Center of screen
    const amplitude = width * 0.18; // Increase wave amplitude for wider separation
    const frequency = 0.7; // Wave frequency
    const stepY = 150; // Increase vertical spacing between missions
    
    return missions.map((_, index) => {
      const y = index * stepY + 120;
      const waveOffset = Math.sin(index * frequency) * amplitude;
      const x = centerX + waveOffset;
      return { x, y };
    });
  };

  const positions = generateWavyPositions();
  const totalHeight = positions[positions.length - 1]?.y + 280 || 800;

  const handleMissionTap = (mission) => {
    setSelectedMission(mission);
    setShowMissionPopup(true);
  };

  const handleStartMission = (mission) => {
    setShowMissionPopup(false);
    
    // For now, just show a console log since we don't have navigation set up
    console.log(`Starting mission: ${mission.title}`);
    
    // Simulate mission completion after a delay
    setTimeout(() => {
      handleMissionComplete(mission);
    }, 1000);
  };

  const handleMissionComplete = (mission) => {
    setRewardData({ xp: mission.xpReward, title: mission.title });
    setShowRewardPopup(true);
  };

  // Determine next mission to suggest/open
  const getNextMission = () => {
    const current = missions.find(m => m.status === 'current');
    if (current) return current;
    const available = missions.find(m => m.status === 'available');
    if (available) return available;
    const firstLocked = missions.find(m => m.status === 'locked');
    return firstLocked || missions[0];
  };

  const handleCoachTap = () => {
    const next = getNextMission();
    if (next) {
      setSelectedMission(next);
      setShowMissionPopup(true);
      // Optionally keep the coach visible; for now, keep it
    }
  };

  const getCoachMessage = () => {
    if (progressPercentage === 100) return "Amazing! Chapter complete!";
    if (progressPercentage > 50) return "You're crushing it!";
    const next = getNextMission();
    if (!next) return "Ready for your next mission?";
    if (next.title.toLowerCase().includes('teasing')) return "💬 Unlock Teasing & Banter?";
    if (next.title.toLowerCase().includes('deep')) return "💖 Ready to build a deeper bond?";
    return `Ready for ${next.title}?`;
  };

  const getCoachMood = () => {
    if (progressPercentage === 100) return "celebrating";
    if (progressPercentage > 50) return "excited";
    return "encouraging";
  };

  const progress = usePlayerProgress();
  return (
    <View style={styles.container}>
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
          onPressStreak={() => {}}
        />
      </View>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      {/* Subtle background chapter art and particles */}
      <BackgroundChapterArt category={category} />
      <BackgroundParticles />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* Progress header removed; TopBar used globally */}

        {/* Scrollable Mission Road */}
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={[styles.scrollContent, { height: totalHeight }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Connector path disabled per request */}

          {/* Mission Bubbles */}
          {missions.map((mission, index) => {
            const isNewlyUnlocked = mission.status === 'available' && index > 0 && missions[index - 1].status === 'completed';
            const hasStreakBonus = completedMissions >= 3 && mission.status === 'current';
            
            return (
              <EnhancedMissionBubble
                key={mission.id}
                mission={mission}
                position={positions[index]}
                onTap={handleMissionTap}
                showNewTag={isNewlyUnlocked}
                streakBonus={hasStreakBonus}
              />
            );
          })}

          {/* Chapter Complete Celebration */}
          {progressPercentage === 100 && (
            <View style={styles.chapterCompleteContainer}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.1)', 'rgba(5, 150, 105, 0.1)']}
                style={styles.chapterCompleteGradient}
              >
                <View style={styles.chapterCompleteIcon}>
                  <Text style={styles.chapterCompleteEmoji}>🏆</Text>
                </View>
                <Text style={styles.chapterCompleteTitle}>
                  Chapter Complete! 🎉
                </Text>
                <Text style={styles.chapterCompleteDescription}>
                  You've mastered the fundamentals of {title.toLowerCase()}. Ready for the next adventure?
                </Text>
                                 <TouchableOpacity 
                   style={styles.chapterCompleteButton}
                   onPress={() => console.log('Navigate to next chapter')}
                 >
                                     <LinearGradient
                     colors={[theme.colors.primary, theme.colors.primaryGlow]}
                     style={styles.chapterCompleteButtonGradient}
                   >
                    <Text style={styles.chapterCompleteButtonText}>
                      Continue to Chapter {chapterNumber + 1}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}
        </ScrollView>

        {/* Coach Character pinned to bottom with close button */}
        {showCoach && (
          <CoachCharacter
            message={getCoachMessage()}
            mood={getCoachMood()}
            position="center"
            showClose
            onClose={() => setShowCoach(false)}
            onTap={handleCoachTap}
          />
        )}
      </Animated.View>

      {/* Mission Popup */}
      <MissionPopup
        isVisible={showMissionPopup}
        onClose={() => setShowMissionPopup(false)}
        mission={selectedMission}
        onStartMission={handleStartMission}
      />

      {/* Reward Popup */}
      <RewardPopup
        isVisible={showRewardPopup}
        onClose={() => setShowRewardPopup(false)}
        xpGained={rewardData?.xp || 0}
        missionTitle={rewardData?.title || ''}
        streakBonus={completedMissions >= 3 ? 25 : 0}
      />

      {/* Celebration Overlay */}
      <CelebrationOverlay
        isVisible={showCelebration}
        type={celebrationType}
        onComplete={() => setShowCelebration(false)}
      />
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    paddingTop: 96, // Space for top bar
  },
  scrollContent: {
    paddingBottom: 80,
  },
  roadmapPath: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  chapterCompleteContainer: {
    marginTop: 32,
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  chapterCompleteGradient: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  chapterCompleteIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  chapterCompleteEmoji: {
    fontSize: 32,
  },
  chapterCompleteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.foreground,
    marginBottom: 8,
    textAlign: 'center',
  },
  chapterCompleteDescription: {
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  chapterCompleteButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  chapterCompleteButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  chapterCompleteButtonText: {
    color: theme.colors.primaryForeground,
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
};

export default PracticeRoad;
