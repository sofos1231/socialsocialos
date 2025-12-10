# SCOUT REPORT — Step 5.12 (Premium Gating & Rotation Integration)

**Date:** Generated after Step 5.11 implementation  
**Mode:** Read-only analysis  
**Purpose:** Map current premium gating state and identify gaps for Step 5.12 implementation

---

## 1. Current State Summary

### 1.1 Backend Premium Representation

**Database Schema:**
- `User.tier`: `AccountTier` enum with values `FREE` (default) and `PREMIUM`
- Located in: `backend/prisma/schema.prisma` line 21
- No `PREMIUM_PLUS` tier exists in enum (but code checks for it)

**Premium Status Lookup:**
- Pattern: `user?.tier === 'PREMIUM' || user?.tier === 'PREMIUM_PLUS'`
- Used in:
  - `backend/src/modules/stats/stats.service.ts` (line 660): `isPremium = user?.tier === 'PREMIUM'`
  - `backend/src/modules/rotation/rotation.service.ts` (line 386): Checks both `PREMIUM` and `PREMIUM_PLUS`

**Issue:** Code checks for `PREMIUM_PLUS` but enum only has `FREE` and `PREMIUM`. This is a mismatch.

### 1.2 Frontend Premium Representation

**Feature Gate System:**
- File: `socialsocial/src/utils/featureGate.ts`
- Feature keys: `'ADVANCED_METRICS' | 'PREMIUM_BADGES' | 'MESSAGE_ANALYZER'`
- Premium features: `['ADVANCED_METRICS', 'MESSAGE_ANALYZER']`
- Function: `isFeatureLocked(featureKey, isPremium)` returns `true` if locked

**Premium Status Source:**
- Frontend gets `isPremium` from `fetchStatsSummary()` → `StatsSummaryResponse.isPremium`
- Backend endpoint: `/stats/summary` returns `isPremium: boolean`
- Used in:
  - `StatsScreen.tsx` (line 28): State variable `isPremium`
  - `AdvancedTab.tsx` (line 22): Prop `isPremium: boolean`
  - `SocialTipsTab.tsx` (line 28): Prop `isPremium: boolean`

**Screens with Premium Gating:**
1. **AdvancedTab** (`socialsocial/src/screens/stats/AdvancedTab.tsx`):
   - Uses `isFeatureLocked('ADVANCED_METRICS', isPremium)`
   - Shows premium lock card if locked
   - Blocks loading of synergy and mood timeline if locked (line 53)

2. **SocialTipsTab** (`socialsocial/src/screens/stats/SocialTipsTab.tsx`):
   - Uses `isFeatureLocked('MESSAGE_ANALYZER', isPremium)`
   - Shows premium lock UI if locked

3. **MissionEndScreen** (`socialsocial/src/screens/MissionEndScreen.tsx`):
   - Has premium CTA for mood timeline (line 420-430)
   - Uses hardcoded `isFeatureLocked('ADVANCED_METRICS', false)` (line 421)
   - **Issue:** Hardcoded `false` instead of actual premium status

---

## 2. Rotation Engine Premium Handling (Step 5.11)

### 2.1 CandidateInsight Structure

**Location:** `backend/src/modules/insights/insights.types.ts` (lines 221-241)

**Fields:**
- ✅ `source: InsightSource` (GATES | HOOKS | PATTERNS | GENERAL | MOOD | SYNERGY | ANALYZER)
- ✅ `isPremium?: boolean` (optional premium flag)
- ✅ `surfaces?: RotationSurface[]` (target surfaces)
- ✅ `title?: string` (preserved from InsightCard)
- ✅ `body?: string` (preserved from InsightCard)
- ✅ `relatedTurnIndex?: number`

**InsightKind includes:** `'MOOD' | 'SYNERGY' | 'ANALYZER_PARAGRAPH'` ✅

### 2.2 RotationService.filterPremium()

**Location:** `backend/src/modules/rotation/rotation.service.ts` (lines 174-179)

**Logic:**
```typescript
filterPremium(candidates: CandidateInsight[], isPremium: boolean): CandidateInsight[] {
  if (isPremium) {
    return candidates; // Premium users see all insights
  }
  // Free users: exclude premium insights
  return candidates.filter((candidate) => !candidate.isPremium);
}
```

**Behavior:**
- Premium users: See all candidates (no filtering)
- Free users: Filter out candidates where `isPremium === true`
- **Deterministic:** Yes, filtering happens before sorting, so order is stable

### 2.3 buildAndPersistRotationPack()

**Location:** `backend/src/modules/rotation/rotation.service.ts` (lines 370-419)

**Premium Status Loading:**
- Line 382-386: Loads user from DB
- Line 386: `isPremium = user?.tier === 'PREMIUM' || user?.tier === 'PREMIUM_PLUS'`
- Line 392: Passes `isPremium` to `selectRotationPack()`

**Persistence:**
- Saves pack to `MissionDeepInsights.insightsJson.rotationPacks[surface]`
- **Issue:** Pack is saved with premium filtering already applied. If user upgrades later, saved pack still has filtered insights.

### 2.4 getRotationPackForSurface()

**Location:** `backend/src/modules/rotation/rotation.service.ts` (lines 430-461)

**Behavior:**
- Line 436-444: Loads saved pack from `MissionDeepInsights`
- Line 454: If saved pack exists, returns it directly
- Line 460: If no saved pack, calls `buildAndPersistRotationPack()` (which applies premium filtering)

**Critical Issue:**
- Saved packs are returned as-is without re-checking premium status
- If pack was saved when user was FREE, it will always return filtered insights even if user upgrades
- If pack was saved when user was PREMIUM, it may include premium insights even if user downgrades

### 2.5 RotationPackResponse Meta

**Location:** `backend/src/modules/rotation/rotation.types.ts` (lines 39-51)

**Current Meta Fields:**
- `seed: string`
- `excludedIds: string[]`
- `pickedIds: string[]`
- `quotas: RotationQuotas`
- `version: 'v1'`

**Missing Premium Metadata:**
- ❌ No `totalAvailable` count (before premium filtering)
- ❌ No `filteredBecausePremium` count
- ❌ No `isPremiumUser` flag (to know what state pack was generated in)
- ❌ No `premiumInsightIds` array (which insights were filtered out)

---

## 3. Insight Sources Premium Wiring

### 3.1 Insight Source Premium Map

| Source | File/Method | Currently sets isPremium? | Expected behavior? |
|--------|-------------|--------------------------|-------------------|
| **Deep insights** | `insights.service.getCandidatesForRotation()` | ✅ Yes (line 606): `isPremium: card.isPremium ?? false` | **Mixed**: Preserves from InsightCard. Some insights may be premium, some free. |
| **Mood** | `mood.service.getMoodCandidatesForRotation()` | ❌ No (line 399): Hardcoded `isPremium: false` | **Unknown**: Comment says "Can be extended later". Likely should be free for basic mood insights, premium for advanced. |
| **Synergy** | `synergy.service.getSynergyCandidatesForRotation()` | ❌ No (line 388): Hardcoded `isPremium: false` | **Unknown**: Comment says "Can be extended later". Likely should be premium (advanced analytics). |
| **Analyzer** | `analyzer.service.getParagraphCandidatesForRotation()` | ❌ No (line 270): Hardcoded `isPremium: false` | **Unknown**: Comment says "Can be extended later". Analyzer is behind `MESSAGE_ANALYZER` feature gate, so likely premium. |

### 3.2 Detailed Analysis

**Deep Insights (`insights.service.ts`):**
- Converts existing `InsightCard[]` to `CandidateInsight[]`
- Preserves `card.isPremium` if present, defaults to `false`
- **Issue:** We don't know which InsightCards have `isPremium: true` set. Need to check insight catalog/registry.

**Mood Insights (`mood.service.ts`):**
- All mood insights currently marked as free (`isPremium: false`)
- Comment: "Step 5.11: Can be extended later with premium flag"
- **Recommendation:** Basic mood state insights should be free, advanced mood analysis should be premium.

**Synergy Insights (`synergy.service.ts`):**
- All synergy insights currently marked as free (`isPremium: false`)
- Comment: "Step 5.11: Can be extended later"
- **Recommendation:** Synergy insights are advanced analytics, should likely be premium.

**Analyzer Paragraphs (`analyzer.service.ts`):**
- All analyzer paragraphs currently marked as free (`isPremium: false`)
- Comment: "Step 5.11: Can be extended later"
- **Recommendation:** Analyzer is behind `MESSAGE_ANALYZER` feature gate, so paragraphs should be premium.

---

## 4. Frontend Consumption of Rotation Packs

### 4.1 Current Usage

**API Client:**
- `fetchRotationPack(sessionId, surface)` exists in `socialsocial/src/api/statsService.ts` (line 334)
- Returns `RotationPackResponse`

**No Current Consumption:**
- ❌ `MissionEndScreen.tsx`: Does NOT use `fetchRotationPack()` yet
- ❌ `AdvancedTab.tsx`: Does NOT use `fetchRotationPack()` yet
- ❌ No other screens consume rotation packs

**Current Insight Display:**
- `MissionEndScreen` uses `buildMissionEndSelectedPack()` which reads from `InsightsDTO.insightsV2`
- `AdvancedTab` loads insights separately (not using rotation pack)

### 4.2 Potential Conflicts

**Frontend Gating vs Backend Filtering:**
- Frontend: `isFeatureLocked('ADVANCED_METRICS', isPremium)` blocks entire AdvancedTab
- Backend: `filterPremium()` removes premium insights from rotation pack
- **Conflict:** If frontend allows access but backend filters, user sees fewer insights than expected
- **Conflict:** If frontend blocks access but backend doesn't filter, user never sees the pack

**MissionEndScreen:**
- Currently uses hardcoded `isFeatureLocked('ADVANCED_METRICS', false)` (line 421)
- Should use actual premium status from session/user
- **Issue:** No premium status available in MissionEndScreen currently

---

## 5. Gaps / Missing Glue

### 5.1 Backend Tasks

#### 5.1.1 Premium Status Helper
**Need:** Centralized helper function
```typescript
async isUserPremium(userId: string): Promise<boolean>
```
- Location: Create `backend/src/modules/users/users.service.ts` or shared helper
- Purpose: Single source of truth for premium check
- Should handle: `PREMIUM` and `PREMIUM_PLUS` (if added to enum)

#### 5.1.2 getRotationPackForSurface() Premium Re-check
**Issue:** Saved packs don't respect current premium status
**Fix:** 
- Option A: Re-filter saved pack based on current premium status
- Option B: Don't save premium-filtered packs, always filter on read
- Option C: Save both free and premium versions, return based on current status

**Recommendation:** Option B (don't save filtered packs, always filter on read)

#### 5.1.3 Rotation Meta Enhancement
**Need:** Add premium metadata to `RotationPackResponse.meta`
```typescript
meta: {
  seed: string;
  excludedIds: string[];
  pickedIds: string[];
  quotas: RotationQuotas;
  version: 'v1';
  // NEW:
  totalAvailable?: number; // Before premium filtering
  filteredBecausePremium?: number; // Count of premium insights filtered
  isPremiumUser?: boolean; // State when pack was generated
  premiumInsightIds?: string[]; // IDs that were filtered (for teasers)
}
```

#### 5.1.4 Candidate Exporter Premium Flags
**Need:** Mark insights as premium based on business rules:
- **Mood:** Basic insights free, advanced analysis premium
- **Synergy:** All synergy insights premium (advanced analytics)
- **Analyzer:** All analyzer paragraphs premium (behind MESSAGE_ANALYZER gate)
- **Deep Insights:** Check insight catalog to determine which are premium

### 5.2 Frontend Tasks

#### 5.2.1 MissionEndScreen Premium Status
**Need:** Get premium status in MissionEndScreen
- Option A: Fetch from `fetchStatsSummary()`
- Option B: Pass as route param
- Option C: Get from session/user context

**Recommendation:** Option A (fetch on mount)

#### 5.2.2 Rotation Pack Integration
**Need:** Replace direct insight access with rotation pack:
- `MissionEndScreen`: Use `fetchRotationPack(sessionId, 'MISSION_END')`
- `AdvancedTab`: Use `fetchRotationPack(sessionId, 'ADVANCED_TAB')`
- Map `RotationPackResponse.selectedInsights` to existing UI components

#### 5.2.3 Premium Teaser UI
**Need:** Show "X more insights available on Premium" when:
- `meta.filteredBecausePremium > 0`
- User is free tier
- Display count and CTA to upgrade

#### 5.2.4 Feature Gate Alignment
**Need:** Ensure frontend gates match backend filtering:
- `ADVANCED_METRICS` gate should align with `ADVANCED_TAB` rotation surface
- `MESSAGE_ANALYZER` gate should align with `ANALYZER` rotation surface
- Consider adding `ROTATION_INSIGHTS` feature key if needed

### 5.3 Edge Cases

#### 5.3.1 Old Sessions Without Rotation Packs
**Current:** `getRotationPackForSurface()` recomputes if pack missing
**Issue:** Old sessions may not have all required data (mood timeline, synergy, etc.)
**Fix:** Graceful degradation, return partial pack

#### 5.3.2 Premium Status Changes
**Scenario:** User upgrades/downgrades between pack generation and consumption
**Current:** Saved pack reflects old premium status
**Fix:** Always re-check premium status on read (don't trust saved pack)

#### 5.3.3 Determinism
**Requirement:** Premium filtering must not break determinism
**Current:** ✅ Filtering happens before sorting, so order is stable
**Risk:** If premium status changes, different insights selected (expected behavior)

---

## 6. Exact Files & Functions to Touch

### 6.1 Backend Files

1. **`backend/src/modules/users/users.service.ts`** (or create if missing)
   - Add: `async isUserPremium(userId: string): Promise<boolean>`

2. **`backend/src/modules/rotation/rotation.service.ts`**
   - Modify: `getRotationPackForSurface()` - Re-check premium and re-filter saved packs
   - Modify: `buildAndPersistRotationPack()` - Don't save premium-filtered packs (or save both)
   - Modify: `selectRotationPack()` - Add premium metadata to meta

3. **`backend/src/modules/rotation/rotation.types.ts`**
   - Extend: `RotationPackResponse.meta` with premium metadata fields

4. **`backend/src/modules/mood/mood.service.ts`**
   - Modify: `getMoodCandidatesForRotation()` - Set `isPremium: true` for advanced mood insights

5. **`backend/src/modules/synergy/synergy.service.ts`**
   - Modify: `getSynergyCandidatesForRotation()` - Set `isPremium: true` for all synergy insights

6. **`backend/src/modules/analyzer/analyzer.service.ts`**
   - Modify: `getParagraphCandidatesForRotation()` - Set `isPremium: true` for all analyzer paragraphs

7. **`backend/src/modules/insights/insights.service.ts`**
   - Review: Which InsightCards have `isPremium: true`? Check insight catalog
   - May need to update catalog to mark premium insights

8. **`backend/prisma/schema.prisma`**
   - Review: Add `PREMIUM_PLUS` to `AccountTier` enum if needed, or remove checks for it

### 6.2 Frontend Files

1. **`socialsocial/src/screens/MissionEndScreen.tsx`**
   - Add: Fetch premium status on mount
   - Modify: Use `fetchRotationPack(sessionId, 'MISSION_END')` instead of direct insights
   - Modify: Fix hardcoded `isFeatureLocked('ADVANCED_METRICS', false)` to use actual premium status
   - Add: Premium teaser UI if `meta.filteredBecausePremium > 0`

2. **`socialsocial/src/screens/stats/AdvancedTab.tsx`**
   - Modify: Use `fetchRotationPack(sessionId, 'ADVANCED_TAB')` for insights
   - Add: Premium teaser UI for filtered insights

3. **`socialsocial/src/utils/featureGate.ts`**
   - Review: Add `ROTATION_INSIGHTS` feature key if needed
   - Ensure alignment with backend filtering

4. **`socialsocial/src/api/statsService.ts`**
   - Already has `fetchRotationPack()` ✅
   - May need to extend `RotationPackResponse` type to match backend meta changes

---

## 7. Risks & Edge Cases

### 7.1 Data Consistency Risks

**Risk:** Saved rotation packs become stale when premium status changes
**Mitigation:** Always re-check premium status on read, don't trust saved pack

**Risk:** Premium status check happens at different times (generation vs consumption)
**Mitigation:** Use same helper function `isUserPremium()` everywhere

### 7.2 Performance Risks

**Risk:** Re-filtering saved packs on every read may be slow
**Mitigation:** Cache premium status in request context, only re-filter if needed

**Risk:** Loading premium status for every rotation pack request
**Mitigation:** Consider caching user tier in JWT or request context

### 7.3 UX Risks

**Risk:** Free users see "0 insights" if all insights are premium
**Mitigation:** Ensure at least some insights are always free (gates, hooks, basic tips)

**Risk:** Premium users see fewer insights if pack was generated when they were free
**Mitigation:** Re-filter on read, or regenerate pack if premium status changed

**Risk:** Inconsistent behavior between frontend gating and backend filtering
**Mitigation:** Align feature gates with rotation surfaces, document clearly

### 7.4 Determinism Risks

**Risk:** Premium filtering changes selection order unpredictably
**Current:** ✅ Filtering happens before sorting, so order is stable
**Mitigation:** Keep filtering before sorting, document behavior

**Risk:** Different users see different insights for same session
**Expected:** Yes, this is by design (premium vs free)
**Mitigation:** Document clearly, ensure free users always get some insights

---

## 8. Definition of Done (Step 5.12)

### 8.1 Backend Checklist

- [ ] Create `isUserPremium(userId)` helper function
- [ ] Fix `getRotationPackForSurface()` to re-check premium status
- [ ] Add premium metadata to `RotationPackResponse.meta`
- [ ] Mark mood insights as premium where appropriate
- [ ] Mark synergy insights as premium (all)
- [ ] Mark analyzer paragraphs as premium (all)
- [ ] Review and mark deep insights as premium where appropriate
- [ ] Fix `PREMIUM_PLUS` enum mismatch (add to enum or remove checks)
- [ ] Add tests for premium filtering behavior

### 8.2 Frontend Checklist

- [ ] Add premium status fetch to `MissionEndScreen`
- [ ] Integrate `fetchRotationPack()` in `MissionEndScreen`
- [ ] Integrate `fetchRotationPack()` in `AdvancedTab`
- [ ] Fix hardcoded premium check in `MissionEndScreen`
- [ ] Add premium teaser UI showing filtered insight count
- [ ] Align feature gates with rotation surfaces
- [ ] Update `RotationPackResponse` type to match backend meta

### 8.3 Testing Checklist

- [ ] Test free user sees only free insights
- [ ] Test premium user sees all insights
- [ ] Test upgrade scenario (free → premium, pack regenerates)
- [ ] Test downgrade scenario (premium → free, pack filters)
- [ ] Test old sessions without rotation packs
- [ ] Test determinism (same user, same session = same insights)
- [ ] Test premium teaser shows correct count

---

## 9. Recommendations

### 9.1 Immediate Priorities

1. **Fix Premium Status Re-check:** `getRotationPackForSurface()` must re-check premium status
2. **Mark Insight Sources:** Set `isPremium: true` for synergy and analyzer insights
3. **Add Premium Metadata:** Include counts in rotation pack meta for teasers
4. **Fix MissionEndScreen:** Remove hardcoded premium check, fetch actual status

### 9.2 Architecture Decisions Needed

1. **Save Strategy:** Should we save premium-filtered packs or always filter on read?
   - **Recommendation:** Don't save filtered packs, always filter on read

2. **Premium Insight Distribution:** What percentage of insights should be premium?
   - **Recommendation:** 30-40% premium, 60-70% free (ensure free users get value)

3. **Feature Gate Alignment:** Should feature gates match rotation surfaces exactly?
   - **Recommendation:** Yes, align `ADVANCED_METRICS` with `ADVANCED_TAB`, `MESSAGE_ANALYZER` with `ANALYZER`

### 9.3 Future Enhancements

1. **Premium Insight Catalog:** Centralized registry of which insights are premium
2. **A/B Testing:** Test different premium/free distributions
3. **Analytics:** Track which premium insights are most valuable
4. **Dynamic Premium:** Mark insights as premium based on user behavior/engagement

---

**END OF SCOUT REPORT**

**Status:** ✅ Ready for Step 5.12 implementation  
**Estimated Effort:** 2-3 days (backend: 1-2 days, frontend: 1 day)  
**Blockers:** None identified  
**Dependencies:** Step 5.11 must be complete (✅ Done)

