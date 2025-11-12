import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useMissions } from '../../hooks/queries';
import { useClaimMission } from '../../hooks/mutations';

export default function MissionsScreen() {
  const { data, isLoading, refetch } = useMissions();
  const claim = useClaimMission();

  if (isLoading) return <></>;
  return (
    <View style={styles.container}>
      {(data?.items || []).map((m) => (
        <View key={m.id} style={styles.item}>
          <Text style={styles.title}>{m.title}</Text>
          <Pressable
            style={[styles.button, claim.isPending && styles.buttonDisabled]}
            disabled={!!claim.isPending}
            onPress={async () => {
              try { await claim.mutateAsync({ id: m.id }); await refetch(); }
              catch (e: any) { alert(e?.message || 'Please try again soon'); }
            }}
          >
            <Text style={styles.buttonText}>Claim</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  item: { padding: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  title: { fontSize: 16, fontWeight: '500', marginBottom: 8 },
  button: { backgroundColor: '#10b981', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 6, alignSelf: 'flex-start' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
});


