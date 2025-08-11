import React, { useRef } from 'react';
import { View, Text, TouchableWithoutFeedback, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const StatTile = ({
  title,
  value,
  iconName,
  borderColor = '#ffffff22',
  glowColor = 'rgba(255,255,255,0.25)',
  size,
  onPress,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  };

  return (
    <TouchableWithoutFeedback onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: 16,
          transform: [{ scale }],
          borderWidth: 2,
          borderColor,
          overflow: 'hidden',
          shadowColor: glowColor,
          shadowOpacity: 0.45,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
          backgroundColor: 'transparent',
        }}
      >
        <LinearGradient
          colors={['rgba(30,41,59,0.9)', 'rgba(2,6,23,0.92)']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' }}
        >
          {/* soft glass highlight */}
          <LinearGradient
            colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)']}
            style={{
              position: 'absolute',
              top: 1,
              left: 1,
              right: 1,
              height: 18,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              opacity: 0.7,
            }}
          />
          <View
            style={{
              marginBottom: 10,
              padding: 10,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.07)',
            }}
          >
            <Ionicons name={iconName} size={24} color="#ffffff" />
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 13, textAlign: 'center' }}>
            {title}
          </Text>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 22, marginTop: 4 }}>{value}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default StatTile;


