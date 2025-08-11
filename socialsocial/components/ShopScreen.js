import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LimitedOffer from './LimitedOffer';
import ImprovedBadge from './ImprovedBadge';
import LockedEffectCard from './LockedEffectCard';
import PurchaseAnimation from './PurchaseAnimation';

const { width } = Dimensions.get('window');
const H_GAP = 12;
const SIDE = Math.floor((width - 24 - H_GAP) / 2);

export default function ShopScreen() {
  const [currency, setCurrency] = useState({ coins: 1250, diamonds: 8 });
  const [purchase, setPurchase] = useState({ visible: false, currency: 'coins', amount: 0 });

  const powerUps = useMemo(() => ([
    { id: 'xp', title: '2x XP Boost', desc: '24 hours of double XP gains', cost: 50, cur: 'coins', rarity: 'common', grad: ['#FACC15', '#FB923C'] },
    { id: 'conf', title: 'Confidence Booster', desc: '+15% confidence score for next session', cost: 75, cur: 'coins', rarity: 'uncommon', grad: ['#60A5FA', '#7C3AED'] },
    { id: 'retry', title: 'Retry Token', desc: 'Retry any failed practice drill', cost: 30, cur: 'coins', rarity: 'common', grad: ['#34D399', '#10B981'] },
    { id: 'unlock', title: 'Instant Unlock', desc: 'Unlock next skill node immediately', cost: 2, cur: 'diamonds', rarity: 'rare', grad: ['#A78BFA', '#EC4899'] },
    { id: 'premium', title: 'Premium Scenarios', desc: '10 exclusive practice scenarios', cost: 3, cur: 'diamonds', rarity: 'epic', grad: ['#FB923C', '#EF4444'] },
    { id: 'coach', title: 'AI Coach Boost', desc: 'Enhanced feedback for 7 days', cost: 5, cur: 'diamonds', rarity: 'legendary', grad: ['#F472B6', '#FB7185'] },
  ]), []);

  const coinPacks = [
    { amount: 100, price: 4.99, bonus: null, badge: null },
    { amount: 300, price: 9.99, bonus: '+50 Bonus', badge: 'popular' },
    { amount: 750, price: 19.99, bonus: '+150 Bonus', badge: 'best-value' },
    { amount: 1500, price: 34.99, bonus: '+400 Bonus', badge: null },
  ];

  const diamondPacks = [
    { amount: 5, price: 2.99, bonus: null, badge: null },
    { amount: 15, price: 7.99, bonus: '+3 Bonus', badge: 'popular' },
    { amount: 40, price: 14.99, bonus: '+10 Bonus', badge: 'best-value' },
    { amount: 100, price: 24.99, bonus: '+25 Bonus', badge: 'premium' },
  ];

  const visualEffects = [
    { id: 1, title: 'Sparkle Trails', desc: 'Beautiful particle effects when completing tasks', cost: 150, cur: 'coins', rarity: 'common' },
    { id: 2, title: 'Golden Frame', desc: 'Exclusive golden avatar border', cost: 5, cur: 'diamonds', rarity: 'rare' },
    { id: 3, title: 'Confidence Aura', desc: 'Glowing confidence indicator effect', cost: 12, cur: 'diamonds', rarity: 'epic' },
    { id: 4, title: 'Champion Crown', desc: 'Ultimate achievement crown effect', cost: 0, cur: 'premium', rarity: 'legendary' },
  ];

  const limitedOffer = {
    title: 'Double Diamond Bonus',
    description: 'Get 100% extra diamonds on all packs for a limited time!',
    originalPrice: 24.99,
    salePrice: 14.99,
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };

  const handlePurchase = (type, baseAmount, bonusText) => {
    const bonus = bonusText ? parseInt(bonusText.match(/\d+/)?.[0] || '0') : 0;
    const amount = baseAmount + bonus;
    if (type === 'coins') setCurrency((p) => ({ ...p, coins: p.coins + amount }));
    else setCurrency((p) => ({ ...p, diamonds: p.diamonds + amount }));
    setPurchase({ visible: true, currency: type, amount });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 28 }}>
      {/* Header */}
      <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 14 }}>
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900' }}>Power Shop</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>Boost your social training with premium items</Text>
      </View>

      {/* Balance */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(30,30,30,0.95)', padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {[{ label: 'Coins', value: currency.coins.toLocaleString(), icon: '🪙', bg: ['#F59E0B', '#EA580C'] },
              { label: 'Diamonds', value: String(currency.diamonds), icon: '💎', bg: ['#3B82F6', '#7C3AED'] }].map((c, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <LinearGradient colors={c.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Text style={{ fontSize: 20, color: '#fff' }}>{c.icon}</Text>
                </LinearGradient>
                <View>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 20 }}>{c.value}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{c.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Limited Offer */}
      <View style={{ marginBottom: 16 }}>
        <LimitedOffer {...limitedOffer} />
      </View>

      {/* Power-ups */}
      <View style={{ marginBottom: 4 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginVertical: 8 }}>⚡ Power-ups</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {powerUps.map((p, idx) => (
            <View key={p.id} style={{ width: SIDE, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginBottom: 12 }}>
              <LinearGradient colors={['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.03)']} style={{ padding: 14, minHeight: 150, justifyContent: 'space-between' }}>
                <LinearGradient colors={p.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Text style={{ color: '#fff', fontWeight: '900' }}>✨</Text>
                </LinearGradient>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{p.title}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{p.desc}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ fontSize: 16 }}>{p.cur === 'coins' ? '🪙' : '💎'}</Text>
                  <Text style={{ color: '#fff', fontWeight: '900', marginLeft: 6 }}>{p.cost}</Text>
                </View>
              </LinearGradient>
            </View>
          ))}
        </View>
      </View>

      {/* Coin Packs */}
      <View style={{ marginTop: 14 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 8 }}>🪙 Coin Packs</Text>
        {coinPacks.map((pack, idx) => (
          <TouchableOpacity
            key={`c-${idx}`}
            activeOpacity={0.9}
            onPress={() => handlePurchase('coins', pack.amount, pack.bonus)}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
              backgroundColor: 'rgba(30,30,30,0.95)',
              padding: 14,
              marginBottom: 12,
              overflow: 'hidden',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {pack.badge ? <ImprovedBadge variant={pack.badge} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <LinearGradient colors={['#F59E0B', '#EA580C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: '#fff', fontSize: 18 }}>🪙</Text>
              </LinearGradient>
              <View>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{pack.amount.toLocaleString()} Coins</Text>
                {pack.bonus ? <Text style={{ color: '#22c55e', fontWeight: '700', fontSize: 12 }}>{pack.bonus}</Text> : null}
              </View>
            </View>
            <LinearGradient colors={['#7C3AED', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '900' }}>${pack.price}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* Diamond Packs */}
      <View style={{ marginTop: 8 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 8 }}>💎 Diamond Packs</Text>
        {diamondPacks.map((pack, idx) => (
          <TouchableOpacity
            key={`d-${idx}`}
            activeOpacity={0.9}
            onPress={() => handlePurchase('diamonds', pack.amount, pack.bonus)}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
              backgroundColor: 'rgba(30,30,30,0.95)',
              padding: 14,
              marginBottom: 12,
              overflow: 'hidden',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {pack.badge ? <ImprovedBadge variant={pack.badge} /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <LinearGradient colors={['#3B82F6', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ color: '#fff', fontSize: 18 }}>💎</Text>
              </LinearGradient>
              <View>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>{pack.amount} Diamonds</Text>
                {pack.bonus ? <Text style={{ color: '#22c55e', fontWeight: '700', fontSize: 12 }}>{pack.bonus}</Text> : null}
              </View>
            </View>
            <LinearGradient colors={['#3B82F6', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '900' }}>${pack.price}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* Visual Effects */}
      <View style={{ marginTop: 8, marginBottom: 16 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', marginVertical: 8 }}>🎨 Visual Effects</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {visualEffects.map((e) => (
            <View key={e.id} style={{ width: SIDE, marginBottom: 12 }}>
              <LockedEffectCard
                title={e.title}
                description={e.desc}
                unlockCost={e.cost}
                unlockCurrency={e.cur}
                rarity={e.rarity}
                onPress={() => {}}
              />
            </View>
          ))}
        </View>
      </View>

      <PurchaseAnimation
        visible={purchase.visible}
        onComplete={() => setPurchase((p) => ({ ...p, visible: false }))}
        currency={purchase.currency}
        amount={purchase.amount}
      />
    </ScrollView>
  );
}

