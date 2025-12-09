# SCOUT REPORT — STEP 5.11 (Rotation Engine)

## Section A: Missing Prerequisites

### A.1 Missing Insight Source Exports
- ❌ **Synergy Insights**: No `getSynergyCandidatesForRotation()` method exists in `SynergyService`
  - Location: `backend/src/modules/synergy/synergy.service.ts`
  - Status: Synergy service only computes correlation matrix, no insight candidates exported
  - Required: Add method to generate insight candidates from synergy data (e.g., "Strong correlation between X and Y traits")

### A.2 Missing Unified History Loader
- ⚠️ **Fragmented History**: Each insight source loads its own history:
  - `loadInsightHistory()` - loads from `MissionDeepInsights.insightsJson.meta.pickedIds`
  - `loadMoodInsightHistory()` - loads from `MissionMoodTimeline.timelineJson.moodInsights.pickedIds`
  - `loadParagraphHistory()` - loads from `MissionDeepInsights.insightsJson.meta.pickedParagraphIds`
- Required: Unified history loader that aggregates all insight IDs from all sources

### A.3 Missing Surface-Specific Quota Configuration
- ❌ **No Surface Quotas**: Current system uses fixed quotas (gate 2-3, hook 2-3, pattern 1-2, tip 6)
  - Required: Surface-specific quotas (e.g., MissionEnd: 6 total, AdvancedTab: 3 total, Analyzer: 2 paragraphs)

### A.4 Missing Premium Flag on Insights
- ❌ **No Premium Metadata**: `CandidateInsight` interface lacks `isPremium` flag
  - Required: Add `isPremium?: boolean` to `CandidateInsight` to support premium gating

### A.5 Missing Rotation Engine Module
- ❌ **No Rotation Module**: `backend/src/modules/rotation/` does not exist
  - Required: Create `rotation.service.ts`, `rotation.module.ts`, `rotation.types.ts`, `rotation.history.ts`, `rotation.policy.ts`

### A.6 Missing Debug Endpoint
- ❌ **No Debug Endpoint**: No `/v1/dev/rotation/debug` endpoint exists
  - Required: Debug endpoint for QA/testing to inspect rotation decisions

## Section B: Confirmed Prerequisites

### B.1 Insight Sources with Stable IDs
- ✅ **Gate/Hook/Pattern/Tip Insights**: `insight-catalog.v1.ts` provides stable IDs (e.g., `'gate_min_messages_too_short'`)
- ✅ **Mood Insights**: `mood.insights.registry.ts` provides stable IDs (e.g., `'MOOD_WARMUP_SUCCESS_V1'`)
- ✅ **Analyzer Paragraphs**: `deepParagraph.registry.ts` provides stable IDs (e.g., `'paragraph_confidence_foundation_v1'`)
- ✅ **CandidateInsight Interface**: Defined in `insights.types.ts` with required fields

### B.2 Existing Cooldown Infrastructure
- ✅ **History Loading**: `loadInsightHistory()` pattern exists and works
- ✅ **Exposure Storage**: Insights stored in `MissionDeepInsights.insightsJson.meta.pickedIds`
- ✅ **Paragraph Storage**: Paragraphs stored in `MissionDeepInsights.insightsJson.meta.pickedParagraphIds`
- ✅ **Mood Storage**: Mood insights stored in `MissionMoodTimeline.timelineJson.moodInsights.pickedIds`

### B.3 Deterministic Selection Infrastructure
- ✅ **Seeded PRNG**: `insight-prng.ts` provides `createSeededPRNG()` and `generateInsightsV2Seed()`
- ✅ **Deterministic Sorting**: Current selector uses stable sort (priority → weight → id)
- ✅ **Idempotent History**: History loading anchored by `PracticeSession.createdAt < anchorTimestamp`

### B.4 Premium Gating Infrastructure
- ✅ **FeatureGate System**: `socialsocial/src/utils/featureGate.ts` exists with `isFeatureLocked()` and `getFeatureLockMessage()`
- ✅ **Premium Features List**: `['ADVANCED_METRICS', 'MESSAGE_ANALYZER']` defined
- ⚠️ **Backend Premium Check**: No backend utility for checking premium status (may need to add)

### B.5 Integration Points Identified
- ✅ **Pipeline Location**: `sessions.service.ts` lines 789-809 (after insights, synergy, mood; before Hall of Fame)
- ✅ **Service Injection**: All required services already injected (InsightsService, SynergyService, MoodService)

## Section C: Integration Points

### C.1 Backend Pipeline Integration
**File**: `backend/src/modules/sessions/sessions.service.ts`
**Location**: Lines 789-809 in `finalizeSessionAnalytics()`

**Current Order**:
1. Line 792: `insightsService.buildAndPersistForSession(usedSessionId)`
2. Line 799: `synergyService.computeAndPersistSynergy(userId, usedSessionId)`
3. Line 806: `moodService.buildAndPersistForSession(userId, usedSessionId)`
4. Line 813: `upsertHallOfFameMessages(userId, usedSessionId)`

**Rotation Engine Insertion Point**: **After line 809 (mood), before line 813 (Hall of Fame)**

**Required Code**:
```typescript
// Step 5.11: Unified Insight Rotation Engine
try {
  await this.rotationService.buildAndPersistRotationPack(
    userId,
    usedSessionId,
    'MISSION_END', // surface
  );
} catch (err: any) {
  console.error(`[SessionsService] Rotation engine failed for ${usedSessionId}:`, err);
}
```

### C.2 Frontend Consumption Points

**MissionEndScreen**:
- File: `socialsocial/src/screens/MissionEndScreen.tsx`
- Current: Uses `buildMissionEndSelectedPack()` from `missionEndPackBuilder.ts`
- Required: Pack builder must consume rotation pack from API

**AdvancedTab**:
- File: `socialsocial/src/screens/stats/AdvancedTab.tsx`
- Current: Fetches insights separately (synergy, mood)
- Required: Fetch unified rotation pack for `'ADVANCED_TAB'` surface

**Analyzer**:
- File: `socialsocial/src/screens/analyzer/*` (if exists)
- Current: Fetches paragraphs via `analyzerService.analyzeMessage()`
- Required: Analyzer must consume rotation pack for `'ANALYZER'` surface

### C.3 API Endpoints Requiring Rotation

**Existing Endpoints**:
- `GET /v1/insights/session/:sessionId` - Must return rotation pack for `'MISSION_END'`
- `GET /v1/stats/advanced` - Must return rotation pack for `'ADVANCED_TAB'`
- `POST /v1/analyzer/analyze` - Must return rotation pack for `'ANALYZER'`

**New Endpoints Required**:
- `GET /v1/rotation/pack/:sessionId?surface=MISSION_END` - Direct rotation pack fetch
- `GET /v1/dev/rotation/debug/:sessionId?surface=MISSION_END` - Debug endpoint

## Section D: DTO Requirements

### D.1 Unified CandidateInsight DTO

**Current Interface** (`insights.types.ts` line 188):
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

**Required Extensions**:
```typescript
export interface CandidateInsight {
  id: string;
  kind: InsightKind | 'MOOD' | 'SYNERGY' | 'ANALYZER_PARAGRAPH'; // Extended
  category: string;
  priority: number;
  weight: number;
  evidence?: { ... };
  isPremium?: boolean; // NEW: Premium gating
  source: 'GATES' | 'HOOKS' | 'PATTERNS' | 'MOOD' | 'SYNERGY' | 'ANALYZER' | 'GENERAL'; // NEW: Source tracking
  surface?: string[]; // NEW: Which surfaces this insight can appear on
}
```

### D.2 Rotation Pack Response DTO

**Required New Interface**:
```typescript
export interface RotationPackResponse {
  sessionId: string;
  surface: 'MISSION_END' | 'ADVANCED_TAB' | 'ANALYZER' | 'SYNERGY_MAP' | 'MOOD_TIMELINE';
  selectedInsights: InsightCard[]; // Selected insights for this surface
  selectedParagraphs?: DeepParagraphDTO[]; // Analyzer paragraphs (if surface = 'ANALYZER')
  meta: {
    seed: string;
    excludedIds: string[]; // All IDs excluded from last 5 sessions
    pickedIds: string[]; // IDs selected for this pack
    quotas: {
      gate: number;
      hook: number;
      pattern: number;
      tip: number;
      mood?: number;
      synergy?: number;
      analyzer?: number;
    };
    version: 'v1';
  };
}
```

### D.3 DTO Compatibility Issues

**Issue 1**: Mood insights use `MoodInsightCandidate` which maps to `CandidateInsight` but lacks `source` field
- **Fix**: Update `getMoodCandidatesForRotation()` to include `source: 'MOOD'`

**Issue 2**: Analyzer paragraphs use `DeepParagraphDTO` which doesn't match `CandidateInsight`
- **Fix**: Create adapter function `paragraphToCandidateInsight(paragraph: DeepParagraphDTO): CandidateInsight`

**Issue 3**: Synergy insights don't exist yet
- **Fix**: Create `getSynergyCandidatesForRotation()` that generates insights from correlation matrix

**Issue 4**: `InsightCard` lacks premium flag
- **Fix**: Add `isPremium?: boolean` to `InsightCard` interface

## Section E: History + Cooldown Readiness

### E.1 Exposure Storage Tables

**MissionDeepInsights** (Lines 584-607 in `schema.prisma`):
- ✅ Stores: `insightsJson.meta.pickedIds` (gate/hook/pattern/tip insights)
- ✅ Stores: `insightsJson.meta.pickedParagraphIds` (analyzer paragraphs)
- ✅ Indexed: `@@index([userId, createdAt])` for efficient history queries
- ✅ Unique: `sessionId @unique` prevents double-write

**MissionMoodTimeline** (Lines 612-635 in `schema.prisma`):
- ✅ Stores: `timelineJson.moodInsights.pickedIds` (mood insights)
- ✅ Indexed: `@@index([userId, createdAt])` for efficient history queries
- ✅ Unique: `sessionId @unique` prevents double-write

**SessionTraitSynergy** (from Step 5.9):
- ⚠️ **No Insight Storage**: Only stores correlation matrix, no insight IDs
- **Required**: Add `synergyInsights?: { pickedIds: string[], insights: [...] }` to `synergyJson`

### E.2 History Loading Functions

**Existing**:
- ✅ `loadInsightHistory()` - Loads from `MissionDeepInsights` (last 5 sessions)
- ✅ `loadMoodInsightHistory()` - Loads from `MissionMoodTimeline` (last 5 sessions)
- ✅ `loadParagraphHistory()` - Loads from `MissionDeepInsights` (last 5 sessions)

**Required**:
- ❌ `loadUnifiedInsightHistory()` - Aggregates all sources (insights + mood + paragraphs + synergy)
- ❌ `loadSynergyInsightHistory()` - Loads synergy insight IDs (if added to schema)

### E.3 Cooldown Window Configuration

**Current**: Fixed 5-session window for all insights
**Required**: Kind-specific cooldown windows:
- Gate insights: 3-5 missions (configurable per template)
- Hook insights: 3-5 missions
- Pattern insights: 3-5 missions
- General tips: 3-5 missions
- Mood insights: 3-5 missions
- Synergy insights: 5 missions (if added)
- Analyzer paragraphs: 5 missions

**Storage**: `InsightTemplate.cooldownMissions` exists (line 175 in `insights.types.ts`), but not used in rotation logic

## Section F: Required Backend Files

### F.1 New Files to Create

1. **`backend/src/modules/rotation/rotation.module.ts`**
   - Import: `PrismaModule`, `InsightsModule`, `MoodModule`, `SynergyModule`, `AnalyzerModule`
   - Export: `RotationService`

2. **`backend/src/modules/rotation/rotation.types.ts`**
   - `RotationSurface`: `'MISSION_END' | 'ADVANCED_TAB' | 'ANALYZER' | 'SYNERGY_MAP' | 'MOOD_TIMELINE'`
   - `RotationPackResponse` (see Section D.2)
   - `RotationQuotas` interface
   - `UnifiedInsightHistory` interface

3. **`backend/src/modules/rotation/rotation.history.ts`**
   - `loadUnifiedInsightHistory(prisma, userId, sessionId): Promise<UnifiedInsightHistory>`
   - Aggregates: `MissionDeepInsights.pickedIds`, `MissionMoodTimeline.moodInsights.pickedIds`, `MissionDeepInsights.pickedParagraphIds`, `SessionTraitSynergy.synergyInsights.pickedIds` (if added)

4. **`backend/src/modules/rotation/rotation.policy.ts`**
   - `getQuotasForSurface(surface: RotationSurface): RotationQuotas`
   - `getCooldownWindow(kind: InsightKind): number`
   - `shouldExcludeByCooldown(insightId: string, history: UnifiedInsightHistory, kind: InsightKind): boolean`

5. **`backend/src/modules/rotation/rotation.service.ts`**
   - `collectAllCandidates(userId, sessionId): Promise<CandidateInsight[]>`
     - Calls: `insightsService.getCandidatesForRotation()` (if exists)
     - Calls: `moodService.getMoodCandidatesForRotation()`
     - Calls: `synergyService.getSynergyCandidatesForRotation()` (to be created)
     - Calls: `analyzerService.getParagraphCandidatesForRotation()` (to be created)
   - `selectRotationPack(candidates, history, surface, seed): RotationPackResponse`
   - `buildAndPersistRotationPack(userId, sessionId, surface): Promise<void>`
   - `getRotationPackForSurface(userId, sessionId, surface): Promise<RotationPackResponse>`

6. **`backend/src/modules/rotation/rotation.controller.ts`** (optional, for debug)
   - `GET /v1/dev/rotation/debug/:sessionId?surface=MISSION_END`
   - Returns: Full rotation decision tree (candidates, exclusions, selected, quotas)

### F.2 Files to Modify

1. **`backend/src/modules/insights/insights.service.ts`**
   - Add: `getCandidatesForRotation(sessionId): Promise<CandidateInsight[]>`
   - Extract candidates from `buildInsightsV2()` logic

2. **`backend/src/modules/synergy/synergy.service.ts`**
   - Add: `getSynergyCandidatesForRotation(synergyJson: SynergyJsonPayload): CandidateInsight[]`
   - Generate insights from correlation matrix (e.g., "Strong positive correlation between confidence and clarity")

3. **`backend/src/modules/analyzer/analyzer.service.ts`**
   - Add: `getParagraphCandidatesForRotation(breakdown: MessageBreakdownDTO): CandidateInsight[]`
   - Map `DeepParagraphDTO[]` to `CandidateInsight[]`

4. **`backend/src/modules/sessions/sessions.module.ts`**
   - Import: `RotationModule`

5. **`backend/src/modules/sessions/sessions.service.ts`**
   - Inject: `RotationService`
   - Add rotation hook in `finalizeSessionAnalytics()` (after mood, before Hall of Fame)

6. **`backend/src/modules/insights/insights.types.ts`**
   - Extend: `InsightKind` to include `'MOOD' | 'SYNERGY' | 'ANALYZER_PARAGRAPH'`
   - Extend: `CandidateInsight` with `isPremium?`, `source`, `surface?`
   - Extend: `InsightCard` with `isPremium?`

7. **`backend/src/modules/insights/insights.controller.ts`**
   - Modify: `getSessionInsights()` to return rotation pack instead of raw insights

8. **`backend/src/modules/stats/stats.service.ts`**
   - Modify: `getAdvancedMetricsForUser()` to include rotation pack for `'ADVANCED_TAB'` surface

9. **`backend/src/modules/analyzer/analyzer.service.ts`**
   - Modify: `analyzeMessage()` to use rotation pack for `'ANALYZER'` surface

## Section G: Required Frontend Changes

### G.1 MissionEndScreen
- **File**: `socialsocial/src/screens/MissionEndScreen.tsx`
- **Change**: `buildMissionEndSelectedPack()` should consume rotation pack from API
- **Impact**: Minimal - pack builder already handles safe defaults

### G.2 AdvancedTab
- **File**: `socialsocial/src/screens/stats/AdvancedTab.tsx`
- **Change**: Fetch rotation pack for `'ADVANCED_TAB'` surface instead of separate API calls
- **Impact**: Medium - need to update state management and UI rendering

### G.3 Analyzer Screens
- **Files**: Analyzer-related screens (if exist)
- **Change**: Consume rotation pack for `'ANALYZER'` surface
- **Impact**: Low - analyzer already uses paragraph selection

### G.4 Feature Gate Updates
- **File**: `socialsocial/src/utils/featureGate.ts`
- **Change**: Add `'ROTATION_ENGINE'` feature key if needed
- **Impact**: Low - likely reuse existing `'ADVANCED_METRICS'` key

## Section H: Premium Gating Glue (Step 5.12)

### H.1 Backend Premium Check
- ❌ **Missing**: Backend utility to check user premium status
- **Required**: Add `isUserPremium(userId: string): Promise<boolean>` helper
- **Location**: `backend/src/modules/auth/` or `backend/src/modules/users/`

### H.2 Premium Flag on Insights
- ❌ **Missing**: `CandidateInsight.isPremium` field
- **Required**: Mark insights as premium in:
  - `insight-catalog.v1.ts` - Add `isPremium: boolean` to `InsightTemplate`
  - `mood.insights.registry.ts` - Add `isPremium: boolean` to `MoodInsightCandidate`
  - `deepParagraph.registry.ts` - Add `isPremium: boolean` to `DeepParagraphTemplate`

### H.3 Rotation Engine Premium Filtering
- **Required**: Filter out premium insights if user is not premium
- **Location**: `rotation.service.ts` in `selectRotationPack()`
- **Logic**: `if (!isPremium && candidate.isPremium) continue;`

## Section I: Debug/Backfill Glue (Step 5.13)

### I.1 Debug Endpoint
- **Required**: `GET /v1/dev/rotation/debug/:sessionId?surface=MISSION_END`
- **Returns**: Full rotation decision tree:
  ```typescript
  {
    candidates: CandidateInsight[];
    history: UnifiedInsightHistory;
    excludedIds: string[];
    selected: CandidateInsight[];
    quotas: RotationQuotas;
    seed: string;
  }
  ```

### I.2 Backfill Utility
- **Required**: Script to backfill rotation packs for old sessions
- **Location**: `backend/scripts/backfill-rotation-packs.ts`
- **Logic**: For each finalized session, call `rotationService.buildAndPersistRotationPack()`

### I.3 Logging Infrastructure
- ⚠️ **Partial**: Logger exists but no structured rotation logging
- **Required**: Add rotation-specific logging:
  - Candidate counts by source
  - Exclusion counts by reason
  - Selected insights by kind
  - Quota fill rates

## Section J: Risks

### J.1 Performance Risks
- **Risk**: Loading history from 4+ tables (MissionDeepInsights, MissionMoodTimeline, SessionTraitSynergy) may be slow
- **Mitigation**: Use single query with joins, or cache history in memory for active sessions

### J.2 Data Consistency Risks
- **Risk**: If rotation pack is computed but not persisted, frontend may show stale data
- **Mitigation**: Ensure idempotent persistence with unique constraints

### J.3 Determinism Risks
- **Risk**: Different surfaces may select different insights for same session (by design, but must be deterministic per surface)
- **Mitigation**: Use surface-specific seed: `generateSeed(userId, sessionId, surface)`

### J.4 Migration Risks
- **Risk**: Old sessions without rotation packs may break frontend
- **Mitigation**: Frontend must handle missing rotation pack gracefully (safe defaults)

### J.5 Premium Gating Risks
- **Risk**: Premium insights may leak to free users if filtering fails
- **Mitigation**: Double-check premium status in both rotation engine and API response

## Section K: Definition of Done

### K.1 Backend Completion Criteria
- [ ] Rotation module created with all required files
- [ ] All insight sources export `getXxxCandidatesForRotation()` methods
- [ ] Unified history loader aggregates all sources
- [ ] Rotation engine selects insights deterministically per surface
- [ ] Rotation packs persisted to database (new table or existing JSON)
- [ ] Premium filtering works correctly
- [ ] Integration hook added to `sessions.service.ts`
- [ ] API endpoints return rotation packs
- [ ] Debug endpoint available for QA

### K.2 Frontend Completion Criteria
- [ ] MissionEndScreen consumes rotation pack
- [ ] AdvancedTab consumes rotation pack
- [ ] Analyzer consumes rotation pack
- [ ] Premium gating UI works correctly
- [ ] Safe defaults for old sessions

### K.3 Testing Criteria
- [ ] Determinism verified (same inputs → same outputs)
- [ ] Cooldown exclusion verified (last 5 sessions excluded)
- [ ] Premium filtering verified (free users don't see premium insights)
- [ ] Surface quotas verified (each surface gets correct number of insights)
- [ ] Performance acceptable (< 500ms for rotation pack generation)

### K.4 Documentation Criteria
- [ ] Rotation engine architecture documented
- [ ] Surface quota configuration documented
- [ ] Cooldown window configuration documented
- [ ] Premium insight marking documented

## VERDICT: **NOT READY** for Implementation

### Blockers:
1. ❌ Synergy insights export function missing
2. ❌ Unified history loader missing
3. ❌ Rotation module structure not defined
4. ❌ Premium flag on insights missing
5. ❌ Surface quota configuration missing

### Prerequisites to Complete First:
1. Add `getSynergyCandidatesForRotation()` to `SynergyService`
2. Create unified history loader
3. Design rotation module structure
4. Add premium flags to all insight sources
5. Define surface quota configuration

### Estimated Effort:
- Backend: 3-4 days (rotation module + integrations)
- Frontend: 1-2 days (consumption updates)
- Testing: 1-2 days
- **Total: 5-8 days**

---

**END OF SCOUT REPORT**

