# SCOUT REPORT — Advanced Tab & Tips Tab Issues

**Date:** Current  
**Scope:** Mood Timeline 404 + SocialTipsTab crash  
**Mode:** Read-only analysis (no code changes)

---

## Issue 1: Advanced Tab — Mood Timeline 404

### Frontend API Call Chain

**File:** `socialsocial/src/screens/stats/AdvancedTab.tsx`

- **Line 106-130:** `loadMoodTimeline()` function
- **Line 113:** Calls `fetchMoodTimeline(statsSummary.lastSessionId)`
- **Line 115-122:** Handles `LockedResponse<T>` correctly (checks `response.locked`, uses `response.preview` or `response.full`)
- **Line 124-126:** Error handling catches and sets `moodError` state

**File:** `socialsocial/src/api/statsService.ts`

- **Line 281-284:** `fetchMoodTimeline(sessionId: string)` function
- **Line 282:** Makes `GET /v1/stats/mood/session/${sessionId}` request
- **Return type:** `Promise<LockedResponse<MoodTimelineResponse>>`

### Backend Route & Controller

**File:** `backend/src/modules/stats/stats.controller.ts`

- **Line 175:** Route defined: `@Get('mood/session/:sessionId')`
- **Line 176-226:** `getMoodTimeline()` method
- **Line 194:** Calls `this.statsService.getMoodTimelineForSession(String(userId), sessionId)`
- **Problem:** No try/catch around the service call — if service throws, NestJS converts to 404/500

### Backend Service Method

**File:** `backend/src/modules/stats/stats.service.ts`

- **Line 1618-1655:** `getMoodTimelineForSession(userId, sessionId)` method
- **Line 1623-1630:** Queries `missionMoodTimeline` table
- **Line 1632-1633:** **ROOT CAUSE** — Throws `Error` when timeline not found:
  ```typescript
  if (!timeline) {
    throw new Error(`Mood timeline not found for session ${sessionId}`);
  }
  ```
- **Line 1636-1638:** Also throws on ownership mismatch

### Root Cause Analysis

1. **Missing mood timeline data:** For sessions that don't have a `MissionMoodTimeline` record (e.g., older sessions before Step 5.10, or sessions where mood computation failed), `getMoodTimelineForSession()` throws an Error.

2. **Unhandled exception in controller:** The controller at line 194 doesn't wrap the service call in try/catch, so when the service throws, NestJS's exception filter converts it to a 404 (or 500), which the frontend receives as an HTTP error.

3. **Frontend error handling:** The frontend correctly catches the error (line 124-126), but it shows a red error card instead of a graceful "no data yet" state.

### Expected Behavior

For a premium user with no mood timeline data, the endpoint should:
- Return HTTP 200 (not 404)
- Return a `LockedResponse` with `locked: false` and `full: { ... }` containing empty/minimal data, OR
- Return a `LockedResponse` with `locked: true` and a `preview` with empty snapshots

### Files & Lines to Fix

**Backend:**

1. **`backend/src/modules/stats/stats.controller.ts`** (Line 175-226)
   - Wrap `getMoodTimelineForSession()` call in try/catch
   - When timeline not found, return a `LockedResponse` with empty data instead of letting the error propagate

2. **`backend/src/modules/stats/stats.service.ts`** (Line 1618-1655)
   - Optionally: Change `getMoodTimelineForSession()` to return `null` or an empty response instead of throwing, but controller handling is preferred for consistency

**Frontend (optional polish):**

3. **`socialsocial/src/screens/stats/AdvancedTab.tsx`** (Line 106-130, 427-480)
   - Improve error state UI to show "No mood timeline data yet" instead of generic error message
   - Check if `moodTimeline` is null/empty before accessing `moodTimeline.payload.snapshots.length`

### Suggested Fix

**Backend controller should:**
```typescript
try {
  const fullData = await this.statsService.getMoodTimelineForSession(String(userId), sessionId);
  // ... existing entitlement check and return logic
} catch (err: any) {
  // If timeline not found, return empty LockedResponse
  if (err.message?.includes('Mood timeline not found')) {
    const emptyData = {
      sessionId,
      payload: {
        version: 1,
        snapshots: [],
        current: { moodState: 'NEUTRAL' as MoodState, moodPercent: 50 },
      },
      current: { moodState: 'NEUTRAL' as MoodState, moodPercent: 50 },
      insights: [],
    };
    
    if (!entitlements.features[FeatureKey.MOOD_TIMELINE_FULL]) {
      return { locked: true, featureKey: FeatureKey.MOOD_TIMELINE_FULL, preview: emptyData, upsell: {...} };
    }
    return { locked: false, featureKey: FeatureKey.MOOD_TIMELINE_FULL, full: emptyData };
  }
  throw err; // Re-throw other errors
}
```

---

## Issue 2: Tips Tab — SocialTipsTab Render Crash

### Error Details

**Error message:** `Cannot read property 'length' of undefined`  
**Component:** `SocialTipsTab.tsx`  
**Stack trace:** Points to `SocialTipsTab` as the top frame

### Component Analysis

**File:** `socialsocial/src/screens/stats/SocialTipsTab.tsx`

#### Problem 1: `fetchAnalyzerLists()` Response Mismatch

- **Line 32:** State: `const [lists, setLists] = useState<AnalyzerListsResponse | null>(null);`
- **Line 45-57:** `loadLists()` function
- **Line 49:** `const data = await fetchAnalyzerLists();`
- **Line 50:** `setLists(data);` — **BUG:** `data` is `LockedResponse<AnalyzerListsResponse>`, not `AnalyzerListsResponse`

**Backend confirmation:**
- **File:** `backend/src/modules/analyzer/analyzer.controller.ts`
- **Line 29-71:** `getLists()` returns `Promise<LockedResponse<AnalyzerListsResponse>>`
- **Line 30:** Return type is `LockedResponse<AnalyzerListsResponse>`

**Frontend API:**
- **File:** `socialsocial/src/api/analyzerService.ts`
- **Line 61-64:** `fetchAnalyzerLists()` returns `Promise<AnalyzerListsResponse>` (WRONG — should be `LockedResponse<AnalyzerListsResponse>`)

#### Problem 2: `analyzeMessage()` Response Mismatch

- **Line 34:** State: `const [analysis, setAnalysis] = useState<AnalyzeMessageResponse | null>(null);`
- **Line 59-75:** `handleMessagePress()` function
- **Line 65:** `const result = await analyzeMessage(item.messageId);`
- **Line 67:** `setAnalysis(result);` — **BUG:** `result` is `LockedResponse<AnalyzeMessageResponse>`, not `AnalyzeMessageResponse`

**Backend confirmation:**
- **File:** `backend/src/modules/analyzer/analyzer.controller.ts`
- **Line 77-123:** `analyzeMessage()` returns `Promise<LockedResponse<AnalyzeMessageResponse>>`
- **Line 81:** Return type is `LockedResponse<AnalyzeMessageResponse>`

**Frontend API:**
- **File:** `socialsocial/src/api/analyzerService.ts`
- **Line 69-72:** `analyzeMessage()` returns `Promise<AnalyzeMessageResponse>` (WRONG — should be `LockedResponse<AnalyzeMessageResponse>`)

#### Crash Locations

1. **Line 154:** `{lists && lists.positive.length > 0 && (`
   - **Crash:** `lists.positive` is `undefined` because `lists` is a `LockedResponse` wrapper, not `AnalyzerListsResponse`
   - `lists` structure is `{ locked: boolean, full?: AnalyzerListsResponse, preview?: AnalyzerListsResponse }`
   - Accessing `lists.positive` on this structure returns `undefined`, then `.length` crashes

2. **Line 169:** `{lists && lists.negative.length > 0 && (`
   - Same issue as above

3. **Line 184:** `{lists && lists.positive.length === 0 && lists.negative.length === 0 && (`
   - Same issue as above

4. **Line 218:** `<AnalysisResultCard breakdown={analysis.breakdown} paragraphs={analysis.paragraphs} />`
   - **Crash:** `analysis.paragraphs` is `undefined` because `analysis` is a `LockedResponse` wrapper
   - `analysis` structure is `{ locked: boolean, full?: AnalyzeMessageResponse, preview?: AnalyzeMessageResponse }`
   - Accessing `analysis.paragraphs` on this structure returns `undefined`

5. **File:** `socialsocial/src/screens/stats/components/AnalysisResultCard.tsx`
   - **Line 72:** `{paragraphs.length > 0 && (`
   - **Crash:** `paragraphs` prop is `undefined` (passed from SocialTipsTab line 218)

### Root Cause Analysis

**Step 5.12 monetization layer introduced `LockedResponse<T>` wrapper for all premium endpoints**, but:

1. **Frontend API types not updated:** `analyzerService.ts` still declares return types as direct DTOs instead of `LockedResponse<DTO>`

2. **Frontend component not unwrapping:** `SocialTipsTab.tsx` expects direct DTOs and doesn't unwrap `LockedResponse` before using the data

3. **No defensive checks:** Component doesn't check if `lists`/`analysis` is a `LockedResponse` or guard against `undefined` properties

### Expected Behavior

1. `fetchAnalyzerLists()` should return `LockedResponse<AnalyzerListsResponse>`
2. `analyzeMessage()` should return `LockedResponse<AnalyzeMessageResponse>`
3. `SocialTipsTab` should unwrap `LockedResponse`:
   - Check `response.locked`
   - Use `response.full` or `response.preview` accordingly
   - Handle locked state with UI (already has `isLocked` check, but needs to handle API response)

### Files & Lines to Fix

**Frontend API Types:**

1. **`socialsocial/src/api/analyzerService.ts`**
   - **Line 61:** Change return type: `Promise<LockedResponse<AnalyzerListsResponse>>`
   - **Line 69:** Change return type: `Promise<LockedResponse<AnalyzeMessageResponse>>`
   - **Line 62-63:** Unwrap response: `const res = await apiClient.get<LockedResponse<AnalyzerListsResponse>>('/analyzer/lists'); return res.data;` (already correct, just type needs update)

**Frontend Component:**

2. **`socialsocial/src/screens/stats/SocialTipsTab.tsx`**
   - **Line 32:** Change state type: `useState<AnalyzerListsResponse | null>(null)` (keep as is, but unwrap LockedResponse)
   - **Line 45-57:** Update `loadLists()`:
     ```typescript
     const response = await fetchAnalyzerLists();
     if (response.locked) {
       // Handle locked state (show preview or lock UI)
       setLists(response.preview || null);
     } else {
       setLists(response.full || null);
     }
     ```
   - **Line 34:** Change state type: `useState<AnalyzeMessageResponse | null>(null)` (keep as is, but unwrap LockedResponse)
   - **Line 59-75:** Update `handleMessagePress()`:
     ```typescript
     const response = await analyzeMessage(item.messageId);
     if (response.locked) {
       // Handle locked state
       setAnalysis(response.preview || null);
     } else {
       setAnalysis(response.full || null);
     }
     ```
   - **Line 154, 169, 184:** Add defensive checks:
     ```typescript
     {lists && lists.positive && lists.positive.length > 0 && (
     ```
   - **Line 218:** Add defensive check:
     ```typescript
     {analysis && analysis.breakdown && analysis.paragraphs && (
       <AnalysisResultCard breakdown={analysis.breakdown} paragraphs={analysis.paragraphs} />
     )}
     ```

3. **`socialsocial/src/screens/stats/components/AnalysisResultCard.tsx`**
   - **Line 23:** Add defensive check:
     ```typescript
     export default function AnalysisResultCard({ breakdown, paragraphs = [] }: AnalysisResultCardProps) {
     ```
   - **Line 72:** Already has check `paragraphs.length > 0`, but needs default parameter above

### Suggested Fix Summary

**Minimal changes:**
1. Update `analyzerService.ts` return types to `LockedResponse<T>`
2. Unwrap `LockedResponse` in `SocialTipsTab` before setting state
3. Add defensive checks for `lists.positive`, `lists.negative`, and `analysis.paragraphs`
4. Add default parameter `paragraphs = []` in `AnalysisResultCard`

**Optional enhancements:**
- Show locked/preview UI when `response.locked === true`
- Handle empty arrays gracefully with "No messages yet" state (already exists at line 184)

---

## Summary

### Issue 1: Mood Timeline 404
- **Root cause:** Service throws Error when timeline not found, controller doesn't catch it
- **Fix:** Add try/catch in controller, return empty `LockedResponse` instead of 404
- **Files:** `backend/src/modules/stats/stats.controller.ts` (line 175-226)

### Issue 2: SocialTipsTab Crash
- **Root cause:** Frontend expects direct DTOs but backend returns `LockedResponse<T>` wrapper
- **Fix:** Update API types, unwrap `LockedResponse` in component, add defensive checks
- **Files:** 
  - `socialsocial/src/api/analyzerService.ts` (line 61, 69)
  - `socialsocial/src/screens/stats/SocialTipsTab.tsx` (line 45-57, 59-75, 154, 169, 184, 218)
  - `socialsocial/src/screens/stats/components/AnalysisResultCard.tsx` (line 23)

Both issues stem from incomplete migration to the `LockedResponse<T>` pattern introduced in Step 5.12.

