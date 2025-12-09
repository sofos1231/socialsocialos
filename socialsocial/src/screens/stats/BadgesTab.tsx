// socialsocial/src/screens/stats/BadgesTab.tsx
// Step 5.4: Badges tab UI

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { fetchBadges, BadgeDTO, BadgesResponse } from '../../api/statsService';
import { CategoryKey, CategoryLabels, CategoryIcons } from '../../logic/categoryTaxonomy';

const TIER_LABELS: Record<number, string> = {
  0: 'None',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Diamond',
};

const TIER_COLORS: Record<number, string> = {
  0: '#9CA3AF',
  1: '#CD7F32',
  2: '#C0C0C0',
  3: '#FFD700',
  4: '#B9F2FF',
};

export default function BadgesTab() {
  const [badges, setBadges] = useState<BadgeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: BadgesResponse = await fetchBadges();
      setBadges(response.badges || []);
    } catch (err: any) {
      console.error('[BadgesTab] Failed to load badges:', err);
      setError(err.message || 'Failed to load badges');
    } finally {
      setLoading(false);
    }
  };

  // Group badges by category
  const badgesByCategory = badges.reduce((acc, badge) => {
    const category = badge.categoryKey as CategoryKey;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(badge);
    return acc;
  }, {} as Record<CategoryKey, BadgeDTO[]>);

  const renderBadgeCard = (badge: BadgeDTO) => {
    const tierLabel = TIER_LABELS[badge.tier] || 'None';
    const tierColor = TIER_COLORS[badge.tier] || '#9CA3AF';
    const progress = badge.nextThreshold > 0 ? (badge.points / badge.nextThreshold) * 100 : 0;

    return (
      <View key={badge.badgeKey} style={styles.badgeCard}>
        <View style={styles.badgeHeader}>
          <Text style={styles.badgeName}>{badge.name}</Text>
          <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
            <Text style={styles.tierText}>{tierLabel}</Text>
          </View>
        </View>
        <Text style={styles.badgeDescription}>{badge.description}</Text>

        {/* Progress bar */}
        {badge.tier < 4 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min(100, progress)}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {badge.points} / {badge.nextThreshold} points
            </Text>
          </View>
        )}

        {/* Rewards preview */}
        <View style={styles.rewardsRow}>
          <Text style={styles.rewardsLabel}>Current rewards:</Text>
          <View style={styles.rewardsValues}>
            {badge.rewards.xp > 0 && (
              <Text style={styles.rewardText}>{badge.rewards.xp} XP</Text>
            )}
            {badge.rewards.coins > 0 && (
              <Text style={styles.rewardText}>{badge.rewards.coins} coins</Text>
            )}
            {badge.rewards.gems && badge.rewards.gems > 0 && (
              <Text style={styles.rewardText}>{badge.rewards.gems} gems</Text>
            )}
          </View>
        </View>

        {/* Next tier rewards */}
        {badge.nextTierRewards && (
          <View style={styles.nextTierRow}>
            <Text style={styles.nextTierLabel}>Next tier rewards:</Text>
            <View style={styles.rewardsValues}>
              {badge.nextTierRewards.xp > 0 && (
                <Text style={styles.rewardText}>{badge.nextTierRewards.xp} XP</Text>
              )}
              {badge.nextTierRewards.coins > 0 && (
                <Text style={styles.rewardText}>{badge.nextTierRewards.coins} coins</Text>
              )}
              {badge.nextTierRewards.gems && badge.nextTierRewards.gems > 0 && (
                <Text style={styles.rewardText}>{badge.nextTierRewards.gems} gems</Text>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading badges...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load badges</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBadges}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      {Object.entries(badgesByCategory).map(([categoryKey, categoryBadges]) => {
        const category = categoryKey as CategoryKey;
        return (
          <View key={category} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryIcon}>{CategoryIcons[category]}</Text>
              <Text style={styles.categoryTitle}>{CategoryLabels[category]}</Text>
            </View>
            {categoryBadges.map(renderBadgeCard)}
          </View>
        );
      })}
      {badges.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No badges yet. Complete missions to earn badges!</Text>
        </View>
      )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingText: {
    color: '#E5E7EB',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorDetail: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  badgeCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  badgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
    flex: 1,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  tierText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeDescription: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 12,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#1F2937',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
  },
  progressText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rewardsLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  rewardsValues: {
    flexDirection: 'row',
    gap: 8,
  },
  rewardText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
  },
  nextTierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  nextTierLabel: {
    fontSize: 12,
    color: '#FBBF24',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

