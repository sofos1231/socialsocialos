// socialsocial/src/screens/stats/SocialTipsTab.tsx
// Step 5.7: Social Tips / Message Analyzer Tab

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  fetchAnalyzerLists,
  analyzeMessage,
  burnMessage,
  AnalyzerListsResponse,
  AnalyzeMessageResponse,
  MessageListItemDTO,
} from '../../api/analyzerService';
import { isFeatureLocked, getFeatureLockMessage } from '../../utils/featureGate';
import MessageCardMini from './components/MessageCardMini';
import MessageAnalyzerPanel from '../../components/stats/MessageAnalyzerPanel';
import MessageAnalysisModal from '../../components/stats/MessageAnalysisModal';
import BurnButton from './components/BurnButton';

interface SocialTipsTabProps {
  isPremium: boolean;
}

export default function SocialTipsTab({ isPremium }: SocialTipsTabProps) {
  const [lists, setLists] = useState<AnalyzerListsResponse | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageListItemDTO | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeMessageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLockedState, setIsLockedState] = useState(false);
  
  // New state for Message Analyzer modal
  const [analyzerMessage, setAnalyzerMessage] = useState<MessageListItemDTO | null>(null);
  const [analyzerAnalysis, setAnalyzerAnalysis] = useState<AnalyzeMessageResponse | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [analyzerError, setAnalyzerError] = useState<string | null>(null);

  const isLocked = isFeatureLocked('MESSAGE_ANALYZER', isPremium);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchAnalyzerLists();
      
      // Step 5.12: Unwrap LockedResponse
      if (response.locked) {
        setIsLockedState(true);
        setLists(response.preview ?? null);
      } else {
        setIsLockedState(false);
        setLists(response.full ?? null);
      }
    } catch (err: any) {
      console.error('[SocialTipsTab] Failed to load lists:', err);
      setError(err.message || 'Failed to load messages');
      setIsLockedState(false);
      setLists(null);
    } finally {
      setLoading(false);
    }
  };

  const handleMessagePress = async (item: MessageListItemDTO) => {
    if (isLocked) return;

    try {
      setAnalyzing(true);
      setError(null);
      const response = await analyzeMessage(item.messageId);
      
      // Step 5.12: Unwrap LockedResponse
      if (response.locked) {
        setIsLockedState(true);
        setSelectedMessage(item);
        setAnalysis(response.preview ?? null);
      } else {
        setIsLockedState(false);
        setSelectedMessage(item);
        setAnalysis(response.full ?? null);
      }
    } catch (err: any) {
      console.error('[SocialTipsTab] Failed to analyze message:', err);
      Alert.alert('Error', err.message || 'Failed to analyze message');
      setError(err.message || 'Failed to analyze message');
      setAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyzeMessage = async (item: MessageListItemDTO) => {
    if (isLocked) return;

    try {
      setAnalyzerError(null);
      setAnalyzerMessage(item);
      setIsModalVisible(true);
      
      const response = await analyzeMessage(item.messageId);
      
      // Step 5.12: Unwrap LockedResponse
      if (response.locked) {
        setIsLockedState(true);
        setAnalyzerAnalysis(response.preview ?? null);
      } else {
        setIsLockedState(false);
        setAnalyzerAnalysis(response.full ?? null);
      }
    } catch (err: any) {
      console.error('[SocialTipsTab] Failed to analyze message:', err);
      setAnalyzerError(err.message || 'Failed to analyze message');
      setAnalyzerAnalysis(null);
    }
  };

  const handleViewFullAnalysis = () => {
    // Modal is already visible, just ensure it's showing the latest data
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    setAnalyzerError(null);
    // Keep analyzerMessage and analyzerAnalysis for panel display
  };

  const handleBurn = async (messageId: string) => {
    if (isLocked) return;

    try {
      await burnMessage(messageId);

      // Remove from local lists
      if (lists) {
        setLists({
          positive: lists.positive?.filter((m) => m.messageId !== messageId) ?? [],
          negative: lists.negative?.filter((m) => m.messageId !== messageId) ?? [],
        });
      }

      // Clear analysis if this message was selected
      if (selectedMessage?.messageId === messageId) {
        setSelectedMessage(null);
        setAnalysis(null);
      }

      Alert.alert('Success', 'Message removed from all lists');
    } catch (err: any) {
      console.error('[SocialTipsTab] Failed to burn message:', err);
      Alert.alert('Error', err.message || 'Failed to remove message');
    }
  };

  // Premium lock UI
  if (isLocked) {
    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.lockOverlay}>
          <View style={styles.lockCard}>
            <Text style={styles.lockTitle}>🔒 Message Analyzer</Text>
            <Text style={styles.lockText}>
              {getFeatureLockMessage('MESSAGE_ANALYZER')}
            </Text>
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeButtonText}>Unlock Message Analyzer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Blurred previews */}
        <View style={[styles.previewSection, styles.blurred]}>
          <Text style={styles.sectionTitle}>Top Messages</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewText}>Message preview...</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  if (error && !lists) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadLists}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Message Analyzer Panel */}
      <MessageAnalyzerPanel
        analyzedMessage={analyzerMessage}
        analysis={analyzerAnalysis}
        onViewFull={handleViewFullAnalysis}
      />

      {/* Positive Messages */}
      {lists?.positive && lists.positive.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Positive Messages</Text>
          {lists.positive.map((item) => (
            <MessageCardMini
              key={item.messageId}
              item={item}
              onPress={() => handleMessagePress(item)}
              onAnalyze={() => handleAnalyzeMessage(item)}
              onBurn={() => handleBurn(item.messageId)}
            />
          ))}
        </View>
      )}

      {/* Negative Messages */}
      {lists?.negative && lists.negative.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Opportunities</Text>
          {lists.negative.map((item) => (
            <MessageCardMini
              key={item.messageId}
              item={item}
              onPress={() => handleMessagePress(item)}
              onAnalyze={() => handleAnalyzeMessage(item)}
              onBurn={() => handleBurn(item.messageId)}
            />
          ))}
        </View>
      )}

      {/* Empty State */}
      {lists && (!lists.positive?.length && !lists.negative?.length) && (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No messages to analyze yet</Text>
          <Text style={styles.emptySubtext}>Complete some practice sessions to see your messages here</Text>
        </View>
      )}

      {/* Analysis Result (kept for backward compatibility, but modal is preferred) */}
      {analyzing && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Analyzing message...</Text>
        </View>
      )}

      {analysis && analysis.breakdown && analysis.paragraphs && selectedMessage && (
        <View style={styles.section}>
          <View style={styles.analysisHeader}>
            <Text style={styles.sectionTitle}>Analysis</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setAnalysis(null);
                setSelectedMessage(null);
              }}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.messagePreview}>
            <Text style={styles.messagePreviewText}>{selectedMessage.contentSnippet}</Text>
          </View>

          <AnalysisResultCard breakdown={analysis.breakdown} paragraphs={analysis.paragraphs} />

          <BurnButton
            messageId={selectedMessage.messageId}
            onBurn={() => handleBurn(selectedMessage.messageId)}
          />
        </View>
      )}

      {/* Message Analysis Modal */}
      <MessageAnalysisModal
        visible={isModalVisible}
        message={analyzerMessage}
        analysis={analyzerAnalysis}
        loading={isModalVisible && !analyzerAnalysis && !analyzerError}
        error={analyzerError}
        onClose={handleCloseModal}
        onRetry={analyzerMessage ? () => handleAnalyzeMessage(analyzerMessage) : undefined}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    alignItems: 'center',
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  lockText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  upgradeButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#0B1220',
    fontWeight: '600',
    fontSize: 14,
  },
  previewSection: {
    marginBottom: 24,
  },
  blurred: {
    opacity: 0.3,
  },
  previewCard: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 16,
  },
  previewText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  messagePreview: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  messagePreviewText: {
    fontSize: 14,
    color: '#E5E7EB',
    fontStyle: 'italic',
  },
});

