import React, { useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  Animated,
  Dimensions,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SectionHeader from './SectionHeader';
import PracticeItemCard from './PracticeItemCard';
import styles from './PracticeRoadStyles';

const { height } = Dimensions.get('window');

const PracticeRoad = ({ onSectionPress }) => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerScaleAnim = useRef(new Animated.Value(0.8)).current;

  // Demo data for training sections with practice items
  const trainingSections = [
    {
      id: 'dating',
      title: "Dating & Romance",
      subtitle: "Master the art of romantic connections",
      icon: "heart",
      isActive: true,
      practiceItems: [
        {
          id: 'openers',
          title: "Opening Lines",
          subtitle: "Start conversations with confidence",
          status: 'unlocked',
          icon: 'chatbubbles-outline',
          xp: 50,
        },
        {
          id: 'push-pull',
          title: "Push & Pull",
          subtitle: "Create attraction through tension",
          status: 'unlocked',
          icon: 'swap-horizontal-outline',
          xp: 75,
        },
        {
          id: 'voice-training',
          title: "Voice Training",
          subtitle: "Master your vocal presence",
          status: 'in-progress',
          icon: 'mic-outline',
          xp: 100,
          progress: 65,
        },
        {
          id: 'body-language',
          title: "Body Language",
          subtitle: "Non-verbal communication mastery",
          status: 'locked',
          icon: 'person-outline',
          xp: 125,
        },
      ],
    },
    {
      id: 'interviews',
      title: "Job Interviews",
      subtitle: "Nail your next opportunity",
      icon: "briefcase",
      isActive: false,
      practiceItems: [
        {
          id: 'self-intro',
          title: "Self Introduction",
          subtitle: "Make a memorable first impression",
          status: 'unlocked',
          icon: 'person-outline',
          xp: 60,
        },
        {
          id: 'behavioral',
          title: "Behavioral Questions",
          subtitle: "Answer with STAR method",
          status: 'locked',
          icon: 'help-circle-outline',
          xp: 80,
        },
        {
          id: 'salary-negotiation',
          title: "Salary Negotiation",
          subtitle: "Get the compensation you deserve",
          status: 'locked',
          icon: 'trending-up-outline',
          xp: 120,
        },
      ],
    },
    {
      id: 'confidence',
      title: "Social Confidence",
      subtitle: "Train your charisma & presence",
      icon: "chatbubbles",
      isActive: false,
      practiceItems: [
        {
          id: 'eye-contact',
          title: "Eye Contact",
          subtitle: "Build connection through gaze",
          status: 'completed',
          icon: 'eye-outline',
          xp: 40,
        },
        {
          id: 'active-listening',
          title: "Active Listening",
          subtitle: "Show genuine interest",
          status: 'unlocked',
          icon: 'ear-outline',
          xp: 55,
        },
        {
          id: 'storytelling',
          title: "Storytelling",
          subtitle: "Captivate with your narratives",
          status: 'locked',
          icon: 'book-outline',
          xp: 90,
        },
      ],
    },
    {
      id: 'networking',
      title: "Professional Networking",
      subtitle: "Build meaningful business relationships",
      icon: "people",
      isActive: false,
      practiceItems: [
        {
          id: 'elevator-pitch',
          title: "Elevator Pitch",
          subtitle: "Introduce yourself in 30 seconds",
          status: 'unlocked',
          icon: 'rocket-outline',
          xp: 70,
        },
        {
          id: 'follow-up',
          title: "Follow-up Messages",
          subtitle: "Maintain connections",
          status: 'locked',
          icon: 'mail-outline',
          xp: 85,
        },
      ],
    },
    {
      id: 'public-speaking',
      title: "Public Speaking",
      subtitle: "Command attention with confidence",
      icon: "mic",
      isActive: false,
      practiceItems: [
        {
          id: 'speech-structure',
          title: "Speech Structure",
          subtitle: "Organize your thoughts",
          status: 'locked',
          icon: 'list-outline',
          xp: 95,
        },
        {
          id: 'delivery',
          title: "Delivery Techniques",
          subtitle: "Master your presentation style",
          status: 'locked',
          icon: 'volume-high-outline',
          xp: 110,
        },
      ],
    },
  ];

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
  }, []);

  const handleSectionPress = (sectionId) => {
    console.log(`Section pressed: ${sectionId}`);
    if (onSectionPress) {
      onSectionPress(sectionId);
    }
  };

  const handlePracticeItemPress = (sectionId, itemId) => {
    console.log(`Practice item pressed: ${sectionId} - ${itemId}`);
    // Placeholder for future navigation or action
    // This will be replaced with actual navigation logic
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim }
      ]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={true}
        alwaysBounceVertical={false}
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={0}
        snapToOffsets={[]}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={3}
      >
        {/* Enhanced Header Section */}
        <Animated.View 
          style={[
            styles.headerSection,
            {
              transform: [{ scale: headerScaleAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)']}
            style={styles.headerBackground}
          >
            <Animated.Text style={styles.headerTitle}>
              Practice Hub
            </Animated.Text>
            <Animated.Text style={styles.headerSubtitle}>
              Choose your training path
            </Animated.Text>
          </LinearGradient>
        </Animated.View>

        {/* Training Sections with Enhanced Animations */}
        <View style={styles.sectionsContainer}>
          {trainingSections.map((section, index) => (
            <Animated.View
              key={section.id}
              style={[
                styles.sectionWrapper,
                {
                  transform: [{
                    translateY: scrollY.interpolate({
                      inputRange: [-1, 0, height * 0.3, height],
                      outputRange: [0, 0, 0, 0],
                      extrapolate: 'clamp',
                    })
                  }]
                }
              ]}
            >
              <SectionHeader
                title={section.title}
                subtitle={section.subtitle}
                icon={section.icon}
                isActive={section.isActive}
                onPress={() => handleSectionPress(section.id)}
              />
              
              {/* Enhanced Practice Items */}
              <View style={styles.practiceItemsContainer}>
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.02)']}
                  style={styles.practiceItemsBackground}
                >
                  <View style={styles.practiceItemsContent}>
                    {section.practiceItems && section.practiceItems.length > 0 ? (
                      section.practiceItems.map((item, itemIndex) => (
                        <PracticeItemCard
                          key={item.id}
                          title={item.title}
                          subtitle={item.subtitle}
                          status={item.status}
                          icon={item.icon}
                          xp={item.xp}
                          progress={item.progress}
                          onPress={() => handlePracticeItemPress(section.id, item.id)}
                          delay={itemIndex * 120} // Enhanced staggered animation
                        />
                      ))
                    ) : (
                      <Animated.View 
                        style={[
                          styles.comingSoonContainer,
                          { opacity: fadeAnim }
                        ]}
                      >
                        <Text style={styles.comingSoonText}>Coming Soon...</Text>
                      </Animated.View>
                    )}
                  </View>
                </LinearGradient>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Enhanced bottom spacing for smooth scrolling */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </Animated.View>
  );
};

export default PracticeRoad; 