// FILE: socialsocial/src/screens/PracticeHubScreen.tsx
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PracticeStackParamList } from '../navigation/types';
import { useRequireOnboardingComplete } from '../hooks/useRequireOnboardingComplete';

type Props = NativeStackScreenProps<PracticeStackParamList, 'PracticeHub'>;

export default function PracticeHubScreen({ navigation }: Props) {
  useRequireOnboardingComplete();
  const handleFreePlay = () => {
    navigation.navigate('FreePlayConfig');
  };

  const handleABPractice = () => {
    navigation.navigate('ABPracticeSession', { topic: 'Tinder A/B Practice' });
  };

  const handleMissionRoad = () => {
    navigation.navigate('MissionRoad');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Practice</Text>
      <Text style={styles.subtitle}>Choose how you want to train today.</Text>

      <View style={styles.grid}>
        {/* Free play – chat freely with AI */}
        <TouchableOpacity style={styles.card} onPress={handleFreePlay}>
          <Text style={styles.cardTag}>FREE PLAY</Text>
          <Text style={styles.cardTitle}>Chat Freely</Text>
          <Text style={styles.cardBody}>
            Build your own scenario: persona, style, difficulty, and place.
          </Text>
        </TouchableOpacity>

        {/* Tinder game – A/B */}
        <TouchableOpacity style={styles.card} onPress={handleABPractice}>
          <Text style={styles.cardTag}>TINDER GAME</Text>
          <Text style={styles.cardTitle}>Swipe &amp; Pick</Text>
          <Text style={styles.cardBody}>
            A/B style missions – choose the better line and learn what works.
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mission road – main story mode */}
      <TouchableOpacity style={styles.storyCard} onPress={handleMissionRoad}>
        <Text style={styles.cardTag}>MISSION ROAD</Text>
        <Text style={styles.storyTitle}>Main Story Mode</Text>
        <Text style={styles.cardBody}>
          Follow a long progression of missions. Start from the basics and climb
          through advanced scenarios.
        </Text>

        {/* Simple progress bar – real progression later from backend */}
        <View style={styles.progressBarOuter}>
          <View style={styles.progressBarInner} />
        </View>

        <Text style={styles.progressText}>Your journey starts here.</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    color: '#020617',
  },
  subtitle: {
    fontSize: 15,
    color: '#4b5563',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  card: {
    flex: 1,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#020617',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  cardTag: {
    fontSize: 11,
    letterSpacing: 1,
    color: '#6ee7b7',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 13,
    color: '#9ca3af',
  },
  storyCard: {
    marginTop: 8,
    borderRadius: 22,
    backgroundColor: '#020617',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  storyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f9fafb',
    marginBottom: 6,
  },
  progressBarOuter: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: '#111827',
    height: 8,
    overflow: 'hidden',
  },
  progressBarInner: {
    width: '30%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  progressText: {
    marginTop: 8,
    fontSize: 13,
    color: '#9ca3af',
  },
});
