import React from 'react';
import AuthGate from './AuthGate';
import { AuthScreen } from './screens/AuthScreen';
import { AppNavigator } from './nav/AppNavigator';

export default function Root() {
  return (
    <AuthGate AuthScreen={AuthScreen}>
      <AppNavigator />
    </AuthGate>
  );
}


