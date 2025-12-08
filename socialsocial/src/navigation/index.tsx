// FILE: socialsocial/src/navigation/index.tsx
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator } from 'react-native';

import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import PracticeHubScreen from '../screens/PracticeHubScreen';
import PracticeScreen from '../screens/PracticeScreen';
import VoicePracticeScreen from '../screens/VoicePracticeScreen';
import ABPracticeScreen from '../screens/ABPracticeScreen';
import StatsScreen from '../screens/StatsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MissionRoadScreen from '../screens/MissionRoadScreen';
import FreePlayConfigScreen from '../screens/FreePlayConfigScreen';

import {
  RootStackParamList,
  MainTabParamList,
  PracticeStackParamList,
} from './types';
import { getAccessToken, hydrateFromStorage } from '../store/tokens';
import { useAppState } from '../store/appState';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const PracticeStack = createNativeStackNavigator<PracticeStackParamList>();

function PracticeStackNavigator() {
  return (
    <PracticeStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <PracticeStack.Screen name="PracticeHub" component={PracticeHubScreen} />
      <PracticeStack.Screen name="MissionRoad" component={MissionRoadScreen} />

      {/* NEW: FreePlay configuration */}
      <PracticeStack.Screen name="FreePlayConfig" component={FreePlayConfigScreen} />

      {/* Existing chat screen (used by missions + freeplay after config) */}
      <PracticeStack.Screen name="PracticeSession" component={PracticeScreen} />

      <PracticeStack.Screen
        name="VoicePracticeSession"
        component={VoicePracticeScreen}
      />
      <PracticeStack.Screen name="ABPracticeSession" component={ABPracticeScreen} />
    </PracticeStack.Navigator>
  );
}

function MainTabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1DB954',
        tabBarInactiveTintColor: '#ccc',
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#222',
        },
      }}
    >
      <Tab.Screen
        name="PracticeTab"
        component={PracticeStackNavigator}
        options={{
          title: 'Practice',
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 12 }}>Practice</Text>
          ),
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StatsScreen}
        options={{
          title: 'Stats',
          tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 12 }}>Stats</Text>,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 12 }}>Profile</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function NavigationRoot() {
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        console.log('[NavigationRoot] hydrating tokens…');
        await hydrateFromStorage();
        const token = getAccessToken();
        console.log('[NavigationRoot] token present?', !!token);

        if (!token) {
          if (!cancelled) {
            setInitialRoute('Auth');
          }
          return;
        }

        // Fetch app state to determine route
        console.log('[NavigationRoot] fetching app state…');
        const appState = await useAppState.getState().fetchAppState();

        if (cancelled) return;

        if (!appState) {
          // If fetch fails, default to Auth
          console.log('[NavigationRoot] appState fetch failed, routing to Auth');
          setInitialRoute('Auth');
        } else if (!appState.user.onboardingCompleted) {
          console.log('[NavigationRoot] onboarding incomplete, routing to Onboarding');
          setInitialRoute('Onboarding');
        } else if (!appState.user.profileCompleted) {
          console.log('[NavigationRoot] profile incomplete, routing to ProfileSetup');
          setInitialRoute('ProfileSetup');
        } else {
          console.log('[NavigationRoot] all complete, routing to Dashboard');
          setInitialRoute('Dashboard');
        }
      } catch (e) {
        console.log('[NavigationRoot] bootstrap error', e);
        if (!cancelled) {
          setInitialRoute('Auth');
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!initialRoute) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator />
        <Text style={{ marginTop: 12, color: '#fff' }}>Loading session…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
        }}
      >
        <RootStack.Screen name="Auth" component={AuthScreen} />
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        <RootStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <RootStack.Screen name="Dashboard" component={MainTabsNavigator} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
