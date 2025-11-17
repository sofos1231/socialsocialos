// socialsocial/src/app/screens/AuthScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { login, signup } from '../../api/auth';
import { setTokens, clearTokens } from '../../store/tokens';

// ----------------------------

export function AuthScreen() {
  const navigation = useNavigation<any>();

  // always start on LOGIN
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // clear any leftover tokens when opening Auth
  useEffect(() => {
    clearTokens();
  }, []);

  async function onSubmit() {
    console.log('[UI][AUTH] SUBMIT', { mode, email, hasPassword: !!password });
    setBusy(true);
    setMsg(null);

    try {
      if (mode === 'signup') {
        // SIGNUP: create account only
        await signup({
          email,
          password,
          name: name.trim() || undefined,
        });

        // Do NOT store tokens here; user must log in manually
        setMsg('Account created! Please log in.');
        setMode('login');
        setPassword(''); // force retyping password
      } else {
        // LOGIN: verify credentials, then store tokens & go to Dashboard
        const res = await login({ email, password });

        await setTokens(res.accessToken, res.refreshToken);

        setMsg('Logged in. Redirecting…');

        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      }
    } catch (e: any) {
      console.log('[UI][AUTH] ERROR RAW', e);
      console.log('[UI][AUTH] ERROR', {
        message: e?.message,
        code: e?.code,
        status: e?.response?.status,
        data: e?.response?.data,
      });

      const backendMsg =
        e?.response?.data?.error?.message || e?.message || 'Network Error';
      setMsg(backendMsg);
    } finally {
      setBusy(false);
    }
  }

  // DEV skip – jumps straight to Dashboard with fake tokens
  async function handleSkipDev() {
    try {
      console.log('[UI][AUTH] SKIP LOGIN (DEV) pressed');
      await setTokens('dev', 'dev');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    } catch (e) {
      console.log('[UI][AUTH] SKIP LOGIN (DEV) failed', e);
    }
  }

  return (
    <View style={s.wrap}>
      <Text style={s.h1}>
        {mode === 'login' ? 'Sign in' : 'Create account'}
      </Text>

      {__DEV__ && (
        <TouchableOpacity onPress={handleSkipDev} style={s.devSkipTop}>
          <Text style={s.devSkipText}>Skip Login (DEV)</Text>
        </TouchableOpacity>
      )}

      {mode === 'signup' ? (
        <TextInput
          style={s.input}
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
          placeholder="name (optional)"
        />
      ) : null}

      <TextInput
        style={s.input}
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        placeholder="email"
      />

      <TextInput
        style={s.input}
        value={password}
        onChangeText={setPassword}
        placeholder="password"
        secureTextEntry
      />

      {msg ? <Text style={s.msg}>{msg}</Text> : null}

      <TouchableOpacity
        style={s.btn}
        disabled={busy}
        onPress={onSubmit}
      >
        <Text style={s.btnText}>
          {busy ? '...' : mode === 'login' ? 'Login' : 'Create account'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          setMsg(null);
          setPassword('');
          setMode(mode === 'login' ? 'signup' : 'login');
        }}
      >
        <Text style={s.link}>
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Sign in'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16, justifyContent: 'center', gap: 12 },
  h1: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  msg: { marginTop: 8, opacity: 0.8 },
  link: { marginTop: 12, textAlign: 'center', color: '#2563eb' },
  btn: {
    marginTop: 10,
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  devSkipTop: {
    alignSelf: 'center',
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#64748b',
    borderRadius: 6,
  },
  devSkipText: { color: '#94a3b8', fontSize: 12 },
});

// default export for all imports like `import AuthScreen from '../app/screens/AuthScreen'`
export default AuthScreen;
