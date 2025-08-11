import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import styles from './BottomNavigationBarStyles';
import theme from '../theme.js';

const BottomNavigationBar = ({ currentTab = 'practice', onTabPress, progress = null }) => {
  const insets = useSafeAreaInsets();
  const tabs = [
    { id: 'practice', icon: 'home', label: 'Practice' },
    { id: 'stats', icon: 'bar-chart', label: 'Stats' },
    { id: 'shop', icon: 'bag', label: 'Shop' },
    { id: 'profile', icon: 'person', label: 'Profile' },
  ];

  const handleTabPress = (tabId) => {
    if (onTabPress) {
      onTabPress(tabId);
    }
  };

  // Layout + animation state
  const [containerWidth, setContainerWidth] = useState(0);
  const ICON_SIZE = 40;
  const PADDING_H = 14; // must match styles.container paddingHorizontal
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === currentTab));
  const animValue = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    const target = typeof progress === 'number' ? progress : activeIndex;
    animValue.setValue(target);
  }, [progress, activeIndex, animValue]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(8, insets.bottom),
          height: undefined,
        },
      ]}
    >
      {containerWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floatingHighlight,
            {
              left: PADDING_H + (containerWidth - PADDING_H * 2) / tabs.length / 2 - ICON_SIZE / 2,
              transform: [
                {
                  translateX: animValue.interpolate({
                    inputRange: tabs.map((_, i) => i),
                    outputRange: tabs.map((_, i) => i * ((containerWidth - PADDING_H * 2) / tabs.length)),
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />
      )}
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabButton}
            onPress={() => handleTabPress(tab.id)}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${tab.label} tab`}
            accessibilityState={{ selected: isActive }}
          >
            <View style={[styles.iconContainer]}>
              <Ionicons
                name={tab.icon}
                size={20}
                color={isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.6)'}
              />
            </View>
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      {/* onLayout to measure container width for correct highlight travel */}
      <View style={{ position: 'absolute', inset: 0 }} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)} />
    </View>
  );
};

export default BottomNavigationBar; 