// FILE: socialsocial/src/hooks/useRequireOnboardingComplete.ts

import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAppState } from '../store/appState';

/**
 * Guard hook that redirects users away from protected screens
 * if onboarding or profile setup is not completed.
 * 
 * Should be called at the top of Practice/Mission/FreePlay screens.
 */
export function useRequireOnboardingComplete() {
  const navigation = useNavigation<any>();
  const appState = useAppState((s) => s.appState);

  useEffect(() => {
    // If appState is not loaded yet, do nothing (screen should handle loading state)
    if (!appState) {
      return;
    }

    // Check onboarding completion
    if (!appState.user.onboardingCompleted) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      });
      return;
    }

    // Check profile completion
    if (!appState.user.profileCompleted) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'ProfileSetup' }],
      });
    }
  }, [appState, navigation]);
}

