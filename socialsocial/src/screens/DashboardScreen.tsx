import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

export default function DashboardScreen({ navigation }: any) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/sessions/dashboard/summary');
      setSummary(res.data);
    } catch (e: any) {
      Alert.alert('Load Error', e?.message ?? 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, []);

  const createMock = async () => {
    try {
      setLoading(true);
      await api.post('/sessions/mock');
      await load();
    } catch (e: any) {
      Alert.alert('Create Session Error', e?.message ?? 'Failed to create mock session');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('accessToken');
    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
  };

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dashboard</Text>

      <TouchableOpacity style={styles.button} onPress={createMock} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Working…' : 'Create Mock Session'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.logout]} onPress={logout} disabled={loading}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Summary</Text>
        <Text style={styles.cardText}>{JSON.stringify(summary, null, 2)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#0E1118' },
  title: { color: 'white', fontSize: 24, fontWeight: '700', marginBottom: 16 },
  button: { backgroundColor: '#10b981', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, width: '100%', marginTop: 12 },
  logout: { backgroundColor: '#ef4444' },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: '600' },
  card: { marginTop: 20, width: '100%', backgroundColor: '#1a1f2a', borderRadius: 8, padding: 12 },
  cardTitle: { color: 'white', fontWeight: '700', marginBottom: 8 },
  cardText: { color: '#cbd5e1', fontFamily: 'Courier' as any, fontSize: 12 },
});


