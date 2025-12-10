// socialsocial/src/screens/stats/AdvancedTab.tsx
// Step 5.6: Advanced Metrics tab (Premium feature)

import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { fetchAdvancedMetrics, AdvancedMetricsResponse, MessageBreakdownDTO, fetchTraitSynergy, TraitSynergyResponse } from '../../api/statsService';
import { fetchStatsSummary } from '../../api/statsService';
import { TraitKey, TRAIT_KEYS, TraitLabels } from '../../logic/traitKeys';
import { isFeatureLocked, getFeatureLockMessage } from '../../utils/featureGate';
import { LockedResponse } from '../../api/types';
import LockedCard from '../../components/LockedCard';
import PremiumUpsellModal from '../../components/PremiumUpsellModal';

interface AdvancedTabProps {
  isPremium: boolean;
}

export default function AdvancedTab({ isPremium }: AdvancedTabProps) {
  const [data, setData] = useState<AdvancedMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageBreakdownDTO | null>(null);
  
  // Step 5.12: Locked response state
  const [advancedLocked, setAdvancedLocked] = useState<LockedResponse<AdvancedMetricsResponse> | null>(null);
  const [upsellModalVisible, setUpsellModalVisible] = useState(false);
  
  // Step 5.9: Synergy state
  const [synergy, setSynergy] = useState<TraitSynergyResponse | null>(null);
  const [synergyLocked, setSynergyLocked] = useState<LockedResponse<TraitSynergyResponse> | null>(null);
  const [synergyLoading, setSynergyLoading] = useState(false);
  const [synergyError, setSynergyError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAdvancedMetrics();
      
      // Step 5.12: Handle LockedResponse
      if (response.locked) {
        setAdvancedLocked(response);
        setData(response.preview || null);
      } else {
        setAdvancedLocked(null);
        setData(response.full || null);
        
        // Step 5.9: Load synergy data if unlocked
        loadSynergy();
      }
    } catch (err: any) {
      console.warn('[AdvancedTab] Failed to load advanced metrics:', err);
      // Show inline error state for this tab, but don't break other tabs
      setError(err.message || 'Failed to load advanced metrics');
      // Set premium status based on error (likely backend 500 means not premium)
      // Don't show fatal error card - just show inline error
    } finally {
      setLoading(false);
    }
  };

  const loadSynergy = async () => {
    setSynergyLoading(true);
    setSynergyError(null);
    try {
      const response = await fetchTraitSynergy();
      
      // Step 5.12: Handle LockedResponse
      if (response.locked) {
        setSynergyLocked(response);
        setSynergy(response.preview || null);
      } else {
        setSynergyLocked(null);
        setSynergy(response.full || null);
      }
    } catch (err: any) {
      console.error('[AdvancedTab] Failed to load trait synergy:', err);
      setSynergyError(err.message || 'Failed to load trait synergy');
    } finally {
      setSynergyLoading(false);
    }
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading advanced metrics...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={loadData} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  // Step 5.12: Premium lock UI (using LockedResponse)
  if (advancedLocked?.locked || isFeatureLocked('ADVANCED_METRICS', isPremium)) {
    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LockedCard
          title="🔒 Advanced Metrics"
          description={advancedLocked?.upsell?.body || getFeatureLockMessage('ADVANCED_METRICS')}
          upsell={advancedLocked?.upsell}
          onUpgrade={() => setUpsellModalVisible(true)}
        >
          {advancedLocked?.preview && (
            <View>
              {/* Show preview content if available */}
              <Text style={styles.cardTextMuted}>Preview: Limited data available</Text>
            </View>
          )}
        </LockedCard>
        <PremiumUpsellModal
          visible={upsellModalVisible}
          featureKey={advancedLocked?.featureKey || 'ADVANCED_METRICS'}
          upsell={advancedLocked?.upsell || {
            title: 'Unlock Advanced Metrics',
            body: getFeatureLockMessage('ADVANCED_METRICS'),
            ctaLabel: 'Upgrade to Premium',
          }}
          onClose={() => setUpsellModalVisible(false)}
          onUpgrade={() => {
            setUpsellModalVisible(false);
            // Navigate to upgrade screen or handle upgrade
            console.log('Upgrade to premium');
          }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {/* Message Evolution */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Message Evolution</Text>
        <Text style={styles.cardTextMuted}>
          {data.messageEvolution.points.length} messages tracked
        </Text>
        {data.messageEvolution.points.length === 0 && (
          <Text style={styles.cardTextMuted}>No message data yet</Text>
        )}
      </View>

      {/* Radar 360 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Traits</Text>
        {TRAIT_KEYS.map((key) => {
          const value = data.radar360.current[key] ?? 0;
          const delta = data.radar360.deltasVsLast3[key];
          return (
            <View key={key} style={styles.traitRow}>
              <Text style={styles.traitLabel}>{TraitLabels[key]}:</Text>
              <Text style={styles.traitValue}>{value}</Text>
              {delta !== undefined && (
                <Text style={[styles.delta, delta > 0 ? styles.deltaPositive : styles.deltaNegative]}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                </Text>
              )}
            </View>
          );
        })}
        {data.radar360.microInsights.length > 0 && (
          <View style={styles.insightsContainer}>
            {data.radar360.microInsights.map((insight, idx) => (
              <View key={idx} style={styles.insightItem}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightBody}>{insight.body}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Persona Sensitivity */}
      {data.personaSensitivity.rows.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Persona Performance</Text>
          {data.personaSensitivity.rows.map((persona, idx) => (
            <View key={idx} style={styles.personaRow}>
              <Text style={styles.personaCode}>{persona.personaKey}</Text>
              <Text style={styles.personaScore}>Avg: {persona.avgScore}</Text>
              <Text style={styles.cardTextMuted}>{persona.sessions} sessions</Text>
              {persona.deltaPct !== undefined && (
                <Text style={styles.cardTextMuted}>
                  {persona.deltaPct > 0 ? '+' : ''}{persona.deltaPct.toFixed(1)}% vs overall
                </Text>
              )}
              <Text style={styles.cardTextMuted}>{persona.explanation}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Trending Traits Heatmap */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trending Traits (Last 12 Weeks)</Text>
        <Text style={styles.cardTextMuted}>
          {data.trendingTraitsHeatmap.weeks.length} weeks of data
        </Text>
      </View>

      {/* Behavioral Bias Tracker */}
      {data.behavioralBiasTracker.items.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Behavioral Patterns</Text>
          {data.behavioralBiasTracker.items.slice(0, 5).map((item, idx) => (
            <View key={idx} style={styles.biasRow}>
              <Text style={styles.biasKey}>{item.biasKey}</Text>
              <Text style={styles.biasFrequency}>
                {item.countThisWeek} this week
                {item.deltaVsLastWeek !== null && (
                  <> ({item.deltaVsLastWeek > 0 ? '+' : ''}{item.deltaVsLastWeek} vs last week)</>
                )}
              </Text>
              <Text style={styles.cardTextMuted}>{item.explanation}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Signature Style */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Signature Style</Text>
        <Text style={styles.cardSubtitle}>{data.signatureStyleCard.title}</Text>
        <Text style={styles.cardText}>{data.signatureStyleCard.description}</Text>
        {data.signatureStyleCard.supportingSignals.length > 0 && (
          <Text style={styles.cardTextMuted}>
            Supporting signals: {data.signatureStyleCard.supportingSignals.join(', ')}
          </Text>
        )}
      </View>

      {/* Step 5.12: Trait Synergy Map with LockedResponse */}
      {synergyLocked?.locked ? (
        <LockedCard
          title="Trait Synergy Map"
          upsell={synergyLocked.upsell}
          onUpgrade={() => setUpsellModalVisible(true)}
        >
          {synergyLocked.preview && (
            <View>
              <Text style={styles.cardTextMuted}>
                Preview: {synergyLocked.preview.nodes.length} traits, {synergyLocked.preview.edges.length} connections
              </Text>
            </View>
          )}
        </LockedCard>
      ) : synergyLoading ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trait Synergy Map</Text>
          <ActivityIndicator size="small" color="#22c55e" />
          <Text style={styles.cardTextMuted}>Loading synergy data...</Text>
        </View>
      ) : synergyError ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trait Synergy Map</Text>
          <Text style={styles.errorText}>{synergyError}</Text>
        </View>
      ) : synergy && (synergy.nodes.length > 0 || synergy.edges.length > 0) ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trait Synergy Map</Text>
          <Text style={styles.cardTextMuted}>
            {synergy.nodes.length} traits, {synergy.edges.length} relationships
          </Text>
          
          {/* Top correlations (positive) */}
          {synergy.edges.length > 0 && (
            <>
              <Text style={styles.cardSubtitle}>Strongest Positive Correlations</Text>
              {synergy.edges
                .filter((e) => e.weight > 0)
                .sort((a, b) => b.weight - a.weight)
                .slice(0, 3)
                .map((edge, idx) => (
                  <View key={idx} style={styles.synergyRow}>
                    <Text style={styles.synergyLabel}>
                      {edge.source} ↔ {edge.target}
                    </Text>
                    <Text style={styles.synergyValue}>
                      {edge.weight.toFixed(2)}
                    </Text>
                  </View>
                ))}
            </>
          )}

          {/* Top negative correlations */}
          {synergy.edges.filter((e) => e.weight < 0).length > 0 && (
            <>
              <Text style={styles.cardSubtitle}>Strongest Negative Correlations</Text>
              {synergy.edges
                .filter((e) => e.weight < 0)
                .sort((a, b) => a.weight - b.weight)
                .slice(0, 3)
                .map((edge, idx) => (
                  <View key={idx} style={styles.synergyRow}>
                    <Text style={styles.synergyLabel}>
                      {edge.source} ↔ {edge.target}
                    </Text>
                    <Text style={[styles.synergyValue, styles.synergyNegative]}>
                      {edge.weight.toFixed(2)}
                    </Text>
                  </View>
                ))}
            </>
          )}

          {synergy.nodes.length === 0 && synergy.edges.length === 0 && (
            <Text style={styles.cardTextMuted}>Not enough data yet</Text>
          )}
        </View>
      ) : null}

      {/* Hall of Fame */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hall of Fame</Text>
        {data.hallOfFame.messages.length === 0 ? (
          <Text style={styles.cardTextMuted}>No hall of fame messages yet</Text>
        ) : (
          data.hallOfFame.messages.slice(0, 5).map((msg, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.hofMessageRow}
              onPress={() => msg.breakdown && setSelectedMessage(msg.breakdown)}
            >
              <Text style={styles.hofScore}>{msg.score}</Text>
              <Text style={styles.hofContent} numberOfLines={2}>
                {msg.contentSnippet}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Message Breakdown Modal */}
      <Modal
        visible={selectedMessage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedMessage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedMessage && (
              <>
                <Text style={styles.modalTitle}>Message Breakdown</Text>
                <Text style={styles.modalScore}>Score: {selectedMessage.score}</Text>
                
                <Text style={styles.modalSectionTitle}>Traits:</Text>
                {TRAIT_KEYS.map((key) => (
                  <Text key={key} style={styles.modalTrait}>
                    {TraitLabels[key]}: {selectedMessage.traits[key] ?? 0}
                  </Text>
                ))}
                
                {selectedMessage.whyItWorked.length > 0 && (
                  <>
                    <Text style={styles.modalSectionTitle}>Why It Worked:</Text>
                    {selectedMessage.whyItWorked.map((reason, idx) => (
                      <Text key={idx} style={styles.modalBullet}>• {reason}</Text>
                    ))}
                  </>
                )}
                
                {selectedMessage.whatToImprove.length > 0 && (
                  <>
                    <Text style={styles.modalSectionTitle}>What To Improve:</Text>
                    {selectedMessage.whatToImprove.map((suggestion, idx) => (
                      <Text key={idx} style={styles.modalBullet}>• {suggestion}</Text>
                    ))}
                  </>
                )}
                
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setSelectedMessage(null)}
                >
                  <Text style={styles.modalCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
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
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#0B1220',
    fontWeight: '600',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  premiumLockCard: {
    borderRadius: 12,
    backgroundColor: '#1F2937',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  premiumLockTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  premiumLockText: {
    fontSize: 14,
    color: '#E5E7EB',
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
    fontWeight: '700',
    fontSize: 16,
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#111827',
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#F9FAFB',
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#E5E7EB',
    marginBottom: 4,
  },
  cardTextMuted: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  traitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  traitLabel: {
    fontSize: 14,
    color: '#E5E7EB',
    flex: 1,
  },
  traitValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
    marginRight: 12,
  },
  delta: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  deltaPositive: {
    color: '#22c55e',
  },
  deltaNegative: {
    color: '#EF4444',
  },
  insightsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  insightItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 4,
  },
  insightBody: {
    fontSize: 13,
    color: '#93C5FD',
  },
  insightRow: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  personaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  personaCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
    flex: 1,
  },
  personaScore: {
    fontSize: 14,
    color: '#22c55e',
    marginRight: 12,
  },
  biasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  biasKey: {
    fontSize: 13,
    color: '#E5E7EB',
    flex: 1,
  },
  biasFrequency: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  hofMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#1F2937',
    borderRadius: 8,
  },
  hofScore: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22c55e',
    marginRight: 12,
    minWidth: 40,
  },
  hofContent: {
    fontSize: 13,
    color: '#E5E7EB',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  modalScore: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 12,
  },
  modalContentText: {
    fontSize: 14,
    color: '#E5E7EB',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
    marginTop: 12,
    marginBottom: 8,
  },
  modalTrait: {
    fontSize: 13,
    color: '#E5E7EB',
    marginBottom: 4,
  },
  modalBullet: {
    fontSize: 13,
    color: '#E5E7EB',
    marginBottom: 4,
    marginLeft: 8,
  },
  modalCloseButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseButtonText: {
    color: '#F9FAFB',
    fontWeight: '600',
    fontSize: 16,
  },
  // Step 5.9: Synergy styles
  synergyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  synergyLabel: {
    fontSize: 13,
    color: '#E5E7EB',
    flex: 1,
    textTransform: 'capitalize',
  },
  synergyValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
    minWidth: 50,
    textAlign: 'right',
  },
  synergyNegative: {
    color: '#EF4444',
  },
});

