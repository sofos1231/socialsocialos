import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useWallet } from '../../hooks/queries';
import { useAdjustWallet } from '../../hooks/mutations';

export default function WalletScreen() {
  const { data, isLoading, refetch } = useWallet();
  const adjust = useAdjustWallet();

  if (isLoading || !data) return <></>;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wallet</Text>
      <Text style={styles.balances}>Coins: {data.coins} | Gems: {data.gems} | XP: {data.xp}</Text>
      <Pressable
        style={[styles.button, adjust.isPending && styles.buttonDisabled]}
        disabled={!!adjust.isPending}
        onPress={async () => {
          try { await adjust.mutateAsync({ coins: 10 }); await refetch(); }
          catch (e: any) { alert(e?.message || 'Please try again soon'); }
        }}
      >
        <Text style={styles.buttonText}>+10 Coins</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  balances: { fontSize: 16, marginBottom: 16 },
  button: { backgroundColor: '#6366f1', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
});


