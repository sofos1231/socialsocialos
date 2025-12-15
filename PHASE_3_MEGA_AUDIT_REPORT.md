# Phase 3 Mega Audit Report
## Checklist-Native Migration: Dashboard, Stats, Analytics, Frontend

**Date:** Phase 3 Pre-Implementation Audit  
**Status:** ✅ COMPLETE AUDIT  
**Mode:** READ-ONLY (No modifications)

---

## Executive Summary

This audit maps **all remaining numeric score dependencies** across the entire codebase and provides a complete Phase 3 migration plan. Phase 2 successfully migrated mission state and gates to checklist-based evaluation. Phase 3 must now migrate all dashboards, stats, analytics, frontend displays, and remaining backend logic to use checklist-native aggregates.

**Key Finding:** Numeric scores are still deeply embedded in:
- Stats aggregation (UserStats, CategoryStats, trait history)
- Hall of Fame selection
- Frontend displays (PracticeScreen, MissionEndScreen, Stats screens)
- API DTOs and serializers
- Prisma schema (multiple tables)

**Migration Complexity:** HIGH - Requires coordinated backend + frontend + schema changes

---

## A. COMPLETE FILE INVENTORY

### Backend Files with Numeric Dependencies

1. **`backend/src/modules/stats/stats.service.ts`** (1698 lines)
   - Lines 81-82, 266-267, 419-420: `averageScore`, `averageMessageScore` in UserStats
   - Lines 185, 232, 278, 380: `score` field from PracticeSession
   - Lines 465, 629-641, 737-749: `avgScore` in CategoryStats and weekly calculations
   - Lines 860, 873, 877: `score` in MessageBreakdownDTO
   - Lines 909-925, 952-956, 965-985: `score` filtering and sorting in advanced metrics
   - Lines 1117-1132, 1141-1154: `avgScore` calculations for persona sensitivity
   - Lines 1401-1438, 1465-1502: Hall of Fame selection using `score >= HALL_OF_FAME_SCORE_THRESHOLD`
   - Lines 1516-1552: Top negative messages using `score` sorting

2. **`backend/src/modules/sessions/sessions.service.ts`** (1400+ lines)
   - Lines 195, 266-267, 566-573, 581-582: `averageScore`, `averageMessageScore` updates
   - Lines 208, 240, 252, 267, 369, 385: `messageScores` array handling
   - Lines 471, 648: `score` field in ChatMessage persistence
   - Lines 551, 613, 618-620, 632: `finalScore` and `bestScore` in RewardLedger and MissionProgress
   - Lines 870-936: `upsertHallOfFameMessages` using `score >= HALL_OF_FAME_SCORE_THRESHOLD` (line 896)

3. **`backend/src/modules/practice/practice.service.ts`** (1808 lines)
   - Lines 83, 379, 385, 441: `averageScore` in MissionStatePayload (legacy compatibility)
   - Lines 93-94, 196-204, 238-239, 245-246, 259-260, 273-274: `successScore`, `failScore` in policy
   - Lines 1349-1376: `messageScores` array construction from checklist-derived scores
   - Lines 1756: `localScoreNumeric` in response (derived from checklist)

4. **`backend/src/modules/gates/gates.service.ts`** (376 lines)
   - Lines 25-26: `GATE_THRESHOLDS_DEFAULT` with numeric thresholds (70, 40)
   - Lines 31-32: `averageScore`, `messageScores` in GateEvaluationContext (marked as deprecated)
   - Lines 151-164, 177-189: Numeric fallback paths (marked `_FALLBACK`)

5. **`backend/src/modules/shared/serializers/api-serializers.ts`** (377 lines)
   - Lines 15, 28, 42, 50, 77, 100: `score` fields in API DTOs
   - Lines 68-69, 85-86, 222-227, 265-272: `successScore`, `failScore` in mission state serialization

6. **`backend/src/modules/ai/score-accumulator.service.ts`** (95 lines)
   - Lines 15, 49, 66: `averageScore` in ScoreSnapshot (derived from checklist, OK)

7. **`backend/src/modules/sessions/scoring.ts`** (267 lines)
   - Lines 11, 75-81, 86-93, 116-153: `score` derivation from checklist (OK - this is the source of truth)
   - Lines 213-238: `score` in `computeSessionRewards` (OK - uses checklist-derived scores)

8. **`backend/src/modules/ai/providers/ai-chat.service.ts`** (1351 lines)
   - Line 27: `messageScore` in ApiAiStructured (deprecated, should be removed)

9. **`backend/prisma/schema.prisma`**
   - Line 242: `PracticeSession.score` (Int, default 0)
   - Line 247: `PracticeSession.overallScore` (Int?)
   - Line 314: `ChatMessage.score` (Int?)
   - Line 346: `UserStats.averageScore` (Float?)
   - Line 347: `UserStats.averageMessageScore` (Float?)
   - Line 378: `MissionProgress.bestScore` (Int?)
   - Line 414: `CategoryStats.avgScore` (Float?)
   - Line 671: `HallOfFameMessage.score` (Int)

10. **`backend/src/modules/stats/config/stats.config.ts`**
    - Line 8: `HALL_OF_FAME_SCORE_THRESHOLD = 90` (numeric threshold)

### Frontend Files with Numeric Dependencies

1. **`socialsocial/src/screens/PracticeScreen.tsx`** (993 lines)
   - Lines 44, 83-84: `score`, `DEFAULT_SUCCESS_SCORE`, `DEFAULT_FAIL_SCORE` constants
   - Uses `missionState.averageScore` for progress display

2. **`socialsocial/src/screens/MissionEndScreen.tsx`** (959 lines)
   - Lines 291-292: Displays `rewards.score`
   - Lines 561: Displays `msg.score` for each message
   - Uses `session.missionState.averageScore` for mood computation

3. **`socialsocial/src/logic/missionEndPackBuilder.ts`** (248 lines)
   - Lines 14-15, 54-67, 76, 86, 98-104, 172-177, 224: Extensive `score` sorting and filtering
   - Line 98: `computeMoodTeaser` uses `averageScore`

4. **`socialsocial/src/types/SessionDTO.ts`**
   - Lines 30, 39, 50-51, 66, 89-90: Multiple `score` fields in DTOs

5. **`socialsocial/src/types/MissionEndTypes.ts`**
   - Lines 12, 31, 52: `score` fields in mission end types

6. **`socialsocial/src/navigation/types.ts`**
   - Lines 138, 146-147, 162, 181: `score` fields in navigation types

7. **`socialsocial/src/screens/stats/StatsPerformanceScreen.tsx`**
   - Displays `avgScoreThisWeek` and other numeric metrics

8. **`socialsocial/src/screens/stats/AdvancedTab.tsx`**
   - Lines 211, 356, 377: Displays `persona.avgScore`, `msg.score`, `selectedMessage.score`

9. **`socialsocial/src/components/stats/MessageAnalyzerPanel.tsx`**
   - Lines 46-47: Displays `analyzedMessage.score`

10. **`socialsocial/src/api/statsService.ts`**
    - Lines 94, 111, 142, 145, 156, 172, 210: Multiple `score` and `avgScore` fields in API types

---

## B. DETAILED AUDIT BY CATEGORY

### 1. Backend: StatsService & Analytics Layer

#### 1.1 UserStats Aggregations

**File:** `backend/src/modules/stats/stats.service.ts`

**Lines 81-82, 266-267, 419-420:**
```typescript
averageScore: 0,
averageMessageScore: 0,
```

**Current Behavior:**
- `averageScore`: Rolling average of `PracticeSession.score` across all sessions
- `averageMessageScore`: Rolling average of per-message scores
- Updated in `sessions.service.ts` lines 566-573 using weighted average formula

**Why Invalid:**
- These are numeric averages of checklist-derived scores
- No semantic meaning - checklist aggregates (hook count, objective progress) are more meaningful

**Checklist-Native Replacement:**
- Replace with:
  - `totalPositiveHooks: number` - Cumulative count of POSITIVE_HOOK_HIT flags
  - `totalObjectiveProgress: number` - Cumulative count of OBJECTIVE_PROGRESS flags
  - `boundarySafeRate: number` - Percentage of messages with NO_BOUNDARY_ISSUES
  - `momentumMaintainedRate: number` - Percentage of messages with MOMENTUM_MAINTAINED
  - `avgChecklistFlagsPerMessage: number` - Average number of flags per message

**Migration Required:**
- Backend: Update `UserStats` aggregation logic
- Schema: Add new fields to `UserStats` table (Phase 4)
- Frontend: Update stats display to show checklist aggregates

---

#### 1.2 CategoryStats

**File:** `backend/src/modules/stats/stats.service.ts`

**Lines 448-469, 465:**
```typescript
averageScore: row.avgScore,
```

**Current Behavior:**
- Tracks `avgScore` per category (Float?)
- Updated in `sessions.service.ts` when sessions complete

**Why Invalid:**
- Numeric average loses semantic meaning
- Category performance should be measured by checklist outcomes

**Checklist-Native Replacement:**
- Replace with:
  - `totalPositiveHooks: number`
  - `totalObjectiveProgress: number`
  - `boundaryViolations: number` - Count of messages missing NO_BOUNDARY_ISSUES
  - `momentumBreaks: number` - Count of messages missing MOMENTUM_MAINTAINED

**Migration Required:**
- Backend: Update CategoryStats aggregation
- Schema: Replace `avgScore` with checklist fields (Phase 4)
- Frontend: Update category stats display

---

#### 1.3 Trait History Average Computations

**File:** `backend/src/modules/stats/stats.service.ts`

**Lines 619-641, 727-749:**
```typescript
const avgScoreThisWeek = sessionsThisWeekWithScores.length > 0
  ? sessionsThisWeekWithScores.reduce((sum, s) => sum + (s.score ?? 0), 0) / sessionsThisWeekWithScores.length
  : null;
```

**Current Behavior:**
- Computes weekly average score from `PracticeSession.score`
- Used in `getTraitsSummaryForUser` and `getStatsSummaryForUser`

**Why Invalid:**
- Weekly trends should show checklist progress, not numeric averages

**Checklist-Native Replacement:**
- Replace with:
  - `positiveHooksThisWeek: number`
  - `objectiveProgressThisWeek: number`
  - `boundarySafeRateThisWeek: number`
  - `momentumMaintainedRateThisWeek: number`

**Migration Required:**
- Backend: Update weekly aggregation logic
- Frontend: Update weekly stats display

---

#### 1.4 Social Score Calculation

**File:** `backend/src/modules/stats/stats.service.ts`

**Lines 94-105, 118-127, 363-368:**
```typescript
private computeSocialScore(
  latestCharismaIndex: number | null,
  avgCharismaIndex: number | null,
): number | null {
  if (typeof latestCharismaIndex === 'number') {
    return Math.round(latestCharismaIndex);
  }
  if (typeof avgCharismaIndex === 'number') {
    return Math.round(avgCharismaIndex);
  }
  return null;
}
```

**Current Behavior:**
- Social Score derived from `charismaIndex` (Option-B metric)
- Falls back to `score` if `charismaIndex` is null (line 278)

**Status:**
- ✅ **SAFE** - Uses Option-B metrics (charismaIndex), not checklist-derived scores
- Fallback to `score` should be removed or replaced with checklist-derived tier

**Migration Required:**
- Backend: Remove fallback to `score`, use checklist-derived tier instead
- Frontend: No changes needed (social score display can remain)

---

#### 1.5 Weekly Trends

**File:** `backend/src/modules/stats/stats.service.ts`

**Lines 320-351:**
```typescript
const IMPROVE_THRESHOLD = 10;
const DECLINE_THRESHOLD = -10;
// ... compares newest vs oldest trait scores
```

**Current Behavior:**
- Compares numeric trait scores (charismaIndex, confidenceScore, etc.) across weeks
- Uses numeric thresholds (10, -10) to detect improvement/decline

**Status:**
- ✅ **SAFE** - Uses Option-B trait metrics, not checklist scores
- No migration needed for this specific logic

---

#### 1.6 Hall of Fame Selection Logic

**File:** `backend/src/modules/stats/stats.service.ts`, `backend/src/modules/sessions/sessions.service.ts`

**Lines 1401-1438 (stats.service.ts), 870-936 (sessions.service.ts):**
```typescript
const HALL_OF_FAME_SCORE_THRESHOLD = 90;
// ...
score: { gte: HALL_OF_FAME_SCORE_THRESHOLD }
```

**Current Behavior:**
- Messages with `score >= 90` are saved to `HallOfFameMessage`
- Top 3 positive and top 3 negative messages per session

**Why Invalid:**
- Uses numeric threshold instead of checklist criteria
- Should select based on checklist flags (e.g., POSITIVE_HOOK_HIT + OBJECTIVE_PROGRESS + tier S+)

**Checklist-Native Replacement:**
- Replace threshold with:
  - `tier === 'S+'` OR
  - `flags.includes(POSITIVE_HOOK_HIT) && flags.includes(OBJECTIVE_PROGRESS) && flags.includes(MULTIPLE_HOOKS_HIT)`
- Keep numeric `score` field for display/sorting, but selection logic uses checklist

**Migration Required:**
- Backend: Update `upsertHallOfFameMessages` to use checklist criteria
- Config: Replace `HALL_OF_FAME_SCORE_THRESHOLD` with checklist criteria
- Frontend: No changes (still displays score for sorting)

---

### 2. Backend: Mission End, Session Persistence, History

#### 2.1 PracticeSession.score

**File:** `backend/prisma/schema.prisma` (line 242), `backend/src/modules/sessions/sessions.service.ts` (line 380)

**Current Behavior:**
- `PracticeSession.score` (Int, default 0) stored in DB
- Set to `finalScore` from `computeSessionRewards` (line 380)
- Used in stats aggregations and frontend displays

**Status:**
- ✅ **COSMETIC** - Score is derived from checklist via `scoreFromChecklist`
- Can remain for display/analytics, but should not be used for logic

**Migration Required:**
- Backend: Ensure all writes use checklist-derived scores (already done in Phase 2)
- Frontend: Can continue displaying, but add checklist aggregates alongside

---

#### 2.2 ChatMessage.score

**File:** `backend/prisma/schema.prisma` (line 314), `backend/src/modules/sessions/sessions.service.ts` (line 471)

**Current Behavior:**
- `ChatMessage.score` (Int?) stored per message
- Set from `messageScores` array (derived from checklist)

**Status:**
- ✅ **COSMETIC** - Score is derived from checklist
- Can remain for display/sorting

**Migration Required:**
- Backend: Ensure all writes use checklist-derived scores (already done)
- Frontend: Can continue displaying, but add checklist flags display

---

#### 2.3 Mission End Logic Storing Numeric Scores

**File:** `backend/src/modules/sessions/sessions.service.ts`

**Lines 551, 613, 618-620, 632:**
```typescript
score: finalScore,
bestScore: finalScore,
bestScore: newBest,
```

**Current Behavior:**
- `RewardLedgerEntry.score` stores final session score
- `MissionProgress.bestScore` tracks best score per template

**Status:**
- ✅ **COSMETIC** - Scores are checklist-derived
- `bestScore` comparison logic (line 619) uses numeric max - OK for display

**Migration Required:**
- Backend: Add checklist aggregates to RewardLedgerEntry.meta (optional)
- Frontend: Can continue displaying bestScore, but add checklist context

---

#### 2.4 Session Summaries

**File:** `backend/src/modules/shared/serializers/api-serializers.ts`

**Lines 176-177, 189, 244-245:**
```typescript
score: typeof resp?.rewards?.score === 'number' ? resp.rewards.score : 0,
averageScore: typeof resp?.missionState?.averageScore === 'number' ? resp.missionState.averageScore : 0,
```

**Current Behavior:**
- API responses include `rewards.score` and `missionState.averageScore`
- Frontend consumes these for display

**Migration Required:**
- Backend: Add checklist aggregates to response (new fields)
- Frontend: Update to display checklist aggregates alongside scores
- DTOs: Extend `PracticeSessionResponsePublic` with checklist fields

---

### 3. Gates, Objectives, and MissionConfigV1

#### 3.1 Gate Dependencies

**File:** `backend/src/modules/gates/gates.service.ts`

**Lines 25-26, 151-164, 177-189:**
```typescript
SUCCESS_THRESHOLD: 70,
FAIL_FLOOR: 40,
// ... numeric fallback paths
```

**Status:**
- ✅ **ALREADY MIGRATED** - Phase 2 updated gates to use checklist aggregates
- Numeric fallbacks marked `_FALLBACK` and only used when checklist unavailable
- **Action:** Remove fallback paths in Phase 3 (or keep as emergency fallback)

---

#### 3.2 MissionConfigV1 Schema

**File:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts`

**Lines 207-208:**
```typescript
successScoreThreshold: number; // 0–100
failScoreThreshold: number; // 0–100
```

**Current Behavior:**
- Config includes numeric thresholds
- Used in policy construction (practice.service.ts lines 259-260, 273-274)

**Status:**
- ⚠️ **DEPRECATED** - No longer used for mission success/fail decisions
- Still included in API responses for UI display

**Migration Required:**
- Backend: Mark as deprecated, add checklist-based thresholds
- Frontend: Remove or hide these fields from UI
- Schema: Keep for backward compatibility, add new checklist fields

---

#### 3.3 Prompt Text

**File:** `backend/src/modules/ai/providers/ai-chat.service.ts`

**Lines 1128-1129:**
```typescript
GATE_SUCCESS_THRESHOLD: 'Sufficient positive hooks, objective progress, boundary safety, and momentum',
GATE_FAIL_FLOOR: 'Boundary safety maintained and objective progress shown',
```

**Status:**
- ✅ **ALREADY MIGRATED** - Phase 2 updated gate descriptions to checklist language
- No numeric references remain

---

### 4. Frontend: Stats Screen, Skill Insights, Hall of Fame

#### 4.1 Stats Screen Components

**Files:**
- `socialsocial/src/screens/stats/StatsPerformanceScreen.tsx`
- `socialsocial/src/screens/stats/StatsAdvancedScreen.tsx`
- `socialsocial/src/screens/stats/StatsHubScreen.tsx`

**Current Behavior:**
- Displays `avgScoreThisWeek`, `averageScore`, `socialScore`
- Shows numeric trends and comparisons

**Checklist-Native Replacement:**
- Replace numeric displays with:
  - "Positive Hooks This Week: X"
  - "Objective Progress Hits: Y"
  - "Boundary Safety Rate: Z%"
  - "Momentum Maintained: W%"
- Add checklist flags visualization (icons/badges)

**Migration Required:**
- Frontend: Rewrite stats display components
- API: Extend stats endpoints to return checklist aggregates
- Types: Update `StatsSummaryResponse`, `TraitsSummaryResponse`

---

#### 4.2 Skill Insights

**File:** `socialsocial/src/screens/stats/AdvancedTab.tsx`

**Lines 211, 356, 377:**
```typescript
<Text style={styles.personaScore}>Avg: {persona.avgScore}</Text>
<Text style={styles.hofScore}>{msg.score}</Text>
<Text style={styles.modalScore}>Score: {selectedMessage.score}</Text>
```

**Current Behavior:**
- Displays numeric scores for persona sensitivity, Hall of Fame, message analyzer

**Checklist-Native Replacement:**
- Persona Sensitivity: Show checklist aggregates per persona
- Hall of Fame: Show checklist flags alongside score
- Message Analyzer: Show checklist flags in breakdown

**Migration Required:**
- Frontend: Update all score displays to include checklist context
- API: Extend responses with checklist aggregates

---

#### 4.3 Hall of Fame

**File:** `socialsocial/src/screens/stats/AdvancedTab.tsx`, `backend/src/modules/stats/stats.service.ts`

**Current Behavior:**
- Displays messages with `score >= 90`
- Sorted by numeric score

**Checklist-Native Replacement:**
- Selection: Use checklist criteria (see 1.6)
- Display: Show checklist flags, tier, and score
- Sorting: Primary by tier (S+ > S > A), secondary by checklist flag count

**Migration Required:**
- Backend: Update selection logic (see 1.6)
- Frontend: Update display to show flags and tier prominently

---

#### 4.4 XP/Level Progress

**File:** `backend/src/modules/sessions/scoring.ts`

**Lines 183-260:**
```typescript
export function computeSessionRewards(inputs: MessageEvaluationInput[]): SessionRewardsSummary {
  // ... computes XP/coins/gems from rarity
  // rarity derived from score via scoreToRarity
}
```

**Current Behavior:**
- XP/coins/gems computed from rarity
- Rarity derived from numeric score (via `scoreToRarity`)

**Status:**
- ✅ **SAFE** - Rarity is derived from checklist via `scoreFromChecklist`
- The numeric score → rarity mapping is deterministic and OK
- XP rewards can remain tied to rarity (which is checklist-derived)

**Migration Required:**
- None - current flow is acceptable (checklist → score → rarity → rewards)

---

### 5. Frontend: Practice Screen / Mission UI

#### 5.1 Per-Message Feedback Bubbles

**File:** `socialsocial/src/screens/PracticeScreen.tsx`

**Lines 44, 83-84:**
```typescript
score?: number;
const DEFAULT_SUCCESS_SCORE = 80;
const DEFAULT_FAIL_SCORE = 60;
```

**Current Behavior:**
- Displays score and rarity for each message
- Uses default thresholds for progress indication

**Checklist-Native Replacement:**
- Display checklist flags as badges/icons
- Show tier (S+, S, A, B, C, D) prominently
- Remove or deprecate numeric score display (or show as secondary)

**Migration Required:**
- Frontend: Update message bubble component
- API: Ensure checklist flags are in response (already done in Phase 2)

---

#### 5.2 Rarity Display Logic

**File:** `socialsocial/src/screens/PracticeScreen.tsx`, `socialsocial/src/logic/missionEndPackBuilder.ts`

**Current Behavior:**
- Rarity (S+, S, A, B, C) displayed from `rewards.messages[].rarity`
- Rarity derived from score via `scoreToRarity`

**Status:**
- ✅ **SAFE** - Rarity is checklist-derived (checklist → score → rarity)
- Can continue displaying rarity

**Migration Required:**
- None - rarity display is acceptable

---

#### 5.3 Progress Bars

**File:** `socialsocial/src/screens/PracticeScreen.tsx`

**Current Behavior:**
- Progress bar uses `missionState.progressPct`
- `progressPct` is now checklist-weighted (Phase 2)

**Status:**
- ✅ **ALREADY MIGRATED** - Phase 2 updated `progressPct` to be checklist-weighted
- Can continue using

**Migration Required:**
- None

---

#### 5.4 Mission Success Banner Logic

**File:** `socialsocial/src/screens/MissionEndScreen.tsx`

**Lines 291-292:**
```typescript
<Text style={styles.rewardValue}>{rewards.score}</Text>
<Text style={styles.rewardLabel}>Score</Text>
```

**Current Behavior:**
- Displays final session score
- Uses `missionState.status` for success/fail (already checklist-driven)

**Checklist-Native Replacement:**
- Show checklist aggregates: "X Positive Hooks", "Y Objective Progress Hits"
- Keep score as secondary display
- Emphasize checklist achievements

**Migration Required:**
- Frontend: Update mission end banner
- API: Ensure checklist aggregates in response

---

#### 5.5 End-of-Mission Summary Card

**File:** `socialsocial/src/logic/missionEndPackBuilder.ts`

**Lines 54-67, 98-104:**
```typescript
// Sort by score
const sortedTop = [...scored].sort((a, b) => b.score - a.score);
// ...
const avgScore = session.missionState.averageScore;
```

**Current Behavior:**
- Top/bottom messages sorted by numeric score
- Mood teaser uses `averageScore`

**Checklist-Native Replacement:**
- Sort by tier first, then by checklist flag count
- Mood teaser uses checklist aggregates (boundary safety, momentum)

**Migration Required:**
- Frontend: Update sorting logic in `missionEndPackBuilder.ts`
- API: Ensure checklist flags in message data

---

### 6. API: DTOs, Response Shapes, Contracts

#### 6.1 Practice Session DTO

**File:** `backend/src/modules/shared/serializers/api-serializers.ts`

**Lines 38-109:**
```typescript
export interface PracticeSessionResponsePublic {
  rewards: {
    score: number;
    messageScore: number;
    // ...
  };
  missionState: {
    averageScore: number;
    // ...
  };
  localScoreNumeric?: number;
  // ...
}
```

**Current Behavior:**
- Response includes multiple numeric score fields
- Frontend consumes these for display

**Migration Required:**
- Backend: Add checklist aggregates to response:
  ```typescript
  checklist: {
    positiveHookCount: number;
    objectiveProgressCount: number;
    boundarySafeStreak: number;
    momentumStreak: number;
    flags: MessageChecklistFlag[];
  };
  ```
- Frontend: Update types and consumption
- Keep numeric fields for backward compatibility (mark as deprecated)

---

#### 6.2 Mission State V1 DTO

**File:** `backend/src/modules/practice/practice.service.ts`

**Lines 80-102:**
```typescript
export interface MissionStatePayload {
  averageScore: number;
  // ...
  checklist?: {
    positiveHookCount: number;
    objectiveProgressCount: number;
    boundarySafeStreak: number;
    momentumStreak: number;
    requiredFlagHits: number;
  };
}
```

**Status:**
- ✅ **PARTIALLY MIGRATED** - Checklist field already added in Phase 2
- `averageScore` marked as legacy compatibility

**Migration Required:**
- Frontend: Start using `checklist` field instead of `averageScore`
- Backend: Keep `averageScore` for backward compatibility

---

#### 6.3 Mission End Summaries

**File:** `socialsocial/src/types/MissionEndTypes.ts`

**Lines 12, 31, 52:**
```typescript
score: number;
averageScore: number;
score: number;
```

**Current Behavior:**
- Mission end types include numeric scores
- Used in `MissionEndSelectedPack`

**Migration Required:**
- Frontend: Add checklist aggregates to `MissionEndSelectedPack`
- Update `missionEndPackBuilder.ts` to include checklist data

---

#### 6.4 History/Stats Endpoints

**File:** `backend/src/modules/stats/stats.types.ts`

**Lines 48, 74, 93, 107, 129, 173:**
```typescript
avgScoreThisWeek?: number;
avgMessageScore: number;
avgScore: number;
score: number;
```

**Current Behavior:**
- Stats endpoints return numeric averages
- Frontend displays these

**Migration Required:**
- Backend: Add checklist aggregates to all stats responses
- Frontend: Update stats displays to use checklist data
- Keep numeric fields for backward compatibility

---

#### 6.5 Hall of Fame Endpoints

**File:** `backend/src/modules/stats/stats.service.ts`

**Lines 1458-1502:**
```typescript
async getTopPositiveMessages(userId: string, limit: number = 10): Promise<HallOfFameMessageItem[]>
async getTopNegativeMessages(userId: string, limit: number = 10): Promise<HallOfFameMessageItem[]>
```

**Current Behavior:**
- Returns messages with `score` field
- Sorted by numeric score

**Migration Required:**
- Backend: Add checklist flags to `HallOfFameMessageItem`
- Update selection criteria (see 1.6)
- Frontend: Display flags alongside score

---

### 7. Prisma Schema Compatibility

#### 7.1 Vestigial Numeric Columns

**File:** `backend/prisma/schema.prisma`

**Columns to Mark as Deprecated (Keep for Compatibility):**
1. `PracticeSession.score` (line 242) - ✅ OK to keep (cosmetic)
2. `PracticeSession.overallScore` (line 247) - ⚠️ Consider removing (duplicate of score)
3. `ChatMessage.score` (line 314) - ✅ OK to keep (cosmetic)
4. `UserStats.averageScore` (line 346) - ⚠️ Replace with checklist aggregates
5. `UserStats.averageMessageScore` (line 347) - ⚠️ Replace with checklist aggregates
6. `MissionProgress.bestScore` (line 378) - ✅ OK to keep (cosmetic, for display)
7. `CategoryStats.avgScore` (line 414) - ⚠️ Replace with checklist aggregates
8. `HallOfFameMessage.score` (line 671) - ✅ OK to keep (for sorting/display)

**Status Assessment:**
- **Keep (Cosmetic):** PracticeSession.score, ChatMessage.score, MissionProgress.bestScore, HallOfFameMessage.score
- **Replace:** UserStats.averageScore, UserStats.averageMessageScore, CategoryStats.avgScore
- **Remove:** PracticeSession.overallScore (duplicate)

---

#### 7.2 New Checklist Columns Needed

**Phase 4 Schema Changes (Not Phase 3):**

**UserStats:**
```prisma
model UserStats {
  // ... existing fields ...
  totalPositiveHooks        Int     @default(0)
  totalObjectiveProgress   Int     @default(0)
  boundarySafeRate         Float?  // Percentage 0-100
  momentumMaintainedRate   Float?  // Percentage 0-100
  avgChecklistFlagsPerMsg   Float?  // Average flags per message
}
```

**CategoryStats:**
```prisma
model CategoryStats {
  // ... existing fields ...
  totalPositiveHooks      Int     @default(0)
  totalObjectiveProgress Int     @default(0)
  boundaryViolations     Int     @default(0)
  momentumBreaks         Int     @default(0)
}
```

**PracticeSession:**
```prisma
model PracticeSession {
  // ... existing fields ...
  checklistAggregates     Json?   // Store cumulative checklist data
}
```

**ChatMessage:**
```prisma
model ChatMessage {
  // ... existing fields ...
  checklistFlags          Json?   // Store MessageChecklistFlag[]
}
```

**Note:** Phase 3 should NOT modify schema. Add checklist data to JSON payloads. Phase 4 will add proper columns.

---

#### 7.3 Tables Requiring Refactoring

**Phase 4 (Not Phase 3):**
1. `UserStats` - Add checklist aggregate columns
2. `CategoryStats` - Replace `avgScore` with checklist fields
3. `PracticeSession` - Add `checklistAggregates` JSON field
4. `ChatMessage` - Add `checklistFlags` JSON field (optional, can derive from traitData)

**Phase 3 Action:**
- Store checklist data in existing JSON fields (`payload`, `traitData`)
- No schema migrations in Phase 3

---

### 8. Legacy Numeric Fallbacks Anywhere

#### 8.1 localScoreNumeric

**Files:**
- `backend/src/modules/practice/practice.service.ts` (line 1313, 1756)
- `backend/src/modules/shared/serializers/api-serializers.ts` (line 100, 313)

**Status:**
- ✅ **ALREADY REMOVED** - Phase 2 removed from parser return type
- Still in response DTO for frontend (derived from checklist)

**Action:**
- Keep in response (derived from checklist)
- Frontend can continue using for display

---

#### 8.2 averageScore

**Files:**
- `backend/src/modules/practice/practice.service.ts` (lines 83, 379, 385, 441)
- `backend/src/modules/stats/stats.service.ts` (lines 81, 266, 419)
- `backend/src/modules/sessions/sessions.service.ts` (lines 195, 566, 581)
- `backend/src/modules/shared/serializers/api-serializers.ts` (line 77, 244)

**Status:**
- ⚠️ **LEGACY COMPATIBILITY** - Computed for display only
- Not used for mission success/fail decisions (Phase 2)

**Action:**
- Keep for backward compatibility
- Mark as deprecated in API docs
- Frontend should prefer checklist aggregates

---

#### 8.3 avgScore

**Files:**
- `backend/src/modules/stats/stats.service.ts` (lines 465, 629, 737)
- `backend/prisma/schema.prisma` (line 414)

**Status:**
- ⚠️ **MUST REPLACE** - Used in CategoryStats and weekly calculations

**Action:**
- Replace with checklist aggregates in Phase 3
- Update aggregation logic

---

#### 8.4 messageScore

**Files:**
- `backend/src/modules/shared/serializers/api-serializers.ts` (line 42, 177)
- `socialsocial/src/navigation/types.ts` (line 147)

**Status:**
- ✅ **COSMETIC** - Derived from checklist
- Can remain for display

**Action:**
- Keep for display
- Add checklist flags alongside

---

#### 8.5 score: (general)

**Files:**
- Multiple files (see inventory)

**Status:**
- ✅ **COSMETIC** - All scores derived from checklist via `scoreFromChecklist`
- Used for display, sorting, rewards

**Action:**
- Keep for display/sorting
- Add checklist context everywhere scores are shown

---

#### 8.6 failScore / successScore

**Files:**
- `backend/src/modules/practice/practice.service.ts` (multiple lines)
- `backend/src/modules/shared/serializers/api-serializers.ts` (lines 68-69, 85-86, 222-227, 265-272)

**Status:**
- ⚠️ **DEPRECATED** - No longer used for mission decisions (Phase 2)
- Still in API responses for UI display

**Action:**
- Mark as deprecated
- Remove from UI (or show as legacy info)
- Keep in API for backward compatibility

---

#### 8.7 GATE_SUCCESS_THRESHOLD / GATE_FAIL_FLOOR

**Files:**
- `backend/src/modules/gates/gates.service.ts` (lines 25-26, 91-94)
- `backend/src/modules/engine-config/engine-config.types.ts` (lines 129-130)

**Status:**
- ✅ **ALREADY MIGRATED** - Phase 2 updated gates to use checklist
- Numeric thresholds only used as fallback

**Action:**
- Remove fallback paths in Phase 3 (or keep as emergency fallback)
- Update EngineConfig to use checklist criteria

---

#### 8.8 progressPct

**Files:**
- `backend/src/modules/practice/practice.service.ts` (lines 82, 384, 406, 440)
- `backend/src/modules/shared/serializers/api-serializers.ts` (line 76, 242)

**Status:**
- ✅ **ALREADY MIGRATED** - Phase 2 updated to be checklist-weighted
- Formula: `rawProgress * 0.4 + checklistProgress * 0.6`

**Action:**
- No changes needed
- Can increase checklist weight if desired

---

## C. FULL MIGRATION MAP FOR PHASE 3

### Phase 3.1: Backend Stats & Analytics Migration

#### Task 3.1.1: Update UserStats Aggregation

**Files:**
- `backend/src/modules/sessions/sessions.service.ts` (lines 566-573, 581-582)
- `backend/src/modules/stats/stats.service.ts` (lines 81-82, 266-267, 419-420)

**Changes:**
1. Add checklist aggregate tracking to `saveOrUpdateScoredSession`:
   - Track `totalPositiveHooks`, `totalObjectiveProgress`, `boundarySafeCount`, `momentumMaintainedCount`
   - Store in `UserStats` JSON field (Phase 3) or new columns (Phase 4)
2. Update `getDashboardForUser` to return checklist aggregates instead of `averageScore`
3. Compute rates: `boundarySafeRate = boundarySafeCount / totalMessages`

**Checklist-Native Fields:**
```typescript
interface UserStatsChecklist {
  totalPositiveHooks: number;
  totalObjectiveProgress: number;
  boundarySafeCount: number;
  momentumMaintainedCount: number;
  totalMessages: number;
  boundarySafeRate: number; // computed
  momentumMaintainedRate: number; // computed
}
```

---

#### Task 3.1.2: Update CategoryStats Aggregation

**Files:**
- `backend/src/modules/sessions/sessions.service.ts` (category stats update logic)
- `backend/src/modules/stats/stats.service.ts` (lines 448-469)

**Changes:**
1. Replace `avgScore` calculation with checklist aggregates
2. Track per-category: `totalPositiveHooks`, `totalObjectiveProgress`, `boundaryViolations`, `momentumBreaks`
3. Update `getCategoryStatsForUser` to return checklist data

**Checklist-Native Fields:**
```typescript
interface CategoryStatsChecklist {
  totalPositiveHooks: number;
  totalObjectiveProgress: number;
  boundaryViolations: number;
  momentumBreaks: number;
  sessionsCount: number; // existing
}
```

---

#### Task 3.1.3: Update Weekly Stats Calculations

**Files:**
- `backend/src/modules/stats/stats.service.ts` (lines 619-641, 727-749)

**Changes:**
1. Replace `avgScoreThisWeek` with checklist aggregates
2. Compute weekly: `positiveHooksThisWeek`, `objectiveProgressThisWeek`, `boundarySafeRateThisWeek`
3. Update `getTraitsSummaryForUser` and `getStatsSummaryForUser` responses

**Checklist-Native Fields:**
```typescript
interface WeeklyStatsChecklist {
  positiveHooksThisWeek: number;
  objectiveProgressThisWeek: number;
  boundarySafeRateThisWeek: number;
  momentumMaintainedRateThisWeek: number;
}
```

---

#### Task 3.1.4: Update Hall of Fame Selection

**Files:**
- `backend/src/modules/sessions/sessions.service.ts` (lines 870-936)
- `backend/src/modules/stats/config/stats.config.ts` (line 8)

**Changes:**
1. Replace `HALL_OF_FAME_SCORE_THRESHOLD` with checklist criteria:
   ```typescript
   const HALL_OF_FAME_CHECKLIST_CRITERIA = {
     minTier: 'S+' as const,
     requiredFlags: ['POSITIVE_HOOK_HIT', 'OBJECTIVE_PROGRESS'],
     optionalFlags: ['MULTIPLE_HOOKS_HIT'], // bonus
   };
   ```
2. Update `upsertHallOfFameMessages` to use checklist criteria
3. Keep `score` field for sorting/display

---

#### Task 3.1.5: Update Advanced Metrics

**Files:**
- `backend/src/modules/stats/stats.service.ts` (lines 886-1452)

**Changes:**
1. **Message Evolution:** Add checklist aggregates per session point
2. **Persona Sensitivity:** Replace `avgScore` with checklist aggregates
3. **Hall of Fame:** Add checklist flags to `HallOfFameMessageItem`
4. **Top Positive/Negative Messages:** Add checklist flags to response

---

### Phase 3.2: API DTOs & Response Shapes

#### Task 3.2.1: Extend PracticeSessionResponsePublic

**File:** `backend/src/modules/shared/serializers/api-serializers.ts`

**Changes:**
```typescript
export interface PracticeSessionResponsePublic {
  // ... existing fields ...
  checklist: {
    positiveHookCount: number;
    objectiveProgressCount: number;
    boundarySafeStreak: number;
    momentumStreak: number;
    flags: string[]; // Last message flags
  };
  // Keep numeric fields for backward compatibility (mark deprecated)
  rewards: {
    score: number; // @deprecated - use checklist instead
    // ...
  };
}
```

---

#### Task 3.2.2: Extend Stats Response Types

**File:** `backend/src/modules/stats/stats.types.ts`

**Changes:**
```typescript
export interface StatsSummaryResponse {
  // ... existing fields ...
  checklist: {
    positiveHooksThisWeek: number;
    objectiveProgressThisWeek: number;
    boundarySafeRateThisWeek: number;
    momentumMaintainedRateThisWeek: number;
  };
  // Keep avgScoreThisWeek for backward compatibility
  avgScoreThisWeek?: number; // @deprecated
}
```

---

#### Task 3.2.3: Extend Hall of Fame Types

**File:** `backend/src/modules/stats/stats.types.ts`

**Changes:**
```typescript
export interface HallOfFameMessageItem {
  // ... existing fields ...
  checklistFlags: string[]; // MessageChecklistFlag[]
  tier: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
  score: number; // Keep for sorting/display
}
```

---

### Phase 3.3: Frontend Migration

#### Task 3.3.1: Update PracticeScreen

**File:** `socialsocial/src/screens/PracticeScreen.tsx`

**Changes:**
1. Remove `DEFAULT_SUCCESS_SCORE` and `DEFAULT_FAIL_SCORE` constants
2. Update message bubble to display checklist flags as badges
3. Show tier (S+, S, A, B, C, D) prominently
4. Move numeric score to secondary display (or remove)

**New UI:**
- Message bubble shows: Tier badge + Checklist flags (icons) + Optional score (small text)
- Progress bar uses checklist-weighted `progressPct` (already done)

---

#### Task 3.3.2: Update MissionEndScreen

**File:** `socialsocial/src/screens/MissionEndScreen.tsx`

**Changes:**
1. Update rewards section to show checklist aggregates:
   - "X Positive Hooks Achieved"
   - "Y Objective Progress Hits"
   - "Z% Boundary Safe"
   - Keep score as secondary
2. Update message highlights to show checklist flags
3. Update mood teaser to use checklist data

---

#### Task 3.3.3: Update missionEndPackBuilder

**File:** `socialsocial/src/logic/missionEndPackBuilder.ts`

**Changes:**
1. Update sorting logic:
   ```typescript
   // Sort by tier first, then by checklist flag count
   const sortedTop = [...scored].sort((a, b) => {
     const tierOrder = { 'S+': 5, 'S': 4, 'A': 3, 'B': 2, 'C': 1, 'D': 0 };
     const tierDiff = tierOrder[b.tier] - tierOrder[a.tier];
     if (tierDiff !== 0) return tierDiff;
     return b.checklistFlags.length - a.checklistFlags.length;
   });
   ```
2. Update `computeMoodTeaser` to use checklist aggregates
3. Add checklist flags to `MessageHighlight` type

---

#### Task 3.3.4: Update Stats Screens

**Files:**
- `socialsocial/src/screens/stats/StatsPerformanceScreen.tsx`
- `socialsocial/src/screens/stats/StatsAdvancedScreen.tsx`
- `socialsocial/src/screens/stats/StatsHubScreen.tsx`

**Changes:**
1. Replace numeric score displays with checklist aggregates
2. Add checklist flags visualization (icons/badges)
3. Update charts to show checklist trends (e.g., "Positive Hooks Over Time")
4. Keep numeric scores as secondary/optional display

**New UI Components:**
- Checklist flags badge component
- Checklist aggregate cards (replacing score cards)
- Checklist trend charts

---

#### Task 3.3.5: Update Advanced Tab

**File:** `socialsocial/src/screens/stats/AdvancedTab.tsx`

**Changes:**
1. Persona Sensitivity: Show checklist aggregates per persona
2. Hall of Fame: Display checklist flags alongside score
3. Message Analyzer: Show checklist flags in breakdown

---

#### Task 3.3.6: Update Type Definitions

**Files:**
- `socialsocial/src/types/SessionDTO.ts`
- `socialsocial/src/types/MissionEndTypes.ts`
- `socialsocial/src/navigation/types.ts`
- `socialsocial/src/api/statsService.ts`

**Changes:**
1. Add checklist fields to all relevant types
2. Mark numeric fields as deprecated (JSDoc comments)
3. Update API service types

---

### Phase 3.4: Cleanup & Deprecation

#### Task 3.4.1: Remove Numeric Fallbacks from Gates

**File:** `backend/src/modules/gates/gates.service.ts`

**Changes:**
1. Remove `_FALLBACK` paths (lines 151-164, 177-189)
2. Require checklist data (fail gracefully if missing)
3. Update `GateEvaluationContext` to remove `averageScore`, `messageScores` (or mark deprecated)

---

#### Task 3.4.2: Deprecate MissionConfigV1 Numeric Thresholds

**File:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts`

**Changes:**
1. Add JSDoc `@deprecated` to `successScoreThreshold`, `failScoreThreshold`
2. Add new checklist-based threshold fields (optional, for future use)
3. Keep old fields for backward compatibility

---

#### Task 3.4.3: Update API Documentation

**Files:**
- API response DTOs
- OpenAPI spec (if exists)

**Changes:**
1. Mark all numeric score fields as `@deprecated`
2. Document checklist fields as primary
3. Provide migration guide for frontend

---

## D. RISK REPORT

### High-Risk Areas

1. **Hall of Fame Selection Logic**
   - **Risk:** Changing selection criteria may result in different messages being selected
   - **Mitigation:** Use tier + checklist flags (conservative criteria)
   - **Testing:** Compare old vs new selection for existing sessions

2. **Stats Aggregation Migration**
   - **Risk:** Breaking changes to stats endpoints may break frontend
   - **Mitigation:** Add checklist fields alongside numeric fields (backward compatible)
   - **Testing:** Ensure frontend can handle both old and new fields

3. **Frontend Display Updates**
   - **Risk:** UI changes may confuse users if not well-designed
   - **Mitigation:** Gradual rollout, show both old and new displays initially
   - **Testing:** User acceptance testing for new UI

### Medium-Risk Areas

1. **Mission End Pack Builder**
   - **Risk:** Changing sort order may change which messages are highlighted
   - **Mitigation:** Test with existing sessions, ensure top/bottom messages still make sense
   - **Testing:** Compare old vs new top/bottom selections

2. **Category Stats Migration**
   - **Risk:** Category performance metrics may change
   - **Mitigation:** Keep numeric `avgScore` for comparison during transition
   - **Testing:** Verify category stats still accurate

### Low-Risk Areas

1. **Cosmetic Score Displays**
   - **Risk:** Minimal - scores are already checklist-derived
   - **Action:** Can remain for display, add checklist context

2. **Rewards/XP System**
   - **Risk:** None - already uses checklist-derived rarity
   - **Action:** No changes needed

---

## E. READINESS CHECK

### Is the system safe to begin Phase 3 implementation?

**Answer: YES, with conditions**

### Conditions:

1. ✅ **Phase 2 Complete** - Mission state and gates are checklist-driven
2. ✅ **Checklist Parsing Stable** - AI contract returns checklist flags reliably
3. ✅ **Score Derivation Working** - `scoreFromChecklist` produces consistent results
4. ⚠️ **Backward Compatibility Plan** - Must keep numeric fields during transition
5. ⚠️ **Frontend Coordination** - Frontend and backend changes must be coordinated

### Blockers (None - All Clear):

- ✅ No schema changes required in Phase 3 (use JSON fields)
- ✅ No breaking API changes (additive only)
- ✅ All numeric scores are already checklist-derived (cosmetic only)

### Recommended Phase 3 Approach:

1. **Phase 3.1:** Backend stats aggregation (add checklist fields, keep numeric)
2. **Phase 3.2:** API DTOs (add checklist fields, mark numeric as deprecated)
3. **Phase 3.3:** Frontend updates (display checklist, keep numeric as fallback)
4. **Phase 3.4:** Cleanup (remove numeric dependencies after frontend migrated)

### Timeline Estimate:

- **Phase 3.1:** 2-3 days (backend stats)
- **Phase 3.2:** 1 day (API DTOs)
- **Phase 3.3:** 3-4 days (frontend updates)
- **Phase 3.4:** 1 day (cleanup)

**Total: 7-9 days**

---

## F. MIGRATION PRIORITY MATRIX

### Must Migrate (High Priority)

1. **Hall of Fame Selection** - Uses numeric threshold, should use checklist
2. **UserStats Aggregation** - Core stats, used everywhere
3. **CategoryStats Aggregation** - Category performance metrics
4. **Weekly Stats** - Weekly trends and insights
5. **Frontend Stats Displays** - User-facing stats screens

### Should Migrate (Medium Priority)

1. **Mission End Pack Builder** - Sorting logic
2. **Advanced Metrics** - Persona sensitivity, message evolution
3. **Practice Screen** - Message feedback bubbles
4. **Mission End Screen** - End-of-mission summary

### Can Keep (Low Priority)

1. **Cosmetic Score Displays** - Can remain for user familiarity
2. **Rewards/XP** - Already checklist-derived via rarity
3. **Progress Bars** - Already checklist-weighted

---

## G. TESTING REQUIREMENTS

### Unit Tests

1. Test checklist aggregation logic
2. Test Hall of Fame selection with checklist criteria
3. Test stats aggregation with checklist data
4. Test sorting logic (tier + flags)

### Integration Tests

1. Test stats endpoints return checklist aggregates
2. Test practice session response includes checklist
3. Test mission end pack builder with checklist data

### E2E Tests

1. Test complete practice session flow with checklist display
2. Test stats screen displays checklist aggregates
3. Test mission end screen shows checklist achievements

---

## H. DEPRECATION TIMELINE

### Phase 3 (Current)
- Add checklist fields to all responses
- Mark numeric fields as `@deprecated` in code/docs
- Frontend displays both (checklist primary, numeric secondary)

### Phase 4 (Future)
- Remove numeric fields from API responses
- Schema migration to add checklist columns
- Remove numeric aggregation logic

### Phase 5 (Future)
- Remove numeric fields from Prisma schema
- Complete migration to checklist-native system

---

## CONCLUSION

Phase 3 migration is **feasible and safe** to begin. The system is ready because:

1. ✅ All numeric scores are already checklist-derived (no logic dependencies)
2. ✅ Mission state and gates are checklist-driven (Phase 2 complete)
3. ✅ Backward compatibility can be maintained (additive changes)
4. ✅ No schema changes required in Phase 3 (use JSON fields)

**Recommended Next Steps:**
1. Start with backend stats aggregation (Phase 3.1)
2. Extend API DTOs (Phase 3.2)
3. Update frontend displays (Phase 3.3)
4. Cleanup and deprecation (Phase 3.4)

**Estimated Completion:** 7-9 days

---

**End of Audit Report**

