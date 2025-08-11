import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

const StatPopup = ({
  visible,
  onClose,
  title,
  value,
  iconName,
  gradient = ['#22c55e33', '#06b6d433'],
  summary,
  trend,
  aiInsight,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }),
      ]).start();
    } else {
      opacity.setValue(0);
      scale.setValue(0.9);
    }
  }, [visible]);

  const progress = Math.floor(40 + Math.random() * 55);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          opacity,
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <Animated.View
          style={{
            transform: [{ scale }],
            borderRadius: 20,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.15)',
            alignSelf: 'center',
            width: '100%',
            maxWidth: 640,
            maxHeight: height * 0.85,
          }}
        >
          <LinearGradient colors={['rgba(30,41,59,0.97)', 'rgba(2,6,23,0.97)']} style={{ paddingBottom: 12 }}>
            {/* Header */}
            <View style={{ padding: 18, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <TouchableOpacity
                onPress={onClose}
                style={{ position: 'absolute', top: 14, right: 14, padding: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' }}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <LinearGradient
                  colors={gradient}
                  style={{ padding: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name={iconName} size={22} color="#fff" />
                </LinearGradient>
                <View>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 20 }}>{title}</Text>
                  {value ? <Text style={{ color: '#fff', fontWeight: '800', fontSize: 26, marginTop: 2 }}>{value}</Text> : null}
                </View>
              </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
              {/* Chart placeholder */}
              <View
                style={{
                  height: 120,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.10)',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 18,
                }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 10 }}>Interactive Chart</Text>
                <View style={{ width: '100%', height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                  <View
                    style={{
                      width: `${progress}%`,
                      height: '100%',
                      borderRadius: 999,
                      backgroundColor: '#22c55e',
                    }}
                  />
                </View>
              </View>

              {/* Summary */}
              <View>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginBottom: 6 }}>Summary</Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 20 }}>{summary}</Text>
              </View>

              {/* Weekly Trend */}
              <View>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginBottom: 6 }}>Weekly Trend</Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{trend}</Text>
              </View>

              {/* AI Insight */}
              <View
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(96,165,250,0.35)',
                  padding: 14,
                  backgroundColor: 'rgba(59,130,246,0.10)',
                }}
              >
                <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#3b82f6' }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>AI Insight</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14, marginTop: 6 }}>{aiInsight}</Text>
              </View>
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default StatPopup;


