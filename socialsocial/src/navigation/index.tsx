// socialsocial/src/navigation/index.tsx

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator } from 'react-native';

import AuthScreen from '../screens/AuthScreen';
import PracticeHubScreen from '../screens/PracticeHubScreen';
import PracticeScreen from '../screens/PracticeScreen';
import VoicePracticeScreen from '../screens/VoicePracticeScreen';
import ABPracticeScreen from '../screens/ABPracticeScreen';
import StatsScreen from '../screens/StatsScreen';
import ProfileScreen from '../screens/ProfileScreen';

import {
  RootStackParamList,
  MainTabParamList,
  PracticeStackParamList,
} from './types';
import {
  getAccessToken,
  hydrateFromStorage,
} from '../store/tokens';

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
      <PracticeStack.Screen
        name="PracticeSession"
        component={PracticeScreen}
      />
      <PracticeStack.Screen
        name="VoicePracticeSession"
        component={VoicePracticeScreen}
      />
      <PracticeStack.Screen
        name="ABPracticeSession"
        component={ABPracticeScreen}
      />
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
          tabBarLabel: ({ color }) => (
            <Text style={{ color, fontSize: 12 }}>Stats</Text>
          ),
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

        if (!cancelled) {
          setInitialRoute(token ? 'Dashboard' : 'Auth');
        }
      } catch (e) {
        console.log('[NavigationRoot] bootstrap error', e);
        if (!cancelled) {
          // אם משהו נשבר בטעינה – ננחת פשוט על Auth
          setInitialRoute('Auth');
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  // בזמן הבוטסטרפינג – מסך לודינג קטן
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
        <RootStack.Screen name="Dashboard" component={MainTabsNavigator} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
