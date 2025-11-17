// socialsocial/src/app/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navRef } from './NavigationService';
import AuthScreen from '../screens/AuthScreen';      // ✅ go up one level to src/screens
import WalletScreen from '../screens/WalletScreen';
import MissionsScreen from '../screens/MissionsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator initialRouteName="Wallet">
        <Stack.Screen
          name="Auth"
          component={AuthScreen}                      // ✅ valid React component
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="Missions" component={MissionsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
