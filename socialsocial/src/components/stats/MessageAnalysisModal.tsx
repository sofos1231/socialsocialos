// socialsocial/src/components/stats/MessageAnalysisModal.tsx
// Modal for displaying full message analysis

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MessageListItemDTO, AnalyzeMessageResponse } from '../../api/analyzerService';
import AnalysisResultCard from '../../screens/stats/components/AnalysisResultCard';

interface MessageAnalysisModalProps {
  visible: boolean;
  message: MessageListItemDTO | null;
  analysis: AnalyzeMessageResponse | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onRetry?: () => void;
}

export default function MessageAnalysisModal({
  visible,
  message,
  analysis,
  loading = false,
  error = null,
  onClose,
  onRetry,
}: MessageAnalysisModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Message Analysis</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading && (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#22c55e" />
                <Text style={styles.loadingText}>Analyzing message...</Text>
              </View>
            )}

            {error && !loading && (
              <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error}</Text>
                {onRetry && (
                  <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!loading && !error && message && analysis && (
              <>
                {/* Message Preview */}
                <View style={styles.messageSection}>
                  <Text style={styles.messageLabel}>Message</Text>
                  <Text style={styles.messageText}>{message.contentSnippet}</Text>
                  <Text style={styles.messageMeta}>
                    Session • Turn {message.turnIndex}
                  </Text>
                </View>

                {/* Analysis Result Card */}
                {analysis.breakdown && (
                  <AnalysisResultCard
                    breakdown={analysis.breakdown}
                    paragraphs={analysis.paragraphs}
                  />
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#111827',
    borderRadius: 16,
    width: '90%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  closeButton: {
    padding: 4,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 28,
    color: '#9CA3AF',
    fontWeight: '300',
    lineHeight: 28,
  },
  content: {
    padding: 16,
  },
  centerContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#0B1220',
    fontWeight: '600',
    fontSize: 14,
  },
  messageSection: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  messageLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: 14,
    color: '#E5E7EB',
    marginBottom: 8,
    lineHeight: 20,
  },
  messageMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

