import { useRef } from 'react';
import { Animated } from 'react-native';

export function useCelebrate() {
  const pop = useRef(new Animated.Value(0)).current;
  const run = () => {
    pop.setValue(0);
    Animated.sequence([
      Animated.timing(pop, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(pop, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
  };
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  return { scale, run };
}


