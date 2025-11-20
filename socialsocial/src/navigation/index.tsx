// socialsocial/src/navigation/index.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AuthScreen from '../app/screens/AuthScreen';
import DashboardScreen from '../screens/DashboardScreen';
import PracticeScreen from '../screens/PracticeScreen';

export type RootStackParamList = {
  Auth: undefined;
  Dashboard: undefined;
  Practice: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function NavigationRoot() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="Auth"
      >
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Practice" component={PracticeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
