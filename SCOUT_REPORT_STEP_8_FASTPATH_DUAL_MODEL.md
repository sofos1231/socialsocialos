# SCOUT REPORT: Step 8 — FastPath, Dual-Model, Micro-Interactions

**Date:** 2025-01-15  
**Mode:** SCOUT ONLY — NO CODE CHANGES  
**Scope:** Complete audit + implementation plan for Step 8: FastPath mission chat, dual-model AI engine, and low-latency / high-feedback UX

---

## EXECUTIVE SUMMARY

This report provides a complete, high-resolution audit and implementation plan for Step 8, which aims to reduce per-message latency from ~15 seconds to 1–3 seconds by introducing a three-layer runtime architecture: FastPath chat loop (mini model), Deep Analyzer worker (heavy model, async), and Mission End Finalizer (ensures analytics ready by mission end).

**Key Findings:**
- **Current latency bottleneck:** All operations (AI reply generation, scoring, analytics) run synchronously on the hot path
- **No async infrastructure:** No queue/worker system exists; all processing is request-response
- **Single model usage:** Currently uses `gpt-4o-mini` (or configurable via `aiRuntimeProfile`), but no distinction between "mini" and "heavy" models
- **Analytics computed at mission end:** Deep analytics (mood timeline, traits, gates, insights) are computed synchronously in `createScoredSessionFromScores()` when mission finalizes
- **No micro-interaction signals:** Current response DTOs don't include `uiEventHint`, `microFlags`, or per-message mood/score deltas for real-time UX feedback
- **No "last analyzed index" tracking:** System doesn't track which messages have been deep-analyzed vs. which are pending

**Architecture Gaps:**
1. FastPath boundary not defined — all logic runs synchronously
2. No DEEP_ANALYSIS job queue or worker infrastructure
3. No model tier routing (mini vs. heavy)
4. No incremental mood/score state machine for FastPath
5. Response DTOs lack micro-interaction fields
6. No observability hooks for latency/queue metrics

---

## PART 1: CURRENT MISSION CHAT PIPELINE MAPPING

### 1.1 Send Message Flow (Current State)

**HTTP Endpoint:**
- `POST /v1/practice/session` (`PracticeController.session()`)

**Call Chain:**

```
1. PracticeController.session()
   └─> PracticeService.runPracticeSession(userId, dto)
       │
       ├─> [VALIDATION] Session continuation check, template/persona validation
       ├─> [STATE BUILD] Load existing transcript, scores, missionStateV1
       ├─> [MISSION STATE] computeMissionState(), computeEndReason()
       │
       ├─> [AI CALL] aiChat.generateReply()
       │   └─> AiChatService.generateReply()
       │       ├─> Build system prompt (complex, includes mission config, state, persona)
       │       ├─> OpenAiClient.createChatCompletion()
       │       │   └─> Single AI call (model from aiRuntimeProfile or default 'gpt-4o-mini')
       │       └─> Returns: { aiReply, aiStructured, aiDebug, errorCode }
       │
       ├─> [SCORING] aiScoring.scoreConversation()
       │   └─> AiScoringService.scoreConversation()
       │       └─> AiScoringService.scoreSession()
       │           ├─> For each message: buildBaseScore() (deterministic, no AI)
       │           └─> Returns: { mode, perMessage[], premiumSessionAnalysis? }
       │
       ├─> [MISSION STATE UPDATE] missionStateService.updateMissionState()
       │   ├─> Updates mood, tension, comfort, progressPct
       │   ├─> Evaluates gates (gatesService.evaluateGatesForActiveSession)
       │   ├─> Computes micro-dynamics
       │   └─> Computes persona stability & modifiers
       │
       ├─> [CORE SCORING] aiCore.scoreSession() (for Option B metrics)
       │   └─> AiCoreScoringService.scoreSession()
       │       └─> Deterministic evaluation (no AI calls)
       │
       └─> [PERSISTENCE] sessions.createScoredSessionFromScores()
           └─> SessionsService.createScoredSessionFromScores()
               ├─> saveOrUpdateScoredSession() (DB write)
               └─> [IF FINALIZED] Analytics computation (synchronous):
                   ├─> moodService.buildAndPersistForSession()
                   ├─> traitsService.persistTraitHistoryAndUpdateScores()
                   ├─> gatesService.evaluateAndPersist()
                   ├─> promptsService.matchAndTriggerHooksForSession()
                   ├─> insightsService.buildAndPersistForSession()
                   ├─> synergyService.computeAndPersistSynergy()
                   └─> categoryStatsService.updateCategoryStats()
```

**Latency Contributors (Synchronous Operations):**

| Operation | Type | Estimated Latency | Notes |
|-----------|------|------------------|-------|
| AI reply generation | AI call | ~3-8s | Single OpenAI API call, model varies by config |
| Scoring (deterministic) | CPU | ~50-200ms | No AI, but processes all messages |
| Mission state update | CPU | ~100-300ms | Gate evaluation, mood computation, micro-dynamics |
| Core scoring (Option B) | CPU | ~100-200ms | Deterministic trait evaluation |
| DB write (session) | DB | ~50-150ms | Single transaction |
| **Analytics (if finalized)** | **Mixed** | **~5-10s** | **Mood timeline, traits, gates, insights — ALL SYNCHRONOUS** |

**Total Estimated Latency:** ~10-15 seconds per message (when mission ends, analytics add 5-10s)

**Key Observations:**
- **One AI call per message** (for reply generation)
- **No async processing** — everything blocks the HTTP response
- **Analytics only computed at mission end** — but still synchronous, blocking the response
- **Full transcript re-scored** on every message (even for continuations, delta scoring exists but still processes all messages)

### 1.2 Mission End Flow (Current State)

**HTTP Endpoint:**
- `GET /v1/sessions/:id/summary` (`SessionsController.getSessionSummary()`)
- Alternative: `GET /v1/sessions/:id` (returns `SessionDTO`)

**Call Chain:**

```
1. SessionsController.getSessionSummary()
   └─> SessionsService.getSessionEndReadModel(userId, sessionId)
       └─> SessionEndReadModelBuilder.buildForSession(sessionId, userId)
           ├─> [DB READS] Load session, messages, template, persona, analytics tables
           ├─> [AGGREGATION] Compute:
           │   ├─> Category summary (from CategoryStats)
           │   ├─> Persona memory (from session payload)
           │   ├─> Final scores (from PracticeSession)
           │   ├─> Score breakdown (from PracticeSession columns)
           │   ├─> Rewards (from PracticeSession)
           │   ├─> Mission outcome (from status)
           │   ├─> Gate results (from GateOutcome table)
           │   ├─> Trait summary (from UserTraitHistory)
           │   ├─> Mood summary (from MissionMoodTimeline)
           │   └─> Key messages (computed from messages + scores)
           └─> Returns: SessionEndReadModel
```

**Current Behavior:**
- Analytics are **already computed** by the time this endpoint is called (computed synchronously in `createScoredSessionFromScores()` when mission ended)
- No "waiting for analysis" logic — assumes analytics are ready
- If analytics are missing (e.g., old sessions), builder returns safe defaults

**Gap:** No mechanism to check if analytics are complete or to trigger priority analysis if missing.

---

## PART 2: LATENCY & COMPLEXITY ANALYSIS (CURRENT STATE)

### 2.1 Hot Path Operations (Per Message)

**AI-Heavy Operations:**
1. **AI Reply Generation** (`aiChat.generateReply()`)
   - **Location:** `backend/src/modules/ai/providers/ai-chat.service.ts:107-325`
   - **Latency:** ~3-8 seconds (depends on model, prompt length, token count)
   - **Blocking:** Yes — blocks HTTP response
   - **Optimization potential:** Can use faster mini model, but still blocks

**DB-Heavy Operations:**
1. **Session Load** (continuation check)
   - **Location:** `practice.service.ts:592-606`
   - **Latency:** ~50-150ms
   - **Blocking:** Yes
   - **Optimization potential:** Minimal — necessary for state

2. **Session Persistence** (`saveOrUpdateScoredSession()`)
   - **Location:** `sessions.service.ts:198-663`
   - **Latency:** ~50-200ms (transaction with multiple writes)
   - **Blocking:** Yes
   - **Optimization potential:** Can be async for non-finalized sessions

**CPU-Heavy Operations:**
1. **Scoring** (`aiScoring.scoreConversation()`)
   - **Location:** `ai-scoring.service.ts:78-109`
   - **Latency:** ~50-200ms (deterministic, but processes all messages)
   - **Blocking:** Yes
   - **Optimization potential:** Can be incremental (only score new messages)

2. **Mission State Update** (`missionStateService.updateMissionState()`)
   - **Location:** `practice.service.ts:1189-1363`
   - **Latency:** ~100-300ms (gate evaluation, mood computation, micro-dynamics)
   - **Blocking:** Yes
   - **Optimization potential:** Can be incremental state machine

3. **Core Scoring (Option B)** (`aiCore.scoreSession()`)
   - **Location:** `ai-core-scoring.service.ts:23-65`
   - **Latency:** ~100-200ms (deterministic trait evaluation)
   - **Blocking:** Yes
   - **Optimization potential:** Can be async (not needed for FastPath)

### 2.2 Analytics Computation (Mission End Only, But Synchronous)

**Operations in `createScoredSessionFromScores()` when `didFinalize === true`:**

1. **Mood Timeline** (`moodService.buildAndPersistForSession()`)
   - **Location:** `sessions.service.ts:779-783`
   - **Latency:** ~500ms-2s (reads all messages, computes mood snapshots)
   - **Blocking:** Yes — blocks mission end response

2. **Trait History** (`traitsService.persistTraitHistoryAndUpdateScores()`)
   - **Location:** `sessions.service.ts:786-790`
   - **Latency:** ~300ms-1s (computes trait deltas, updates long-term scores)
   - **Blocking:** Yes

3. **Gate Outcomes** (`gatesService.evaluateAndPersist()`)
   - **Location:** `sessions.service.ts:793-797`
   - **Latency:** ~200ms-500ms (evaluates all gates)
   - **Blocking:** Yes

4. **Prompt Hooks** (`promptsService.matchAndTriggerHooksForSession()`)
   - **Location:** `sessions.service.ts:800-804`
   - **Latency:** ~200ms-500ms (matches hooks, triggers)
   - **Blocking:** Yes

5. **Deep Insights** (`insightsService.buildAndPersistForSession()`)
   - **Location:** `sessions.service.ts:808-812`
   - **Latency:** ~1-3s (builds insights from all signals)
   - **Blocking:** Yes

6. **Synergy Computation** (`synergyService.computeAndPersistSynergy()`)
   - **Location:** `sessions.service.ts:815-819`
   - **Latency:** ~300ms-1s
   - **Blocking:** Yes

**Total Analytics Latency:** ~2.5-8.5 seconds (all synchronous, blocking mission end)

### 2.3 Root Cause Analysis

**Why ~15s latency per message?**

1. **AI Reply Generation** (~3-8s) — Necessary, but can use faster model
2. **Scoring** (~50-200ms) — Deterministic, but processes all messages
3. **Mission State Update** (~100-300ms) — Complex logic, but can be incremental
4. **Core Scoring** (~100-200ms) — Not needed for FastPath
5. **Analytics (if finalized)** (~5-10s) — **MAJOR BOTTLENECK** — Should be async

**Fundamental Architecture Issue:**
- Everything runs synchronously on the hot path
- No separation between "must-have for reply" and "nice-to-have for analytics"
- Analytics computed at mission end, but still blocks the response
- No incremental processing — full re-computation on every message

---

## PART 3: GAP ANALYSIS vs TARGET ARCHITECTURE

### 3.1 Gap Table

| Component | Current State | Target State | Gaps | Risks |
|-----------|---------------|--------------|------|-------|
| **FastPath Chat Loop** | All logic synchronous in `runPracticeSession()` | Mini model only, structured JSON response with mood/score deltas, incremental state machine | 1. No mini model distinction<br>2. No structured JSON from AI (only `aiStructured` for reply text)<br>3. No incremental mood/score state machine<br>4. No `uiEventHint` or `microFlags` in response | 1. Breaking change if response DTO changes<br>2. Mini model may not support structured JSON well<br>3. State machine must be deterministic |
| **Deep Analyzer Worker** | Analytics computed synchronously in `createScoredSessionFromScores()` | Background worker consumes DEEP_ANALYSIS jobs, uses heavy model, persists to existing tables | 1. No queue infrastructure (Bull, Redis, etc.)<br>2. No worker module<br>3. No job payload structure<br>4. No "last analyzed index" tracking | 1. Queue backlog if worker can't keep up<br>2. Race conditions if multiple workers<br>3. Job failures need retry logic |
| **Mission End Finalizer** | Analytics computed synchronously, no wait logic | Checks `lastAnalyzedMessageIndex`, enqueues priority job if needed, bounded wait (~500-1000ms) | 1. No "last analyzed index" field in DB<br>2. No priority job mechanism<br>3. No bounded wait logic | 1. User still waits if analytics not ready<br>2. Priority jobs may starve regular queue |
| **Model Routing** | Single model via `aiRuntimeProfile.model` or default `gpt-4o-mini` | Clear service/config defines mini vs. heavy, routes FastPath → mini, Deep Analyzer → heavy | 1. No model tier service<br>2. No routing logic<br>3. No config for mini/heavy models | 1. Cost increase if heavy model used for FastPath<br>2. Mini model may not support structured JSON |
| **UX Contract (Micro-Interactions)** | Response DTO includes `aiReply`, `missionState`, `rewards`, but no micro-interaction fields | Response includes `currentMood`, `localScoreTier`, `uiEventHint`, `microFlags`, `moodDelta`, etc. | 1. Response DTO missing micro-interaction fields<br>2. No logic to compute `uiEventHint` from score/flags<br>3. No "rarity" computation for score tiers | 1. Frontend must be updated to consume new fields<br>2. Backward compatibility if old clients don't expect these fields |
| **Observability** | No metrics infrastructure | Hook points for latency, queue depth, error tracking | 1. No metrics service<br>2. No hook points defined<br>3. No error tracking | 1. Can't monitor FastPath latency in production<br>2. Can't detect queue backlog |

### 3.2 Detailed Gap Analysis

#### 3.2.1 FastPath Chat Loop

**Current State:**
- Endpoint: `POST /v1/practice/session`
- AI call: Single call to OpenAI (model from config or default)
- Response: `PracticeSessionResponsePublic` with `aiReply`, `missionState`, `rewards`, `messages`
- Mood/Score: Computed in `updateMissionState()`, but not returned as deltas
- No structured JSON from AI for tags/flags (only `aiStructured.replyText`)

**Target State:**
- Endpoint: Same (`POST /v1/practice/session`) or new FastPath-specific endpoint
- AI call: **One call to mini model**, must return structured JSON:
  ```json
  {
    "reply": "AI reply text...",
    "localScoreTier": "S|A|B|C|D",
    "localScoreNumeric": 0.0,
    "moodDelta": "up|down|stable",
    "tensionDelta": "up|down|stable",
    "comfortDelta": "up|down|stable",
    "boundaryRisk": "low|med|high",
    "microFlags": ["playful", "teasing", "needy", "brilliant"],
    "uiEventHint": "celebration|warning|neutral"
  }
  ```
- Response: Enhanced DTO with `currentMood`, `localScoreTier`, `uiEventHint`, `microFlags`
- Mood/Score: Incremental state machine updates `currentMood` and running score snapshot
- Enqueue: DEEP_ANALYSIS job dispatched after FastPath response sent

**Gaps:**
1. **No mini model distinction** — Need to define "mini" vs. "heavy" models
2. **AI doesn't return structured JSON for tags** — Currently only returns `replyText` in structured mode
3. **No incremental mood state machine** — `updateMissionState()` recomputes from scratch
4. **No `uiEventHint` computation** — Need logic to map score/flags → hint
5. **Response DTO missing fields** — Need to add micro-interaction fields

#### 3.2.2 Deep Analyzer Worker

**Current State:**
- Analytics computed synchronously in `createScoredSessionFromScores()` when `didFinalize === true`
- No queue infrastructure
- No worker process
- Analytics always computed from scratch (no "last analyzed index")

**Target State:**
- Background worker consumes DEEP_ANALYSIS jobs from queue
- Job payload: `{ traceId, missionId, sessionId, lastMessageIndex, fastTags }`
- Worker fetches trace, missionConfigV1, existing analytics
- Calls heavy model for full trace or deltas
- Computes/refines: 5-layer scores, MoodTimeline, GateOutcome, TraitHistory, Deep Insights
- Persists to existing Step 5–6 tables
- Updates "last analyzed index" in session metadata

**Gaps:**
1. **No queue infrastructure** — Need to add Bull/BullMQ or similar
2. **No worker module** — Need to create worker service
3. **No job payload structure** — Need to define DEEP_ANALYSIS job type
4. **No "last analyzed index" tracking** — Need to add field to `PracticeSession.payload` or new table
5. **No batching logic** — Should batch per mission/session when possible

#### 3.2.3 Mission End Finalizer

**Current State:**
- `GET /v1/sessions/:id/summary` assumes analytics are ready
- No wait logic
- No priority job mechanism

**Target State:**
- Endpoint checks `lastAnalyzedMessageIndex` vs. `lastMessageIndex`
- If not complete: enqueue priority DEEP_ANALYSIS job, wait up to ~500-1000ms
- Then read final aggregated analytics, return `SessionEndReadModel`

**Gaps:**
1. **No "last analyzed index" field** — Need to track in DB
2. **No priority job mechanism** — Need priority queue or job priority field
3. **No bounded wait logic** — Need timeout/retry logic

#### 3.2.4 Model Routing

**Current State:**
- Model selection: `aiRuntimeProfile.model` from mission config, or default `gpt-4o-mini`
- Single model used for all AI calls
- No distinction between "mini" and "heavy"

**Target State:**
- Model tier service defines:
  - Mini model: `gpt-4o-mini` (or configurable)
  - Heavy model: `gpt-4o` or `gpt-4-turbo` (or configurable)
  - Optional hero tier: Future (e.g., `gpt-4` for S/S+ moments)
- Routing:
  - FastPath → always mini
  - Deep Analyzer → heavy
  - Mission summary → heavy

**Gaps:**
1. **No model tier service** — Need `ModelTierService` or config
2. **No routing logic** — Need to inject model selection into `AiChatService`
3. **No config for mini/heavy models** — Need environment variables or DB config

#### 3.2.5 UX Contract (Micro-Interactions)

**Current State:**
- Response DTO (`PracticeSessionResponsePublic`) includes:
  - `aiReply` (string)
  - `missionState` (status, progressPct, averageScore, etc.)
  - `rewards` (score, xpGained, coinsGained, etc.)
  - `messages` (array with scores)
- No micro-interaction fields

**Target State:**
- Response DTO should include:
  - `currentMood` (string/enum) — for avatar expression
  - `localScoreTier` (S/A/B/C/D) — for glow/confetti
  - `localScoreRarity` (common/rare/epic) — for animation intensity
  - `uiEventHint` (celebration/warning/neutral) — for animation trigger
  - `microFlags` (string[]) — for tooltips/hints
  - `moodDelta`, `tensionDelta`, `comfortDelta` — for subtle feedback

**Gaps:**
1. **Response DTO missing fields** — Need to extend `PracticeSessionResponsePublic`
2. **No `uiEventHint` computation** — Need logic: `score >= 90 && flags.includes('brilliant')` → `celebration`
3. **No rarity computation** — Need to map score tier → rarity (S+ = epic, S = rare, A = common, etc.)

#### 3.2.6 Observability

**Current State:**
- No metrics infrastructure
- No latency tracking
- No queue depth monitoring
- No error tracking for analytics

**Target State:**
- Hook points for:
  - FastPath latency (HTTP entry → reply build)
  - Deep Analyzer job processing time
  - Queue depth per mission/session
  - AI provider errors
  - Queue processing errors
  - DB failures for analytics

**Gaps:**
1. **No metrics service** — Need Prometheus/StatsD or similar
2. **No hook points defined** — Need to identify exact methods to instrument
3. **No error tracking** — Need structured error logging

---

## PART 4: CONCRETE STEP 8 IMPLEMENTATION PLAN (PHASED, NO CODE)

### Phase 1: Define FastPath Boundary

**Objective:** Identify which endpoint(s) and methods will be considered FastPath, and extract deterministic logic into reusable services.

**Tasks:**

1. **FastPath Endpoint Decision**
   - **Option A:** Keep `POST /v1/practice/session` as FastPath (backward compatible)
   - **Option B:** Create new `POST /v1/practice/fastpath` endpoint (cleaner separation)
   - **Recommendation:** Option A (backward compatible, gradual migration)

2. **Extract Mood State Machine**
   - **Location:** Create `backend/src/modules/mission-state/mood-state-machine.service.ts`
   - **Method:** `updateMood(currentMood: string, deltas: { moodDelta, tensionDelta, comfortDelta }, flags: string[]): string`
   - **Logic:** Deterministic state machine that updates mood based on deltas and flags
   - **Source:** Extract from `missionStateService.updateMissionState()` mood computation logic

3. **Extract Score Accumulator**
   - **Location:** Create `backend/src/modules/ai/score-accumulator.service.ts`
   - **Method:** `updateRunningScore(currentSnapshot: ScoreSnapshot, localScore: number, tier: string): ScoreSnapshot`
   - **Logic:** Incremental score accumulation (cumulative numeric, counts per tier, lastScoreTier)
   - **Source:** Extract from `updateMissionState()` score computation

4. **Define FastPath Response DTO**
   - **Location:** `backend/src/modules/practice/dto/fastpath-response.dto.ts`
   - **Fields:**
     ```typescript
     {
       aiReply: string;
       currentMood: string;
       localScoreTier: 'S' | 'A' | 'B' | 'C' | 'D';
       localScoreNumeric: number;
       localScoreRarity: 'common' | 'rare' | 'epic';
       uiEventHint: 'celebration' | 'warning' | 'neutral';
       microFlags: string[];
       moodDelta: 'up' | 'down' | 'stable';
       tensionDelta: 'up' | 'down' | 'stable';
       comfortDelta: 'up' | 'down' | 'stable';
       boundaryRisk: 'low' | 'med' | 'high';
       sessionId: string;
       turnIndex: number;
     }
     ```

5. **Identify FastPath Methods**
   - **Must be in FastPath:**
     - `aiChat.generateReply()` (mini model only)
     - `moodStateMachine.updateMood()` (deterministic)
     - `scoreAccumulator.updateRunningScore()` (deterministic)
     - `sessions.saveOrUpdateScoredSession()` (DB write, but can be async for non-finalized)
   - **Must NOT be in FastPath:**
     - `aiCore.scoreSession()` (Option B metrics, not needed for reply)
     - `gatesService.evaluateGatesForActiveSession()` (can be async)
     - `microDynamicsService.computeMicroDynamics()` (can be async)
     - `personaDriftService.computePersonaStability()` (can be async)
     - All analytics services (mood timeline, traits, gates, insights)

**Deliverables:**
- `MoodStateMachineService` with deterministic `updateMood()` method
- `ScoreAccumulatorService` with incremental `updateRunningScore()` method
- `FastPathResponseDto` type definition
- Documented list of methods that must/should not be in FastPath

**Risks:**
- Mood state machine must be deterministic (no randomness)
- Score accumulator must match final analytics (no drift)
- Response DTO changes may break existing clients (mitigation: make new fields optional initially)

### Phase 2: Introduce DEEP_ANALYSIS Jobs & Worker

**Objective:** Create queue infrastructure, job payload structure, and worker that processes DEEP_ANALYSIS jobs asynchronously.

**Tasks:**

1. **Add Queue Infrastructure**
   - **Option A:** BullMQ (Redis-based, recommended for NestJS)
   - **Option B:** Bull (older, but still maintained)
   - **Recommendation:** BullMQ (modern, better TypeScript support)
   - **Dependencies:** `@nestjs/bullmq`, `bullmq`, `ioredis`
   - **Location:** `backend/src/modules/queue/` (new module)

2. **Define DEEP_ANALYSIS Job Payload**
   - **Location:** `backend/src/modules/queue/jobs/deep-analysis.job.ts`
   - **Structure:**
     ```typescript
     interface DeepAnalysisJobPayload {
       traceId: string; // AI call trace ID
       missionId: string | null; // templateId or 'freeplay'
       sessionId: string;
       userId: string;
       lastMessageIndex: number; // Last message index in trace
       fastTags: {
         localScoreTier: string;
         moodDelta: string;
         tensionDelta: string;
         comfortDelta: string;
         boundaryRisk: string;
         microFlags: string[];
       };
       timestamp: string; // ISO timestamp
     }
     ```

3. **Create Worker Module**
   - **Location:** `backend/src/modules/queue/workers/deep-analysis.worker.ts`
   - **Class:** `DeepAnalysisWorker`
   - **Method:** `process(job: Job<DeepAnalysisJobPayload>): Promise<void>`
   - **Logic:**
     1. Fetch trace from DB (or reconstruct from session messages)
     2. Fetch missionConfigV1 from session payload or template
     3. Fetch existing analytics (mood timeline, traits, gates, insights)
     4. Call heavy model for full trace analysis (or delta analysis if `lastAnalyzedMessageIndex` exists)
     5. Compute/refine:
        - 5-layer scores (via `aiScoring.scoreSession()` with heavy model)
        - Mood timeline (via `moodService.buildAndPersistForSession()`)
        - Gate outcomes (via `gatesService.evaluateAndPersist()`)
        - Trait history (via `traitsService.persistTraitHistoryAndUpdateScores()`)
        - Deep insights (via `insightsService.buildAndPersistForSession()`)
     6. Update `lastAnalyzedMessageIndex` in session metadata
     7. Handle errors gracefully (log, don't crash worker)

4. **Register Queue & Worker**
   - **Location:** `backend/src/modules/queue/queue.module.ts`
   - **Queue Name:** `'deep-analysis'`
   - **Worker:** Register `DeepAnalysisWorker` as processor
   - **Config:** Concurrency (e.g., 3 workers), retry attempts (3), backoff strategy

5. **Dispatch Jobs from FastPath**
   - **Location:** `practice.service.ts` (in `runPracticeSession()`)
   - **Method:** After FastPath response is built, before returning:
     ```typescript
     await this.deepAnalysisQueue.add('deep-analysis', {
       traceId: aiCallSnapshot.id,
       missionId: templateId ?? 'freeplay',
       sessionId: usedSessionId,
       userId,
       lastMessageIndex: fullTranscript.length - 1,
       fastTags: {
         localScoreTier: fastPathResponse.localScoreTier,
         moodDelta: fastPathResponse.moodDelta,
         tensionDelta: fastPathResponse.tensionDelta,
         comfortDelta: fastPathResponse.comfortDelta,
         boundaryRisk: fastPathResponse.boundaryRisk,
         microFlags: fastPathResponse.microFlags,
       },
       timestamp: new Date().toISOString(),
     });
     ```

6. **Add "Last Analyzed Index" Tracking**
   - **Location:** `PracticeSession.payload` (JSON field)
   - **Field:** `payload.deepAnalysisMetadata.lastAnalyzedMessageIndex: number | null`
   - **Update:** Worker updates this field after successful analysis

7. **Avoid Race Conditions**
   - **Strategy:** Use job deduplication (BullMQ `jobId` based on `sessionId:lastMessageIndex`)
   - **Alternative:** Check `lastAnalyzedMessageIndex` in worker before processing (skip if already analyzed)

**Deliverables:**
- Queue module with BullMQ setup
- `DeepAnalysisJobPayload` type definition
- `DeepAnalysisWorker` class with full processing logic
- Job dispatch in FastPath
- "Last analyzed index" tracking in session metadata

**Risks:**
- Queue backlog if worker can't keep up (mitigation: monitor queue depth, scale workers)
- Race conditions if multiple workers process same job (mitigation: job deduplication)
- Job failures need retry logic (mitigation: BullMQ retry config)
- Heavy model costs (mitigation: batch jobs per session when possible)

### Phase 3: Mission End Finalizer

**Objective:** Ensure analytics are ready by mission end without long "please wait" pauses.

**Tasks:**

1. **Enhance Mission End Endpoint**
   - **Location:** `sessions.service.ts:getSessionEndReadModel()`
   - **Logic:**
     ```typescript
     async getSessionEndReadModel(userId: string, sessionId: string): Promise<SessionEndReadModel> {
       // 1. Load session
       const session = await this.prisma.practiceSession.findUnique({ ... });
       
       // 2. Check analytics completeness
       const lastMessageIndex = session.messageCount - 1;
       const lastAnalyzedIndex = session.payload?.deepAnalysisMetadata?.lastAnalyzedMessageIndex ?? -1;
       
       // 3. If not complete, enqueue priority job and wait
       if (lastAnalyzedIndex < lastMessageIndex) {
         await this.deepAnalysisQueue.add('deep-analysis', {
           ...jobPayload,
           priority: 10, // Higher priority
         }, {
           jobId: `priority:${sessionId}:${lastMessageIndex}`, // Deduplication
         });
         
         // Wait up to 1000ms for analysis to complete
         const startTime = Date.now();
         const maxWaitMs = 1000;
         while (Date.now() - startTime < maxWaitMs) {
           await new Promise(resolve => setTimeout(resolve, 100)); // Poll every 100ms
           const updated = await this.prisma.practiceSession.findUnique({ ... });
           const updatedAnalyzedIndex = updated.payload?.deepAnalysisMetadata?.lastAnalyzedMessageIndex ?? -1;
           if (updatedAnalyzedIndex >= lastMessageIndex) {
             break; // Analysis complete
           }
         }
       }
       
       // 4. Build and return SessionEndReadModel
       return this.sessionEndReadModelBuilder.buildForSession(sessionId, userId);
     }
     ```

2. **Add Priority Job Support**
   - **Location:** BullMQ queue config
   - **Config:** Enable priority queue (BullMQ supports `priority` field in job data)
   - **Strategy:** Priority jobs (priority > 0) processed before regular jobs

3. **Handle Timeout Gracefully**
   - **Strategy:** If analysis not complete after maxWaitMs, return `SessionEndReadModel` with available data (may have stale analytics, but doesn't block user)
   - **Fallback:** Show "analysis in progress" indicator in frontend if `lastAnalyzedIndex < lastMessageIndex`

**Deliverables:**
- Enhanced `getSessionEndReadModel()` with bounded wait logic
- Priority job support in queue config
- Timeout handling with graceful degradation

**Risks:**
- User still waits up to 1s if analytics not ready (mitigation: worker should usually keep up)
- Priority jobs may starve regular queue (mitigation: limit priority job rate)
- Stale analytics if timeout (mitigation: frontend can show "refreshing..." indicator)

### Phase 4: Model Tier Routing

**Objective:** Define mini vs. heavy models and route them correctly.

**Tasks:**

1. **Create Model Tier Service**
   - **Location:** `backend/src/modules/ai/model-tier.service.ts`
   - **Class:** `ModelTierService`
   - **Methods:**
     ```typescript
     getMiniModel(): string {
       return process.env.AI_MODEL_MINI || 'gpt-4o-mini';
     }
     
     getHeavyModel(): string {
       return process.env.AI_MODEL_HEAVY || 'gpt-4o';
     }
     
     getHeroModel(): string | null {
       return process.env.AI_MODEL_HERO || null; // Future
     }
     
     getModelForTier(tier: 'mini' | 'heavy' | 'hero'): string {
       switch (tier) {
         case 'mini': return this.getMiniModel();
         case 'heavy': return this.getHeavyModel();
         case 'hero': return this.getHeroModel() ?? this.getHeavyModel();
       }
     }
     ```

2. **Update AiChatService to Accept Model Tier**
   - **Location:** `ai-chat.service.ts:generateReply()`
   - **Parameter:** Add optional `modelTier?: 'mini' | 'heavy' | 'hero'`
   - **Logic:** If `modelTier` provided, use `modelTierService.getModelForTier(modelTier)` instead of `aiRuntimeProfile.model`

3. **Route FastPath to Mini Model**
   - **Location:** `practice.service.ts:runPracticeSession()`
   - **Change:** Call `aiChat.generateReply({ ..., modelTier: 'mini' })`

4. **Route Deep Analyzer to Heavy Model**
   - **Location:** `deep-analysis.worker.ts`
   - **Change:** When calling AI for analysis, use `modelTier: 'heavy'`

5. **Route Mission Summary to Heavy Model**
   - **Location:** If mission summary needs AI (currently doesn't, but future-proof)
   - **Change:** Use `modelTier: 'heavy'`

6. **Environment Variables**
   - **Add:**
     - `AI_MODEL_MINI=gpt-4o-mini` (default)
     - `AI_MODEL_HEAVY=gpt-4o` (default)
     - `AI_MODEL_HERO=` (optional, future)

**Deliverables:**
- `ModelTierService` with mini/heavy/hero model selection
- Updated `AiChatService` to accept `modelTier` parameter
- FastPath uses mini model
- Deep Analyzer uses heavy model
- Environment variables for model configuration

**Risks:**
- Mini model may not support structured JSON well (mitigation: test with `gpt-4o-mini`, fallback to parsing text if needed)
- Cost increase if heavy model used incorrectly (mitigation: strict routing, monitoring)
- Model availability (mitigation: fallback to mini if heavy model unavailable)

### Phase 5: UX Contract & Micro-Interactions

**Objective:** Enhance response DTOs with micro-interaction fields and compute them in the pipeline.

**Tasks:**

1. **Extend FastPath Response DTO**
   - **Location:** `backend/src/modules/practice/dto/fastpath-response.dto.ts` (from Phase 1)
   - **Fields:** Already defined in Phase 1, but ensure all are included

2. **Compute `uiEventHint`**
   - **Location:** `practice.service.ts` (in FastPath response building)
   - **Logic:**
     ```typescript
     function computeUiEventHint(localScoreTier: string, microFlags: string[], boundaryRisk: string): 'celebration' | 'warning' | 'neutral' {
       // Celebration: S/S+ tier OR brilliant flag
       if (localScoreTier === 'S' || localScoreTier === 'S+' || microFlags.includes('brilliant')) {
         return 'celebration';
       }
       // Warning: High boundary risk OR needy flag
       if (boundaryRisk === 'high' || microFlags.includes('needy')) {
         return 'warning';
       }
       return 'neutral';
     }
     ```

3. **Compute `localScoreRarity`**
   - **Location:** `practice.service.ts`
   - **Logic:**
     ```typescript
     function computeRarity(tier: string): 'common' | 'rare' | 'epic' {
       if (tier === 'S+' || tier === 'S') return 'epic';
       if (tier === 'A') return 'rare';
       return 'common';
     }
     ```

4. **Extract Mood/Tension/Comfort Deltas from AI Response**
   - **Location:** `practice.service.ts` (after AI call)
   - **Logic:** Parse structured JSON from AI response (from Phase 1), extract `moodDelta`, `tensionDelta`, `comfortDelta`

5. **Update Response Serializer**
   - **Location:** `backend/src/modules/shared/serializers/api-serializers.ts`
   - **Method:** `toPracticeSessionResponsePublic()` (or new `toFastPathResponsePublic()`)
   - **Change:** Include all micro-interaction fields in allowlist

6. **Ensure Graceful Degradation**
   - **Strategy:** If Deep Analyzer is down, FastPath still works (mood/score from FastPath, analytics may be stale)
   - **Fallback:** If AI doesn't return structured JSON, use defaults:
     - `moodDelta: 'stable'`
     - `tensionDelta: 'stable'`
     - `comfortDelta: 'stable'`
     - `boundaryRisk: 'low'`
     - `microFlags: []`
     - `uiEventHint: 'neutral'`

**Deliverables:**
- Extended FastPath response DTO with all micro-interaction fields
- `computeUiEventHint()` function
- `computeRarity()` function
- Structured JSON parsing from AI response
- Updated response serializer
- Graceful degradation logic

**Risks:**
- Frontend must be updated to consume new fields (mitigation: make fields optional initially)
- AI may not return structured JSON reliably (mitigation: fallback to defaults)
- Backward compatibility if old clients don't expect these fields (mitigation: optional fields, old clients ignore)

### Phase 6: Observability Hook Points

**Objective:** Define exact methods/functions where metrics should be hooked (not implemented now, but architecture ready).

**Tasks:**

1. **FastPath Latency Metrics**
   - **Hook Point 1:** `PracticeController.session()` — Start timer at HTTP entry
   - **Hook Point 2:** `PracticeService.runPracticeSession()` — Stop timer after FastPath response built (before returning)
   - **Metric Name:** `fastpath_latency_ms` (histogram)
   - **Tags:** `{ endpoint: 'practice/session', userId, missionId }`

2. **Deep Analyzer Metrics**
   - **Hook Point 1:** `DeepAnalysisWorker.process()` — Start timer at job start
   - **Hook Point 2:** `DeepAnalysisWorker.process()` — Stop timer after analytics persisted
   - **Metric Name:** `deep_analyzer_processing_time_ms` (histogram)
   - **Tags:** `{ sessionId, missionId, jobId }`
   - **Queue Depth:** `deep_analysis_queue_depth` (gauge) — BullMQ provides this

3. **Error Tracking**
   - **Hook Point 1:** `AiChatService.generateReply()` — Catch AI provider errors
   - **Hook Point 2:** `DeepAnalysisWorker.process()` — Catch queue processing errors
   - **Hook Point 3:** `SessionsService.createScoredSessionFromScores()` — Catch DB failures for analytics
   - **Metric Name:** `ai_provider_errors_total` (counter), `queue_processing_errors_total` (counter), `analytics_db_errors_total` (counter)
   - **Tags:** `{ errorCode, sessionId, missionId }`

4. **Success vs. Error Rates**
   - **Hook Point:** All methods above
   - **Metric Name:** `fastpath_success_total`, `fastpath_errors_total`, `deep_analyzer_success_total`, `deep_analyzer_errors_total`

**Deliverables:**
- Documented hook points with exact method names and line numbers
- Metric names and tags defined
- Error tracking points identified

**Risks:**
- Metrics infrastructure not yet chosen (mitigation: use abstract metrics interface, implement later)
- Too many metrics may impact performance (mitigation: sample rates, async metric collection)

---

## PART 5: RISK & COMPATIBILITY SECTION

### 5.1 Performance Risks

1. **Heavy Worker Load**
   - **Risk:** Deep Analyzer worker may not keep up with user pace, causing backlog
   - **Mitigation:**
     - Scale workers horizontally (multiple worker processes)
     - Batch jobs per session when possible (reduce job count)
     - Monitor queue depth, alert if > 100 jobs
     - Use priority queue for mission end jobs

2. **Job Backlog**
   - **Risk:** Queue may accumulate jobs faster than workers can process
   - **Mitigation:**
     - Auto-scale workers based on queue depth
     - Implement job TTL (expire old jobs after 1 hour)
     - Skip duplicate jobs (deduplication by `sessionId:lastMessageIndex`)

3. **Mini Model Latency**
   - **Risk:** Mini model may still be slow (3-5s) if prompt is long
   - **Mitigation:**
     - Optimize prompt length (remove unnecessary context)
     - Use streaming responses (if supported by mini model)
     - Cache common responses (future optimization)

4. **DB Write Contention**
   - **Risk:** Multiple workers writing to same session may cause DB locks
   - **Mitigation:**
     - Use optimistic locking (version field in session)
     - Batch DB writes (single transaction per worker job)
     - Retry on lock timeout

### 5.2 Backwards Compatibility Risks

1. **Response DTO Changes**
   - **Risk:** Adding new fields to `PracticeSessionResponsePublic` may break old clients
   - **Mitigation:**
     - Make all new fields optional initially
     - Use API versioning (`/v1/practice/session` vs. `/v2/practice/session`)
     - Document breaking changes in changelog

2. **Behavior Changes**
   - **Risk:** FastPath may return different data than current synchronous flow
   - **Mitigation:**
     - Keep old endpoint available (`/v1/practice/session` with feature flag)
     - Gradual migration (frontend opts into FastPath via header)
     - A/B test FastPath vs. old flow

3. **Analytics Availability**
   - **Risk:** Analytics may not be ready immediately after mission end (async now)
   - **Mitigation:**
     - Mission End Finalizer ensures analytics ready (bounded wait)
     - Frontend can show "analyzing..." indicator if analytics stale
     - Fallback to cached analytics if worker fails

### 5.3 Interactions with Existing Systems

1. **Steps 5–7 Analytics**
   - **Status:** ✅ Compatible
   - **Reason:** Deep Analyzer uses existing services (`moodService`, `traitsService`, `gatesService`, `insightsService`), writes to same tables
   - **Change:** Analytics computed asynchronously instead of synchronously, but data model unchanged

2. **Dashboards (Step 7)**
   - **Status:** ✅ Compatible
   - **Reason:** Dashboards read from same analytics tables (`MissionMoodTimeline`, `UserTraitHistory`, `GateOutcome`, `MissionDeepInsights`)
   - **Change:** Dashboards may show "stale" data briefly (until worker processes), but eventually consistent

3. **AI Contracts (Step 6)**
   - **Status:** ✅ Compatible
   - **Reason:** FastPath uses same `aiRuntimeProfile` config, but overrides model to mini
   - **Change:** Mini model must support same prompt structure (may need prompt optimization)

4. **Session End Read Model (Step 5.13)**
   - **Status:** ⚠️ Requires Enhancement
   - **Reason:** `getSessionEndReadModel()` must check `lastAnalyzedMessageIndex` and wait if needed
   - **Change:** Add bounded wait logic (Phase 3)

### 5.4 Breaking Changes

**None identified** — All changes are additive and backward compatible:
- New fields in response DTO are optional
- Old endpoint behavior preserved (can be feature-flagged)
- Analytics tables unchanged
- No Prisma schema changes required (uses existing `payload` JSON field for metadata)

### 5.5 Migration Strategy

1. **Phase 1–2:** Implement FastPath and worker infrastructure (backend only, no frontend changes)
2. **Phase 3:** Add Mission End Finalizer (backend only)
3. **Phase 4:** Add model routing (backend only)
4. **Phase 5:** Add micro-interaction fields to response (backend + frontend opt-in)
5. **Phase 6:** Add observability hooks (backend only, metrics infrastructure later)

**Rollout:**
- Deploy backend with feature flag (`ENABLE_FASTPATH=true`)
- Frontend opts into FastPath via header (`X-Use-FastPath: true`)
- Monitor latency, queue depth, error rates
- Gradually increase FastPath adoption (10% → 50% → 100%)
- Remove old synchronous flow after 100% adoption

---

## PART 6: EXPLICIT CONFIRMATION

**✅ NO CODE CHANGES WERE MADE IN SCOUT MODE**

This report is a read-only analysis. No files were modified, no code was written, and no database changes were made. This report serves as the contract for EXECUTE mode implementation.

---

## APPENDIX: REFERENCE MATERIALS

### A.1 Current File Locations

- **Practice Controller:** `backend/src/modules/practice/practice.controller.ts`
- **Practice Service:** `backend/src/modules/practice/practice.service.ts`
- **AI Chat Service:** `backend/src/modules/ai/providers/ai-chat.service.ts`
- **AI Scoring Service:** `backend/src/modules/ai/ai-scoring.service.ts`
- **Sessions Service:** `backend/src/modules/sessions/sessions.service.ts`
- **Session End Read Model Builder:** `backend/src/modules/sessions/session-end-read-model.builder.ts`

### A.2 Key DTOs

- **PracticeSessionResponsePublic:** Defined in `backend/src/modules/shared/serializers/api-serializers.ts`
- **SessionEndReadModel:** Defined in `backend/src/modules/shared/types/session-end-read-model.types.ts`

### A.3 Analytics Services

- **MoodService:** `backend/src/modules/mood/mood.service.ts`
- **TraitsService:** `backend/src/modules/traits/traits.service.ts`
- **GatesService:** `backend/src/modules/gates/gates.service.ts`
- **InsightsService:** `backend/src/modules/insights/insights.service.ts`

### A.4 Database Tables

- **PracticeSession:** Main session table
- **MissionMoodTimeline:** Mood timeline analytics
- **UserTraitHistory:** Trait history analytics
- **GateOutcome:** Gate evaluation results
- **MissionDeepInsights:** Deep insights analytics

---

**End of SCOUT Report**

