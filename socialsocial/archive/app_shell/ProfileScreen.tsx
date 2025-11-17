import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useProfile } from '../../hooks/queries';
import { update as updateProfile } from '../../api/profileService';

export default function ProfileScreen() {
  const { data, isLoading, refetch } = useProfile();
  const [email, setEmail] = useState('');
  useEffect(() => { if (data?.email) setEmail(String(data.email)); }, [data?.email]);
  if (isLoading) return null;
  const save = async () => {
    try { await updateProfile({ email }); await refetch(); }
    catch (e: any) {
      const code = e?.response?.data?.error?.code;
      alert(code === 'EMAIL_CONFLICT' ? 'Email already in use' : 'Invalid email');
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="email"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Save</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  label: { fontSize: 14, color: '#94a3b8', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', marginBottom: 12 },
  button: { backgroundColor: '#6366f1', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start' },
  buttonText: { color: '#fff', fontWeight: '600' },
});



