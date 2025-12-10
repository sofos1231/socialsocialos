# Entitlements Test Matrix - Step 5.12

This document outlines the expected behavior for premium endpoints across free and premium user tiers.

## Test Matrix

| Endpoint | Free User | Premium User |
|----------|-----------|--------------|
| `/v1/stats/advanced` | `locked: true` + preview (limited data) | `locked: false` + full data |
| `/v1/stats/synergy` | `locked: true` + preview (limited nodes/edges) | `locked: false` + full correlation matrix |
| `/v1/stats/mood/session/:id` | `locked: true` + preview (current mood only) | `locked: false` + full timeline with snapshots |
| `/v1/analyzer/lists` | `locked: true` + preview (2 positive, 2 negative) | `locked: false` + full lists |
| `/v1/analyzer/analyze` | `locked: true` + preview (no deep paragraphs) | `locked: false` + full breakdown with paragraphs |
| `/v1/insights/rotation/:sessionId` | Filtered insights (premium removed) | All insights (no filtering) |

## LockedResponse Structure

All premium endpoints return `LockedResponse<T>`:

```typescript
{
  locked: boolean;
  featureKey?: FeatureKey;
  preview?: T;  // For free users
  full?: T;     // For premium users
  upsell?: {
    title: string;
    body: string;
    ctaLabel: string;
  };
}
```

## Rotation Pack Meta

Rotation packs include premium metadata:

```typescript
{
  meta: {
    totalAvailable: number;           // Total insights in base pack
    filteredBecausePremium: number;   // Count filtered for free users
    isPremiumUser: boolean;           // Current user premium status
    premiumInsightIds: string[];      // IDs of premium insights (empty for premium)
    pickedIds: string[];              // IDs visible to current user
  }
}
```

## Deterministic Behavior

- **Base packs**: Always generated deterministically (same candidates → same base pack)
- **Preview data**: Deterministic subset of full data (no random sampling)
- **Filtering**: Premium filtering happens on read, not during generation

## Test Cases

### Free User
1. ✅ `/stats/advanced` returns `locked: true` with preview
2. ✅ `/stats/synergy` returns `locked: true` with preview
3. ✅ `/stats/mood/session/:id` returns `locked: true` with preview
4. ✅ `/analyzer/lists` returns `locked: true` with preview
5. ✅ `/analyzer/analyze` returns `locked: true` with preview
6. ✅ `/insights/rotation/:sessionId` filters premium insights
7. ✅ `meta.filteredBecausePremium > 0` when premium insights exist
8. ✅ `meta.pickedIds.length === selectedInsights.length`

### Premium User
1. ✅ `/stats/advanced` returns `locked: false` with full data
2. ✅ `/stats/synergy` returns `locked: false` with full data
3. ✅ `/stats/mood/session/:id` returns `locked: false` with full data
4. ✅ `/analyzer/lists` returns `locked: false` with full data
5. ✅ `/analyzer/analyze` returns `locked: false` with full data
6. ✅ `/insights/rotation/:sessionId` includes all insights
7. ✅ `meta.filteredBecausePremium === 0`
8. ✅ `meta.totalAvailable === selectedInsights.length === meta.pickedIds.length`

### Edge Cases
1. ✅ User upgrades mid-session: Next rotation pack call shows premium insights
2. ✅ User downgrades mid-session: Next rotation pack call filters premium insights
3. ✅ Base pack persists unchanged regardless of user tier changes
4. ✅ Preview data is deterministic (same input → same preview)

