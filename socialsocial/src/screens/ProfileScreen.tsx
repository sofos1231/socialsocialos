// socialsocial/src/screens/ProfileScreen.tsx

import React from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTokens } from '../store/tokens';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    await useTokens.getState().clearTokens();
    Alert.alert('Logged out', 'You have been logged out.');

    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <Text style={styles.text}>
        More profile features coming soon. For now you can log out here.
      </Text>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    padding: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    color: '#fff',
  },
  text: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 24,
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
