// socialsocial/src/screens/MissionEndScreen.tsx
// Step 5.3: Full-screen end-of-mission insights UI
//
// CONTRACTUAL REQUIREMENT: This screen MUST use ONLY MissionEndSelectedPack for all mission end data.
// The selectedPack is built by buildMissionEndSelectedPack() from raw API responses (SessionDTO, InsightsDTO).
// The screen must NOT access sessionResponse, insightsResponse, or any raw API DTOs directly in JSX or hooks.
// All UI sections (banner, rewards, messages, insights, traits, mood, synergy) are driven solely by selectedPack.
// This ensures a single source of truth and safe defaults for old sessions/missing data.

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PracticeStackParamList } from '../navigation/types';
import { fetchSessionById } from '../api/sessionsService';
import { fetchInsightsBySessionId } from '../api/insightsService';
import { buildMissionEndSelectedPack } from '../logic/missionEndPackBuilder';
import { fetchStatsSummary, fetchRotationPack, RotationPackResponse, fetchMoodTimeline } from '../api/statsService';
import { isFeatureLocked } from '../utils/featureGate';
import { MissionEndSelectedPack } from '../types/MissionEndTypes';
import { MoodTimelineResponse } from '../types/InsightsDTO';
import MoodTimelineCard from '../components/MoodTimelineCard';

type Props = NativeStackScreenProps<PracticeStackParamList, 'MissionEnd'>;

export default function MissionEndScreen({ route, navigation }: Props) {
  const { sessionId, templateId, personaId, missionId, title } = route.params;
  const flatListRef = useRef<FlatList>(null);
  const [highlightedTurnIndex, setHighlightedTurnIndex] = useState<number | null>(null);

  const [selectedPack, setSelectedPack] = useState<MissionEndSelectedPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insightsFailed, setInsightsFailed] = useState(false);
  // Step 5.12: Premium status and rotation pack
  const [isPremium, setIsPremium] = useState(false);
  const [rotationPack, setRotationPack] = useState<RotationPackResponse | null>(null);
  const [rotationLoading, setRotationLoading] = useState(false);
  
  // Mood timeline state (mission-specific)
  const [moodTimeline, setMoodTimeline] = useState<MoodTimelineResponse | null>(null);
  const [moodTimelineLoading, setMoodTimelineLoading] = useState(false);
  const [moodTimelineError, setMoodTimelineError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadPremiumStatus();
    loadRotationPack();
    loadMoodTimeline();
  }, [sessionId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setInsightsFailed(false);

    try {
      // Fetch session first (required)
      const session = await fetchSessionById(sessionId);

      // Fetch insights (optional, continue if fails)
      let insights = null;
      try {
        insights = await fetchInsightsBySessionId(sessionId);
      } catch (err: any) {
        console.warn('[MissionEndScreen] Insights fetch failed:', err);
        setInsightsFailed(true);
        // Continue without insights
      }

      // Build selectedPack
      const pack = buildMissionEndSelectedPack(session, insights);
      setSelectedPack(pack);
    } catch (err: any) {
      console.error('[MissionEndScreen] Failed to load session:', err);
      setError(err.message || 'Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  // Step 5.12: Load premium status (resilient - fallback to false on error)
  const loadPremiumStatus = async () => {
    try {
      const stats = await fetchStatsSummary();
      setIsPremium(stats.isPremium);
    } catch (err: any) {
      console.warn('[MissionEndScreen] Failed to load premium status:', err);
      // Fallback: assume not premium, but do NOT show a fatal error card
      setIsPremium(false);
    }
  };

  // Step 5.12: Load rotation pack (resilient - handles 404 gracefully)
  const loadRotationPack = async () => {
    setRotationLoading(true);
    try {
      const pack = await fetchRotationPack(sessionId, 'MISSION_END');
      setRotationPack(pack);
    } catch (err: any) {
      console.warn('[MissionEndScreen] Failed to load rotation pack:', err);
      // Continue without rotation pack (fallback to old insights)
      // Backend now returns empty pack instead of 404, so this should rarely happen
      setRotationPack(null);
    } finally {
      setRotationLoading(false);
    }
  };

  // Load mood timeline for this mission session
  const loadMoodTimeline = async () => {
    setMoodTimelineLoading(true);
    setMoodTimelineError(null);
    try {
      const response = await fetchMoodTimeline(sessionId);
      
      // Handle LockedResponse wrapper
      if (response.locked) {
        // For locked responses, we can show preview or just show "not available"
        setMoodTimeline(response.preview || null);
      } else {
        setMoodTimeline(response.full || null);
      }
    } catch (err: any) {
      // 404 or other errors - treat as "no data yet" (non-fatal)
      console.warn('[MissionEndScreen] Mood timeline not available for this session:', err);
      setMoodTimelineError(null); // Don't show error, just show "not available" message
      setMoodTimeline(null);
    } finally {
      setMoodTimelineLoading(false);
    }
  };

  const handlePracticeAgain = () => {
    navigation.replace('PracticeSession', {
      templateId: templateId || selectedPack?.session.templateId || undefined,
      personaId: personaId || selectedPack?.session.personaId || undefined,
      missionId,
      title,
    });
  };

  const handleBackToMissions = () => {
    navigation.navigate('PracticeHub');
  };

  const handleViewStats = () => {
    const parent = navigation.getParent();
    parent?.navigate('StatsTab');
  };

  // Build combined messages list for FlatList (top + bottom + referenced, maintaining order)
  const combinedMessages = useMemo(() => {
    if (!selectedPack) return [];
    // Combine messages: top messages first, then bottom, then referenced (sorted by turnIndex)
    return [
      ...selectedPack.topMessages.map(msg => ({ ...msg, section: 'top' as const })),
      ...selectedPack.bottomMessages.map(msg => ({ ...msg, section: 'bottom' as const })),
      ...selectedPack.referencedMessages.map(msg => ({ ...msg, section: 'referenced' as const })),
    ];
  }, [selectedPack]);

  // Map turnIndex -> FlatList index for scroll-to-message
  const turnIndexToFlatListIndex = useMemo(() => {
    const map = new Map<number, number>();
    combinedMessages.forEach((msg, index) => {
      map.set(msg.turnIndex, index);
    });
    return map;
  }, [combinedMessages]);

  // Check if a turnIndex is in the message list (for button enable/disable)
  const isTurnIndexInList = useMemo(() => {
    return (turnIndex: number) => turnIndexToFlatListIndex.has(turnIndex);
  }, [turnIndexToFlatListIndex]);

  const scrollToMessage = (turnIndex: number) => {
    const flatListIndex = turnIndexToFlatListIndex.get(turnIndex);
    
    if (flatListIndex !== undefined && flatListRef.current) {
      try {
        // Scroll FlatList to the message index
        flatListRef.current.scrollToIndex({ 
          index: flatListIndex, 
          animated: true,
          viewOffset: 50, // Offset from top for better visibility
          viewPosition: 0.3, // Position in viewport (0 = top, 1 = bottom, 0.5 = center)
        });
        
        // Brief highlight feedback
        setHighlightedTurnIndex(turnIndex);
        setTimeout(() => setHighlightedTurnIndex(null), 1500);
      } catch (error) {
        // Fail gracefully if scroll fails
        if (__DEV__) {
          console.warn(`[MissionEndScreen] scrollToIndex failed for turnIndex ${turnIndex}:`, error);
        }
      }
    } else {
      // Fail gracefully if turnIndex not found (log in dev mode only)
      if (__DEV__) {
        console.warn(`[MissionEndScreen] Could not find FlatList index for turnIndex ${turnIndex}`);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Loading mission results...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Failed to load session</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToMissions}>
            <Text style={styles.backButtonText}>Back to Missions</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedPack) {
    return null;
  }

  const { endReason, rewards, topMessages, bottomMessages, insightsV2, traitDeltas, analyzerParagraphs, moodTeaser } = selectedPack;

  // End reason banner colors
  const toneColors = {
    success: { bg: '#0f5132', border: '#198754', text: '#d1e7dd' },
    fail: { bg: '#5a1a1a', border: '#dc3545', text: '#f8d7da' },
    warning: { bg: '#5c4b00', border: '#ffc107', text: '#fff3cd' },
    danger: { bg: '#5a0b14', border: '#ff3b30', text: '#f8d7da' },
    neutral: { bg: '#1f2937', border: '#334155', text: '#e5e7eb' },
  };

  const colors = toneColors[endReason.tone] || toneColors.neutral;

  // ListHeaderComponent: Banner + Rewards
  const renderHeader = () => (
    <View>
      {/* End Reason Banner */}
      <View style={[styles.banner, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        {endReason.code === 'ABORT_DISQUALIFIED' && endReason.disqualifyNote && (
          <View style={styles.disqualifyBox}>
            <Text style={styles.disqualifyTitle}>DISQUALIFIED</Text>
            <Text style={styles.disqualifyText}>{endReason.disqualifyNote}</Text>
          </View>
        )}
        <Text style={[styles.bannerTitle, { color: colors.text }]}>{endReason.title}</Text>
        <Text style={[styles.bannerSubtitle, { color: colors.text }]}>{endReason.subtitle}</Text>
      </View>

      {/* Rewards Summary */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rewards</Text>
        <View style={styles.rewardsGrid}>
          <View style={styles.rewardItem}>
            <Text style={styles.rewardValue}>{rewards.xpGained}</Text>
            <Text style={styles.rewardLabel}>XP</Text>
          </View>
          <View style={styles.rewardItem}>
            <Text style={styles.rewardValue}>{rewards.coinsGained}</Text>
            <Text style={styles.rewardLabel}>Coins</Text>
          </View>
          <View style={styles.rewardItem}>
            <Text style={styles.rewardValue}>{rewards.gemsGained}</Text>
            <Text style={styles.rewardLabel}>Gems</Text>
          </View>
          <View style={styles.rewardItem}>
            <Text style={styles.rewardValue}>{rewards.score}</Text>
            <Text style={styles.rewardLabel}>Score</Text>
          </View>
        </View>
        {Object.keys(rewards.rarityCounts).length > 0 && (
          <View style={styles.rarityRow}>
            {Object.entries(rewards.rarityCounts).map(([rarity, count]) => (
              <View key={rarity} style={styles.rarityBadge}>
                <Text style={styles.rarityBadgeText}>{rarity}: {count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Reserved Badge Slot (Step 5.4 glue) */}
        <View style={styles.badgeSlotReserved}>
          <Text style={styles.badgeSlotLabel}>Unlocked / Progress</Text>
          <Text style={styles.badgeSlotPlaceholder}>Badges coming soon</Text>
        </View>
      </View>

      {/* Messages Section Header */}
      {combinedMessages.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Messages</Text>
        </View>
      )}
    </View>
  );

  // ListFooterComponent: Insights + Traits + Mood + Synergy
  const renderFooter = () => (
    <View>
      {/* Insights: Gate Fails */}
      {insightsV2.gateInsights.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gate Failures</Text>
          {insightsV2.gateInsights.map((insight) => {
            const hasRelatedTurnIndex = insight.relatedTurnIndex !== undefined;
            const isInList = hasRelatedTurnIndex && isTurnIndexInList(insight.relatedTurnIndex!);
            
            return (
              <View key={insight.id} style={styles.insightCard}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightBody}>{insight.body}</Text>
                {hasRelatedTurnIndex && (
                  <>
                    {isInList ? (
                      <TouchableOpacity
                        style={styles.highlightButton}
                        onPress={() => scrollToMessage(insight.relatedTurnIndex!)}
                      >
                        <Text style={styles.highlightButtonText}>Highlight Message</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.highlightButtonDisabled}>
                        <Text style={styles.highlightButtonDisabledText}>Message not in highlights</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        !insightsFailed && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Gate Failures</Text>
            <Text style={styles.emptyText}>Not enough data yet</Text>
          </View>
        )
      )}

      {/* Insights: Positive Hooks */}
      {insightsV2.positiveInsights.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Positive Highlights</Text>
          {insightsV2.positiveInsights.map((insight) => {
            const hasRelatedTurnIndex = insight.relatedTurnIndex !== undefined;
            const isInList = hasRelatedTurnIndex && isTurnIndexInList(insight.relatedTurnIndex!);
            
            return (
              <View key={insight.id} style={styles.insightCard}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightBody}>{insight.body}</Text>
                {hasRelatedTurnIndex && (
                  <>
                    {isInList ? (
                      <TouchableOpacity
                        style={styles.highlightButton}
                        onPress={() => scrollToMessage(insight.relatedTurnIndex!)}
                      >
                        <Text style={styles.highlightButtonText}>Highlight Message</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.highlightButtonDisabled}>
                        <Text style={styles.highlightButtonDisabledText}>Message not in highlights</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        !insightsFailed && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Positive Highlights</Text>
            <Text style={styles.emptyText}>Not enough data yet</Text>
          </View>
        )
      )}

      {/* Insights: Negative Patterns */}
      {insightsV2.negativeInsights.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Areas to Improve</Text>
          {insightsV2.negativeInsights.map((insight) => {
            const hasRelatedTurnIndex = insight.relatedTurnIndex !== undefined;
            const isInList = hasRelatedTurnIndex && isTurnIndexInList(insight.relatedTurnIndex!);
            
            return (
              <View key={insight.id} style={styles.insightCard}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightBody}>{insight.body}</Text>
                {hasRelatedTurnIndex && (
                  <>
                    {isInList ? (
                      <TouchableOpacity
                        style={styles.highlightButton}
                        onPress={() => scrollToMessage(insight.relatedTurnIndex!)}
                      >
                        <Text style={styles.highlightButtonText}>Highlight Message</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.highlightButtonDisabled}>
                        <Text style={styles.highlightButtonDisabledText}>Message not in highlights</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          })}
        </View>
      ) : (
        !insightsFailed && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Areas to Improve</Text>
            <Text style={styles.emptyText}>Not enough data yet</Text>
          </View>
        )
      )}

      {/* Step 5.9: Analyzer Paragraphs */}
      {analyzerParagraphs && analyzerParagraphs.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Deep Insights</Text>
          {analyzerParagraphs.map((paragraph) => (
            <View key={paragraph.id} style={styles.insightCard}>
              <Text style={styles.insightTitle}>{paragraph.title}</Text>
              <Text style={styles.insightBody}>{paragraph.body}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Trait Deltas */}
      {Object.keys(traitDeltas).length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trait Changes</Text>
          {Object.entries(traitDeltas).map(([trait, delta]) => (
            <View key={trait} style={styles.traitRow}>
              <Text style={styles.traitName}>{trait}</Text>
              <Text style={[styles.traitDelta, delta >= 0 ? styles.traitDeltaPositive : styles.traitDeltaNegative]}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trait Changes</Text>
          <Text style={styles.emptyText}>No trait change yet</Text>
        </View>
      )}

      {/* Mood Timeline Card (mission-specific) */}
      <MoodTimelineCard
        moodTimeline={moodTimeline}
        loading={moodTimelineLoading}
        error={moodTimelineError}
      />

      {/* Step 5.12: Premium Teaser for Filtered Insights */}
      {(() => {
        const rotationMeta = rotationPack?.meta;
        const filteredBecausePremium = rotationMeta?.filteredBecausePremium ?? 0;
        const totalAvailable = rotationMeta?.totalAvailable ?? rotationPack?.selectedInsights?.length ?? 0;
        const isPremiumUser = rotationMeta?.isPremiumUser ?? isPremium;
        const hasLockedInsights = !isPremiumUser && filteredBecausePremium > 0;

        return hasLockedInsights ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>More Insights Available</Text>
            <Text style={styles.moodText}>
              +{filteredBecausePremium} more insight{filteredBecausePremium > 1 ? 's' : ''} unlocked on Premium
            </Text>
            <TouchableOpacity
              style={styles.premiumCta}
              onPress={() => {
                handleViewStats();
              }}
            >
              <Text style={styles.premiumCtaText}>
                🔒 Upgrade to Premium
              </Text>
            </TouchableOpacity>
          </View>
        ) : null;
      })()}

      {/* Synergy Teaser (Locked) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Synergy Analysis</Text>
        <Text style={styles.lockedText}>🔒 Coming soon</Text>
      </View>

      {/* Spacer for bottom CTAs */}
      <View style={styles.spacer} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={combinedMessages}
        keyExtractor={(item, index) => `msg-${item.turnIndex}-${index}`}
        renderItem={({ item: msg, index }) => {
          const isHighlighted = highlightedTurnIndex === msg.turnIndex;
          const isTopSection = msg.section === 'top';
          const isBottomSection = msg.section === 'bottom';
          const topCount = topMessages.length;
          const shouldShowTopHeader = isTopSection && index === 0;
          const shouldShowBottomHeader = isBottomSection && index === topCount;
          
          return (
            <View style={styles.messageCardContainer}>
              {shouldShowTopHeader && (
                <Text style={styles.sectionLabel}>Top Messages</Text>
              )}
              {shouldShowBottomHeader && (
                <Text style={styles.sectionLabel}>Bottom Messages</Text>
              )}
              <View
                style={[
                  styles.messageCard,
                  isHighlighted && styles.messageCardHighlighted,
                ]}
              >
                <View style={styles.messageHeader}>
                  <Text style={styles.messageIndex}>#{msg.turnIndex + 1}</Text>
                  {msg.rarity && (
                    <View style={styles.rarityTag}>
                      <Text style={styles.rarityTagText}>{msg.rarity}</Text>
                    </View>
                  )}
                  <Text style={styles.messageScore}>Score: {msg.score}</Text>
                </View>
                <Text style={styles.messageContent}>{msg.content}</Text>
              </View>
            </View>
          );
        }}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.flatListContent}
        onScrollToIndexFailed={(info) => {
          // Fallback: scroll to nearest valid index
          if (__DEV__) {
            console.warn(`[MissionEndScreen] scrollToIndex failed:`, info);
          }
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToIndex({
                index: Math.min(info.index, Math.max(0, combinedMessages.length - 1)),
                animated: true,
              });
            }
          });
        }}
      />

      {/* Sticky Bottom CTAs */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity style={[styles.ctaButton, styles.ctaSecondary]} onPress={handlePracticeAgain}>
          <Text style={styles.ctaSecondaryText}>Practice Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctaButton, styles.ctaSecondary]} onPress={handleBackToMissions}>
          <Text style={styles.ctaSecondaryText}>Back to Missions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.ctaButton, styles.ctaPrimary]} onPress={handleViewStats}>
          <Text style={styles.ctaPrimaryText}>View Full Stats</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  flatListContent: {
    padding: 16,
    paddingBottom: 100, // Space for sticky CTAs
  },
  messageCardContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#e5e7eb',
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  backButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#e5e7eb',
    fontWeight: '600',
  },
  banner: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  disqualifyBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  disqualifyTitle: {
    color: '#ff3b30',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 4,
  },
  disqualifyText: {
    color: '#f8d7da',
    fontSize: 13,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    opacity: 0.9,
  },
  card: {
    backgroundColor: '#0b1220',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  rewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  rewardItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rewardValue: {
    color: '#22c55e',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  rewardLabel: {
    color: '#9ca3af',
    fontSize: 12,
  },
  rarityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  rarityBadge: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  rarityBadgeText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeSlotReserved: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#111827',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  badgeSlotLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  badgeSlotPlaceholder: {
    color: '#64748b',
    fontSize: 11,
  },
  messageCard: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  messageCardHighlighted: {
    backgroundColor: '#1e3a5f',
    borderWidth: 2,
    borderColor: '#60a5fa',
  },
  sectionLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  messageIndex: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
  },
  rarityTag: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rarityTagText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '700',
  },
  messageScore: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  messageContent: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20,
  },
  insightCard: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  insightTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  insightBody: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  highlightButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  highlightButtonText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
  },
  highlightButtonDisabled: {
    alignSelf: 'flex-start',
    backgroundColor: '#1f2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    opacity: 0.5,
  },
  highlightButtonDisabledText: {
    color: '#9ca3af',
    fontSize: 11,
    fontStyle: 'italic',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    fontStyle: 'italic',
  },
  traitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  traitName: {
    color: '#e5e7eb',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  traitDelta: {
    fontSize: 14,
    fontWeight: '700',
  },
  traitDeltaPositive: {
    color: '#22c55e',
  },
  traitDeltaNegative: {
    color: '#ef4444',
  },
  moodText: {
    color: '#e5e7eb',
    fontSize: 14,
    marginBottom: 8,
  },
  premiumCta: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1f2937',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#374151',
  },
  premiumCtaText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  lockedText: {
    color: '#64748b',
    fontSize: 13,
    fontStyle: 'italic',
  },
  spacer: {
    height: 20,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#020617',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    padding: 16,
    flexDirection: 'row',
    gap: 8,
  },
  ctaButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaPrimary: {
    backgroundColor: '#22c55e',
  },
  ctaPrimaryText: {
    color: '#0b1220',
    fontWeight: '700',
    fontSize: 14,
  },
  ctaSecondary: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#334155',
  },
  ctaSecondaryText: {
    color: '#e5e7eb',
    fontWeight: '600',
    fontSize: 14,
  },
});

