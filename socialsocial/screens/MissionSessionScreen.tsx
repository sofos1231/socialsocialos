import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { usePracticeStore } from '../src/state/practiceStore';

export default function MissionSessionScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { activeSessionId, submit, complete } = usePracticeStore();
  const [log, setLog] = useState<string[]>([]);

  const onSubmit = async () => {
    try {
      const res = await submit({ text: 'hello' });
      setLog((l) => [...l, JSON.stringify(res)]);
    } catch (e: any) {
      setLog((l) => [...l, `ERR: ${e?.message || 'submit failed'}`]);
    }
  };

  const onComplete = async () => {
    try {
      const res = await complete();
      setLog((l) => [...l, `Completed: ${JSON.stringify(res)}`]);
      navigation.goBack();
    } catch (e: any) {
      setLog((l) => [...l, `ERR: ${e?.message || 'complete failed'}`]);
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: 60, paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Mission Session</Text>
      <Text selectable style={{ marginBottom: 12 }}>Session ID: {activeSessionId || 'none'}</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button title="Submit" onPress={onSubmit} />
        <Button title="Complete" onPress={onComplete} />
      </View>
      <View style={{ marginTop: 16 }}>
        {log.map((line, idx) => (
          <Text key={idx} selectable style={{ color: '#999', marginBottom: 4 }}>{line}</Text>
        ))}
      </View>
    </View>
  );
}


