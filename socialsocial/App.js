import React, { useRef, useState } from 'react';
import Providers from './src/app/Providers';
import Root from './src/app/Root';
import { View, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomNavigationBar from './components/BottomNavigationBar';
import PracticeHub from './components/PracticeHub';
import PracticeRoad from './screens/PracticeRoad';
import EnhancedRoadmapScreen from './screens/EnhancedRoadmapScreen';
import StatsScreen from './components/StatsScreen';
import MissionScreen from './components/MissionScreen';
import MissionSessionScreen from './screens/MissionSessionScreen';
import ShopScreen from './components/ShopScreen';
import ProfileScreen from './components/ProfileScreen';
import SwipePager from './components/SwipePager';
import StreakScreen from './screens/StreakScreen';
import { PlayerProgressProvider } from './src/state/playerProgress';

    const TABS = ['practice', 'stats', 'shop', 'profile'];
const indexFromTab = (tab) => Math.max(0, TABS.indexOf(tab));
const tabFromIndex = (i) => TABS[Math.max(0, Math.min(TABS.length - 1, i))];

export default function App() {
  const [currentTab, setCurrentTab] = useState('practice');
  const [showMission, setShowMission] = useState(false);
  const [showPracticeRoad, setShowPracticeRoad] = useState(false);
  const [pagerProgress, setPagerProgress] = useState(0); // 0..(tabs-1)
  const [showStreakScreen, setShowStreakScreen] = useState(false);
  const [showEnhancedRoadmap, setShowEnhancedRoadmap] = useState(false);
  const pagerRef = useRef(null);

  const handleTabPress = (tabName) => {
    setCurrentTab(tabName);
    console.log(`Switched to ${tabName} tab`);
  };

  const pagerIndex = indexFromTab(currentTab);

  // Mock navigation object for MissionScreen
  const mockNavigation = {
    goBack: () => setShowMission(false)
  };

  // Mock navigation object for PracticeRoad
  const mockRoadNavigation = {
    goBack: () => setShowPracticeRoad(false)
  };

  if (showMission) {
    return (
      <SafeAreaProvider>
        <MissionSessionScreen navigation={mockNavigation} />
      </SafeAreaProvider>
    );
  }

  if (showPracticeRoad) {
    return (
      <SafeAreaProvider>
        <PracticeRoad navigation={mockRoadNavigation} />
      </SafeAreaProvider>
    );
  }

  if (showEnhancedRoadmap) {
    return (
      <SafeAreaProvider>
        <EnhancedRoadmapScreen onShowStreak={() => setShowStreakScreen(true)} />
      </SafeAreaProvider>
    );
  }

  if (showStreakScreen) {
    return (
      <SafeAreaProvider>
        <StreakScreen onClose={() => setShowStreakScreen(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <Providers>
      <PlayerProgressProvider>
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
          <LinearGradient
            colors={["#0B0D12", "#0E1118"]}
            style={styles.background}
          >
            <Root />
          </LinearGradient>
        </View>
      </SafeAreaProvider>
      </PlayerProgressProvider>
    </Providers>
  );
}

    const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        flex: 1,
    },
    content: {
      flex: 1,
      // No extra top padding; TransparentTopBar in PracticeHub handles safe-area spacing
    },
          placeholderContent: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          },
          practiceContainer: {
            flex: 1,
          },
          missionButton: {
            backgroundColor: '#6366f1',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 8,
            margin: 20,
            alignSelf: 'center',
          },
          missionButtonText: {
            color: '#ffffff',
            fontSize: 16,
            fontWeight: '600',
          },
}); 