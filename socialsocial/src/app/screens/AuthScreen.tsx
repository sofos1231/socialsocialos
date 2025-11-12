import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { login } from '../../api/authService';
import { setTokens } from '../../store/tokens';

export function AuthScreen() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('dev');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit() {
    setBusy(true); setMsg(null);
    try {
      const res = await login(email, password);
      await setTokens(res.accessToken, (res as any).refreshToken);
      setMsg('Logged in. Redirecting…');
    } catch (e: any) {
      setMsg(e?.response?.data?.error?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>Sign in</Text>
      <TextInput style={s.input} autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="email" />
      <TextInput style={s.input} value={password} onChangeText={setPassword} placeholder="password" secureTextEntry />
      <Button title={busy ? '...' : 'Continue'} onPress={onSubmit} disabled={busy} />
      {msg ? <Text style={s.msg}>{msg}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16, justifyContent: 'center', gap: 12 },
  h1: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 8 },
  msg: { marginTop: 8, opacity: 0.8 },
});


