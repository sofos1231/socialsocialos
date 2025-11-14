import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';
import { login, signup } from '../../api/authService';

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit() {
    // eslint-disable-next-line no-console
    console.log('[UI][AUTH] SUBMIT', { mode, email, hasPassword: !!password });
    setBusy(true); setMsg(null);
    try {
      if (mode === 'signup') {
        await signup({ email, password, name: name || undefined });
        setMsg('Account created. Redirecting…');
      } else {
        await login(email, password);
        setMsg('Logged in. Redirecting…');
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.log('[UI][AUTH] ERROR RAW', e);
      // eslint-disable-next-line no-console
      console.log('[UI][AUTH] ERROR', {
        message: e?.message,
        code: e?.code,
        status: e?.response?.status,
        data: e?.response?.data,
      });
      const backendMsg = e?.response?.data?.error?.message;
      setMsg(backendMsg || e?.message || 'Network Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
      {mode === 'signup' ? (
        <TextInput style={s.input} autoCapitalize="words" value={name} onChangeText={setName} placeholder="name (optional)" />
      ) : null}
      <TextInput style={s.input} autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="email" />
      <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="password" secureTextEntry />
      <Button title={busy ? '...' : (mode === 'login' ? 'Continue' : 'Create account')} onPress={onSubmit} disabled={busy} />
      {msg ? <Text style={s.msg}>{msg}</Text> : null}
      <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
        <Text style={s.link}>
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16, justifyContent: 'center', gap: 12 },
  h1: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 8 },
  msg: { marginTop: 8, opacity: 0.8 },
  link: { marginTop: 12, textAlign: 'center', color: '#2563eb' },
});


