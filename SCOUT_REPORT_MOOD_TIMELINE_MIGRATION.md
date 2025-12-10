# SCOUT REPORT — Mood Timeline Migration (Stats → Mission End)

**Date:** Current  
**Goal:** Move mood timeline from Stats/Advanced tab to Mission End screen, fix crashes

---

## Current State Analysis

### 1. Stats / Advanced Tab — Mood Timeline Implementation

**File:** `socialsocial/src/screens/stats/AdvancedTab.tsx`

**Components/Functions:**
- **Line 15:** Imports `fetchMoodTimeline` from `statsService`
- **Line 44-48:** Mood timeline state variables:
  - `moodTimeline: MoodTimelineResponse | null`
  - `moodLocked: LockedResponse<MoodTimelineResponse> | null`
  - `moodLoading: boolean`
  - `moodError: string | null`
- **Line 70-71:** Calls `loadMoodTimeline()` after loading advanced metrics
- **Line 106-130:** `loadMoodTimeline()` function:
  - Fetches `statsSummary.lastSessionId`
  - Calls `fetchMoodTimeline(statsSummary.lastSessionId)`
  - Handles `LockedResponse` wrapper
  - Logs error: `[AdvancedTab] Failed to load mood timeline`
- **Line 133-178:** `renderMoodChart()` function:
  - Takes `snapshots: Array<{ turnIndex, smoothedMoodScore, moodState }>`
  - Renders SVG polyline chart
- **Line 427-499:** Mood Timeline card UI rendering:
  - Shows locked state, loading, error, or data
  - **Line 455:** `const snapshots = moodTimeline?.payload?.snapshots ?? [];` (defensive)
  - **Line 456:** `const insights = moodTimeline?.insights ?? [];` (defensive)
  - **Line 458:** `if (snapshots.length > 0)` - safe check
  - **Line 472:** `{insights.length > 0 &&` - safe check

**API Call:**
- **File:** `socialsocial/src/api/statsService.ts`
- **Line 281-284:** `fetchMoodTimeline(sessionId: string)`
- **Endpoint:** `GET /v1/stats/mood/session/${sessionId}`
- **Returns:** `Promise<LockedResponse<MoodTimelineResponse>>`

**Data Shape:**
```typescript
MoodTimelineResponse {
  sessionId: string;
  payload: {
    version: number;
    snapshots: Array<{
      turnIndex: number;
      rawScore: number;
      smoothedMoodScore: number;
      moodState: MoodState; // 'COLD' | 'NEUTRAL' | 'WARM' | 'TENSE' | 'FLOW'
      tension: number;
      warmth: number;
      vibe: number;
      flow: number;
    }>;
    current: {
      moodState: MoodState;
      moodPercent: number;
    };
    moodInsights?: {
      pickedIds: string[];
      insights: Array<{ id, title, body }>;
    };
  };
  current: { moodState, moodPercent };
  insights: Array<{ id, title, body }>;
}
```

**Potential Crash Points:**
- **Line 455:** `moodTimeline?.payload?.snapshots` - already defensive with `?? []`
- **Line 456:** `moodTimeline?.insights` - already defensive with `?? []`
- **Line 463:** `moodTimeline.current.moodState` - could crash if `moodTimeline` exists but `current` is undefined
- **Line 159:** Inside `renderMoodChart`, `snapshots.length - 1 || 1` - safe

### 2. Mission End / Deep Insights Screen

**File:** `socialsocial/src/screens/MissionEndScreen.tsx`

**Current Mood Implementation:**
- **Line 214:** Destructures `moodTeaser` from `selectedPack`
- **Line 448-470:** "Mood Summary" card:
  - Shows `moodTeaser.averageScore`
  - Has a TODO comment: "Add start → end mood transition when timeline data is available"
  - Shows premium CTA to view stats

**Data Structure:**
- **File:** `socialsocial/src/types/MissionEndTypes.ts`
- **Line 30-33:** `MoodTeaser` interface:
  ```typescript
  interface MoodTeaser {
    averageScore: number;
    timeline?: any; // Optional: backend timeline if exists in future
  }
  ```
- **File:** `socialsocial/src/logic/missionEndPackBuilder.ts`
- **Line 97-107:** `computeMoodTeaser()` function:
  - Only computes `averageScore` from `session.missionState.averageScore`
  - `timeline: undefined` (commented as placeholder)

**Deep Insights Payload:**
- **File:** `socialsocial/src/api/insightsService.ts`
- **Line 14-22:** `fetchInsightsBySessionId()` returns `InsightsDTO`
- **File:** `socialsocial/src/types/InsightsDTO.ts`
- **Line 98-101:** `DeepInsightsResponse` structure:
  ```typescript
  interface DeepInsightsResponse {
    insightsV2: InsightsV2Payload;
    analyzerParagraphs?: DeepParagraphDTO[];
    // NO mood timeline field currently
  }
  ```

**Conclusion:** The insights API does NOT currently include mood timeline data. The `MoodTeaser.timeline` field exists but is always `undefined`.

### 3. API Endpoint

**Backend Endpoint:**
- **Route:** `GET /v1/stats/mood/session/:sessionId`
- **Controller:** `backend/src/modules/stats/stats.controller.ts` (line 175)
- **Service:** `backend/src/modules/stats/stats.service.ts` (line 1618)
- **Returns:** `LockedResponse<MoodTimelineResponse>` or 404 if no timeline exists

---

## Implementation Plan

### A. Remove Mood Timeline from Stats / Advanced Tab

**Files to modify:**
1. `socialsocial/src/screens/stats/AdvancedTab.tsx`
   - Remove mood timeline state (lines 44-48)
   - Remove `loadMoodTimeline()` function (lines 106-130)
   - Remove call to `loadMoodTimeline()` (line 71)
   - Remove mood timeline card UI (lines 427-499)
   - Remove `renderMoodChart()` function (lines 133-178) OR extract to shared component
   - Remove `fetchMoodTimeline` import (line 15)
   - Remove `MoodTimelineResponse, MoodState` imports if unused (line 16)

2. `socialsocial/src/api/statsService.ts`
   - Keep `fetchMoodTimeline()` function (will be used by MissionEndScreen)
   - No changes needed

### B. Add Mood Timeline to Mission End Screen

**Files to modify:**
1. Extract reusable component (optional but recommended):
   - Create `socialsocial/src/components/MoodTimelineCard.tsx`
   - Move `renderMoodChart()` logic into this component
   - Accept `MoodTimelineResponse | null` as prop
   - Handle null/empty states defensively

2. `socialsocial/src/screens/MissionEndScreen.tsx`
   - Add state for mood timeline: `const [moodTimeline, setMoodTimeline] = useState<MoodTimelineResponse | null>(null);`
   - Add `loadMoodTimeline()` function that calls `fetchMoodTimeline(sessionId)`
   - Call `loadMoodTimeline()` in `useEffect` after loading session
   - Replace or enhance the "Mood Summary" card (line 448-470) with full mood timeline card
   - Import `fetchMoodTimeline` from `statsService`
   - Import `MoodTimelineResponse, MoodState` from `InsightsDTO`

3. **Data handling:**
   - Since insights API doesn't include mood timeline, fetch it separately using `fetchMoodTimeline(sessionId)`
   - Handle 404/null gracefully: show "Mood timeline is not available for this mission yet"
   - Use defensive checks: `moodTimeline?.payload?.snapshots ?? []`

### C. Defensive Programming

**All mood timeline access must:**
- Use optional chaining: `moodTimeline?.payload?.snapshots`
- Default to empty array: `?? []`
- Check length before rendering: `if (snapshots.length > 0)`
- Never access `.length` on potentially undefined values

---

## Files & Symbols to Change

### Remove from AdvancedTab.tsx:
- State: `moodTimeline`, `moodLocked`, `moodLoading`, `moodError`
- Function: `loadMoodTimeline()`
- Function call: `loadMoodTimeline()` in `loadData()`
- UI: Lines 427-499 (entire mood timeline card section)
- Function: `renderMoodChart()` (lines 133-178) - OR extract to shared component
- Import: `fetchMoodTimeline` (if not used elsewhere)
- Import: `MoodTimelineResponse, MoodState` (if not used elsewhere)

### Add to MissionEndScreen.tsx:
- State: `moodTimeline: MoodTimelineResponse | null`
- State: `moodLoading: boolean`
- State: `moodError: string | null`
- Function: `loadMoodTimeline()`
- Function call: `loadMoodTimeline()` in `useEffect`
- UI: Mood timeline card (replace or enhance existing Mood Summary card)
- Import: `fetchMoodTimeline` from `statsService`
- Import: `MoodTimelineResponse, MoodState` from `InsightsDTO`

### Optional: Create shared component:
- `socialsocial/src/components/MoodTimelineCard.tsx`
- Props: `{ moodTimeline: MoodTimelineResponse | null; loading?: boolean; error?: string | null; }`
- Includes `renderMoodChart()` logic
- Handles all null/empty states

---

## Current Mood Timeline Data Shape

**Confirmed:** Mood timeline data is NOT in the insights API response. It must be fetched separately via `fetchMoodTimeline(sessionId)`.

**Structure when available:**
```typescript
MoodTimelineResponse {
  sessionId: string;
  payload: {
    snapshots: Array<{
      turnIndex: number;
      smoothedMoodScore: number;
      moodState: MoodState;
      // ... other fields
    }>;
    current: { moodState, moodPercent };
  };
  current: { moodState, moodPercent };
  insights: Array<{ id, title, body }>;
}
```

---

## Where `.length` is Called (Potential Crash Points)

1. **AdvancedTab.tsx line 134:** `if (snapshots.length === 0)` - SAFE (snapshots is parameter)
2. **AdvancedTab.tsx line 159:** `(snapshots.length - 1 || 1)` - SAFE (snapshots is parameter)
3. **AdvancedTab.tsx line 458:** `if (snapshots.length > 0)` - SAFE (uses `?? []`)
4. **AdvancedTab.tsx line 472:** `{insights.length > 0 &&` - SAFE (uses `?? []`)

**All current `.length` accesses are already defensive.** The crash is likely from accessing `moodTimeline.current.moodState` when `moodTimeline` exists but `current` is undefined, OR from the 404 error causing the component to render in an invalid state.

---

## Implementation Strategy

1. **Extract `renderMoodChart()` to a shared utility or component** (recommended for reusability)
2. **Remove all mood timeline code from AdvancedTab.tsx**
3. **Add mood timeline loading and UI to MissionEndScreen.tsx**
4. **Use defensive checks everywhere: `moodTimeline?.payload?.snapshots ?? []`**
5. **Show friendly "not available" message when `moodTimeline` is null or empty**

---

## Verification Checklist

After implementation:
- [ ] Advanced tab no longer shows mood timeline card
- [ ] Advanced tab no longer calls `fetchMoodTimeline`
- [ ] No `[AdvancedTab] Failed to load mood timeline` errors
- [ ] Mission End screen shows mood timeline card (if data exists)
- [ ] Mission End screen shows "not available" message (if no data)
- [ ] No crashes from `.length` on undefined
- [ ] No crashes from accessing `moodTimeline.current` when undefined

