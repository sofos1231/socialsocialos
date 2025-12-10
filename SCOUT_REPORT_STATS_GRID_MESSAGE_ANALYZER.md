# SCOUT REPORT: Stats Grid + Message Analyzer Redesign

**Date:** 2025-01-XX  
**Mode:** SCOUT (Analysis Only - No Code Changes)  
**Scope:** Stats screen 2×2 grid redesign + Message Analyzer UX enhancement

---

## PART 1 – CURRENT IMPLEMENTATION MAP

### 1.1 Main Stats Screen

**File:** `socialsocial/src/screens/StatsScreen.tsx`  
**Component:** `StatsScreen` (default export)

**Current Structure:**
- Uses local state (`activeTab`) to switch between 4 tabs
- Tab navigation implemented as horizontal `Pressable` buttons in a `tabContainer` (lines 127-160)
- Tab content rendered via `renderTabContent()` switch statement (lines 61-74)
- All tabs rendered within the same screen (no separate navigation routes)
- Premium status fetched on mount and passed to `AdvancedTab` and `SocialTipsTab`

**Tab Labels:**
- "Badges" → `BadgesTab`
- "Performance" → `PerformanceTab`
- "Advanced" → `AdvancedTab`
- "Tips" → `SocialTipsTab`

**Navigation Type:** Local state-based tab switching (NOT React Navigation nested routes)

### 1.2 Tab Components

#### BadgesTab
- **File:** `socialsocial/src/screens/stats/BadgesTab.tsx`
- **Props:** None
- **Data Source:** `fetchBadges()` from `statsService.ts`
- **API Endpoint:** `GET /stats/badges`
- **Type:** `BadgesResponse` with `BadgeDTO[]`

#### PerformanceTab
- **File:** `socialsocial/src/screens/stats/PerformanceTab.tsx`
- **Props:** None
- **Data Sources:**
  - `fetchTraitsSummary()` → `GET /stats/traits/summary`
  - `fetchTraitHistory(20)` → `GET /stats/traits/history?limit=20`
- **Types:** `TraitsSummaryResponse`, `TraitHistoryResponse`

#### AdvancedTab
- **File:** `socialsocial/src/screens/stats/AdvancedTab.tsx`
- **Props:** `{ isPremium: boolean }`
- **Data Sources:**
  - `fetchAdvancedMetrics()` → `GET /stats/advanced` (returns `LockedResponse<AdvancedMetricsResponse>`)
  - `fetchTraitSynergy()` → `GET /stats/synergy` (returns `LockedResponse<TraitSynergyResponse>`)
- **Premium Gating:** Uses `LockedResponse` wrapper, shows `LockedCard` when locked

#### SocialTipsTab
- **File:** `socialsocial/src/screens/stats/SocialTipsTab.tsx`
- **Props:** `{ isPremium: boolean }`
- **Data Sources:**
  - `fetchAnalyzerLists()` → `GET /analyzer/lists` (returns `LockedResponse<AnalyzerListsResponse>`)
  - `analyzeMessage(messageId)` → `POST /analyzer/analyze` (returns `LockedResponse<AnalyzeMessageResponse>`)
- **Premium Gating:** Uses `LockedResponse` wrapper, shows lock overlay when `isFeatureLocked('MESSAGE_ANALYZER', isPremium)`

### 1.3 Social Tips / Message Analyzer Current Implementation

**Component:** `SocialTipsTab`  
**File:** `socialsocial/src/screens/stats/SocialTipsTab.tsx`

**Current UX:**
- Shows two sections: "Top Positive Messages" and "Learning Opportunities"
- Each message rendered via `MessageCardMini` component
- On message press → calls `handleMessagePress()` → fetches analysis via `analyzeMessage()`
- Analysis result shown inline below the message list (not in a modal)
- Uses `AnalysisResultCard` to display breakdown + paragraphs

**Message Data Structure:**
```typescript
// From analyzerService.ts
interface MessageListItemDTO {
  messageId: string;
  sessionId: string;
  recordedAtISO: string;
  turnIndex: number;
  contentSnippet: string;
  score: number;
  breakdown?: MessageBreakdownDTO; // Optional, may not be present in list
}

interface MessageBreakdownDTO {
  score: number;
  traits: Record<string, number>;
  hooks: string[];
  patterns: string[];
  whyItWorked: string[];
  whatToImprove: string[];
}

interface AnalyzeMessageResponse {
  message: MessageListItemDTO;
  breakdown: MessageBreakdownDTO;
  paragraphs: DeepParagraphDTO[];
}
```

**Message Card Component:**
- **File:** `socialsocial/src/screens/stats/components/MessageCardMini.tsx`
- **Props:** `{ item: MessageListItemDTO, onPress: () => void, onBurn?: () => void }`
- **Display:** Score (left), content snippet, metadata ("Session • Turn X"), burn button (⋯)

**Analysis Display Component:**
- **File:** `socialsocial/src/screens/stats/components/AnalysisResultCard.tsx`
- **Props:** `{ breakdown: MessageBreakdownDTO, paragraphs?: DeepParagraphDTO[] }`
- **Shows:** Score, traits grid, "Why This Works", "What To Improve", deep insights paragraphs

### 1.4 Existing Analysis Structures

**Available Analysis Data:**
1. **MessageBreakdownDTO** (from `analyzerService.ts` and `statsService.ts`):
   - Score (0-100)
   - Traits (Record<string, number>)
   - Hooks (string[])
   - Patterns (string[])
   - whyItWorked (string[])
   - whatToImprove (string[])

2. **DeepParagraphDTO** (from `analyzerService.ts`):
   - id, title, body, category

3. **AnalysisResultCard** already exists and displays all this data

**Backend Endpoints:**
- `GET /analyzer/lists` - Returns positive/negative message lists
- `POST /analyzer/analyze` - Analyzes a specific message (returns full breakdown + paragraphs)
- `POST /analyzer/burn` - Removes message from lists

**Note:** All analysis data is precomputed. The `analyzeMessage()` endpoint returns existing metrics, not real-time analysis.

### 1.5 Navigation Structure

**Main Navigator:** `socialsocial/src/navigation/index.tsx`

**Current Structure:**
```
RootStack
  └─ Dashboard (MainTabsNavigator)
      ├─ PracticeTab (PracticeStackNavigator)
      ├─ StatsTab (StatsScreen) ← Current location
      └─ ProfileTab (ProfileScreen)
```

**StatsScreen Navigation:**
- Currently a direct screen in `MainTabsNavigator`
- No nested navigator for Stats sub-screens
- All tab content rendered inline via state switching

**Navigation Types:**
- **File:** `socialsocial/src/navigation/types.ts`
- `MainTabParamList` includes `StatsTab: undefined`
- No separate routes defined for Stats sub-screens

---

## PART 2 – 2×2 STATS GRID DESIGN

### 2.1 Proposed Navigation Approach

**Option A (Recommended):** Create a Stats Stack Navigator

**Structure:**
```
MainTabsNavigator
  └─ StatsTab (StatsStackNavigator)
      ├─ StatsHub (new - shows 2×2 grid)
      ├─ StatsBadgesScreen (BadgesTab content)
      ├─ StatsPerformanceScreen (PerformanceTab content)
      ├─ StatsAdvancedScreen (AdvancedTab content)
      └─ StatsTipsScreen (SocialTipsTab content)
```

**Benefits:**
- Clean separation of concerns
- Each section gets its own full-screen route
- Easy to add navigation animations
- Maintains existing data fetching logic (components unchanged)

**Alternative (Simpler but less flexible):**
- Keep `StatsScreen` as hub with 2×2 grid
- Use React Navigation `navigate()` to push new screens
- Still requires creating 4 new screen components

### 2.2 Stats Hub Screen (2×2 Grid)

**New Component:** `StatsHubScreen` (replaces current `StatsScreen`)

**Layout:**
- Top: Wallet/Progress summary (keep existing mini cards)
- Middle: Scrollable content area (can show recent activity or empty)
- Bottom: **2×2 Grid of Stat Category Cards**

**Grid Cards:**
1. **Badges Card**
   - Icon: 🏆 or badge icon
   - Label: "Badges"
   - On press: Navigate to `StatsBadgesScreen`

2. **Performance Card**
   - Icon: 📊 or chart icon
   - Label: "Performance"
   - On press: Navigate to `StatsPerformanceScreen`

3. **Advanced Card**
   - Icon: ⚡ or advanced icon
   - Label: "Advanced"
   - On press: Navigate to `StatsAdvancedScreen`

4. **Tips Card**
   - Icon: 💡 or message icon
   - Label: "Tips"
   - On press: Navigate to `StatsTipsScreen`

**Card Interaction:**
- Idle: All cards same size (flex: 1, equal width/height)
- On press: Scale animation (1.0 → 1.05 → 1.0) using `Animated` or `reanimated`
- Navigate immediately after animation starts

**Grid Layout:**
```tsx
<View style={styles.gridContainer}>
  <View style={styles.gridRow}>
    <StatCategoryCard label="Badges" icon="🏆" onPress={() => navigate('StatsBadges')} />
    <StatCategoryCard label="Performance" icon="📊" onPress={() => navigate('StatsPerformance')} />
  </View>
  <View style={styles.gridRow}>
    <StatCategoryCard label="Advanced" icon="⚡" onPress={() => navigate('StatsAdvanced')} />
    <StatCategoryCard label="Tips" icon="💡" onPress={() => navigate('StatsTips')} />
  </View>
</View>
```

### 2.3 New Screen Components

Each existing tab component will be wrapped in a full-screen component:

1. **StatsBadgesScreen.tsx**
   - Wraps `<BadgesTab />`
   - Adds header with back button
   - Full-screen ScrollView

2. **StatsPerformanceScreen.tsx**
   - Wraps `<PerformanceTab />`
   - Adds header with back button
   - Full-screen ScrollView

3. **StatsAdvancedScreen.tsx**
   - Wraps `<AdvancedTab isPremium={isPremium} />`
   - Adds header with back button
   - Full-screen ScrollView
   - Needs premium status (fetch or pass via route params)

4. **StatsTipsScreen.tsx**
   - Wraps `<SocialTipsTab isPremium={isPremium} />`
   - Adds header with back button
   - Full-screen ScrollView
   - Needs premium status (fetch or pass via route params)

**Note:** Tab components (`BadgesTab`, `PerformanceTab`, etc.) remain unchanged - they just get wrapped in screens.

### 2.4 Navigation Type Updates

**File:** `socialsocial/src/navigation/types.ts`

**Add new type:**
```typescript
export type StatsStackParamList = {
  StatsHub: undefined;
  StatsBadges: undefined;
  StatsPerformance: undefined;
  StatsAdvanced: undefined;
  StatsTips: undefined;
};
```

**Update MainTabParamList:**
```typescript
export type MainTabParamList = {
  PracticeTab: undefined;
  StatsTab: undefined; // Now points to StatsStackNavigator
  ProfileTab: undefined;
};
```

### 2.5 Files to Modify

**Structural Changes:**
1. `socialsocial/src/navigation/index.tsx`
   - Create `StatsStackNavigator` function
   - Register 5 screens (Hub + 4 category screens)
   - Update `MainTabsNavigator` to use `StatsStackNavigator` instead of `StatsScreen`

2. `socialsocial/src/navigation/types.ts`
   - Add `StatsStackParamList` type

3. `socialsocial/src/screens/StatsScreen.tsx`
   - Rename to `StatsHubScreen.tsx` OR create new `StatsHubScreen.tsx`
   - Remove tab switching logic
   - Add 2×2 grid at bottom
   - Remove `renderTabContent()` and tab container

**New Files:**
1. `socialsocial/src/screens/stats/StatsHubScreen.tsx` (or rename existing)
2. `socialsocial/src/screens/stats/StatsBadgesScreen.tsx`
3. `socialsocial/src/screens/stats/StatsPerformanceScreen.tsx`
4. `socialsocial/src/screens/stats/StatsAdvancedScreen.tsx`
5. `socialsocial/src/screens/stats/StatsTipsScreen.tsx`
6. `socialsocial/src/components/stats/StatCategoryCard.tsx` (reusable grid card)

**Unchanged Files (wrapped in new screens):**
- `socialsocial/src/screens/stats/BadgesTab.tsx`
- `socialsocial/src/screens/stats/PerformanceTab.tsx`
- `socialsocial/src/screens/stats/AdvancedTab.tsx`
- `socialsocial/src/screens/stats/SocialTipsTab.tsx`

---

## PART 3 – MESSAGE ANALYZER UX DESIGN

### 3.1 Recommended First Implementation

**Approach:** Tap-to-analyze (simpler, mobile-friendly)

**Rationale:**
- `react-native-reanimated` is available (v4.1.1)
- No `react-native-gesture-handler` in dependencies (would need to add for drag)
- Tap is more reliable on mobile than drag-and-drop
- Can add drag later without rewriting core structure

**Future Enhancement Path:**
- Structure code so drag can be added later
- Use a shared "analyze message" function
- Keep Message Analyzer panel as a visual component that can accept messages via props

### 3.2 Message Analyzer Panel Design

**Location:** Top of `StatsTipsScreen` (above message lists)

**Component:** `MessageAnalyzerPanel`

**Visual Design:**
- Distinct panel with border/background (looks like a device/gadget)
- Title: "Message Analyzer"
- Subtitle: "Tap 'Analyze' on any message below"
- Optional: Show last analyzed message summary (if one exists)
- Empty state: "No message analyzed yet"

**When Message Analyzed:**
- Panel highlights/shows message preview
- Shows quick summary (score, top trait)
- Button to "View Full Analysis" opens modal

### 3.3 Message List Item Enhancement

**Component:** `MessageCardMini` (modify existing)

**Changes:**
- Add "Analyze" button/icon to each card
- Button positioned on the right (opposite burn button)
- On press: Calls `onAnalyze` callback (new prop)
- Visual feedback: Button highlights on press

**Alternative:** Keep existing `onPress` behavior but add visual "Analyze" label/icon

### 3.4 Analysis Modal Design

**Component:** `MessageAnalysisModal` (new)

**Trigger:** When user taps "Analyze" on a message card

**Content Structure:**
1. **Header:**
   - Message text (full or snippet)
   - Close button (X)

2. **Score Section:**
   - Large score display (0-100)
   - Visual indicator (color-coded)

3. **Trait Breakdown:**
   - Grid of trait scores (reuse `AnalysisResultCard` trait display)
   - Or simplified list

4. **Hooks/Flags:**
   - Positive hooks hit
   - Negative flags (if any)

5. **Improvement Tips:**
   - 1-2 short tips from `whatToImprove` array
   - Or from `whyItWorked` if score is high

6. **Deep Insights (Optional):**
   - Collapsible section with `DeepParagraphDTO[]` content

**Data Source:**
- Use existing `analyzeMessage(messageId)` API call
- Returns `AnalyzeMessageResponse` with all needed data
- No new backend endpoint required

**State Handling:**
- Show loading spinner while fetching
- Display error if fetch fails
- Modal closes on backdrop tap or close button

### 3.5 Data Flow

**Current Flow:**
```
MessageCardMini onPress
  → SocialTipsTab.handleMessagePress(item)
    → analyzeMessage(item.messageId)
      → setAnalysis(response)
      → Render AnalysisResultCard inline
```

**New Flow (Option 1 - Modal):**
```
MessageCardMini onAnalyze
  → SocialTipsTab.handleAnalyzeMessage(item)
    → analyzeMessage(item.messageId)
      → setSelectedMessageForModal(item)
      → setAnalysisData(response)
      → Open MessageAnalysisModal
```

**New Flow (Option 2 - Panel + Modal):**
```
MessageCardMini onAnalyze
  → SocialTipsTab.handleAnalyzeMessage(item)
    → analyzeMessage(item.messageId)
      → setAnalyzerPanelMessage(item) // Show in panel
      → setAnalysisData(response)
      → User taps "View Full" in panel
        → Open MessageAnalysisModal
```

**Recommended:** Option 1 (direct modal) for MVP, Option 2 for enhanced UX later

### 3.6 Components to Create/Modify

**New Components:**
1. `socialsocial/src/components/stats/MessageAnalyzerPanel.tsx`
   - Visual panel at top of Tips screen
   - Shows last analyzed message summary
   - Optional "View Full Analysis" button

2. `socialsocial/src/components/stats/MessageAnalysisModal.tsx`
   - Full-screen modal with analysis details
   - Reuses `AnalysisResultCard` for breakdown
   - Or creates simplified display

**Modified Components:**
1. `socialsocial/src/screens/stats/components/MessageCardMini.tsx`
   - Add `onAnalyze?: () => void` prop
   - Add "Analyze" button/icon
   - Or modify `onPress` to trigger analysis

2. `socialsocial/src/screens/stats/SocialTipsTab.tsx`
   - Add `MessageAnalyzerPanel` at top
   - Add modal state management
   - Add `handleAnalyzeMessage()` function
   - Keep existing `handleMessagePress()` for backward compatibility (or replace)

### 3.7 Drag-and-Drop Future Enhancement

**If adding drag later:**
- Install `react-native-gesture-handler` (not currently in deps)
- Use `LongPressGestureHandler` from gesture-handler
- Wrap `MessageCardMini` with gesture handler
- Use `react-native-reanimated` for drag animations
- Drop zone: `MessageAnalyzerPanel` detects drop
- Same data flow as tap (just different trigger)

**Code Structure:**
- Keep `handleAnalyzeMessage()` function
- Both tap and drag call the same function
- Panel/modal logic unchanged

---

## PART 4 – IMPLEMENTATION PLAN & IMPACT

### 4.1 Implementation Steps

#### Phase A: Stats Layout Refactor (2×2 Grid + Navigation)

**Step 1: Create Navigation Types**
- File: `socialsocial/src/navigation/types.ts`
- Add `StatsStackParamList` type

**Step 2: Create Stats Stack Navigator**
- File: `socialsocial/src/navigation/index.tsx`
- Create `StatsStackNavigator()` function
- Register 5 screens: Hub, Badges, Performance, Advanced, Tips
- Update `MainTabsNavigator` to use `StatsStackNavigator`

**Step 3: Create Stat Category Card Component**
- File: `socialsocial/src/components/stats/StatCategoryCard.tsx`
- Props: `{ label: string, icon: string, onPress: () => void }`
- Animated press effect

**Step 4: Create Stats Hub Screen**
- File: `socialsocial/src/screens/stats/StatsHubScreen.tsx`
- Move wallet/progress cards from `StatsScreen.tsx`
- Add 2×2 grid at bottom
- Remove tab switching logic

**Step 5: Create Individual Stat Screens**
- `StatsBadgesScreen.tsx` - Wraps `BadgesTab`
- `StatsPerformanceScreen.tsx` - Wraps `PerformanceTab`
- `StatsAdvancedScreen.tsx` - Wraps `AdvancedTab` (needs premium prop)
- `StatsTipsScreen.tsx` - Wraps `SocialTipsTab` (needs premium prop)

**Step 6: Handle Premium Status**
- Option A: Fetch in each screen that needs it
- Option B: Pass via route params (from Hub)
- Option C: Use global state/store
- **Recommended:** Option A (fetch in Advanced/Tips screens, same as current)

**Step 7: Update/Remove Old StatsScreen**
- If creating new `StatsHubScreen.tsx`, keep `StatsScreen.tsx` temporarily for reference
- Or rename `StatsScreen.tsx` → `StatsHubScreen.tsx` and refactor

#### Phase B: Message Analyzer Panel + Modal

**Step 8: Create Message Analyzer Panel**
- File: `socialsocial/src/components/stats/MessageAnalyzerPanel.tsx`
- Props: `{ analyzedMessage: MessageListItemDTO | null, onViewFull: () => void }`
- Shows message preview, score, "View Full" button

**Step 9: Create Message Analysis Modal**
- File: `socialsocial/src/components/stats/MessageAnalysisModal.tsx`
- Props: `{ visible: boolean, message: MessageListItemDTO | null, analysis: AnalyzeMessageResponse | null, onClose: () => void }`
- Uses `AnalysisResultCard` or simplified display

**Step 10: Enhance MessageCardMini**
- File: `socialsocial/src/screens/stats/components/MessageCardMini.tsx`
- Add `onAnalyze?: () => void` prop
- Add "Analyze" button/icon
- Style to match existing design

**Step 11: Update SocialTipsTab**
- File: `socialsocial/src/screens/stats/SocialTipsTab.tsx`
- Add `MessageAnalyzerPanel` at top of ScrollView
- Add modal state (`selectedMessageForModal`, `analysisForModal`)
- Add `handleAnalyzeMessage()` function
- Pass `onAnalyze` to `MessageCardMini`
- Render `MessageAnalysisModal`

**Step 12: Test Data Flow**
- Verify `analyzeMessage()` API call works
- Verify modal displays all analysis data
- Verify panel updates when message analyzed
- Test error handling (API failure)

#### Phase C: Polish & Testing

**Step 13: Add Animations**
- Card press animations (scale)
- Modal fade-in
- Panel highlight animation

**Step 14: Error Handling**
- Loading states
- Error messages in modal
- Retry functionality

**Step 15: Accessibility**
- Screen reader labels
- Touch target sizes
- Color contrast

### 4.2 Dependencies

**No New Dependencies Required:**
- `react-native-reanimated` already installed (v4.1.1)
- `@react-navigation/native-stack` already installed
- All API clients exist

**Optional Future:**
- `react-native-gesture-handler` (for drag-and-drop, not needed for MVP)

### 4.3 Backend Changes

**None Required:**
- All endpoints exist:
  - `GET /analyzer/lists`
  - `POST /analyzer/analyze`
  - `POST /analyzer/burn`
- All data structures exist
- Analysis is precomputed (no new model needed)

### 4.4 Risk & Regression Analysis

#### Potential Regressions

1. **Stats Tab Navigation**
   - **Risk:** Users expect tabs, now see grid
   - **Mitigation:** Grid is more intuitive, but add clear labels
   - **Test:** Verify all 4 sections accessible from grid

2. **Premium Status**
   - **Risk:** Premium check might break in new screens
   - **Mitigation:** Reuse existing `fetchStatsSummary()` pattern
   - **Test:** Verify Advanced/Tips screens show lock correctly

3. **Data Fetching**
   - **Risk:** Tab components might not fetch on mount in new screens
   - **Mitigation:** Tab components already use `useEffect` - should work
   - **Test:** Verify each screen loads data correctly

4. **Navigation Stack**
   - **Risk:** Back button behavior might confuse users
   - **Mitigation:** Add clear headers with back buttons
   - **Test:** Verify back navigation works from all screens

5. **Message Analyzer**
   - **Risk:** Existing `handleMessagePress()` behavior might break
   - **Mitigation:** Keep both `onPress` and `onAnalyze` initially, or migrate gradually
   - **Test:** Verify analysis still works, modal displays correctly

#### Sanity Checks

**After Implementation, Verify:**

1. ✅ Open Stats tab → See 2×2 grid at bottom
2. ✅ Tap each grid card → Navigate to full-screen section
3. ✅ Verify content matches previous tab content
4. ✅ Back button returns to grid
5. ✅ Premium lock works in Advanced/Tips screens
6. ✅ Tips screen shows Message Analyzer panel at top
7. ✅ Tap "Analyze" on message → Modal opens with analysis
8. ✅ Modal shows score, traits, tips correctly
9. ✅ Close modal → Returns to Tips screen
10. ✅ All existing API calls still work
11. ✅ No console errors
12. ✅ Performance acceptable (no lag on navigation)

### 4.5 File Change Summary

**New Files (11):**
1. `socialsocial/src/screens/stats/StatsHubScreen.tsx`
2. `socialsocial/src/screens/stats/StatsBadgesScreen.tsx`
3. `socialsocial/src/screens/stats/StatsPerformanceScreen.tsx`
4. `socialsocial/src/screens/stats/StatsAdvancedScreen.tsx`
5. `socialsocial/src/screens/stats/StatsTipsScreen.tsx`
6. `socialsocial/src/components/stats/StatCategoryCard.tsx`
7. `socialsocial/src/components/stats/MessageAnalyzerPanel.tsx`
8. `socialsocial/src/components/stats/MessageAnalysisModal.tsx`

**Modified Files (4):**
1. `socialsocial/src/navigation/index.tsx` - Add StatsStackNavigator
2. `socialsocial/src/navigation/types.ts` - Add StatsStackParamList
3. `socialsocial/src/screens/stats/components/MessageCardMini.tsx` - Add Analyze button
4. `socialsocial/src/screens/stats/SocialTipsTab.tsx` - Add panel + modal

**Unchanged Files (wrapped, not modified):**
- `socialsocial/src/screens/stats/BadgesTab.tsx`
- `socialsocial/src/screens/stats/PerformanceTab.tsx`
- `socialsocial/src/screens/stats/AdvancedTab.tsx`
- `socialsocial/src/api/analyzerService.ts`
- `socialsocial/src/api/statsService.ts`

**Deprecated (after migration):**
- `socialsocial/src/screens/StatsScreen.tsx` (replaced by StatsHubScreen)

---

## SUMMARY

### Current State
- Stats screen uses local state tabs (4 tabs in one screen)
- Tips tab shows message lists with inline analysis
- All data fetching works correctly
- Premium gating implemented via `LockedResponse`

### Target State
- Stats hub shows 2×2 grid of category cards
- Each category opens full-screen dedicated view
- Tips screen has Message Analyzer panel at top
- Message analysis shown in modal popup
- Tap-to-analyze UX (drag can be added later)

### Implementation Approach
- **Minimal changes:** Wrap existing tab components in screens
- **No backend changes:** Use existing APIs
- **Progressive enhancement:** Start with tap, add drag later if needed
- **Maintain compatibility:** Keep data fetching logic unchanged

### Estimated Complexity
- **Phase A (Grid):** Medium (navigation refactor, new screens)
- **Phase B (Analyzer):** Low-Medium (new components, modal)
- **Total:** Medium complexity, low risk

### Next Steps
1. Review this SCOUT report
2. Approve implementation plan
3. Begin Phase A (Stats Grid)
4. Test navigation flow
5. Begin Phase B (Message Analyzer)
6. Test analysis flow
7. Polish & deploy

---

**END OF SCOUT REPORT**

