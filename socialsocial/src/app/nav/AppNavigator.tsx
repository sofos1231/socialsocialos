import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navRef } from './NavigationService';
import { AuthScreen } from '../screens/AuthScreen';
import WalletScreen from '../screens/WalletScreen';
import MissionsScreen from '../screens/MissionsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator initialRouteName="Wallet">
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="Missions" component={MissionsScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


