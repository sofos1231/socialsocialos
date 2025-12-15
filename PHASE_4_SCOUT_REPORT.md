# Phase 4 SCOUT Report: Checklist DB Hardening Readiness

**Date**: Phase 4 Readiness Check  
**Mode**: READ-ONLY SCOUT (no code changes)  
**Goal**: Map current reality vs Phase 4 target (making Prisma schema first-class home for checklist aggregates)

---

## A. Phase 1–3 Invariant Check

### Invariant Verification Table

| Invariant | Status | File + Line References | Notes |
|-----------|--------|------------------------|-------|
| **1. Single scoring source** | ✅ **Pass** | `backend/src/modules/sessions/scoring.ts:116` | `scoreFromChecklist()` is the only per-message numeric score derivation. No other code path asks AI for numeric scores or computes scores from scratch. |
| **2. No AI numeric scores** | ✅ **Pass** | `backend/src/modules/practice/practice.service.ts:1308-1311` | Checklist flags parsed from AI; `scoreFromChecklist()` called to derive numeric. `localScoreNumeric` explicitly ignored if AI provides it (line 1313 sets it from `checklistScore.numericScore`). |
| **3. Mission state checklist-driven** | ✅ **Pass** | `backend/src/modules/practice/practice.service.ts:353-453` | `computeMissionState()` uses `checklistAgg` for success/fail (lines 398-422). `averageScore` computed for legacy compatibility only (lines 376-379). Status determined by checklist criteria (line 420). |
| **4. Gates checklist-driven** | ✅ **Pass** | `backend/src/modules/gates/gates.service.ts:141-219` | Primary gate decisions use `context.checklist` (lines 142-166, 170-194, 206-209). Numeric fallbacks exist but marked `@deprecated` with console.warn (lines 152-154, 180-182). |
| **5. Stats checklist-native** | ✅ **Pass** | `backend/src/modules/stats/stats.service.ts:399-480, 504-540` | Dashboard reads from `UserStats.checklistAggregates` (JSON field, lines 399-407). CategoryStats reads from `CategoryStats.checklistAggregates` (JSON field, lines 504-512). Weekly aggregates computed from session payloads (lines 873-887). |
| **6. Frontend tier/checklist primary** | ✅ **Pass** | `socialsocial/src/screens/PracticeScreen.tsx:514-538`<br>`socialsocial/src/screens/MissionEndScreen.tsx:585-610`<br>`socialsocial/src/screens/stats/AdvancedTab.tsx:358-385` | Tier displayed prominently. Checklist flags shown. Numeric scores secondary/cosmetic. No `if (score > X)` logic found in frontend. |
| **7. No numeric decision logic** | ✅ **Pass** | All files verified | All numeric score comparisons are: (a) validation checks (0-100 range), (b) fallback styling when tier unavailable, (c) display-only. No conditional logic based on `score >= X` thresholds for decisions. |

**Overall Phase 1-3 Status**: ✅ **ALL INVARIANTS PASS**

---

## B. Prisma Schema Reality

### Current Schema State (Exact from `backend/prisma/schema.prisma`)

#### **UserStats** (lines 341-351)
```prisma
model UserStats {
  userId              String    @id
  sessionsCount       Int       @default(0)
  successCount        Int       @default(0)
  failCount           Int       @default(0)
  averageScore        Float?    // ⚠️ LEGACY numeric
  averageMessageScore Float?    // ⚠️ LEGACY numeric
  lastSessionAt       DateTime?
  lastUpdatedAt       DateTime  @updatedAt
  user                User      @relation(...)
}
```

**Checklist-related fields**: ❌ **NONE** (currently stored in JSON via `checklistAggregates` typed as `any` in code, not in schema)

**Current persistence**: Checklist aggregates stored via:
```typescript
// sessions.service.ts:633-634
checklistAggregates: updatedChecklistAggregates as any
```
This writes to a **JSON field that doesn't exist in the schema** - likely Prisma allows `any` JSON writes, but the field is not explicitly defined.

---

#### **CategoryStats** (lines 409-426)
```prisma
model CategoryStats {
  id            String          @id @default(cuid())
  userId        String
  categoryId    String
  categoryKey   String
  avgScore      Float?          // ⚠️ LEGACY numeric
  sessionsCount Int             @default(0)
  successCount  Int             @default(0)
  failCount     Int             @default(0)
  updatedAt     DateTime        @updatedAt
  createdAt     DateTime        @default(now())
  category      MissionCategory @relation(...)
  user          User            @relation(...)
}
```

**Checklist-related fields**: ❌ **NONE** (currently stored in JSON via `checklistAggregates` typed as `any`)

**Current persistence**: Same pattern - JSON writes via `checklistAggregates: updatedChecklistAggregates as any` (category-stats.service.ts:123, 130)

---

#### **PracticeSession** (lines 237-298)
```prisma
model PracticeSession {
  id                 String                   @id @default(cuid())
  userId             String
  createdAt          DateTime                 @default(now())
  topic              String
  score              Int                      @default(0)  // ⚠️ LEGACY numeric (final session score)
  xpGained           Int                      @default(0)
  durationSec        Int                      @default(0)
  notes              String?
  endedAt            DateTime?
  overallScore       Int?                     // ⚠️ LEGACY numeric (redundant with score?)
  personaId          String?
  status             MissionStatus            @default(IN_PROGRESS)
  templateId         String?
  coinsGained        Int                      @default(0)
  gemsGained         Int                      @default(0)
  isSuccess          Boolean?
  messageCount       Int                      @default(0)
  payload            Json?                    // ✅ Contains fastPathScoreSnapshot with checklist aggregates
  rarityCounts       Json?
  aiMode             String?
  aiSummary          Json?
  aiCorePayload      Json?
  // ... Option B metrics fields (charismaIndex, clarityScore, etc.)
  endReasonCode      String?
  endReasonMeta      Json?                    // ✅ Contains checklist aggregates in endReasonMeta.checklist
  // ... relations
}
```

**Checklist-related fields**: ❌ **NO dedicated columns**  
**Current persistence**: Checklist aggregates stored in:
- `payload.fastPathScoreSnapshot` (JSON) - running aggregates during session
- `endReasonMeta.checklist` (JSON) - final aggregates at mission end

**Schema gap**: No first-class `checklistAggregates Json?` field on `PracticeSession`.

---

#### **ChatMessage** (lines 300-328)
```prisma
model ChatMessage {
  id                String              @id @default(cuid())
  sessionId         String
  userId            String
  createdAt         DateTime            @default(now())
  role              MessageRole
  content           String
  grade             MessageGrade?
  xpDelta           Int                 @default(0)
  coinsDelta        Int                 @default(0)
  gemsDelta         Int                 @default(0)
  isBrilliant       Boolean             @default(false)
  isLifesaver       Boolean             @default(false)
  meta              Json?               // ✅ May contain tier/flags via meta (not guaranteed)
  score             Int?                // ⚠️ LEGACY numeric (derived from checklist)
  traitData         Json                // ✅ Contains flags array (Phase 2 stores checklist flags here)
  turnIndex         Int
  // ... relations
}
```

**Checklist-related fields**: ❌ **NO dedicated columns**  
**Current persistence**: Checklist flags stored in:
- `traitData.flags` (JSON array) - Phase 2 pattern
- `meta` (JSON) - potentially, but not consistently

**Tier storage**: ❌ **NOT stored** - tier is derived on-the-fly from `score` via `scoreToTier()` in code.

---

#### **HallOfFameMessage** (lines 661-678)
```prisma
model HallOfFameMessage {
  id          String          @id @default(cuid())
  userId      String
  messageId   String
  sessionId   String
  turnIndex   Int
  categoryKey String?
  score       Int             // ⚠️ LEGACY numeric
  createdAt   DateTime        @default(now())
  savedAt     DateTime        @default(now())
  message     ChatMessage     @relation(...)
  session     PracticeSession @relation(...)
  user        User            @relation(...)
}
```

**Checklist-related fields**: ❌ **NO dedicated columns**  
**Current persistence**: Code attempts to write to `meta` field (sessions.service.ts:1062), but **`meta` field does NOT exist in schema**.

**Schema gap**: Missing `meta Json?` field and explicit `tier`/`checklistFlags` columns.

---

### Schema Summary

| Model | Legacy Numeric Fields | Current Checklist Storage | Schema Fields Needed |
|-------|----------------------|---------------------------|---------------------|
| **UserStats** | `averageScore`, `averageMessageScore` | JSON (via `checklistAggregates` cast) - **field not in schema** | Need: `checklistAggregates Json?` or dedicated columns |
| **CategoryStats** | `avgScore` | JSON (via `checklistAggregates` cast) - **field not in schema** | Need: `checklistAggregates Json?` or dedicated columns |
| **PracticeSession** | `score`, `overallScore` | JSON (`payload.fastPathScoreSnapshot`) | Need: `checklistAggregates Json?` or dedicated columns |
| **ChatMessage** | `score` | JSON (`tierData.flags` array) | Need: `checklistFlags Json?` and `tier String?` columns |
| **HallOfFameMessage** | `score` | **Code writes to `meta` but field doesn't exist** | Need: `meta Json?` OR `tier String?` + `checklistFlags Json?` |

**Critical Finding**: Code is writing to JSON fields (`checklistAggregates`, `meta`) that **do not exist in the Prisma schema**. Prisma may allow this via `as any` casts, but it's unsafe and not type-checked.

---

## C. Write Paths Overview

### Where Checklist Aggregates Are Computed & Stored

#### **UserStats**

**Write path**: `backend/src/modules/sessions/sessions.service.ts:602-636`

**Function**: `saveOrUpdateScoredSession()` → `tx.userStats.update()` (line 623)

**Checklist data computed**:
- Extracted from `basePayload.fastPathScoreSnapshot` (lines 587-596):
  - `totalPositiveHooks` (from `positiveHookCount`)
  - `totalObjectiveProgress` (from `objectiveProgressCount`)
  - `boundarySafeCount` (from `boundarySafeStreak`)
  - `momentumMaintainedCount` (from `momentumStreak`)
  - `totalMessages` (from `messageCount`)

**Persistence today**: 
- Stored in `checklistAggregates` JSON field (line 634)
- **Problem**: Field doesn't exist in schema; code uses `as any` cast
- Accumulated cumulatively: new session aggregates added to existing (lines 613-621)

**Read from**: `fastPathScoreSnapshot` in `session.payload` (extracted from `extraPayload`)

---

#### **CategoryStats**

**Write path**: `backend/src/modules/stats/category-stats.service.ts:15-133`

**Function**: `CategoryStatsService.updateForSession()` → `tx.categoryStats.upsert()` (line 108)

**Checklist data computed**:
- Extracted from `session.payload.fastPathScoreSnapshot` (lines 67-82):
  - `totalPositiveHooks`
  - `totalObjectiveProgress`
  - `boundaryViolations` (computed as `totalMessages - boundarySafeCount`)
  - `momentumBreaks` (computed as `totalMessages - momentumMaintainedCount`)
  - `totalMessages`

**Persistence today**:
- Stored in `checklistAggregates` JSON field (lines 123, 130)
- **Problem**: Field doesn't exist in schema; code uses `as any` cast
- Accumulated cumulatively per category (lines 98-106)

**Read from**: `session.payload.fastPathScoreSnapshot`

---

#### **PracticeSession**

**Write path**: `backend/src/modules/sessions/sessions.service.ts:405-412`

**Function**: `saveOrUpdateScoredSession()` → `tx.practiceSession.create()` or `update()`

**Checklist data stored**:
- In `payload` JSON field as `payload.fastPathScoreSnapshot` (from `extraPayload`)
- In `endReasonMeta` JSON field as `endReasonMeta.checklist` (via `computeEndReason()`)

**Schema**: `payload Json?` and `endReasonMeta Json?` **DO exist** in schema (lines 255, 278)

**Current state**: ✅ **Already persists checklist aggregates** (but nested in JSON, not first-class)

---

#### **ChatMessage**

**Write path**: `backend/src/modules/sessions/sessions.service.ts:458-527`

**Function**: `saveOrUpdateScoredSession()` → `tx.chatMessage.createMany()` (line 526)

**Checklist data stored**:
- Checklist flags stored in `traitData.flags` array (line 472: `traitData: enrichedTraitData`)
- `enrichedTraitData` includes flags from `baseTraitData.flags` (line 446)
- **Tier NOT stored** - only derived from score on read

**Schema**: `tierData Json` **DOES exist** (line 315)

**Current state**: ✅ **Flags stored in traitData.flags** (but tier not persisted)

---

#### **HallOfFameMessage**

**Write path**: `backend/src/modules/sessions/sessions.service.ts:1048-1070`

**Function**: `upsertHallOfFameMessages()` → `tx.hallOfFameMessage.upsert()`

**Checklist data stored**:
- Code attempts to store `meta: { tier, checklistFlags }` (lines 1043-1062)
- **Problem**: `meta` field **DOES NOT EXIST in schema** (schema lines 661-678 show no `meta` field)

**Current state**: ❌ **Code writes to non-existent field** - likely fails silently or Prisma ignores it

---

### Write Paths Summary Table

| Model | Write Function | Checklist Source | Current Storage | Schema Field Exists? |
|-------|---------------|------------------|-----------------|---------------------|
| **UserStats** | `sessions.service.ts:623` | `payload.fastPathScoreSnapshot` | `checklistAggregates` (JSON cast) | ❌ **NO** |
| **CategoryStats** | `category-stats.service.ts:108` | `payload.fastPathScoreSnapshot` | `checklistAggregates` (JSON cast) | ❌ **NO** |
| **PracticeSession** | `sessions.service.ts:405-412` | `extraPayload.fastPathScoreSnapshot` | `payload.fastPathScoreSnapshot` (JSON) | ✅ **YES** (`payload Json?`) |
| **ChatMessage** | `sessions.service.ts:526` | From `traitData.flags` (Phase 2) | `traitData.flags` (JSON array) | ✅ **YES** (`traitData Json`) |
| **HallOfFameMessage** | `sessions.service.ts:1048` | Derived from `traitData.flags` | `meta` (JSON cast) | ❌ **NO** |

**Critical Issues**:
1. `UserStats.checklistAggregates` - code writes but field doesn't exist in schema
2. `CategoryStats.checklistAggregates` - code writes but field doesn't exist in schema  
3. `HallOfFameMessage.meta` - code writes but field doesn't exist in schema
4. `ChatMessage.tier` - never stored, only derived on-the-fly

---

## D. Read Paths Overview

### Where Checklist Data Is Consumed

#### **1. Dashboard Summary / StatsSummaryResponse**

**Read path**: `backend/src/modules/stats/stats.service.ts:145-483`

**Function**: `getDashboardForUser()`

**Checklist info used**:
- Positive hooks total (`checklist.totalPositiveHooks`)
- Objective progress total (`checklist.totalObjectiveProgress`)
- Boundary safe rate (`checklist.boundarySafeRate` - computed from count/total)
- Momentum maintained rate (`checklist.momentumMaintainedRate` - computed from count/total)

**Where data comes from**:
- **Source**: `UserStats.checklistAggregates` JSON field (lines 399-407)
- **Method**: Read via `(safeStats as any).checklistAggregates` cast
- **Problem**: Field doesn't exist in schema, so Prisma read may return `undefined`
- **Fallback**: Defaults to zeros if missing (lines 401-407)

**Status**: ⚠️ **Works but unsafe** - relies on non-existent schema field

---

#### **2. Weekly Trends / TraitsSummaryResponse**

**Read path**: `backend/src/modules/stats/stats.service.ts:547-764`

**Function**: `getTraitsSummaryForUser()`

**Checklist info used**:
- `checklist.positiveHooksThisWeek`
- `checklist.objectiveProgressThisWeek`
- `checklist.boundarySafeRateThisWeek` (computed)
- `checklist.momentumMaintainedRateThisWeek` (computed)

**Where data comes from**:
- **Source**: **Recomputed from session payloads** (lines 873-887)
- **Method**: Query `PracticeSession` where `createdAt` in current week, read `payload.fastPathScoreSnapshot` from each
- **Performance**: **O(N) reads** where N = sessions this week (each session payload parsed)

**Status**: ⚠️ **Inefficient** - recomputes from JSON payloads on every read

---

#### **3. Category Stats**

**Read path**: `backend/src/modules/stats/stats.service.ts:489-541`

**Function**: `getCategoryStatsForUser()` → calls `getCategoryStatsForUser()`

**Checklist info used**:
- Per-category: `totalPositiveHooks`, `totalObjectiveProgress`, `boundaryViolations`, `momentumBreaks`, `boundarySafeRate`, `momentumMaintainedRate`

**Where data comes from**:
- **Source**: `CategoryStats.checklistAggregates` JSON field (lines 504-512)
- **Method**: Read via `(row as any).checklistAggregates` cast
- **Problem**: Field doesn't exist in schema
- **Fallback**: Defaults to zeros if missing (lines 505-512)

**Status**: ⚠️ **Works but unsafe** - relies on non-existent schema field

---

#### **4. Hall of Fame**

**Read path**: `backend/src/modules/stats/stats.service.ts:1553-1602`

**Function**: `getAdvancedMetricsForUser()` → reads `HallOfFameMessage`

**Checklist info used**:
- `tier` (S+, S, A, B, C, D)
- `checklistFlags` (array of MessageChecklistFlag strings)

**Where data comes from**:
- **Source**: `HallOfFameMessage.meta` JSON field (lines 1582-1588)
- **Problem**: **`meta` field does NOT exist in schema** (schema lines 661-678)
- **Current workaround**: Code extracts from `meta`, but field likely doesn't exist, so falls back to `undefined`
- **Alternative source**: Code also derives tier/flags from `ChatMessage.traitData.flags` in write path (sessions.service.ts:948-971), but doesn't store in HallOfFameMessage

**Selection logic**: 
- Uses tier + required flags (Phase 3 criteria) for filtering (sessions.service.ts:975-987)
- Orders by tier → score → flag count (lines 990-998)

**Status**: ❌ **Broken** - code expects `meta` field that doesn't exist

---

#### **5. Advanced Metrics (Persona Sensitivity, Message Evolution)**

**Read path**: `backend/src/modules/stats/stats.service.ts:1100-1150` (persona), `930-980` (message evolution)

**Checklist info used**:
- Persona rows: Still show `avgScore` (numeric) - **no checklist metrics yet**
- Message evolution: Uses `avgMessageScore` from `UserTraitHistory` - **no checklist metrics yet**

**Where data comes from**:
- **Persona**: Computed from `PracticeSession.score` per persona (recomputed)
- **Message Evolution**: From `UserTraitHistory.avgMessageScore` (numeric) or computed from `ChatMessage.score`

**Status**: ⚠️ **Still numeric-based** - no checklist metrics implemented

---

#### **6. Stats Summary (Weekly Overview)**

**Read path**: `backend/src/modules/stats/stats.service.ts:775-920`

**Function**: `getStatsSummaryForUser()`

**Checklist info used**:
- `checklist.positiveHooksThisWeek`
- `checklist.objectiveProgressThisWeek`
- `checklist.boundarySafeRateThisWeek`
- `checklist.momentumMaintainedRateThisWeek`

**Where data comes from**:
- **Source**: **Recomputed from session payloads** (lines 873-887)
- **Method**: Query `PracticeSession` where `createdAt` in current week, parse `payload.fastPathScoreSnapshot` from each

**Status**: ⚠️ **Inefficient** - recomputes from JSON on every read

---

### Read Paths Summary Table

| Feature | Read Function | Checklist Source | Current Method | Schema Field? | Issue |
|---------|---------------|------------------|----------------|---------------|-------|
| **Dashboard** | `stats.service.ts:145` | `UserStats.checklistAggregates` | JSON cast read | ❌ **NO** | Unsafe, may return undefined |
| **Weekly Trends** | `stats.service.ts:547` | Session `payload.fastPathScoreSnapshot` | **Recomputed** from N sessions | ✅ (nested JSON) | **Inefficient** - O(N) payload parses |
| **Category Stats** | `stats.service.ts:489` | `CategoryStats.checklistAggregates` | JSON cast read | ❌ **NO** | Unsafe, may return undefined |
| **Hall of Fame** | `stats.service.ts:1553` | `HallOfFameMessage.meta` | JSON cast read | ❌ **NO** | **Field doesn't exist** - likely broken |
| **Stats Summary** | `stats.service.ts:775` | Session `payload.fastPathScoreSnapshot` | **Recomputed** from N sessions | ✅ (nested JSON) | **Inefficient** - O(N) payload parses |
| **Persona Sensitivity** | `stats.service.ts:1100` | N/A | Uses numeric `avgScore` | N/A | **No checklist metrics yet** |
| **Message Evolution** | `stats.service.ts:930` | N/A | Uses numeric `avgMessageScore` | N/A | **No checklist metrics yet** |

---

## E. Phase 4 Delta / TODO

### E.1 Schema Additions Required

#### **UserStats** (add fields)
```prisma
model UserStats {
  // ... existing fields ...
  
  // Phase 4: Checklist aggregates (first-class columns)
  totalPositiveHooks       Int     @default(0)
  totalObjectiveProgress   Int     @default(0)
  boundarySafeCount        Int     @default(0)
  momentumMaintainedCount  Int     @default(0)
  totalMessagesWithChecklist Int   @default(0)
  
  // OR (alternative): Keep as JSON but make it explicit
  // checklistAggregates     Json?   // Explicit JSON field
}
```

**Rationale**: Currently written via `as any` cast to non-existent field. Need explicit columns or JSON field.

---

#### **CategoryStats** (add fields)
```prisma
model CategoryStats {
  // ... existing fields ...
  
  // Phase 4: Checklist aggregates (first-class columns)
  totalPositiveHooks       Int     @default(0)
  totalObjectiveProgress   Int     @default(0)
  boundaryViolations       Int     @default(0)
  momentumBreaks           Int     @default(0)
  totalMessagesWithChecklist Int   @default(0)
  
  // OR (alternative): Keep as JSON but make it explicit
  // checklistAggregates     Json?   // Explicit JSON field
}
```

**Rationale**: Same as UserStats - currently unsafe JSON cast.

---

#### **PracticeSession** (add field)
```prisma
model PracticeSession {
  // ... existing fields ...
  
  // Phase 4: Checklist aggregates (first-class field)
  checklistAggregates      Json?   // Explicit JSON field for session-level aggregates
  
  // OR (alternative): Dedicated columns
  // positiveHookCount       Int?
  // objectiveProgressCount  Int?
  // boundarySafeStreak      Int?
  // momentumStreak          Int?
}
```

**Rationale**: Currently nested in `payload.fastPathScoreSnapshot`. Make it first-class for easier queries.

---

#### **ChatMessage** (add fields)
```prisma
model ChatMessage {
  // ... existing fields ...
  
  // Phase 4: Checklist-native fields
  tier                     String? // 'S+' | 'S' | 'A' | 'B' | 'C' | 'D'
  checklistFlags           Json?   // Array of MessageChecklistFlag strings
  
  // OR keep in traitData but add explicit tier column for indexing
}
```

**Rationale**: Tier currently derived on-the-fly. Flags in `traitData.flags` but not consistently. Need explicit storage for queries/indexing.

---

#### **HallOfFameMessage** (add fields)
```prisma
model HallOfFameMessage {
  // ... existing fields ...
  
  // Phase 4: Checklist-native fields
  meta                     Json?   // OR explicit columns:
  // tier                   String? // 'S+' | 'S' | 'A' | 'B' | 'C' | 'D'
  // checklistFlags         Json?   // Array of MessageChecklistFlag strings
}
```

**Rationale**: Code writes to `meta` but field doesn't exist. Either add `meta Json?` or explicit `tier` + `checklistFlags` columns.

---

### E.2 Write Path Updates Required

#### **UserStats write path**
**File**: `backend/src/modules/sessions/sessions.service.ts:602-636`

**Current**: Writes via `checklistAggregates: updatedChecklistAggregates as any` (line 634)

**Required changes**:
1. Replace `as any` cast with explicit field write (if using JSON)
2. OR replace with individual column updates (if using dedicated columns)
3. Ensure field exists in schema before writing

**Function to modify**: `saveOrUpdateScoredSession()` → `tx.userStats.update()` block

---

#### **CategoryStats write path**
**File**: `backend/src/modules/stats/category-stats.service.ts:108-132`

**Current**: Writes via `checklistAggregates: updatedChecklistAggregates as any` (lines 123, 130)

**Required changes**:
1. Replace `as any` cast with explicit field write
2. OR replace with individual column updates
3. Ensure field exists in schema

**Function to modify**: `CategoryStatsService.updateForSession()` → `tx.categoryStats.upsert()`

---

#### **PracticeSession write path**
**File**: `backend/src/modules/sessions/sessions.service.ts:405-412`

**Current**: Stores in `payload.fastPathScoreSnapshot` (nested JSON)

**Required changes**:
1. **Option A**: Extract `checklistAggregates` to top-level JSON field
2. **Option B**: Keep in `payload` but ensure it's consistently populated
3. **Option C**: Add dedicated columns and write to both (payload for backward compat)

**Function to modify**: `saveOrUpdateScoredSession()` → `tx.practiceSession.create/update()`

---

#### **ChatMessage write path**
**File**: `backend/src/modules/sessions/sessions.service.ts:458-527`

**Current**: Flags in `tierData.flags`, tier not stored

**Required changes**:
1. Extract tier from `checklistScore.tier` and store in `tier` column
2. Store `checklistFlags` array explicitly (either in new `checklistFlags Json?` or ensure `tierData.flags` is consistently populated)

**Function to modify**: `saveOrUpdateScoredSession()` → message creation loop (line 458-527)

**Source of tier**: Already computed in `practice.service.ts:1314` as `localScoreTier = checklistScore.tier` - need to pass this to `saveOrUpdateScoredSession()`

---

#### **HallOfFameMessage write path**
**File**: `backend/src/modules/sessions/sessions.service.ts:1048-1070`

**Current**: Writes to `meta` field that doesn't exist

**Required changes**:
1. Add `meta Json?` field to schema, OR
2. Add explicit `tier String?` and `checklistFlags Json?` columns
3. Update write code to use correct field names

**Function to modify**: `upsertHallOfFameMessages()` → `tx.hallOfFameMessage.upsert()`

---

### E.3 Read Path Updates Required

#### **Dashboard / UserStats reads**
**File**: `backend/src/modules/stats/stats.service.ts:399-407`

**Current**: Reads via `(safeStats as any).checklistAggregates` cast

**Required changes**:
1. Replace cast with proper Prisma field access
2. Handle null/undefined gracefully (backward compatibility for old data)

**Function to modify**: `getDashboardForUser()` → `checklistAggregates` extraction

---

#### **Weekly trends reads**
**File**: `backend/src/modules/stats/stats.service.ts:873-887`

**Current**: Recomputes by parsing `payload.fastPathScoreSnapshot` from N sessions

**Required changes**:
1. **Option A**: Query `PracticeSession.checklistAggregates` (if added as top-level field)
2. **Option B**: Keep recomputing but cache in `UserStats.weeklyChecklistAggregates` (new field)
3. **Option C**: Create `WeeklyStats` table with checklist aggregates pre-computed

**Performance gain**: **O(N) → O(1)** if using pre-aggregated data

**Function to modify**: `getTraitsSummaryForUser()` and `getStatsSummaryForUser()`

---

#### **CategoryStats reads**
**File**: `backend/src/modules/stats/stats.service.ts:504-512`

**Current**: Reads via `(row as any).checklistAggregates` cast

**Required changes**:
1. Replace cast with proper Prisma field access
2. Handle null/undefined gracefully

**Function to modify**: `getCategoryStatsForUser()`

---

#### **Hall of Fame reads**
**File**: `backend/src/modules/stats/stats.service.ts:1582-1588`

**Current**: Reads from `hofEntry.meta` (field doesn't exist)

**Required changes**:
1. If adding `meta Json?` field: Update to read from `meta`
2. If adding explicit columns: Read from `tier` and `checklistFlags` columns
3. Add fallback to derive from `ChatMessage.traitData.flags` if missing (backward compatibility)

**Function to modify**: `getAdvancedMetricsForUser()` → Hall of Fame building

---

#### **Advanced metrics (persona, message evolution)**
**Files**: `stats.service.ts:1100-1150` (persona), `930-980` (message evolution)

**Current**: Still uses numeric `avgScore` / `avgMessageScore`

**Required changes**:
1. **Not required for Phase 4** - these are Phase 5 enhancements
2. Document as future work

**Status**: ⚠️ **Out of scope for Phase 4** (focus on schema hardening, not feature expansion)

---

### E.4 Backward Compatibility Considerations

#### **Migration Strategy**

1. **New columns should be nullable** (`Int?`, `String?`, `Json?`) to allow gradual population

2. **Default values**: Use `@default(0)` for count fields, `null` for optional fields

3. **Dual-write period** (optional):
   - Continue writing to old locations (JSON in payload, traitData.flags)
   - Also write to new schema fields
   - Read from new fields first, fallback to old if null

4. **Data migration** (if needed):
   - For existing `UserStats`: Recompute checklist aggregates from session history (if `payload` data available)
   - For existing `CategoryStats`: Same approach
   - For existing `HallOfFameMessage`: Derive tier/flags from `ChatMessage.traitData.flags`
   - For existing `ChatMessage`: Derive tier from `score` via `scoreToTier()`

5. **Read path fallbacks**:
   - If new schema field is null/zero, fallback to:
     - `UserStats`: Recompute from recent sessions
     - `CategoryStats`: Recompute from category sessions
     - `HallOfFameMessage`: Derive from `ChatMessage.traitData`
     - `ChatMessage`: Derive tier from `score`

---

### E.5 Clean-up / Deprecation Notes

#### **Fields to deprecate (keep but mark)**

- `UserStats.averageScore` - Keep for backward compat, mark `@deprecated` in code comments
- `UserStats.averageMessageScore` - Same
- `CategoryStats.avgScore` - Same
- `PracticeSession.score` - Keep (still needed for rewards/XP logic)
- `PracticeSession.overallScore` - Consider removing if redundant with `score`
- `ChatMessage.score` - Keep (needed for legacy displays)
- `HallOfFameMessage.score` - Keep (needed for sorting fallback)

#### **JSON fields to keep vs replace**

- `PracticeSession.payload.fastPathScoreSnapshot` - **Keep** (needed for runtime state during session)
- `PracticeSession.endReasonMeta.checklist` - **Keep** (historical record of mission end)
- `ChatMessage.tierData.flags` - **Keep** (source of truth for per-message flags)
- `UserStats.checklistAggregates` (current JSON cast) - **Replace** with schema field
- `CategoryStats.checklistAggregates` (current JSON cast) - **Replace** with schema field
- `HallOfFameMessage.meta` (non-existent) - **Add** as schema field OR replace with columns

---

## F. Readiness Verdict

### ✅ **YES - Ready for Phase 4 Execution**

**Rationale**:

1. **Phase 1-3 invariants are solid**: All core checklist-driven logic is in place. No numeric decision logic remains.

2. **Current state is well-understood**: 
   - Write paths clearly identified
   - Read paths clearly identified
   - Schema gaps clearly identified

3. **Migration path is clear**:
   - Schema additions are straightforward
   - Write path updates are localized
   - Read path updates are localized
   - Backward compatibility strategy is feasible

4. **No blockers identified**:
   - No conflicting schema changes needed
   - No breaking API contract changes required
   - All changes are additive (nullable fields)

---

### F.1 Remaining Risks & Mitigations

#### **Risk 1: Existing data in "phantom" JSON fields**
**Description**: Code writes to `checklistAggregates` fields that don't exist in schema. Prisma may have silently stored these in database but Prisma Client won't read them.

**Mitigation**: 
- After adding schema fields, run data migration to backfill from session history if needed
- Read paths already have fallback to recompute if missing

#### **Risk 2: HallOfFameMessage.meta writes are failing silently**
**Description**: Code writes to `meta` field that doesn't exist. These writes may be ignored.

**Mitigation**:
- After adding `meta` field (or explicit columns), verify existing HOF entries get populated
- May need to backfill by re-running `upsertHallOfFameMessages()` for recent sessions

#### **Risk 3: Performance impact of weekly recomputation**
**Description**: Weekly checklist aggregates are recomputed from N session payloads on every read.

**Mitigation**:
- Phase 4 can keep recomputation for now (backward compat)
- Add `UserStats.weeklyChecklistAggregates` field in future optimization phase
- Or create `WeeklyStats` table for pre-aggregated weekly data

#### **Risk 4: ChatMessage.tier not stored**
**Description**: Tier is derived on-the-fly from score. If score changes or is missing, tier derivation may be inconsistent.

**Mitigation**:
- Phase 4 should add `tier` column and populate during message save
- Ensure tier is computed from `checklistScore.tier` (not from numeric score) for consistency

---

### F.2 Recommended Phase 4 Execution Order

1. **Schema migration** (add all new fields as nullable)
2. **Write path updates** (start writing to new fields)
3. **Read path updates** (read from new fields with fallbacks)
4. **Data migration** (optional - backfill existing data)
5. **Verification** (ensure no regressions, old data still works)

---

### F.3 Out-of-Scope for Phase 4 (Document for Phase 5)

- **Persona sensitivity checklist metrics**: Still uses numeric `avgScore` - enhancement for Phase 5
- **Message evolution checklist metrics**: Still uses numeric `avgMessageScore` - enhancement for Phase 5
- **WeeklyStats table**: Pre-aggregated weekly data - optimization for Phase 5
- **Indexes on checklist fields**: May want indexes on `tier`, `checklistFlags` for query performance - Phase 5

---

**SCOUT COMPLETE** ✅

**Next step**: Proceed with Phase 4 EXECUTION prompt (schema changes + write/read path updates).

