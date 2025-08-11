import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatTile from './StatTile';
import StatPopup from './StatPopup';

const { width } = Dimensions.get('window');
const H_GAP = 12;
const SIDE = Math.floor((width - 24 - H_GAP) / 2);

const StatsScreen = () => {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const statTiles = useMemo(
    () => [
      {
        id: 'confidence',
        title: 'Confidence',
        value: '92%',
        iconName: 'trophy',
        borderColor: '#FBBF2466',
        glowColor: 'rgba(251,191,36,0.35)',
        gradient: ['#FBBF2433', '#D9770633'],
        summary:
          'Your confidence level has been consistently high this week, with strong vocal projection and assertive language patterns.',
        trend: 'Confidence peaked during afternoon meetings (↑8% vs morning sessions)',
        aiInsight:
          'You tend to sound most confident when discussing technical topics. Try bringing this energy to casual conversations too!',
      },
      {
        id: 'filler-words',
        title: 'Filler Words',
        value: '4/min',
        iconName: 'chatbubble-ellipses',
        borderColor: '#FB923C66',
        glowColor: 'rgba(251,146,60,0.35)',
        gradient: ['#FB923C33', '#EF444433'],
        summary:
          'You say "um" and "like" about 4 times per minute, which is slightly above the ideal range of 2-3 per minute.',
        trend: 'Filler word usage decreased by 15% compared to last week (↓1 filler/min)',
        aiInsight:
          'You tend to say "like" 90 times per session. Try pausing instead of filling silence - it actually makes you sound more authoritative!',
      },
      {
        id: 'energy',
        title: 'Energy Level',
        value: 'High',
        iconName: 'flash',
        borderColor: '#2DD4BF66',
        glowColor: 'rgba(45,212,191,0.35)',
        gradient: ['#2DD4BF33', '#0D948833'],
        summary:
          'Your vocal energy and enthusiasm are consistently high, making you engaging and dynamic in conversations.',
        trend: 'Energy levels peak around 2-4 PM, with slight dips in early morning calls',
        aiInsight:
          "Your energy is contagious! You bring 25% more enthusiasm to group conversations than one-on-ones.",
      },
      {
        id: 'sentiment',
        title: 'Sentiment',
        value: '85%',
        iconName: 'heart',
        borderColor: '#F472B666',
        glowColor: 'rgba(244,114,182,0.35)',
        gradient: ['#F472B633', '#DB277733'],
        summary:
          'Your overall sentiment is very positive, with encouraging language and supportive tone throughout conversations.',
        trend: 'Positive sentiment increased by 5% this week, especially in team meetings',
        aiInsight:
          'You use 40% more positive words during collaborative sessions. Your optimism really shines in teamwork!',
      },
      {
        id: 'xp-progress',
        title: 'XP Progress',
        value: '2,840',
        iconName: 'bar-chart',
        borderColor: '#9333EA66',
        glowColor: 'rgba(147,51,234,0.35)',
        gradient: ['#9333EA33', '#6D28D933'],
        summary:
          "You've earned 2,840 XP this week through consistent practice and achieving communication milestones.",
        trend: 'XP gain accelerated by 30% with daily practice sessions (↑650 XP vs last week)',
        aiInsight:
          "You're on track to reach Level 15 this month! Keep up the daily practice for bonus XP multipliers.",
      },
      {
        id: 'ai-insights',
        title: 'AI Insights',
        value: '12 New',
        iconName: 'bulb',
        borderColor: '#9CA3AF66',
        glowColor: 'rgba(156,163,175,0.35)',
        gradient: ['#9CA3AF33', '#6B728033'],
        summary:
          'Our AI has identified 12 new patterns in your communication style, including improved eye contact and humor usage.',
        trend: 'AI detected 3x more humor attempts this week - your wit is developing!',
        aiInsight:
          'You make eye contact 60% more during storytelling. This natural instinct is a huge strength - use it more often!',
      },
    ],
    []
  );

  const premiumTiles = [
    { id: 'tone-mastery', title: 'Tone Mastery', desc: 'Measures pitch control, tension, pauses, nuance', icon: 'mic' },
    { id: 'charisma-index', title: 'Charisma Index', desc: 'Based on humor, storytelling, presence', icon: 'star' },
    { id: 'body-language', title: 'Body Language Score', desc: 'Based on posture, facial cues, gestures', icon: 'eye' },
    { id: 'speaking-habits', title: 'Speaking Habits Scan', desc: 'Unique patterns & quirks in your speech', icon: 'volume-high' },
  ];

  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: 28,
        paddingBottom: Math.max(24, insets.bottom + 18),
        paddingHorizontal: 12,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ color: '#fff', fontSize: 34, fontWeight: '900', textAlign: 'center', lineHeight: 38 }}>
          Performance{"\n"}Dashboard
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, marginTop: 8, textAlign: 'center' }}>
          Your personal communication playground with AI-powered insights
        </Text>
      </View>

      {/* Stats grid 2x3 */}
      <View style={{ marginBottom: 28, flexDirection: 'row', flexWrap: 'wrap', gap: H_GAP, justifyContent: 'space-between' }}>
        {statTiles.map((t) => (
          <StatTile
            key={t.id}
            title={t.title}
            value={t.value}
            iconName={t.iconName}
            borderColor={t.borderColor}
            glowColor={t.glowColor}
            size={SIDE}
            onPress={() => setSelected(t.id)}
          />
        ))}
      </View>

      {/* Premium section */}
      <View style={{ marginBottom: 16, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6 }}>Premium Deep Insights</Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)' }}>Unlock advanced personality and communication analytics</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: H_GAP, justifyContent: 'space-between', marginBottom: 16 }}>
        {premiumTiles.map((p) => (
          <TouchableOpacity
            key={p.id}
            activeOpacity={0.8}
            onPress={() => setShowUpgrade(true)}
            style={{
              width: SIDE,
              height: SIDE * 0.82,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(250,204,21,0.45)',
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={['rgba(250,204,21,0.08)', 'rgba(147,51,234,0.12)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, padding: 16 }}
            >
              <View style={{ position: 'absolute', top: 10, right: 10 }}>
                <Ionicons name="lock-closed" size={18} color="#FACC15" />
              </View>
              <View style={{ marginBottom: 12 }}>
                <Ionicons name={p.icon} size={26} color="rgba(250,204,21,0.8)" />
              </View>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, marginBottom: 6 }}>{p.title}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{p.desc}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity activeOpacity={0.9} onPress={() => setShowUpgrade(true)} style={{ alignSelf: 'center', width: '100%' }}>
        <LinearGradient
          colors={['#FACC15', '#9333EA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 18,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: 'rgba(250,204,21,0.5)',
            shadowOpacity: 0.6,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 6,
          }}
        >
          <Text style={{ color: '#0a0a0a', fontWeight: '800', fontSize: 16 }}>🔓 Unlock Deep Personality Stats</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Stat popups */}
      {statTiles.map((t) => (
        <StatPopup
          key={`popup-${t.id}`}
          visible={selected === t.id}
          onClose={() => setSelected(null)}
          title={t.title}
          value={t.value}
          iconName={t.iconName}
          gradient={t.gradient}
          summary={t.summary}
          trend={t.trend}
          aiInsight={t.aiInsight}
        />
      ))}

      {/* Upgrade modal (reusing StatPopup) */}
      <StatPopup
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        title="Unlock Deep Personality Stats"
        value=""
        iconName="lock-closed"
        gradient={['#FACC15', '#9333EA']}
        summary="See how your tone, charisma, and body language truly show up."
        trend="Includes Tone Mastery, Charisma Index, Body Language Score, and Speaking Habits Scan."
        aiInsight="Start a 7‑day free trial. Cancel anytime."
      />
    </ScrollView>
  );
};

export default StatsScreen;


