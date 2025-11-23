// socialsocial/App.tsx

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NavigationRoot from './src/navigation';
import './src/utils/networkDebug';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationRoot />
    </SafeAreaProvider>
  );
}
