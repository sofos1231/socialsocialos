    import React, { useRef, useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomNavigationBar from './components/BottomNavigationBar';
import PracticeHub from './components/PracticeHub';
import PracticeRoad from './screens/PracticeRoad';
import StatsScreen from './components/StatsScreen';
import MissionScreen from './components/MissionScreen';
import ShopScreen from './components/ShopScreen';
import ProfileScreen from './components/ProfileScreen';
import SwipePager from './components/SwipePager';

    const TABS = ['practice', 'stats', 'shop', 'profile'];
const indexFromTab = (tab) => Math.max(0, TABS.indexOf(tab));
const tabFromIndex = (i) => TABS[Math.max(0, Math.min(TABS.length - 1, i))];

export default function App() {
  const [currentTab, setCurrentTab] = useState('practice');
  const [showMission, setShowMission] = useState(false);
  const [showPracticeRoad, setShowPracticeRoad] = useState(false);
  const [pagerProgress, setPagerProgress] = useState(0); // 0..(tabs-1)
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
        <MissionScreen navigation={mockNavigation} />
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

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={["#0B0D12", "#0E1118"]} // subtle dark navy gradient
          style={styles.background}
        >
          <View style={styles.content}>
            <SwipePager
              index={pagerIndex}
              onIndexChange={(i) => setCurrentTab(tabFromIndex(i))}
              onProgress={(f) => setPagerProgress(f)}
            >
              <View style={styles.practiceContainer}>
                <PracticeHub onShowPracticeRoad={() => setShowPracticeRoad(true)} />
              </View>
              <StatsScreen />
              <ShopScreen />
              <ProfileScreen />
            </SwipePager>
          </View>
          <BottomNavigationBar 
            currentTab={currentTab}
            onTabPress={handleTabPress}
            progress={pagerProgress}
          />
        </LinearGradient>
      </View>
    </SafeAreaProvider>
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