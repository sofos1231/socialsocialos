// socialsocial/src/navigation/index.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

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
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tab.Screen
        name="PracticeTab"
        component={PracticeStackNavigator}
        options={{
          title: 'Practice',
          tabBarLabel: 'Practice',
          tabBarIcon: () => <Text>💬</Text>,
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StatsScreen}
        options={{
          title: 'Stats',
          tabBarLabel: 'Stats',
          tabBarIcon: () => <Text>📊</Text>,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: () => <Text>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function NavigationRoot() {
  return (
    <NavigationContainer>
      <RootStack.Navigator
        initialRouteName="Auth"
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
