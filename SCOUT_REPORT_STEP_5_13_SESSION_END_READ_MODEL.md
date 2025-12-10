# SCOUT REPORT: Step 5.13 SessionEndReadModel & Stabilization

**Date:** 2025-01-XX  
**Mode:** SCOUT (Read-Only Analysis)  
**Scope:** Unified session-end read model design for Step 5.13

---

## EXECUTIVE SUMMARY

This report maps the current session-end write/read pipeline, identifies inconsistencies, and proposes a unified `SessionEndReadModel` that Step 6 can safely rely on. The system currently has fragmented read paths across multiple endpoints and screens, with data stored in both normalized columns and JSON blobs.

**Key Findings:**
- Session finalization happens in `SessionsService.createScoredSessionFromScores()` (called from `PracticeService.runPracticeSession()`)
- Data is written to `PracticeSession` table + related analytics tables (`MissionDeepInsights`, `MissionMoodTimeline`, `UserTraitHistory`, `GateOutcome`)
- Frontend reads from multiple endpoints: `/v1/sessions/:id`, `/v1/insights/session/:id`, `/v1/stats/dashboard`, `/v1/stats/*`
- Mission success logic has two paths: template-based (uses `missionStatus === 'SUCCESS'`) and freeplay (uses `finalScore >= 60`)
- Trait deltas computed once and stored in `UserTraitHistory.deltasJson`
- Mood computed on-demand from messages, stored in `MissionMoodTimeline.timelineJson`
- No double-counting detected, but read paths are fragmented

---

## PART 1: CURRENT WRITE MODEL (SESSION-END → DB FIELDS)

### 1.1 Main Entry Point

**Service:** `backend/src/modules/practice/practice.service.ts`  
**Method:** `runPracticeSession(userId: string, dto: CreatePracticeSessionDto)`

**Flow:**
1. Validates session continuation or creates new session
2. Computes `missionState` via `computeMissionState()`
3. Computes `endReason` via `computeEndReason()`
4. Calls OpenAI for AI reply
5. Calls `aiCore.scoreSession()` for scoring
6. Calls `SessionsService.createScoredSessionFromScores()` to persist

**Finalization Method:** `backend/src/modules/sessions/sessions.service.ts`  
**Method:** `createScoredSessionFromScores(params)`

### 1.2 Database Write Map

#### PracticeSession Table

**Fields Written at Session End:**

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `id` | String | Generated (cuid) | Session ID |
| `userId` | String | Parameter | User ID |
| `topic` | String | Parameter | Session topic |
| `score` | Int | `finalScore` (computed from `messageScores`) | 0-100, normalized |
| `overallScore` | Int? | Same as `score` | Duplicate field (legacy) |
| `xpGained` | Int | `summary.totalXp` | From `computeSessionRewards()` |
| `coinsGained` | Int | `summary.totalCoins` | From `computeSessionRewards()` |
| `gemsGained` | Int | `summary.totalGems` | From `computeSessionRewards()` |
| `messageCount` | Int | `messageScores.length` | Number of USER messages |
| `status` | MissionStatus | `targetStatus` | 'IN_PROGRESS' | 'SUCCESS' | 'FAIL' | 'ABORTED' |
| `endedAt` | DateTime? | `now` if `shouldFinalize` | Null if IN_PROGRESS |
| `isSuccess` | Boolean? | Computed (see 1.3) | Null if IN_PROGRESS |
| `templateId` | String? | Parameter | Mission template ID |
| `personaId` | String? | Parameter | AI persona ID |
| `aiMode` | String? | 'MISSION' or 'FREEPLAY' | Derived from templateId |
| `endReasonCode` | String? | `normalizeEndReason().endReasonCode` | Validated enum |
| `endReasonMeta` | Json? | `normalizeEndReason().endReasonMeta` | Plain object or null |
| `payload` | Json? | `basePayload` | Contains: `messageScores[]`, `transcript[]`, `endReasonCode`, `endReasonMeta` |
| `rarityCounts` | Json? | `summary.rarityCounts` | Record<string, number> |
| `charismaIndex` | Int? | From `aiCoreResult` | Option B metric |
| `confidenceScore` | Int? | From `aiCoreResult` | Option B metric |
| `clarityScore` | Int? | From `aiCoreResult` | Option B metric |
| `humorScore` | Int? | From `aiCoreResult` | Option B metric |
| `tensionScore` | Int? | From `aiCoreResult` | Option B metric |
| `emotionalWarmth` | Int? | From `aiCoreResult` | Option B metric |
| `dominanceScore` | Int? | From `aiCoreResult` | Option B metric |
| `fillerWordsCount` | Int? | From `aiCoreResult` | Option B metric |
| `totalMessages` | Int? | From `aiCoreResult` | Option B metric |
| `totalWords` | Int? | From `aiCoreResult` | Option B metric |
| `aiCoreVersion` | String? | From `aiCoreResult` | Version string |
| `aiCorePayload` | Json? | Full `aiCoreResult` | Complete AI scoring result |

**ChatMessage Records:**
- Created for each message in transcript (USER + AI)
- Fields: `sessionId`, `userId`, `role`, `content`, `turnIndex`, `score` (USER only), `traitData` (JSON)
- Old messages deleted before creating new ones (line 395: `deleteMany`)

#### MissionDeepInsights Table

**Written By:** `InsightsService.buildAndPersistForSession()`  
**Triggered:** After session finalization (line 796 in `sessions.service.ts`)

| Field | Source | Notes |
|-------|--------|-------|
| `sessionId` | Session ID | Unique constraint |
| `userId` | User ID | |
| `missionId` | `templateId` | Template ID or 'unknown' |
| `insightsJson` | `MissionDeepInsightsPayload` | Full JSON payload (v1 + v2) |
| `averageRarityTier` | Denormalized from payload | 'D' | 'C' | 'B' | 'A' | 'S' | 'S+' |
| `primaryLabels` | Denormalized from payload | String[] (max 5) |
| `overallCharismaIndex` | Denormalized from payload | Int? |

**Payload Structure (insightsJson):**
- `version`: "v1"
- `sessionId`, `userId`, `missionId`
- `bestMessages[]`, `worstMessages[]`
- `traitProfile`: Record<string, number>
- `rarityStats`: Record<string, number>
- `labels`: { primaryLabels[], secondaryLabels[] }
- `metaForHooks`: { averageRarityTier, ... }
- `computedFields`: { overallCharismaIndex, ... }
- `insightsV2?`: { gateInsights[], positiveInsights[], negativeInsights[], traitDeltas{} }

#### MissionMoodTimeline Table

**Written By:** `MoodService.buildAndPersistForSession()`  
**Triggered:** After session finalization (line 767 in `sessions.service.ts`)

| Field | Source | Notes |
|-------|--------|-------|
| `sessionId` | Session ID | Unique constraint |
| `userId` | User ID | |
| `missionId` | `templateId` | Template ID or 'unknown' |
| `timelineJson` | `MoodTimelinePayload` | Full timeline JSON |
| `currentMoodState` | Denormalized | 'COLD' | 'NEUTRAL' | 'WARM' | 'TENSE' | 'FLOW' |
| `currentMoodPercent` | Denormalized | 0-100 |

**Timeline Structure (timelineJson):**
- `version`: 1
- `snapshots[]`: Array of `MoodSnapshot` (one per USER message)
  - `turnIndex`, `rawScore`, `smoothedMoodScore`, `moodState`, `tension`, `warmth`, `vibe`, `flow`
- `current`: { `moodState`, `moodPercent` }
- `moodInsights?`: { `pickedIds[]`, `insights[]` } (added later)

#### UserTraitHistory Table

**Written By:** `TraitsService.persistTraitHistoryAndUpdateScores()`  
**Triggered:** After session finalization (line 774 in `sessions.service.ts`)

| Field | Source | Notes |
|-------|--------|-------|
| `sessionId` | Session ID | Unique constraint |
| `userId` | User ID | |
| `traitsJson` | `TraitSnapshot` | Current session trait averages |
| `deltasJson` | `TraitSnapshot` | Delta vs previous long-term scores |
| `sessionScore` | `PracticeSession.score` | Final session score |
| `avgMessageScore` | Computed from messages | Average of USER message scores |
| `missionId` | `templateId` | Template ID or null |

**TraitSnapshot Structure:**
- `confidence`: number (0-100)
- `clarity`: number (0-100)
- `humor`: number (0-100)
- `tensionControl`: number (0-100)
- `emotionalWarmth`: number (0-100)
- `dominance`: number (0-100)

**Delta Computation:**
- If no previous scores: `deltas = current` (first session)
- Otherwise: `deltas = current - previous` (can be negative)

#### UserTraitScores Table

**Written By:** `TraitsService.persistTraitHistoryAndUpdateScores()`  
**Triggered:** Same as UserTraitHistory

| Field | Source | Notes |
|-------|--------|-------|
| `userId` | User ID | Primary key |
| `traitsJson` | `TraitSnapshot` | Long-term EMA scores (70% current + 30% previous) |
| `updatedAt` | Auto | Timestamp |

**Update Logic:**
- Exponential Moving Average: `newScore = (current * 0.7) + (previous * 0.3)`
- First session: `newScore = current`

#### GateOutcome Table

**Written By:** `GatesService.evaluateAndPersist()`  
**Triggered:** After session finalization (line 781 in `sessions.service.ts`)

| Field | Source | Notes |
|-------|--------|-------|
| `sessionId` | Session ID | Part of unique key |
| `userId` | User ID | |
| `gateKey` | GateKey enum | Part of unique key |
| `passed` | Boolean | Gate evaluation result |
| `reasonCode` | String? | Why passed/failed |
| `contextJson` | Json? | Additional context |

**Gate Keys Evaluated:**
- `GATE_MIN_MESSAGES`: Requires ≥3 USER messages
- `GATE_SUCCESS_THRESHOLD`: Average score ≥70
- `GATE_FAIL_FLOOR`: Average score >40
- `GATE_DISQUALIFIED`: Checks `endReasonCode` for disqualification
- `GATE_OBJECTIVE_PROGRESS`: Progress ≥50% (if available)

#### RewardLedgerEntry Table

**Written By:** `SessionsService.saveOrUpdateScoredSession()` (inside transaction)  
**Triggered:** Only if `shouldFinalize && !existingGrant`

| Field | Source | Notes |
|-------|--------|-------|
| `sessionId` | Session ID | Part of unique key |
| `userId` | User ID | |
| `kind` | `SESSION_REWARD` | Ledger kind |
| `xpDelta` | `summary.totalXp` | XP granted |
| `coinsDelta` | `summary.totalCoins` | Coins granted |
| `gemsDelta` | `summary.totalGems` | Gems granted |
| `score` | `finalScore` | Session score |
| `isSuccess` | `isSuccess` | Boolean or null |
| `meta` | Json? | { `rarityCounts`, `messageCount` } |

**Idempotency:** Unique constraint on `(sessionId, kind)` prevents double-granting.

#### UserStats Table

**Updated By:** `SessionsService.saveOrUpdateScoredSession()` (inside transaction)  
**Triggered:** Only if `shouldFinalize && didGrant`

| Field | Update Logic | Notes |
|-------|--------------|-------|
| `sessionsCount` | `stats.sessionsCount + 1` | Increment |
| `successCount` | `stats.successCount + (isSuccess ? 1 : 0)` | Conditional increment |
| `failCount` | `stats.failCount + (isSuccess ? 0 : 1)` | Conditional increment |
| `averageScore` | `(prevAvg * count + finalScore) / newCount` | Running average |
| `averageMessageScore` | `(prevAvg * count + sessionMessageAvg) / newCount` | Running average |
| `lastSessionAt` | `now` | Timestamp |

#### UserWallet Table

**Updated By:** `SessionsService.saveOrUpdateScoredSession()` (inside transaction)  
**Triggered:** Only if `shouldFinalize && didGrant`

| Field | Update Logic | Notes |
|-------|--------------|-------|
| `xp` | `wallet.xp + summary.totalXp` | Additive |
| `lifetimeXp` | `wallet.lifetimeXp + summary.totalXp` | Additive |
| `coins` | `wallet.coins + summary.totalCoins` | Additive |
| `gems` | `wallet.gems + summary.totalGems` | Additive |

---

## PART 2: CURRENT READ MODEL USAGES

### 2.1 Dashboard Summary

**Endpoint:** `GET /v1/stats/dashboard`  
**Controller:** `StatsController.getDashboard()`  
**Service:** `StatsService.getDashboardForUser()`

**Fields Read:**
- `User`: `id`, `email`, `createdAt`, `streakCurrent`
- `UserWallet`: `xp`, `level`, `coins`, `gems`, `lifetimeXp`
- `UserStats`: `sessionsCount`, `successCount`, `failCount`, `averageScore`, `averageMessageScore`, `lastSessionAt`
- `PracticeSession` (latest finalized): `score`, `charismaIndex`, `confidenceScore`, `clarityScore`, `humorScore`, `tensionScore`, `emotionalWarmth`, `dominanceScore`, `fillerWordsCount`, `totalMessages`, `totalWords`, `aiCoreVersion`, `aiSummary`
- `PracticeSession` (last 5): `createdAt`, `charismaIndex`, `score`

**Response Shape:**
```typescript
{
  ok: true,
  user: { id, email, createdAt },
  streak: { current },
  wallet: { xp, level, coins, gems, lifetimeXp },
  stats: {
    sessionsCount,
    successCount,
    failCount,
    averageScore,
    averageMessageScore,
    lastSessionAt,
    latest: { /* Option B metrics from latest session */ },
    averages: { /* Option B averages across all sessions */ },
    insights: { /* Latest aiSummary + improving/declining traits */ },
    socialScore: number | null,
    socialTier: string | null,
    recentSessions: Array<{ createdAt, charismaIndex, score }>
  }
}
```

**Gaps:**
- No `endReasonCode`/`endReasonMeta` in dashboard
- No trait deltas in dashboard
- No mood summary in dashboard
- No gate outcomes in dashboard

### 2.2 Mission End Screen

**Endpoints Used:**
1. `GET /v1/sessions/:id` → `SessionDTO`
2. `GET /v1/insights/session/:id` → `InsightsDTO` (optional)
3. `GET /v1/insights/rotation/:sessionId?surface=MISSION_END` → `RotationPackResponse` (optional)
4. `GET /v1/stats/mood/session/:sessionId` → `MoodTimelineResponse` (optional)

**Frontend Builder:** `buildMissionEndSelectedPack(session, insights)`

**Fields Consumed:**
- From `SessionDTO`:
  - `sessionId`, `templateId`, `personaId`
  - `rewards`: `score`, `xpGained`, `coinsGained`, `gemsGained`, `rarityCounts`, `messages[]`
  - `missionState`: `status`, `progressPct`, `averageScore`, `totalMessages`, `endReasonCode`, `endReasonMeta`
  - `messages[]`: `turnIndex`, `role`, `content`, `score`, `traitData`
- From `InsightsDTO`:
  - `insightsV2`: `gateInsights[]`, `positiveInsights[]`, `negativeInsights[]`, `traitDeltas{}`
  - `analyzerParagraphs[]`

**Transform:** `buildMissionEndSelectedPack()` computes:
- Top 3 / Bottom 3 messages from `session.messages`
- `endReason` banner from `missionState.endReasonCode`
- `moodTeaser` (computed locally, not from backend)

**Gaps:**
- Mood timeline fetched separately (not in main pack)
- Rotation pack fetched separately (not in main pack)
- No unified "session end summary" endpoint

### 2.3 Stats Tabs

#### Badges Tab
**Endpoint:** `GET /v1/stats/badges`  
**Reads:** `UserBadgeProgress`, `UserBadgeEvent`, `BadgeLedgerEntry`  
**No session-end data consumed**

#### Performance Tab
**Endpoints:**
- `GET /v1/stats/traits/summary` → `TraitsSummaryResponse`
- `GET /v1/stats/traits/history?limit=20` → `TraitHistoryResponse`

**Fields Read:**
- `UserTraitScores.traitsJson` (current long-term scores)
- `UserTraitHistory[]` (per-session snapshots + deltas)
- Computes weekly deltas from `UserTraitHistory.recordedAt`

**Gaps:**
- No direct link to `PracticeSession` (reads from `UserTraitHistory` only)
- No `endReasonCode` in trait history

#### Advanced Tab
**Endpoint:** `GET /v1/stats/advanced` → `AdvancedMetricsResponse`

**Fields Read:**
- `PracticeSession` (multiple): `score`, `charismaIndex`, trait scores, `createdAt`
- `MissionDeepInsights`: `insightsJson` (parsed for hall of fame, signature style)
- `UserTraitHistory`: For message evolution
- `SessionTraitSynergy`: For synergy map

**Gaps:**
- Reads raw JSON blobs (`insightsJson`)
- No unified structure

#### Tips Tab (Message Analyzer)
**Endpoints:**
- `GET /v1/analyzer/lists` → `AnalyzerListsResponse`
- `POST /v1/analyzer/analyze` → `AnalyzeMessageResponse`

**Fields Read:**
- `ChatMessage`: `messageId`, `contentSnippet`, `score`, `turnIndex`
- `MessageBreakdownDTO`: `score`, `traits`, `hooks`, `patterns`, `whyItWorked`, `whatToImprove`
- `DeepParagraphDTO[]`: Analysis paragraphs

**Gaps:**
- No session-level context (just message-level)

### 2.4 Admin/Inspector Views

**Not found in codebase** - assumed to read raw `PracticeSession.payload` JSON blobs.

---

## PART 3: MISSION SUCCESS LOGIC & ENDREASON CODES

### 3.1 Success Determination

**Location:** `backend/src/modules/sessions/sessions.service.ts` (lines 265-269)

**Logic:**
```typescript
const isSuccess: boolean | null = shouldFinalize
  ? templateId
    ? missionStatus === 'SUCCESS'  // Mission: use status directly
    : missionStatus === 'SUCCESS' && finalScore >= 60  // Freeplay: status + score threshold
  : null;  // IN_PROGRESS: null
```

**Thresholds:**
- **Mission (templateId exists):** `missionStatus === 'SUCCESS'` (no score threshold)
- **Freeplay (no templateId):** `missionStatus === 'SUCCESS' && finalScore >= 60`

**Status Computation:** `backend/src/modules/practice/practice.service.ts` (lines 254-308)

**Function:** `computeMissionState(messageScores, policy, minMessagesBeforeEnd)`

**Logic:**
- If `totalUserMessages >= policy.maxMessages && totalUserMessages >= minEnd`:
  - `status = averageScore >= policy.successScore ? 'SUCCESS' : 'FAIL'`
- Otherwise: `status = 'IN_PROGRESS'`

**Policy Thresholds (from `resolvePolicy()`):**
- `successScore`: 70 (default)
- `failScore`: 40 (default)
- `maxMessages`: 5-10 (varies by difficulty)

### 3.2 EndReasonCode Mapping

**Location:** `backend/src/modules/practice/practice.service.ts` (lines 324-400)

**Function:** `computeEndReason(params)`

**Mapping:**

| Condition | endReasonCode | endReasonMeta |
|-----------|---------------|---------------|
| `aiMode === 'FREEPLAY'` | `null` | `null` |
| `status === 'IN_PROGRESS'` | `null` | `null` |
| `disqualified === true` | `'ABORT_DISQUALIFIED'` | `{ disqualifyCode, triggeredByUserMessageIndex, matchedText }` |
| `status === 'SUCCESS'` (natural) | `'SUCCESS_OBJECTIVE'` | `{ averageScore, successScoreThreshold, failScoreThreshold, naturalReason, finalStatus }` |
| `status === 'FAIL'` (natural) | `'FAIL_OBJECTIVE'` | `{ averageScore, successScoreThreshold, failScoreThreshold, naturalReason, finalStatus }` |
| Custom config allowed reasons | From `normalizedConfig.endReasonPrecedenceResolved` | Same meta structure |

**Normalization:** `backend/src/modules/shared/normalizers/end-reason.normalizer.ts`

**Function:** `normalizeEndReason(code, meta)`

**Rules:**
- Validates `code` against `MISSION_END_REASON_CODES` enum
- Invalid code → `null`
- Ensures `meta` is plain object or `null` (handles Prisma.DbNull/JsonNull)

**Valid Codes:** (from `mission-config-v1.schema.ts`)
- `'SUCCESS_OBJECTIVE'`
- `'FAIL_OBJECTIVE'`
- `'ABORT_DISQUALIFIED'`
- `'ABORT_TIMEOUT'`
- `'ABORT_USER_QUIT'`
- (others...)

### 3.3 Inconsistencies

**None Found:**
- ✅ Single source of truth: `computeEndReason()` in `practice.service.ts`
- ✅ Normalization applied consistently via `normalizeEndReason()`
- ✅ Success logic is deterministic (no race conditions)

**Potential Issues:**
- ⚠️ Freeplay success threshold (60) is hardcoded, not configurable
- ⚠️ Mission success uses `missionStatus` directly (no score validation)

---

## PART 4: MOOD BASELINE & SUMMARY

### 4.1 Mood Computation

**Location:** `backend/src/modules/mood/mood.service.ts`

**Function:** `buildTimelineForSession(sessionId)`

**Computation:**
1. Loads session messages via `loadSessionAnalyticsSnapshot()`
2. Filters to USER messages only
3. For each USER message:
   - Extracts `rawScore` (from `msg.score`, default 50)
   - Computes EMA smoothing: `smoothed = α * raw + (1-α) * previous` (α=0.35)
   - Extracts traits: `tensionControl`, `emotionalWarmth`, `humor`, `confidence`
   - Computes derived metrics:
     - `tension = 100 - tensionControl + (negativePatterns * 5)`
     - `warmth = emotionalWarmth + (positiveHooks * 3)`
     - `vibe = (humor + confidence) / 2`
     - `flow = EMA(stability)` (inverse variance of recent scores)
   - Classifies `moodState`: 'FLOW' | 'TENSE' | 'WARM' | 'COLD' | 'NEUTRAL'
4. Returns `MoodTimelinePayload` with `snapshots[]` and `current` (last snapshot)

**Baseline:**
- **No explicit baseline** - first message uses `rawScore` as initial `smoothedMoodScore`
- **Current mood** = last snapshot's `moodState` and `smoothedMoodScore`

### 4.2 Mood Storage

**Table:** `MissionMoodTimeline`

**Fields:**
- `timelineJson`: Full `MoodTimelinePayload` (snapshots + current)
- `currentMoodState`: Denormalized (for queries)
- `currentMoodPercent`: Denormalized (0-100)

**Write:** `MoodService.persistTimeline()` (upsert by `sessionId`)

### 4.3 Mood Read Paths

**Endpoint:** `GET /v1/stats/mood/session/:sessionId`  
**Controller:** `StatsController.getMoodTimeline()`  
**Returns:** `LockedResponse<MoodTimelineResponse>`

**Response Shape:**
```typescript
{
  version: 1,
  snapshots: Array<{
    turnIndex: number,
    rawScore: number,
    smoothedMoodScore: number,
    moodState: 'COLD' | 'NEUTRAL' | 'WARM' | 'TENSE' | 'FLOW',
    tension: number,
    warmth: number,
    vibe: number,
    flow: number
  }>,
  current: {
    moodState: string,
    moodPercent: number
  }
}
```

**Frontend Usage:**
- `MissionEndScreen`: Fetches mood timeline separately
- Not included in main session response

**Defaults:**
- Missing timeline → Returns `null` (frontend handles gracefully)
- Missing message scores → Defaults to 50 for `rawScore`
- Missing traits → Defaults to 50 for trait values

### 4.4 Gaps

- ⚠️ Mood not included in main session response (requires separate API call)
- ⚠️ No "mood summary" in dashboard
- ⚠️ No mood baseline concept (first message is baseline)

---

## PART 5: TRAIT DELTAS / SNAPSHOTS

### 5.1 Trait Snapshot Computation

**Location:** `backend/src/modules/traits/traits.service.ts`

**Function:** `computeSessionTraitSnapshot(sessionId)`

**Computation:**
1. Loads session messages via `loadSessionAnalyticsSnapshot()`
2. Filters to USER messages only
3. Aggregates traits across all USER messages:
   - Sums trait values per key (confidence, clarity, humor, etc.)
   - Counts messages with valid trait values
   - Computes average: `sum / count`
   - Clamps to 0-100 range
4. Returns `TraitSnapshot` with all 6 traits

**Default Values:**
- Missing trait → 0
- No USER messages → Throws error

### 5.2 Trait Delta Computation

**Location:** `backend/src/modules/traits/traits.service.ts`

**Function:** `computeDeltas(current, previous)`

**Computation:**
- If `previous === null`: `deltas = current` (first session)
- Otherwise: `deltas = current - previous` (can be negative)

**Storage:**
- `UserTraitHistory.deltasJson`: Delta snapshot
- `UserTraitHistory.traitsJson`: Current session snapshot

### 5.3 Long-Term Score Update

**Location:** `backend/src/modules/traits/traits.service.ts`

**Function:** `updateLongTermScores(current, previous)`

**Computation:**
- EMA: `newScore = (current * 0.7) + (previous * 0.3)`
- First session: `newScore = current`

**Storage:**
- `UserTraitScores.traitsJson`: Long-term scores (updated per session)

### 5.4 Trait Read Paths

**Endpoints:**
- `GET /v1/stats/traits/summary` → `TraitsSummaryResponse`
- `GET /v1/stats/traits/history?limit=20` → `TraitHistoryResponse`

**Fields Read:**
- `UserTraitScores.traitsJson` (current)
- `UserTraitHistory[]` (history points)
- Computes weekly deltas from `UserTraitHistory.recordedAt`

**Gaps:**
- No trait deltas in main session response
- No trait snapshot in main session response

### 5.5 Consistency Check

**✅ No Double-Counting:**
- Traits computed once per session (in `persistTraitHistoryAndUpdateScores()`)
- Deltas computed once (from current vs previous)
- Long-term scores updated once (EMA applied)

**⚠️ Potential Issues:**
- If `persistTraitHistoryAndUpdateScores()` is called twice for same session, it will recompute (but upsert prevents duplicates)
- No validation that `UserTraitHistory` exists before reading deltas

---

## PART 6: MESSAGE-LEVEL SCORING HISTORY & DUPLICATION

### 6.1 Message Scoring Storage

**Table:** `ChatMessage`

**Fields:**
- `score`: number | null (USER messages only)
- `traitData`: Json (contains `traits`, `flags`, `label`, `hooks`, `patterns`)
- `turnIndex`: number (preserves transcript order)
- `meta`: Json (contains `index`, `userIndex`, `score`, `rarity`)

**Write:** `SessionsService.saveOrUpdateScoredSession()` (lines 408-503)

**Logic:**
- Deletes all existing messages for session (line 395)
- Creates new messages from transcript
- Maps `aiCoreResult.messages[]` to transcript indices
- Enriches USER messages with hooks/patterns (derived from traits)

### 6.2 Message Scores in Payload

**Table:** `PracticeSession.payload`

**Field:** `messageScores: number[]` (array of USER message scores)

**Purpose:** Backup/audit trail (messages can be deleted/recreated)

### 6.3 Duplication Check

**✅ No Re-Scoring:**
- Messages scored once during `aiCore.scoreSession()` call
- Scores stored in `ChatMessage.score` and `PracticeSession.payload.messageScores`
- No re-computation on read

**✅ No Double-Counting:**
- Each USER message has one score
- Scores aggregated once in `computeSessionRewards()`
- No duplicate entries in `ChatMessage` (old messages deleted before creating new)

**⚠️ Potential Issues:**
- If session is updated multiple times, messages are deleted/recreated (scores preserved in payload)
- `turnIndex` must match transcript order (validated by unique constraint)

---

## PART 7: KNOWN DUPLICATION / INSTABILITY POINTS

### 7.1 Fragmented Read Paths

**Issue:** Frontend must make multiple API calls to get complete session-end data:
1. `/v1/sessions/:id` → Session + rewards + messages
2. `/v1/insights/session/:id` → Insights v2 + trait deltas
3. `/v1/stats/mood/session/:sessionId` → Mood timeline
4. `/v1/insights/rotation/:sessionId` → Rotation pack

**Impact:** 
- Multiple network requests
- No single source of truth for "session end summary"
- Frontend must merge data from multiple endpoints

### 7.2 JSON Blob Dependencies

**Issue:** Critical data stored in JSON blobs:
- `PracticeSession.payload` → `messageScores[]`, `transcript[]`
- `MissionDeepInsights.insightsJson` → Full insights payload
- `MissionMoodTimeline.timelineJson` → Full timeline
- `UserTraitHistory.traitsJson` / `deltasJson` → Trait snapshots

**Impact:**
- No type safety at DB level
- Requires parsing/validation on read
- Harder to query/filter

### 7.3 Inconsistent Field Names

**Issue:** Some fields duplicated with different names:
- `PracticeSession.score` vs `PracticeSession.overallScore` (both same value)
- `PracticeSession.messageCount` vs `ChatMessage` count (should match)

**Impact:**
- Confusion about which field to use
- Potential drift if updates miss one field

### 7.4 Missing Normalization on Read

**Issue:** Some read paths don't normalize:
- Dashboard reads raw `charismaIndex` (may be null)
- Stats tabs read raw JSON blobs
- No unified "session end summary" endpoint

**Impact:**
- Inconsistent defaults across endpoints
- Frontend must handle nulls/undefined everywhere

### 7.5 No Re-Scoring (Good)

**✅ Confirmed:** Messages are scored once, stored, never re-computed on read.

### 7.6 No Double Deltas (Good)

**✅ Confirmed:** Trait deltas computed once, stored, never re-computed.

---

## PART 8: PROPOSED SESSIONENDREADMODEL

### 8.1 TypeScript Interface

```typescript
/**
 * Step 5.13: Unified Session End Read Model
 * Single source of truth for completed session/mission data
 * All fields have safe defaults (no nulls unless semantically meaningful)
 */
export interface SessionEndReadModel {
  // Core identifiers
  sessionId: string;
  userId: string;
  
  // Timestamps
  createdAt: string; // ISO string
  endedAt: string; // ISO string (never null for finalized sessions)
  
  // Mission context
  templateId: string | null;
  personaId: string | null;
  missionDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'ELITE' | null;
  missionCategory: string | null; // GoalType or category key
  aiMode: 'MISSION' | 'FREEPLAY';
  
  // Final scores
  finalScore: number; // 0-100, normalized
  averageMessageScore: number; // 0-100, average of USER messages
  messageCount: number; // Number of USER messages
  
  // Score breakdown (Option B metrics)
  scoreBreakdown: {
    charismaIndex: number | null; // 0-100
    confidenceScore: number | null;
    clarityScore: number | null;
    humorScore: number | null;
    tensionScore: number | null;
    emotionalWarmth: number | null;
    dominanceScore: number | null;
    fillerWordsCount: number | null;
    totalWords: number | null;
  };
  
  // Rewards
  rewards: {
    xpGained: number; // Always ≥0
    coinsGained: number; // Always ≥0
    gemsGained: number; // Always ≥0
    rarityCounts: Record<string, number>; // e.g. { 'S': 2, 'A': 1 }
  };
  
  // Mission outcome
  outcome: MissionOutcome;
  
  // Gate results
  gateResults: Array<{
    gateKey: string; // 'GATE_MIN_MESSAGES' | 'GATE_SUCCESS_THRESHOLD' | etc.
    passed: boolean;
    reasonCode: string | null;
    context: Record<string, any>; // Always object (never null)
  }>;
  
  // Trait summary
  traitSummary: {
    snapshot: TraitSnapshot; // Current session averages (all 6 traits, 0-100)
    deltas: TraitSnapshot; // Delta vs previous long-term scores (can be negative)
    longTermScores: TraitSnapshot; // Updated long-term EMA scores
  };
  
  // Mood summary
  moodSummary: {
    current: {
      moodState: 'COLD' | 'NEUTRAL' | 'WARM' | 'TENSE' | 'FLOW';
      moodPercent: number; // 0-100
    };
    baseline: {
      moodState: 'COLD' | 'NEUTRAL' | 'WARM' | 'TENSE' | 'FLOW';
      moodPercent: number; // 0-100 (first message)
    };
    delta: number; // current.moodPercent - baseline.moodPercent (can be negative)
    snapshots: Array<{
      turnIndex: number;
      rawScore: number;
      smoothedMoodScore: number;
      moodState: string;
      tension: number;
      warmth: number;
      vibe: number;
      flow: number;
    }>; // Empty array if no mood data
  };
  
  // Key messages
  keyMessages: {
    top: MessageHighlight[]; // Top 3 USER messages (by score)
    bottom: MessageHighlight[]; // Bottom 3 USER messages (by score)
    rare: MessageHighlight[]; // Messages with rarity S or S+
  };
  
  // Insights pointers (for Step 6)
  insights: {
    deepInsightsId: string | null; // MissionDeepInsights.id
    moodTimelineId: string | null; // MissionMoodTimeline.id
    rotationPackAvailable: boolean; // Whether rotation pack exists
    traitHistoryId: string | null; // UserTraitHistory.id
  };
  
  // Completion metadata
  completionPercentage: number; // 0-100 (progressPct from missionState)
  durationSeconds: number; // Session duration (if available)
}

/**
 * Step 5.13: Mission Outcome (nested in SessionEndReadModel)
 */
export interface MissionOutcome {
  status: 'SUCCESS' | 'FAIL' | 'ABORTED';
  isSuccess: boolean; // true if SUCCESS, false if FAIL/ABORTED
  endReasonCode: string | null; // Normalized MissionEndReasonCode or null
  endReasonMeta: Record<string, any>; // Always object (never null, empty {} if no meta)
  successThreshold: number | null; // Policy successScore threshold (if available)
  failThreshold: number | null; // Policy failScore threshold (if available)
}

/**
 * Step 5.13: Trait Snapshot (reused from traits.service.ts)
 */
export interface TraitSnapshot {
  confidence: number; // 0-100
  clarity: number; // 0-100
  humor: number; // 0-100
  tensionControl: number; // 0-100
  emotionalWarmth: number; // 0-100
  dominance: number; // 0-100
}

/**
 * Step 5.13: Message Highlight (reused from MissionEndTypes.ts)
 */
export interface MessageHighlight {
  turnIndex: number;
  content: string;
  score: number; // 0-100 (never null for highlighted messages)
  rarity: 'C' | 'B' | 'A' | 'S' | 'S+' | null;
  traits: Record<string, number>; // Trait values for this message
  hooks: string[]; // Positive hooks hit
  patterns: string[]; // Patterns detected
}
```

### 8.2 Field Mapping & Normalization Rules

#### Core Identifiers
- **sessionId**: `PracticeSession.id`
- **userId**: `PracticeSession.userId`
- **createdAt**: `PracticeSession.createdAt.toISOString()`
- **endedAt**: `PracticeSession.endedAt?.toISOString() ?? null` → **Default:** Must be non-null for finalized sessions (validation)

#### Mission Context
- **templateId**: `PracticeSession.templateId` → **Default:** `null`
- **personaId**: `PracticeSession.personaId` → **Default:** `null`
- **missionDifficulty**: From `PracticeMissionTemplate.difficulty` (join) → **Default:** `null`
- **missionCategory**: From `PracticeMissionTemplate.goalType` (join) → **Default:** `null`
- **aiMode**: `PracticeSession.aiMode` → **Default:** `'FREEPLAY'` if null

#### Final Scores
- **finalScore**: `PracticeSession.score` → **Default:** `0` (should never be null for finalized)
- **averageMessageScore**: Computed from `ChatMessage.score[]` (USER only) → **Default:** `0` if no messages
- **messageCount**: `PracticeSession.messageCount` → **Default:** `0`

#### Score Breakdown
- **charismaIndex**: `PracticeSession.charismaIndex` → **Default:** `null`
- **confidenceScore**: `PracticeSession.confidenceScore` → **Default:** `null`
- **clarityScore**: `PracticeSession.clarityScore` → **Default:** `null`
- **humorScore**: `PracticeSession.humorScore` → **Default:** `null`
- **tensionScore**: `PracticeSession.tensionScore` → **Default:** `null`
- **emotionalWarmth**: `PracticeSession.emotionalWarmth` → **Default:** `null`
- **dominanceScore**: `PracticeSession.dominanceScore` → **Default:** `null`
- **fillerWordsCount**: `PracticeSession.fillerWordsCount` → **Default:** `null`
- **totalWords**: `PracticeSession.totalWords` → **Default:** `null`

#### Rewards
- **xpGained**: `PracticeSession.xpGained` → **Default:** `0`
- **coinsGained**: `PracticeSession.coinsGained` → **Default:** `0`
- **gemsGained**: `PracticeSession.gemsGained` → **Default:** `0`
- **rarityCounts**: `PracticeSession.rarityCounts` (parsed JSON) → **Default:** `{}`

#### Mission Outcome
- **status**: `PracticeSession.status` → **Default:** Must be SUCCESS/FAIL/ABORTED for finalized
- **isSuccess**: `PracticeSession.isSuccess` → **Default:** `false` if null
- **endReasonCode**: `normalizeEndReason(session.endReasonCode, session.endReasonMeta).endReasonCode` → **Default:** `null`
- **endReasonMeta**: `normalizeEndReason(session.endReasonCode, session.endReasonMeta).endReasonMeta` → **Default:** `{}` (empty object, never null)
- **successThreshold**: From `policy.successScore` (if available in payload) → **Default:** `null`
- **failThreshold**: From `policy.failScore` (if available in payload) → **Default:** `null`

#### Gate Results
- **gateResults**: From `GateOutcome[]` (join) → **Default:** `[]` (empty array)
- Each outcome: `{ gateKey, passed, reasonCode, context }`
- **context**: `GateOutcome.contextJson` (parsed) → **Default:** `{}` (empty object)

#### Trait Summary
- **snapshot**: `UserTraitHistory.traitsJson` (parsed) → **Default:** All traits = 0
- **deltas**: `UserTraitHistory.deltasJson` (parsed) → **Default:** All deltas = 0
- **longTermScores**: `UserTraitScores.traitsJson` (parsed) → **Default:** All traits = 0

**Normalization:**
- If `UserTraitHistory` missing → Compute on-demand or use defaults
- If `UserTraitScores` missing → Use defaults (first session)

#### Mood Summary
- **current**: `MissionMoodTimeline.currentMoodState` / `currentMoodPercent` → **Default:** `{ moodState: 'NEUTRAL', moodPercent: 50 }`
- **baseline**: First snapshot from `timelineJson.snapshots[0]` → **Default:** `{ moodState: 'NEUTRAL', moodPercent: 50 }`
- **delta**: `current.moodPercent - baseline.moodPercent` → **Default:** `0`
- **snapshots**: `MissionMoodTimeline.timelineJson.snapshots` → **Default:** `[]` (empty array)

**Normalization:**
- If `MissionMoodTimeline` missing → Compute on-demand or use defaults
- If `snapshots` empty → Use defaults

#### Key Messages
- **top**: Top 3 USER messages by score (from `ChatMessage[]`) → **Default:** `[]`
- **bottom**: Bottom 3 USER messages by score → **Default:** `[]`
- **rare**: Messages with rarity S or S+ (from `rewards.messages[]`) → **Default:** `[]`

**Computation:**
- Filter `ChatMessage[]` to USER role
- Sort by `score` DESC (top) / ASC (bottom)
- Take top 3
- Extract rarity from `rewards.messages[]` (match by turnIndex)

#### Insights Pointers
- **deepInsightsId**: `MissionDeepInsights.id` (if exists) → **Default:** `null`
- **moodTimelineId**: `MissionMoodTimeline.id` (if exists) → **Default:** `null`
- **rotationPackAvailable**: Check if rotation pack exists → **Default:** `false`
- **traitHistoryId**: `UserTraitHistory.id` (if exists) → **Default:** `null`

#### Completion Metadata
- **completionPercentage**: From `missionState.progressPct` (if in payload) or computed → **Default:** `100` if finalized
- **durationSeconds**: `PracticeSession.durationSec` → **Default:** `0`

---

## PART 9: PROPOSED MISSIONOUTCOME (IF SEPARATE)

**Recommendation:** Keep `MissionOutcome` nested inside `SessionEndReadModel` (not separate type).

**Rationale:**
- Always part of session-end context
- No standalone use cases
- Simplifies API responses

**If Separate Needed:**
```typescript
export interface MissionOutcome {
  status: 'SUCCESS' | 'FAIL' | 'ABORTED';
  isSuccess: boolean;
  endReasonCode: string | null;
  endReasonMeta: Record<string, any>; // Never null
  successThreshold: number | null;
  failThreshold: number | null;
  averageScore: number; // For context
  messageCount: number; // For context
}
```

---

## PART 10: IMPLEMENTATION PLAN

### 10.1 New Files to Create

1. **`backend/src/modules/shared/types/session-end-read-model.types.ts`**
   - Define `SessionEndReadModel`, `MissionOutcome`, `TraitSnapshot`, `MessageHighlight` interfaces
   - Export for use across modules

2. **`backend/src/modules/sessions/session-end-read-model.builder.ts`**
   - Function: `buildSessionEndReadModel(sessionId: string, userId: string): Promise<SessionEndReadModel>`
   - Aggregates data from:
     - `PracticeSession`
     - `ChatMessage[]`
     - `MissionDeepInsights`
     - `MissionMoodTimeline`
     - `UserTraitHistory`
     - `UserTraitScores`
     - `GateOutcome[]`
   - Applies all normalization rules
   - Returns unified model

3. **`backend/src/modules/sessions/session-end-read-model.normalizer.ts`**
   - Helper functions for normalization:
     - `normalizeTraitSnapshot(data: any): TraitSnapshot`
     - `normalizeMoodSummary(timeline: any): MoodSummary`
     - `normalizeGateResults(outcomes: GateOutcome[]): GateResult[]`
     - `normalizeKeyMessages(messages: ChatMessage[], rewards: any): KeyMessages`

### 10.2 Files to Modify

1. **`backend/src/modules/sessions/sessions.controller.ts`**
   - Add endpoint: `GET /v1/sessions/:id/summary`
   - Returns `SessionEndReadModel`
   - Uses `buildSessionEndReadModel()`

2. **`backend/src/modules/sessions/sessions.service.ts`**
   - Add method: `getSessionEndReadModel(sessionId: string, userId: string): Promise<SessionEndReadModel>`
   - Calls builder function
   - Validates ownership

3. **`backend/src/modules/shared/serializers/api-serializers.ts`**
   - Add serializer: `toSessionEndReadModelPublic(model: SessionEndReadModel): SessionEndReadModel`
   - Allowlist-only (no changes needed, but document)

### 10.3 Frontend Integration (Future)

**New API Client Function:**
```typescript
// socialsocial/src/api/sessionsService.ts
export async function fetchSessionEndSummary(sessionId: string): Promise<SessionEndReadModel> {
  const res = await apiClient.get(`/sessions/${sessionId}/summary`);
  return res.data;
}
```

**Update MissionEndScreen:**
- Option A: Replace multiple API calls with single `fetchSessionEndSummary()`
- Option B: Keep existing calls, add new endpoint as alternative

**Recommendation:** Option B (backward compatible, gradual migration)

### 10.4 Backward Compatibility

**Strategy:**
- ✅ New endpoint (`/sessions/:id/summary`) does not break existing endpoints
- ✅ Existing endpoints (`/sessions/:id`, `/insights/session/:id`) remain unchanged
- ✅ Frontend can migrate gradually
- ✅ Old sessions without analytics data return safe defaults

**Validation:**
- Test with old sessions (no `MissionDeepInsights`, no `MissionMoodTimeline`)
- Test with sessions missing trait history
- Test with sessions missing gate outcomes
- All should return valid `SessionEndReadModel` with defaults

### 10.5 Implementation Steps

**Step 1: Create Types**
- Add `session-end-read-model.types.ts`
- Define all interfaces

**Step 2: Create Builder**
- Add `session-end-read-model.builder.ts`
- Implement data aggregation logic
- Apply normalization rules

**Step 3: Create Normalizers**
- Add `session-end-read-model.normalizer.ts`
- Implement helper functions

**Step 4: Add Service Method**
- Add `getSessionEndReadModel()` to `SessionsService`
- Validate ownership
- Call builder

**Step 5: Add Controller Endpoint**
- Add `GET /v1/sessions/:id/summary` to `SessionsController`
- Use JWT guard
- Return `SessionEndReadModel`

**Step 6: Test**
- Test with finalized sessions
- Test with old sessions (missing analytics)
- Test with freeplay sessions
- Test with mission sessions
- Verify all defaults work

**Step 7: Documentation**
- Document normalization rules
- Document default values
- Document field mappings

### 10.6 Risk Mitigation

**Risk:** Breaking existing endpoints  
**Mitigation:** New endpoint only, no changes to existing code

**Risk:** Performance (multiple joins)  
**Mitigation:** Use Prisma `include` for efficient queries, cache if needed

**Risk:** Missing data in old sessions  
**Mitigation:** Comprehensive defaults, compute on-demand where possible

**Risk:** Type safety  
**Mitigation:** Strict TypeScript interfaces, runtime validation

---

## SUMMARY

### Current State
- ✅ Session finalization works correctly
- ✅ No double-counting detected
- ✅ Analytics data persisted correctly
- ⚠️ Fragmented read paths (multiple endpoints)
- ⚠️ JSON blob dependencies
- ⚠️ Inconsistent field names

### Proposed Solution
- ✅ Unified `SessionEndReadModel` interface
- ✅ Single endpoint: `GET /v1/sessions/:id/summary`
- ✅ Comprehensive normalization rules
- ✅ Safe defaults for all fields
- ✅ Backward compatible (existing endpoints unchanged)

### Next Steps
1. Review this SCOUT report
2. Approve `SessionEndReadModel` design
3. Implement builder + normalizer
4. Add controller endpoint
5. Test with various session types
6. Document for Step 6

---

**END OF SCOUT REPORT**

