// socialsocial/src/screens/stats/components/BurnButton.tsx
// Step 5.7: Burn button component

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';

interface BurnButtonProps {
  onBurn: () => void;
  messageId: string;
}

export default function BurnButton({ onBurn, messageId }: BurnButtonProps) {
  const handlePress = () => {
    Alert.alert(
      'Remove Message',
      'This message will be removed from all lists and won\'t appear again. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: onBurn,
        },
      ],
    );
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={styles.buttonText}>Never Show Again</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#7F1D1D',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FCA5A5',
  },
});

