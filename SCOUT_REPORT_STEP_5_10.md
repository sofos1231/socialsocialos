# SCOUT REPORT — Step 5.10 (Mood Timeline + Mood Insights + 5.11 Glue)

## 1. Schema Status

**MissionMoodTimeline Model** (Lines 612-635 in `backend/prisma/schema.prisma`):
- ✅ EXISTS: Model already defined with required fields
- ⚠️ **ISSUE**: `currentMoodState` field uses old enum values (`'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'RECOVERING' | 'COLLAPSED'`)
- ✅ Fields present: `id`, `sessionId` (unique), `userId`, `timelineJson` (Json), `currentMoodState` (String), `currentMoodPercent` (Int), `createdAt`, `updatedAt`, `version`
- ✅ Relations: `session` (PracticeSession), `user` (User) with cascade delete
- ✅ Indexes: `@@index([userId, createdAt])`, `@@index([missionId])`, `@@index([currentMoodState])`
- **ACTION REQUIRED**: Update `currentMoodState` comment/doc to reflect Step 5.10 values: `'COLD' | 'NEUTRAL' | 'WARM' | 'TENSE' | 'FLOW'` (actual DB field is String, so no migration needed)

**UserInsightHistory Model**:
- ❌ **DOES NOT EXIST** - No separate model for tracking insight exposures
- ✅ **ALTERNATIVE**: Insights cooldown tracked via `MissionDeepInsights.insightsJson.meta.pickedIds` array
- ✅ Pattern: `loadInsightHistory()` in `backend/src/modules/insights/engine/insight-history.ts` loads last 5 sessions' `pickedIds` from `MissionDeepInsights`
- **ACTION REQUIRED**: For Step 5.10 mood insights, either:
  - Option A: Store mood insight IDs in a separate field within `MissionMoodTimeline.timelineJson` (e.g., `moodInsightsJson.pickedIds`)
  - Option B: Create `UserInsightHistory` model if spec requires separate tracking (not found in blueprint)
  - **RECOMMENDATION**: Use Option A (store in timeline JSON) to match existing pattern

## 2. Message Source Mapping

**Primary Source**: `backend/src/modules/shared/helpers/session-snapshot.helper.ts`
- ✅ Function: `loadSessionAnalyticsSnapshot(prisma, sessionId)` returns `SessionAnalyticsSnapshot`
- ✅ Provides normalized messages with:
  - `turnIndex: number` ✅
  - `role: 'USER' | 'AI' | 'SYSTEM'` ✅
  - `score: number | null` ✅
  - `traitData: { traits: Record<string, number>, hooks: string[], patterns: string[] }` ✅
- ✅ Messages ordered by `turnIndex: 'asc'`
- ✅ Session must be finalized (SUCCESS/FAIL/ABORTED) for analytics

**Trait Data Normalization**: `backend/src/modules/shared/normalizers/chat-message.normalizer.ts`
- ✅ Function: `normalizeTraitData(v)` returns normalized trait structure
- ✅ Guarantees: `hooks: string[]` and `patterns: string[]` (default to `[]` if missing)
- ✅ Traits available: `confidence`, `clarity`, `humor`, `tensionControl`, `emotionalWarmth`, `dominance`

**Efficiency**: Single query via `loadSessionAnalyticsSnapshot()` - no additional queries needed for mood computation.

## 3. Finalization Pipeline Insertion Point

**File**: `backend/src/modules/sessions/sessions.service.ts`

**Exact Location**: Lines 789-809
```typescript
// Line 789-795: Deep Insights
try {
  await this.insightsService.buildAndPersistForSession(usedSessionId);
} catch (err: any) {
  console.error(`[SessionsService] Deep Insights failed for ${usedSessionId}:`, err);
}

// Line 797-802: Step 5.9 Trait Synergy (CURRENT)
try {
  await this.synergyService.computeAndPersistSynergy(userId, usedSessionId);
} catch (err: any) {
  console.error(`[SessionsService] Trait synergy computation failed for ${usedSessionId}:`, err);
}

// Line 804-809: Hall of Fame (AFTER mood)
try {
  await this.upsertHallOfFameMessages(userId, usedSessionId);
} catch (err: any) {
  // ...
}
```

**Insertion Point**: **After line 802 (synergy), before line 804 (Hall of Fame)**
- ✅ After Deep Insights (line 795)
- ✅ After Trait Synergy (line 802)
- ✅ Before Hall of Fame (line 804)
- ✅ Same error handling pattern (try/catch with console.error)

**Dependencies**: 
- `MoodService` must be injected into `SessionsService` constructor (check line ~101-110)
- `MoodModule` must be imported in `SessionsModule` (check `backend/src/modules/sessions/sessions.module.ts`)

## 4. Insight Cooldown + Integration Requirements

**Existing Pattern** (`backend/src/modules/insights/engine/insight-history.ts`):
- ✅ Function: `loadInsightHistory(prisma, userId, currentSessionId)` returns `InsightHistory`
- ✅ Loads last 5 prior sessions from `MissionDeepInsights` (anchored by `PracticeSession.createdAt < anchorTimestamp`)
- ✅ Extracts `pickedIds` from `insightsJson.insightsV2.meta.pickedIds` array
- ✅ Returns deduplicated array of insight IDs to exclude

**For Mood Insights**:
- **Option A (Recommended)**: Store mood insight IDs in `MissionMoodTimeline.timelineJson`:
  ```typescript
  {
    version: 1,
    snapshots: [...],
    moodInsights?: {
      pickedIds: string[],
      insights: Array<{ id, title, body, ... }>
    }
  }
  ```
- **Option B**: Create separate `UserInsightHistory` model (not found in existing codebase)
- **Cooldown Logic**: Load last 5 `MissionMoodTimeline` records, extract `pickedIds`, exclude from selection

**Stable IDs Pattern**:
- ✅ Insight catalog uses stable IDs (e.g., `'gate_min_messages_too_short'`, `'hook_empathy_strong_v1'`)
- ✅ Mood insights registry already defines stable IDs (e.g., `'MOOD_WARMUP_SUCCESS_V1'`)
- ✅ IDs must be deterministic and versioned

**Selection Pattern** (`backend/src/modules/insights/engine/insight-selector.ts`):
- ✅ Build candidates, filter by excluded IDs, sort by priority, apply quotas
- ✅ Mood insights should follow same pattern: evaluate rules → filter cooldown → sort by `priorityScore` → select top 1-3

## 5. Backend Files to Create

**Already Exists**:
- ✅ `backend/src/modules/mood/mood.module.ts` (exists, lines 1-13)
- ✅ `backend/src/modules/mood/mood.types.ts` (exists, but needs Step 5.10 updates)
- ✅ `backend/src/modules/mood/mood.service.ts` (exists, but uses old Phase 0 structure - needs complete rewrite)
- ✅ `backend/src/modules/mood/mood.insights.registry.ts` (just created, needs integration)

**Files to Modify**:
1. **`backend/src/modules/mood/mood.types.ts`**:
   - ✅ Already updated with Step 5.10 `MoodState` enum
   - ✅ Already updated with Step 5.10 `MoodSnapshot` structure
   - ✅ Already updated with `MoodTimelinePayload` (version: 1)
   - ⚠️ **ACTION**: Verify `MoodTimelinePayload` matches exact blueprint spec

2. **`backend/src/modules/mood/mood.service.ts`**:
   - ⚠️ **REWRITE REQUIRED**: Current implementation uses old Phase 0 structure
   - Must implement:
     - `buildTimelineForSession(sessionId)` - compute timeline with EMA smoothing (α=0.35)
     - `persistTimeline(sessionId, payload)` - upsert to `MissionMoodTimeline`
     - `selectMoodInsights(userId, sessionId, timelinePayload)` - evaluate registry, apply cooldown, return top 1-3
     - `recordMoodInsightExposure(userId, sessionId, insight)` - store picked IDs in timeline JSON
     - `getMoodCandidatesForRotation(timelinePayload)` - Step 5.11 glue (export function)

3. **`backend/src/modules/mood/mood.insights.registry.ts`**:
   - ✅ Already created with 5 rules
   - ⚠️ **ACTION**: Verify rules match blueprint requirements, add more if needed

**Files to Wire**:
4. **`backend/src/modules/sessions/sessions.service.ts`**:
   - Inject `MoodService` in constructor
   - Add mood computation hook in `finalizeSessionAnalytics()` (after synergy, before Hall of Fame)

5. **`backend/src/modules/sessions/sessions.module.ts`**:
   - Import `MoodModule` (verify if already imported)

6. **`backend/src/modules/stats/stats.service.ts`**:
   - Add `getMoodTimelineForSession(userId, sessionId)` method
   - Load `MissionMoodTimeline`, validate ownership, return response with insights

7. **`backend/src/modules/stats/stats.controller.ts`**:
   - Add `GET /v1/stats/mood/session/:sessionId` endpoint
   - Use `JwtAuthGuard`, extract userId from `req.user`, call `statsService.getMoodTimelineForSession()`

## 6. API Surfaces + DTO Requirements

**Backend API Endpoint**:
- **Path**: `GET /v1/stats/mood/session/:sessionId`
- **Controller**: `backend/src/modules/stats/stats.controller.ts` (add new method)
- **Guard**: `@UseGuards(JwtAuthGuard)` (class-level already applied)
- **User ID Extraction**: `req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user)` (same pattern as other endpoints, line 14-16)

**Response DTO** (to be defined in `backend/src/modules/stats/stats.types.ts`):
```typescript
export interface MoodTimelineResponse {
  sessionId: string;
  payload: {
    version: number;
    snapshots: Array<{
      turnIndex: number;
      smoothedMoodScore: number;
      moodState: MoodState;
    }>;
  };
  current: {
    moodState: MoodState;
    moodPercent: number;
  };
  insights: Array<{
    id: string;
    title: string;
    body: string;
  }>;
}
```

**Ownership Validation Pattern** (`backend/src/modules/insights/insights.service.ts`, lines 456-474):
- ✅ Load `MissionMoodTimeline` with `session` relation included
- ✅ Check `timeline.session.userId === userId`
- ✅ Throw error if ownership mismatch

**Service Method** (`backend/src/modules/stats/stats.service.ts`):
- Follow pattern from `getSynergyForUser()` (lines 1520-1600)
- Load `MissionMoodTimeline` by `sessionId`
- Extract `timelineJson`, map to response DTO
- Load mood insights from timeline JSON (or separate query if stored separately)

## 7. Frontend Surfaces to Modify

**Types** (`socialsocial/src/types/InsightsDTO.ts` or new file):
- ⚠️ **ACTION**: Add `MoodState`, `MoodSnapshot`, `MoodTimelineResponse` types
- Match backend DTO structure exactly

**API Client** (`socialsocial/src/api/statsService.ts`):
- ✅ Pattern exists: `fetchTraitSynergy()` (lines 266-269)
- **ACTION**: Add `fetchMoodTimeline(sessionId: string): Promise<MoodTimelineResponse>`
- Use: `apiClient.get(`/v1/stats/mood/session/${sessionId}`)`

**MissionEndScreen** (`socialsocial/src/screens/MissionEndScreen.tsx`):
- ✅ Placeholder exists: `moodTeaser` (lines 412-418)
- ✅ `MissionEndSelectedPack` includes `moodTeaser: MoodTeaser | null` (line 82 in `MissionEndTypes.ts`)
- **ACTION**: 
  - Add "Mood Summary" card showing start → end mood transition
  - Show current mood banner (e.g., "You finished in FLOW state")
  - Add CTA to open full mood view (premium locked)
  - Use `fetchMoodTimeline(sessionId)` if available, otherwise show computed teaser

**AdvancedTab** (`socialsocial/src/screens/stats/AdvancedTab.tsx`):
- ✅ Premium gating pattern exists (lines 99-120)
- ✅ Chart utility exists: `TraitMiniChart` component (uses `react-native-svg`)
- **ACTION**:
  - Add "Mood Timeline" section (after synergy section)
  - Load mood timeline data via `fetchMoodTimeline()` (need sessionId - may need to fetch latest session)
  - Render line chart using `TraitMiniChart` or similar SVG component
  - Color-code by mood state (COLD=blue, NEUTRAL=gray, WARM=orange, TENSE=red, FLOW=green)
  - Show premium lock UI if `isFeatureLocked('ADVANCED_METRICS', isPremium)`

**Feature Gate** (`socialsocial/src/utils/featureGate.ts`):
- ✅ Pattern exists: `isFeatureLocked('ADVANCED_METRICS', isPremium)`
- **ACTION**: Verify mood timeline is part of `'ADVANCED_METRICS'` or add separate `'MOOD_TIMELINE'` key

## 8. Determinism Constraints

**EMA Smoothing**:
- ✅ Must use EMA with α=0.35 (exponential moving average)
- Formula: `smoothed = α * raw + (1 - α) * previousSmoothed`
- First snapshot: `smoothed = raw` (no previous value)

**Mood State Classification**:
- ✅ Must be rule-based (no randomness)
- Thresholds from blueprint:
  - `COLD`: `smoothedMoodScore < 30` AND `tension > 60`
  - `NEUTRAL`: `30 <= smoothedMoodScore < 60` AND `tension <= 60`
  - `WARM`: `60 <= smoothedMoodScore < 80` AND `warmth > 50`
  - `TENSE`: `tension > 70` OR (`smoothedMoodScore < 50` AND `tension > 50`)
  - `FLOW`: `smoothedMoodScore >= 80` AND `flow > 70` AND `tension < 40`
- ⚠️ **ACTION**: Verify exact thresholds from blueprint

**Tension/Warmth/Vibe/Flow Computation**:
- ✅ Must be deterministic functions of traits + patterns
- `tension`: Inverse of `tensionControl` trait + negative patterns
- `warmth`: `emotionalWarmth` trait + positive hooks
- `vibe`: `humor` + `confidence` traits
- `flow`: EMA of score stability (variance of recent scores)

**Insight Selection**:
- ✅ Registry rules must be deterministic (same timeline → same insights)
- ✅ Cooldown exclusion must be deterministic (same history → same exclusions)
- ✅ Sorting by `priorityScore` must be stable (tie-break by ID if needed)
- ✅ Selection of top 1-3 must be deterministic (no random selection)

**Node Positions** (if graph visualization):
- ✅ Use deterministic layout (fixed circle or grid)
- ✅ Same trait keys → same positions

## 9. Step 5.11 Glue Requirements

**Function to Export**: `getMoodCandidatesForRotation(timelinePayload: MoodTimelinePayload): CandidateInsight[]`

**Location**: `backend/src/modules/mood/mood.service.ts` (export as public method)

**Return Type**: Must match `CandidateInsight` interface from `backend/src/modules/insights/insights.types.ts`:
```typescript
export interface CandidateInsight {
  id: string;
  kind: InsightKind; // 'GATE_FAIL' | 'POSITIVE_HOOK' | 'NEGATIVE_PATTERN' | 'GENERAL_TIP'
  category: string;
  priority: number; // 0-100
  weight: number;
  evidence?: { ... };
}
```

**Mapping from MoodInsightCandidate**:
- `id` → `id` (same)
- `kind` → Map to closest `InsightKind` (mood insights are likely `'GENERAL_TIP'` or new kind)
- `category` → `categoryKey` or default
- `priority` → `priorityScore`
- `weight` → Use `priorityScore` as weight (or fixed value)
- `evidence` → Extract from `evidence` string or construct object

**Integration Point** (future Step 5.11):
- Rotation engine will call `moodService.getMoodCandidatesForRotation(timeline)` 
- Merge with other insight candidates (gates, hooks, patterns)
- Apply unified selection logic

**⚠️ ACTION**: Verify if mood insights need new `InsightKind` or can use existing `'GENERAL_TIP'`

## 10. Risks & Missing Dependencies

**Risks**:
1. ⚠️ **Schema Mismatch**: `MissionMoodTimeline.currentMoodState` comment references old enum values - may cause confusion but no runtime issue (field is String)
2. ⚠️ **No UserInsightHistory Model**: Mood insights cooldown must use alternative (store in timeline JSON)
3. ⚠️ **SessionId in AdvancedTab**: Frontend needs sessionId to fetch mood timeline - may need to fetch latest session first
4. ⚠️ **Mood State Thresholds**: Exact thresholds from blueprint must be verified and implemented deterministically
5. ⚠️ **EMA Initialization**: First snapshot smoothing must handle edge case (no previous value)

**Missing Dependencies**:
1. ✅ All required modules exist (MoodModule, StatsModule, SessionsModule)
2. ✅ All required helpers exist (session-snapshot.helper, chat-message.normalizer)
3. ✅ Chart utilities exist (TraitMiniChart with react-native-svg)
4. ⚠️ **Mood Insights Cooldown Helper**: May need to create `loadMoodInsightHistory()` similar to `loadInsightHistory()` but querying `MissionMoodTimeline`

**Potential Issues**:
1. **Performance**: Loading last 5 mood timelines for cooldown may be slower than insights (separate table) - consider indexing
2. **Data Migration**: Existing `MissionMoodTimeline` records may have old structure - handle gracefully in service
3. **Frontend SessionId**: `AdvancedTab` doesn't have sessionId - may need to add `fetchLatestSessionId()` or pass from parent

## 11. Implementation Checklist (Do NOT implement)

**Backend**:
- [ ] Update `mood.types.ts` to match exact blueprint spec (verify `MoodTimelinePayload` structure)
- [ ] Rewrite `mood.service.ts` with Step 5.10 methods:
  - [ ] `buildTimelineForSession()` - EMA smoothing (α=0.35), deterministic mood state classification
  - [ ] `persistTimeline()` - upsert to `MissionMoodTimeline`
  - [ ] `selectMoodInsights()` - evaluate registry, apply cooldown, return top 1-3
  - [ ] `recordMoodInsightExposure()` - store picked IDs in timeline JSON
  - [ ] `getMoodCandidatesForRotation()` - Step 5.11 glue
- [ ] Create `loadMoodInsightHistory()` helper (if needed) or use existing pattern
- [ ] Wire `MoodService` into `SessionsService.finalizeSessionAnalytics()` (after synergy, before Hall of Fame)
- [ ] Add `getMoodTimelineForSession()` to `StatsService`
- [ ] Add `GET /v1/stats/mood/session/:sessionId` endpoint to `StatsController`
- [ ] Add `MoodTimelineResponse` type to `stats.types.ts`
- [ ] Update `MissionMoodTimeline.currentMoodState` comment/doc (no migration needed)

**Frontend**:
- [ ] Add `MoodState`, `MoodSnapshot`, `MoodTimelineResponse` types to `InsightsDTO.ts` or new file
- [ ] Add `fetchMoodTimeline(sessionId)` to `statsService.ts`
- [ ] Update `MissionEndScreen` with mood summary card (start → end, current mood, CTA)
- [ ] Add mood timeline section to `AdvancedTab` (line chart, color-coded, premium gated)
- [ ] Verify feature gate includes mood timeline (or add separate key)

**Testing**:
- [ ] Verify EMA smoothing produces deterministic results
- [ ] Verify mood state classification matches blueprint thresholds
- [ ] Verify insight cooldown excludes last 5 sessions correctly
- [ ] Verify API endpoint returns correct shape and validates ownership
- [ ] Verify frontend displays timeline correctly with color coding

**Step 5.11 Glue**:
- [ ] Export `getMoodCandidatesForRotation()` from `MoodService`
- [ ] Verify return type matches `CandidateInsight` interface
- [ ] Document integration point for future rotation engine

---

**END OF SCOUT REPORT**

