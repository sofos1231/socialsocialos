// socialsocial/src/screens/stats/components/MessageCardMini.tsx
// Step 5.7: Mini message card for analyzer lists

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MessageListItemDTO } from '../../../api/analyzerService';

interface MessageCardMiniProps {
  item: MessageListItemDTO;
  onPress: () => void;
  onBurn?: () => void;
}

export default function MessageCardMini({ item, onPress, onBurn }: MessageCardMiniProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.scoreContainer}>
          <Text style={styles.score}>{item.score}</Text>
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.content} numberOfLines={2}>
            {item.contentSnippet}
          </Text>
          <Text style={styles.metadata}>
            Session • Turn {item.turnIndex}
          </Text>
        </View>
        {onBurn && (
          <TouchableOpacity
            style={styles.burnButton}
            onPress={(e) => {
              e.stopPropagation();
              onBurn();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.burnIcon}>⋯</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  scoreContainer: {
    marginRight: 12,
    minWidth: 40,
  },
  score: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    fontSize: 14,
    color: '#E5E7EB',
    marginBottom: 4,
    lineHeight: 20,
  },
  metadata: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  burnButton: {
    padding: 4,
    marginLeft: 8,
  },
  burnIcon: {
    fontSize: 20,
    color: '#9CA3AF',
  },
});

