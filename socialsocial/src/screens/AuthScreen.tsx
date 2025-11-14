import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

export default function AuthScreen({ navigation }: any) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleMode = () => setMode((m) => (m === 'login' ? 'signup' : 'login'));

  const onSubmit = async () => {
    try {
      setLoading(true);
      if (mode === 'signup') {
        await api.post('/auth/signup', { email, password, name });
      }
      const res = await api.post('/auth/login', { email });
      const token = res.data?.accessToken;
      if (!token) throw new Error('No accessToken in response');
      await AsyncStorage.setItem('accessToken', token);
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    } catch (e: any) {
      Alert.alert('Auth Error', e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{mode === 'login' ? 'Login' : 'Sign Up'}</Text>
      {mode === 'signup' && (
        <TextInput
          placeholder="Name"
          placeholderTextColor="#777"
          value={name}
          onChangeText={setName}
          style={styles.input}
          autoCapitalize="words"
        />
      )}
      <TextInput
        placeholder="Email"
        placeholderTextColor="#777"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {mode === 'signup' && (
        <TextInput
          placeholder="Password"
          placeholderTextColor="#777"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
        />
      )}

      <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create account'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={toggleMode} style={styles.link}>
        <Text style={styles.linkText}>
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#0E1118' },
  title: { color: 'white', fontSize: 24, fontWeight: '700', marginBottom: 16 },
  input: {
    width: '100%',
    backgroundColor: '#1a1f2a',
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  button: { marginTop: 16, backgroundColor: '#6366f1', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, width: '100%' },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: '600' },
  link: { marginTop: 16 },
  linkText: { color: '#93c5fd' },
});


