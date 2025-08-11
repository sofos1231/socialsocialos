import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function LimitedOffer({ title, description, originalPrice, salePrice, endTime }) {
  const [timeLeft, setTimeLeft] = useState({ h: '00', m: '00', s: '00' });

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const dist = Math.max(0, new Date(endTime).getTime() - now);
      const h = String(Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
      const m = String(Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
      const s = String(Math.floor((dist % (1000 * 60)) / 1000)).padStart(2, '0');
      setTimeLeft({ h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  const discount = useMemo(() => {
    if (!originalPrice) return 0;
    return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
  }, [originalPrice, salePrice]);

  return (
    <LinearGradient
      colors={['rgba(255,99,71,0.18)', 'rgba(255,165,0,0.18)', 'rgba(255,215,0,0.18)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 16, padding: 16, borderWidth: 2, borderColor: 'rgba(251,191,36,0.5)', overflow: 'hidden' }}
    >
      <View style={{ position: 'absolute', top: 10, right: 12 }}>
        <Text style={{ fontSize: 16 }}>🔥</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,125,0,0.9)', marginRight: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>⚡</Text>
        </View>
        <View>
          <Text style={{ color: '#fb923c', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 }}>LIMITED TIME OFFER</Text>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>{title}</Text>
        </View>
      </View>

      <Text style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 12 }}>{description}</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 22 }}>${salePrice?.toFixed ? salePrice.toFixed(2) : salePrice}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', textDecorationLine: 'line-through', fontSize: 16, marginLeft: 6 }}>${originalPrice?.toFixed ? originalPrice.toFixed(2) : originalPrice}</Text>
        </View>
        <View style={{ backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>{discount}% OFF</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ color: '#fb923c', marginRight: 8 }}>⏰ Ends in:</Text>
        <View style={{ flexDirection: 'row' }}>
          {[{ v: timeLeft.h, key: 'h' }, { v: timeLeft.m, key: 'm' }, { v: timeLeft.s, key: 's' }].map((b, i) => (
            <View key={b.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontFamily: 'System' }}>{b.v}</Text>
              </View>
              {i < 2 ? <Text style={{ color: '#fff', marginHorizontal: 6 }}>:</Text> : null}
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.9} accessibilityRole="button" accessibilityLabel="Claim deal now">
        <LinearGradient
          colors={['#f97316', '#ef4444']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '900' }}>Claim Deal Now</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

