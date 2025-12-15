# SCOUT REPORT — PHASE 2 / PART 1 (Mission Schema & Flow)

**Date:** 2025-01-15  
**Mode:** SCOUT ONLY (No code edits, no commands)  
**Goal:** Map all mission-related models, flows, schema, and seed data for PHASE 2 PART 2 implementation planning.

---

## A. CODEBASE MAP — MISSIONS, AI CONTRACT, ENGINE CONFIG

### A1. Mission templates & progress

#### 1. Core Entities

**PracticeMissionTemplate** (Prisma Model)
- **File:** `backend/prisma/schema.prisma` (lines 191-223)
- **Purpose:** Stores mission template definitions including aiContract JSON field
- **Key Fields for PHASE 2:**
  - `id`: String (cuid)
  - `code`: String (unique identifier, e.g., "OPENERS_L1_M1")
  - `title`: String
  - `description`: String?
  - `laneIndex`: Int (default: 0) - Used for road organization
  - `orderIndex`: Int (default: 0) - Order within lane
  - `categoryId`: String? - Links to MissionCategory
  - `personaId`: String? - Links to AiPersona
  - `aiStyleId`: String? - Links to AiStyle
  - `difficulty`: MissionDifficulty (EASY | MEDIUM | HARD | ELITE)
  - `goalType`: MissionGoalType? (OPENING | FLIRTING | RECOVERY | BOUNDARY | LOGISTICS | SOCIAL)
  - `active`: Boolean (default: true)
  - `aiContract`: Json? - **CRITICAL: Stores { missionConfigV1: {...} }**
  - `isAttractionSensitive`: Boolean (default: false)
  - `targetRomanticGender`: Gender? (MALE | FEMALE | OTHER | UNKNOWN)
  - `timeLimitSec`: Int (default: 30)
  - `maxMessages`: Int?
  - `wordLimit`: Int?
  - `baseXpReward`: Int (default: 50)
  - `baseCoinsReward`: Int (default: 10)
  - `baseGemsReward`: Int (default: 0)

**MissionProgress** (Prisma Model)
- **File:** `backend/prisma/schema.prisma` (lines 394-406)
- **Purpose:** Tracks per-user progress on each mission template
- **Key Fields:**
  - `id`: String (cuid)
  - `userId`: String
  - `templateId`: String (FK to PracticeMissionTemplate)
  - `status`: MissionProgressStatus (LOCKED | UNLOCKED | COMPLETED, default: LOCKED)
  - `bestScore`: Int?
  - `createdAt`: DateTime
  - `updatedAt`: DateTime
  - Unique constraint: `[userId, templateId]`

**MissionCategory** (Prisma Model)
- **File:** `backend/prisma/schema.prisma` (lines 143-157)
- **Purpose:** Groups missions by category (Openers, Flirting, etc.)
- **Key Fields:**
  - `id`: String (cuid)
  - `code`: String (unique, e.g., "OPENERS", "FLIRTING")
  - `label`: String
  - `description`: String?
  - `attractionPath`: AttractionPath (UNISEX | FEMALE_PATH | MALE_PATH)
  - `isAttractionSensitive`: Boolean (default: false)
  - `dynamicLabelTemplate`: String? (e.g., "Approach {{targetPlural}}")
  - `displayOrder`: Int (default: 0)
  - `active`: Boolean (default: true)

**AiPersona** (Prisma Model)
- **File:** `backend/prisma/schema.prisma` (lines 122-138)
- **Purpose:** Character definitions for missions
- **Key Fields:**
  - `id`: String (cuid)
  - `code`: String (unique, e.g., "MAYA_PLAYFUL")
  - `name`: String
  - `description`: String?
  - `personaGender`: Gender (default: UNKNOWN)
  - `active`: Boolean (default: true)

**AiStyle** (Prisma Model)
- **File:** `backend/prisma/schema.prisma` (lines 162-186)
- **Purpose:** AI behavior style definitions (mapped to missionConfigV1.style.aiStyleKey)
- **Key Fields:**
  - `id`: String (cuid)
  - `key`: AiStyleKey (unique enum: NEUTRAL | FLIRTY | PLAYFUL | CHALLENGING | WARM | COLD | SHY | DIRECT | JUDGMENTAL | CHAOTIC)
  - `name`: String
  - `stylePrompt`: String
  - `isActive`: Boolean (default: true)

#### 2. Enums

**MissionDifficulty** (lines 834-839)
- `EASY | MEDIUM | HARD | ELITE`

**MissionGoalType** (lines 842-849)
- `OPENING | FLIRTING | RECOVERY | BOUNDARY | LOGISTICS | SOCIAL`

**MissionProgressStatus** (lines 758-762)
- `LOCKED | UNLOCKED | COMPLETED`

**AiStyleKey** (lines 852-863)
- `NEUTRAL | FLIRTY | PLAYFUL | CHALLENGING | WARM | COLD | SHY | DIRECT | JUDGMENTAL | CHAOTIC`

---

### A2. Missions endpoints used by the app

#### 1. Mission Road Endpoint (GET)

**Route:** `GET /v1/missions/road`  
**Controller:** `backend/src/modules/missions/missions.controller.ts` (lines 23-29)  
**Service:** `MissionsService.getRoadForUser(userId: string)`  
**File:** `backend/src/modules/missions/missions.service.ts` (lines 27-217)

**Data Flow:**
1. Loads user preferences (gender, attractedTo, preferencePath)
2. Fetches all active `PracticeMissionTemplate` rows ordered by `laneIndex`, then `orderIndex`
3. Filters attraction-sensitive missions based on user's `attractedTo` preference
4. Loads `MissionProgress` rows for user
5. Computes unlock logic: first mission in lane is unlocked; others require previous mission completed
6. Computes "current" mission (first unlocked-but-not-completed)
7. Returns array of mission objects with progress, unlock status, category, persona info

**Response Shape:**
```typescript
{
  id: string;
  code: string;
  title: string;
  description: string;
  laneIndex: number;
  orderIndex: number;
  difficulty: MissionDifficulty;
  goalType: MissionGoalType | null;
  category: { id, code, label, displayLabel } | null;
  persona: { id, name, bio, avatarUrl, voicePreset } | null;
  progress: { status, attempts, bestScore, updatedAt } | null;
  isUnlocked: boolean;
  isCompleted: boolean;
  isCurrent: boolean;
  isActive: boolean;
}[]
```

**Frontend Usage:**
- **File:** `socialsocial/src/api/missionsService.ts` (line 5-8)
- **Function:** `fetchMissionRoad()` calls `GET /missions/road`
- **Screen:** `socialsocial/src/screens/MissionRoadScreen.tsx` displays the road

#### 2. Start Mission Endpoint (POST)

**Route:** `POST /v1/missions/:id/start`  
**Controller:** `backend/src/modules/missions/missions.controller.ts` (lines 40-63)  
**Service:** `MissionsService.startMissionForUser(userId: string, templateId: string)`  
**File:** `backend/src/modules/missions/missions.service.ts` (lines 225-382)

**Parameters:**
- `id` (URL path param) - `PracticeMissionTemplate.id`
- No request body required (empty `{}` is acceptable)

**Data Flow:**
1. Validates user exists
2. Loads template with `persona` and `category` relations
3. Validates template exists and is active
4. **CRITICAL:** Validates `aiContract` exists and calls `normalizeMissionConfigV1(template.aiContract)`
   - Throws `MISSION_TEMPLATE_INVALID_AT_START` if missing or invalid
5. Checks unlock status (calls `isUnlockedForUser()`)
6. Selects compatible persona (handles attraction-sensitive routing)
7. Creates/updates `MissionProgress` row (status: UNLOCKED)
8. Returns mission payload (id, title, description, category, persona, etc.)

**Error Codes:**
- `MISSION_TEMPLATE_NOT_FOUND` - Template doesn't exist
- `MISSION_INACTIVE` - Template is inactive
- `MISSION_TEMPLATE_INVALID_AT_START` - aiContract missing or invalid
- `MISSION_LOCKED_PREVIOUS_NOT_COMPLETED` - Unlock rule not met

**Frontend Usage:**
- **File:** `socialsocial/src/api/missionsService.ts` (line 10-13)
- **Function:** `startMission(templateId: string)` calls `POST /missions/${templateId}/start`
- **Field Used:** Frontend uses `templateId` from road response as the `:id` parameter

#### 3. Admin Endpoints (for dev-dashboard.html)

**Route:** `GET /v1/admin/missions`  
**Controller:** `backend/src/modules/missions-admin/missions-admin.controller.ts` (line 62-65)  
**Service:** `MissionsAdminService.listMissionsFlat()`  
**File:** `backend/src/modules/missions-admin/missions-admin.service.ts` (line 261-272)

**Purpose:** Returns flat array of all missions (no filtering, no user progress) for dashboard editing.

**Route:** `GET /v1/admin/missions/road`  
**Controller:** `backend/src/modules/missions-admin/missions-admin.controller.ts` (line 237-259)  
**Service:** `MissionsAdminService.getRoad()`  
**File:** `backend/src/modules/missions-admin/missions-admin.service.ts` (line 237-259)

**Purpose:** Returns missions grouped by lane with full template data for dashboard.

---

### A3. aiContract / missionConfigV1 stack

#### 1. Storage

**Prisma Model Field:**
- `PracticeMissionTemplate.aiContract`: Json? (nullable JSONB column)
- **File:** `backend/prisma/schema.prisma` (line 211)
- **Migration:** `backend/prisma/migrations/20251125203804_schema_update_1_field_before_ai_integration/migration.sql`

**Expected Shape:**
```typescript
{
  missionConfigV1: {
    version: 1;
    dynamics: {...};
    objective: {...};
    difficulty: {...};
    style: {...};
    statePolicy: {...};
    // Optional fields:
    openings?: {...} | null;
    responseArchitecture?: {...} | null;
    aiRuntimeProfile?: {...} | null;
    scoringProfileCode?: string | null;
    dynamicsProfileCode?: string | null;
  }
}
```

#### 2. Reading from DB

**Locations:**
1. **MissionsService.startMissionForUser()**
   - **File:** `backend/src/modules/missions/missions.service.ts` (line 240-243, 287)
   - Reads `template.aiContract` from DB
   - Calls `normalizeMissionConfigV1(template.aiContract)` for validation

2. **PracticeService.runPracticeSession()**
   - **File:** `backend/src/modules/practice/practice.service.ts` (line 806, 885)
   - Reads `template.aiContract` from DB when `templateId` is provided
   - Calls `normalizeMissionConfigV1(template?.aiContract ?? null)` for normalization
   - Falls back to persisted `normalizedMissionConfigV1` from `session.payload` for continuations

3. **MissionsAdminService.createMission() / updateMission()**
   - **File:** `backend/src/modules/missions-admin/missions-admin.service.ts` (line 471, 658)
   - Reads `dto.aiContract` from request body
   - Calls `normalizeMissionConfigV1(aiContract)` before saving

#### 3. Parsing / Normalization / Validation

**Normalization Function:**
- **File:** `backend/src/modules/practice/mission-config-runtime.ts` (lines 67-178)
- **Function:** `normalizeMissionConfigV1(aiContractUnknown: unknown): NormalizeResult`

**Validation Function:**
- **File:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts` (lines 364-985)
- **Function:** `validateMissionConfigV1Shape(aiContract: any): MissionConfigValidationError[]`

**Normalization Flow:**
1. Checks if input is plain object
2. Checks if `missionConfigV1` key exists
3. Calls `validateMissionConfigV1Shape()` to validate structure
4. Normalizes optional fields (nulls, defaults)
5. Resolves `endReasonPrecedenceResolved` (uses `statePolicy.endReasonPrecedence` or global `MISSION_END_REASON_PRECEDENCE`)
6. Returns `NormalizedMissionConfigV1` (JSON-safe, no functions)

**Validation Rules:**
- `version` must be `1`
- `dynamics` must have: `mode`, `locationTag`, `hasPerMessageTimer`, `defaultEntryRoute`
- `objective` must have: `kind`, `userTitle`, `userDescription`
- `difficulty` must have: `level` (EASY | MEDIUM | HARD | ELITE)
- `style` must have: `aiStyleKey` (must match valid AiStyleKey enum)
- `statePolicy` must have: `maxMessages`, `maxStrikes`, `allowTimerExtension`, `successScoreThreshold`, `failScoreThreshold`, `enableGateSequence`, `enableMoodCollapse`, `enableObjectiveAutoSuccess`, `allowedEndReasons`
- Optional fields validated if present: `openings`, `responseArchitecture`, `aiRuntimeProfile`, tuning parameters

#### 4. Passing into Runtime Functions

**PracticeService.runPracticeSession()** (lines 1296-1325)
- Builds `unifiedMissionConfig` from `normalizedMissionConfigV1`
- Passes to `aiChat.generateReply()` as `missionConfig` parameter
- Includes: `dynamics`, `difficulty`, `openings`, `responseArchitecture`, `objective`, `aiRuntimeProfile`

**AiChatService.buildSystemPrompt()** (lines 354-591)
- **File:** `backend/src/modules/ai/providers/ai-chat.service.ts`
- Receives `missionConfig` parameter
- Reads `missionConfig.dynamics`, `missionConfig.difficulty`, `missionConfig.openings`, `missionConfig.responseArchitecture`, `missionConfig.objective`
- Builds prompt blocks for AI chat behavior

**MessageAnalysisWorker** (lines 54-214)
- **File:** `backend/src/modules/queue/workers/message-analysis.worker.ts`
- Loads session and reads `session.payload.normalizedMissionConfigV1` (if persisted)
- Uses for scoring, mood, gates evaluation

**InsightsWorker** (lines 31-84)
- **File:** `backend/src/modules/queue/workers/insights.worker.ts`
- Generates insights for finalized sessions
- May read missionConfigV1 from session payload (indirectly via InsightsService)

---

### A4. EngineConfig & runtime profiles integration

#### 1. EngineConfig Prisma Model

**File:** `backend/prisma/schema.prisma` (lines 879-884)
```prisma
model EngineConfig {
  key       String   @id               // 'GLOBAL_V1'
  configJson Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**EngineConfigService:**
- **File:** `backend/src/modules/engine-config/engine-config.service.ts`
- **Methods:**
  - `getGlobalConfig(): Promise<EngineConfigJson>` - Loads from DB, caches in memory
  - `updateGlobalConfig(config: EngineConfigJson): Promise<void>` - Saves to DB
  - `getDefaultConfig(): EngineConfigJson` - Returns hard-coded defaults

**EngineConfigJson Structure:**
- **File:** `backend/src/modules/engine-config/engine-config.types.ts` (lines 274-292)
- Contains: `scoringProfiles[]`, `defaultScoringProfileCode`, `dynamicsProfiles[]`, `defaultDynamicsProfileCode`, `gates[]`, `mood`, `statePolicy`, `microFeedback?`, `microDynamics?`, `persona?`

#### 2. Where EngineConfig is Loaded

**MessageAnalysisWorker** (line 87-94)
- Loads `engineConfig` via `engineConfigService.getGlobalConfig()`
- Passes to `scoringRuntime.scoreMessage(session, messages, messageIndex, engineConfig)`

**AiScoringRuntimeService** (lines 90-106)
- **File:** `backend/src/modules/ai/ai-scoring-runtime.service.ts`
- Tries to get scoring profile from `session.scoringRuntimeProfileKey`
- Falls back to `engineConfig.defaultScoringProfileCode`

**PracticeService.runPracticeSession()**
- Does NOT directly load EngineConfig
- Relies on workers (MessageAnalysisWorker) to use EngineConfig

#### 3. Runtime Profile Keys on PracticeSession

**Prisma Model Fields:**
- **File:** `backend/prisma/schema.prisma` (lines 284-288)
- `engineVersionId`: String?
- `chatRuntimeProfileKey`: String?
- `scoringRuntimeProfileKey`: String?
- `insightsRuntimeProfileKey`: String?
- `currentMoodState`: String?

**How They're Set:**
- **NOT FOUND:** No explicit code found that sets these fields during mission start or session creation
- **Inference:** These fields may be set by workers or future implementation
- **Current State:** Fields exist in schema but may not be actively populated

**How They're Used:**
- `scoringRuntimeProfileKey`: Used by `AiScoringRuntimeService.getScoringProfile()` (line 95-99)
  - If set, loads profile from `engineConfigService.getScoringProfile(profileKey)`
  - Otherwise falls back to default from EngineConfig
- `chatRuntimeProfileKey`: **NOT FOUND** - No code found that reads this field
- `insightsRuntimeProfileKey`: **NOT FOUND** - No code found that reads this field

**MissionConfigV1 Profile References:**
- **File:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts` (lines 269-271)
- `scoringProfileCode?: string | null` - Optional reference to EngineConfig scoring profile
- `dynamicsProfileCode?: string | null` - Optional reference to EngineConfig dynamics profile
- **Normalization:** Preserved in `normalizeMissionConfigV1()` (lines 170-175) but not part of `NormalizedMissionConfigV1` type (stored as `any`)

---

## B. MISSION LEGO SCHEMA — CURRENT REALITY

### B1. Types and interfaces

#### 1. Core MissionConfigV1 Interface

**File:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts` (lines 256-272)

```typescript
export interface MissionConfigV1 {
  version: 1;
  dynamics: MissionConfigV1Dynamics;
  objective: MissionConfigV1Objective;
  difficulty: MissionConfigV1Difficulty;
  style: MissionConfigV1Style;
  statePolicy: MissionConfigV1StatePolicy;
  // Optional (backward compatibility):
  openings?: MissionConfigV1Openings | null;
  responseArchitecture?: MissionConfigV1ResponseArchitecture | null;
  aiRuntimeProfile?: MissionConfigV1AiRuntimeProfile | null;
  scoringProfileCode?: string | null;
  dynamicsProfileCode?: string | null;
}
```

#### 2. Required vs Optional Fields

**REQUIRED (validation fails if missing):**
- `version: 1`
- `dynamics: MissionConfigV1Dynamics` (all fields required)
- `objective: MissionConfigV1Objective` (all fields required)
- `difficulty: MissionConfigV1Difficulty` (level required, others optional)
- `style: MissionConfigV1Style` (aiStyleKey required, styleIntensity optional)
- `statePolicy: MissionConfigV1StatePolicy` (all fields required except optional ones)

**OPTIONAL (can be null/undefined):**
- `openings?: MissionConfigV1Openings | null`
- `responseArchitecture?: MissionConfigV1ResponseArchitecture | null`
- `aiRuntimeProfile?: MissionConfigV1AiRuntimeProfile | null`
- `scoringProfileCode?: string | null`
- `dynamicsProfileCode?: string | null`

**Dynamics Tuning Parameters (all optional, 0-100 or null):**
- `pace`, `emojiDensity`, `flirtiveness`, `hostility`, `dryness`, `vulnerability`, `escalationSpeed`, `randomness`

**Difficulty Tuning Parameters (all optional, 0-100 or null):**
- `strictness`, `ambiguityTolerance`, `emotionalPenalty`, `bonusForCleverness`, `failThreshold`, `recoveryDifficulty`

#### 3. Schema-Level Validation

**Validation Function:**
- **File:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts` (lines 364-985)
- **Function:** `validateMissionConfigV1Shape(aiContract: any): MissionConfigValidationError[]`

**Strict Enforcement:**
- Type checks (string, number, boolean, object, array)
- Enum validation (MissionMode, MissionLocationTag, MissionObjectiveKind, MissionDifficulty, AiStyleKey, MissionEndReasonCode)
- Range validation (0-100 for tuning parameters, 0-100 for thresholds)
- Required field presence
- Unknown key detection (rejects keys not in allowed list)

**Silent Ignoring:**
- Extra keys at top level of `aiContract` (only `missionConfigV1` is checked)
- Unknown keys in optional sections are rejected (validation errors)

---

### B2. Normalization & validation path (from DB to runtime)

#### 1. Full Path Trace

**Step 1: DB Load**
- **File:** `backend/src/modules/missions/missions.service.ts` (line 240-243)
- `template = await prisma.practiceMissionTemplate.findUnique({ where: { id: templateId }, include: {...} })`
- `template.aiContract` is Prisma `JsonValue` (could be object, null, or malformed)

**Step 2: Parse**
- **File:** `backend/src/modules/missions/missions.service.ts` (line 287)
- `normalizeResult = normalizeMissionConfigV1(template.aiContract)`

**Step 3: Normalize/Validate**
- **File:** `backend/src/modules/practice/mission-config-runtime.ts` (lines 67-178)
- `normalizeMissionConfigV1()` calls `validateMissionConfigV1Shape()` internally
- If validation fails, returns `{ ok: false, reason: 'invalid', errors: [...] }`
- If valid, normalizes to `NormalizedMissionConfigV1` (JSON-safe, defaults applied)

**Step 4: Error Handling**
- **File:** `backend/src/modules/missions/missions.service.ts` (lines 288-307)
- If `normalizeResult.ok === false`, throws `BadRequestException` with code `MISSION_TEMPLATE_INVALID_AT_START`
- Error includes `details: failedResult.errors` for debugging

**Step 5: Runtime Use**
- **File:** `backend/src/modules/practice/practice.service.ts` (lines 884-905)
- For new sessions: normalizes `template.aiContract` again (idempotent)
- For continuations: reads `session.payload.normalizedMissionConfigV1` (already normalized)
- Stores normalized config in `session.payload` for persistence

#### 2. What "Valid" Currently Means

**Minimal Required Fields for Validation to Pass:**
1. `aiContract` must be an object (not null, not string, not array)
2. `aiContract.missionConfigV1` must exist and be an object
3. `missionConfigV1.version` must be `1`
4. `missionConfigV1.dynamics` must have:
   - `mode`: 'CHAT' | 'REAL_LIFE'
   - `locationTag`: Valid MissionLocationTag
   - `hasPerMessageTimer`: boolean
   - `defaultEntryRoute`: 'TEXT_CHAT' | 'VOICE_SIM'
5. `missionConfigV1.objective` must have:
   - `kind`: Valid MissionObjectiveKind
   - `userTitle`: non-empty string
   - `userDescription`: non-empty string
6. `missionConfigV1.difficulty` must have:
   - `level`: 'EASY' | 'MEDIUM' | 'HARD' | 'ELITE'
7. `missionConfigV1.style` must have:
   - `aiStyleKey`: Valid AiStyleKey enum value
8. `missionConfigV1.statePolicy` must have:
   - `maxMessages`: positive number
   - `maxStrikes`: non-negative number
   - `allowTimerExtension`: boolean
   - `successScoreThreshold`: 0-100
   - `failScoreThreshold`: 0-100
   - `enableGateSequence`: boolean
   - `enableMoodCollapse`: boolean
   - `enableObjectiveAutoSuccess`: boolean
   - `allowedEndReasons`: non-empty array of valid MissionEndReasonCode values

**Fallback/Defaulting Logic:**
- **Dynamics tuning parameters:** Default to `null` if missing (lines 104-111)
- **Difficulty tuning parameters:** Default to `null` if missing (lines 126-131)
- **styleIntensity:** Omitted if not provided (lines 91-93)
- **endReasonPrecedenceResolved:** Falls back to global `MISSION_END_REASON_PRECEDENCE` if `statePolicy.endReasonPrecedence` is missing (lines 85-89)
- **Feature toggles (enableMicroDynamics, etc.):** Default to `true` if missing (lines 152-155)

#### 3. TODOs / Legacy Comments

**Deprecated Fields:**
- **File:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts` (lines 207-210)
- `statePolicy.successScoreThreshold` - Marked `@deprecated Phase 3: Mission success/fail is now checklist-driven`
- `statePolicy.failScoreThreshold` - Marked `@deprecated Phase 3: Mission success/fail is now checklist-driven`
- **Note:** These fields are still required by validation but marked deprecated in comments

**No "Temporary" or "Legacy" Comments Found:**
- No comments indicating missionConfigV1 is temporary or to be cleaned up
- Schema appears stable and intended for long-term use

---

### B3. Relationship between missionConfigV1 and the two-lane engine

#### 1. Lane A Usage (Chat Behavior)

**AiChatService.buildSystemPrompt()**
- **File:** `backend/src/modules/ai/providers/ai-chat.service.ts` (lines 354-591)
- **missionConfigV1 Fields Read:**
  - `missionConfig.dynamics` → Builds dynamics block (mode, locationTag, tuning parameters)
  - `missionConfig.difficulty` → Builds difficulty block (level, strictness, etc.)
  - `missionConfig.openings` → Builds openings block (style, energy, personaInitMood)
  - `missionConfig.responseArchitecture` → Builds response architecture block (reflection, validation, etc.)
  - `missionConfig.objective` → Builds objective block (kind, userTitle, userDescription)
  - `missionConfig.aiRuntimeProfile` → Used for model selection, temperature, etc. (if provided)

**PracticeService.runPracticeSession()**
- **File:** `backend/src/modules/practice/practice.service.ts` (lines 1296-1325)
- **missionConfigV1 Fields Read:**
  - Builds `unifiedMissionConfig` from `normalizedMissionConfigV1`
  - Passes to `aiChat.generateReply()` as `missionConfig` parameter
  - Includes: `dynamics`, `difficulty`, `openings`, `responseArchitecture`, `objective`, `aiRuntimeProfile`

**Persona/Style Selection:**
- `missionConfigV1.style.aiStyleKey` → Maps to `AiStyle` table via `template.aiStyleId`
- `template.personaId` → Used for persona selection (not directly from missionConfigV1, but linked via template)

#### 2. Lane B Usage (Scoring, Mood, Gates, Insights)

**MessageAnalysisWorker**
- **File:** `backend/src/modules/queue/workers/message-analysis.worker.ts` (lines 54-214)
- **missionConfigV1 Fields Read:**
  - Loads `session.payload.normalizedMissionConfigV1` (if persisted)
  - Uses for scoring profile selection (indirectly via EngineConfig)
  - Uses for mood evaluation (indirectly via EngineConfig)
  - Uses for gates evaluation (indirectly via EngineConfig)

**AiScoringRuntimeService**
- **File:** `backend/src/modules/ai/ai-scoring-runtime.service.ts` (lines 90-106)
- **missionConfigV1 Fields Read:**
  - `session.scoringRuntimeProfileKey` → May be set from `missionConfigV1.scoringProfileCode` (not explicitly found)
  - Falls back to `engineConfig.defaultScoringProfileCode`

**GatesService**
- **File:** `backend/src/modules/gates/gates.service.ts` (referenced in workers)
- **missionConfigV1 Fields Read:**
  - `statePolicy.enableGateSequence` → Controls whether gates are evaluated
  - `statePolicy.allowedEndReasons` → Filters which end reasons are allowed
  - `statePolicy.endReasonPrecedence` → Overrides global precedence

**MoodService**
- **File:** `backend/src/modules/mood/mood.service.ts` (referenced in workers)
- **missionConfigV1 Fields Read:**
  - `statePolicy.enableMoodCollapse` → Controls mood collapse behavior

**InsightsWorker**
- **File:** `backend/src/modules/queue/workers/insights.worker.ts` (lines 31-84)
- **missionConfigV1 Fields Read:**
  - Indirectly via InsightsService (may read from session payload)

**PracticeService.computeMissionState()**
- **File:** `backend/src/modules/practice/practice.service.ts` (lines 356-456)
- **missionConfigV1 Fields Read:**
  - `statePolicy.maxMessages` → Used for progress calculation
  - `statePolicy.minMessagesBeforeEnd` → Used for end timing
  - **Note:** Mission state is now checklist-driven, not numeric-score-driven (Phase 3 migration)

#### 3. Connection to ScoringRuntime, MessageAnalysisWorker, InsightsWorker

**ScoringRuntime:**
- **File:** `backend/src/modules/ai/ai-scoring-runtime.service.ts`
- Reads `session.scoringRuntimeProfileKey` (may be set from `missionConfigV1.scoringProfileCode`)
- Falls back to `engineConfig.defaultScoringProfileCode`
- Uses EngineConfig scoring profiles (not directly missionConfigV1)

**MessageAnalysisWorker:**
- Loads `session.payload.normalizedMissionConfigV1` (if persisted)
- Passes to scoring, mood, gates services
- Indirectly uses missionConfigV1 via EngineConfig profiles

**InsightsWorker:**
- Generates insights for finalized sessions
- May read missionConfigV1 from session payload (indirectly via InsightsService)

#### 4. Summary: Live vs Unused Parts

**LIVE AND USED:**
- ✅ `dynamics` (mode, locationTag, hasPerMessageTimer, defaultEntryRoute) - Used in Lane A prompt
- ✅ `dynamics` tuning parameters (pace, emojiDensity, etc.) - Used in Lane A prompt (if provided)
- ✅ `objective` (kind, userTitle, userDescription) - Used in Lane A prompt
- ✅ `difficulty` (level) - Used for policy resolution
- ✅ `difficulty` tuning parameters - Used in Lane A prompt (if provided)
- ✅ `style` (aiStyleKey) - Maps to AiStyle table, used in Lane A
- ✅ `statePolicy.maxMessages` - Used for progress calculation
- ✅ `statePolicy.minMessagesBeforeEnd` - Used for end timing
- ✅ `statePolicy.enableGateSequence` - Controls gates evaluation
- ✅ `statePolicy.enableMoodCollapse` - Controls mood collapse
- ✅ `statePolicy.allowedEndReasons` - Filters end reasons
- ✅ `statePolicy.endReasonPrecedence` - Overrides global precedence
- ✅ `openings` - Used in Lane A prompt (if provided)
- ✅ `responseArchitecture` - Used in Lane A prompt (if provided)
- ✅ `aiRuntimeProfile` - Used for model selection (if provided)

**DEFINED BUT NOT YET USED:**
- ⚠️ `scoringProfileCode` - Defined in schema, preserved in normalization, but no explicit code found that sets `session.scoringRuntimeProfileKey` from it
- ⚠️ `dynamicsProfileCode` - Defined in schema, preserved in normalization, but no explicit code found that uses it
- ⚠️ `statePolicy.successScoreThreshold` / `failScoreThreshold` - Marked deprecated, still required by validation, but mission state is now checklist-driven

---

## C. SEED / DEFAULT MISSIONS — CURRENT REALITY

### C1. Seeds and fixtures

#### 1. Seed Script Location

**File:** `backend/prisma/seed.ts` (lines 1-387)

**Execution:**
- Run via `npx prisma db seed` or `npm run seed`
- Creates demo user, categories, personas, AI styles, missions, and EngineConfig

#### 2. Seeded Missions

**Total Seeded Missions:** 6

**Mission 1: OPENERS_L1_M1**
- **File:** `backend/prisma/seed.ts` (lines 185-212)
- **Fields:**
  - `code`: "OPENERS_L1_M1"
  - `title`: "First Safe Opener"
  - `description`: "Send a simple, casual opener in under 30 seconds."
  - `categoryId`: openersCategory.id (OPENERS, FEMALE_PATH)
  - `personaId`: maya.id (MAYA_PLAYFUL, FEMALE)
  - `goalType`: MissionGoalType.OPENING
  - `difficulty`: MissionDifficulty.EASY
  - `laneIndex`: 0
  - `orderIndex`: 0
  - `isAttractionSensitive`: true
  - `targetRomanticGender`: Gender.FEMALE
  - `active`: true
- **aiContract:** ❌ **NOT SET** - Mission created without `aiContract` field

**Mission 2: OPENERS_L1_M2**
- **File:** `backend/prisma/seed.ts` (lines 214-241)
- **Fields:**
  - `code`: "OPENERS_L1_M2"
  - `title`: "Curious Opener"
  - `description`: "Ask a curiosity-based opener with a bit of personality."
  - `categoryId`: openersCategory.id
  - `personaId`: maya.id
  - `goalType`: MissionGoalType.OPENING
  - `difficulty`: MissionDifficulty.MEDIUM
  - `laneIndex`: 0
  - `orderIndex`: 1
  - `isAttractionSensitive`: true
  - `targetRomanticGender`: Gender.FEMALE
  - `active`: true
- **aiContract:** ❌ **NOT SET**

**Mission 3: OPENERS_L1_M3_MALE**
- **File:** `backend/prisma/seed.ts` (lines 246-274)
- **Fields:**
  - `code`: "OPENERS_L1_M3_MALE"
  - `title`: "First Safe Opener"
  - `description`: "Send a simple, casual opener to a guy in under 30 seconds."
  - `categoryId`: openersMaleCategory.id (OPENERS_MALE, MALE_PATH)
  - `personaId`: dan.id (DAN_CONFIDENT, MALE)
  - `goalType`: MissionGoalType.OPENING
  - `difficulty`: MissionDifficulty.EASY
  - `laneIndex`: 0
  - `orderIndex`: 0
  - `isAttractionSensitive`: true
  - `targetRomanticGender`: Gender.MALE
  - `active`: true
- **aiContract:** ❌ **NOT SET**

**Mission 4: OPENERS_L1_M4_MALE**
- **File:** `backend/prisma/seed.ts` (lines 276-304)
- **Fields:**
  - `code`: "OPENERS_L1_M4_MALE"
  - `title`: "Curious Opener"
  - `description`: "Ask a curiosity-based opener to a guy with a bit of personality."
  - `categoryId`: openersMaleCategory.id
  - `personaId`: omer.id (OMER_WARM, MALE)
  - `goalType`: MissionGoalType.OPENING
  - `difficulty`: MissionDifficulty.MEDIUM
  - `laneIndex`: 0
  - `orderIndex`: 1
  - `isAttractionSensitive`: true
  - `targetRomanticGender`: Gender.MALE
  - `active`: true
- **aiContract:** ❌ **NOT SET**

**Mission 5: FLIRTING_L1_M1**
- **File:** `backend/prisma/seed.ts` (lines 307-330)
- **Fields:**
  - `code`: "FLIRTING_L1_M1"
  - `title`: "Light Tease"
  - `description`: "Turn a neutral reply into something playful without being cringe."
  - `categoryId`: flirtingCategory.id (FLIRTING, UNISEX)
  - `personaId`: noa.id (NOA_CALM, FEMALE)
  - `goalType`: MissionGoalType.FLIRTING
  - `difficulty`: MissionDifficulty.EASY
  - `laneIndex`: 1
  - `orderIndex`: 0
  - `isAttractionSensitive`: false (default)
  - `active`: true
- **aiContract:** ❌ **NOT SET**

**Mission 6: FLIRTING_L2_M1**
- **File:** `backend/prisma/seed.ts` (lines 332-355)
- **Fields:**
  - `code`: "FLIRTING_L2_M1"
  - `title`: "Build Tension Fast"
  - `description`: "Raise the vibe quickly in 2 messages with a time limit per message."
  - `categoryId`: flirtingCategory.id
  - `personaId`: noa.id
  - `goalType`: MissionGoalType.FLIRTING
  - `difficulty`: MissionDifficulty.MEDIUM
  - `laneIndex`: 1
  - `orderIndex`: 1
  - `isAttractionSensitive`: false (default)
  - `active`: true
- **aiContract:** ❌ **NOT SET**

#### 3. Validation Status

**All 6 Seeded Missions:**
- ❌ **INVALID** - All missions are missing `aiContract` field
- **Would Fail With:** `MISSION_TEMPLATE_INVALID_AT_START` when calling `startMissionForUser()`
- **Error Reason:** `normalizeMissionConfigV1()` would return `{ ok: false, reason: 'missing' }` because `aiContract` is `null`

**Missing Parts:**
- All missions need `aiContract: { missionConfigV1: {...} }` with required fields:
  - `version: 1`
  - `dynamics` (mode, locationTag, hasPerMessageTimer, defaultEntryRoute)
  - `objective` (kind, userTitle, userDescription)
  - `difficulty` (level matching template.difficulty)
  - `style` (aiStyleKey matching template's AiStyle)
  - `statePolicy` (all required fields)

---

### C2. "Best candidate mission" for demo

#### 1. Candidate Selection

**Best Candidate: OPENERS_L1_M1 ("First Safe Opener")**

**Rationale:**
- ✅ Simplest mission (EASY difficulty, OPENING goal type)
- ✅ First mission in lane 0 (orderIndex: 0) - naturally unlocked
- ✅ Has persona (MAYA_PLAYFUL) and category (OPENERS)
- ✅ Clear, simple objective ("Send a simple, casual opener")
- ✅ Minimal complexity (3 max messages, 30 second time limit, 40 word limit)
- ✅ Attraction-sensitive (good for testing routing)
- ✅ Female-target mission (good for testing persona compatibility)

**Alternative Candidates:**
- `FLIRTING_L1_M1` ("Light Tease") - Also simple, but UNISEX (less routing complexity)
- `OPENERS_L1_M3_MALE` - Good for testing MALE_PATH, but same complexity as OPENERS_L1_M1

#### 2. Issues to Fix for OPENERS_L1_M1

**DB Fields (Already Correct):**
- ✅ `id`, `code`, `title`, `description` - Present
- ✅ `laneIndex: 0`, `orderIndex: 0` - Correct
- ✅ `categoryId` - Links to OPENERS category
- ✅ `personaId` - Links to MAYA_PLAYFUL persona
- ✅ `difficulty: EASY` - Correct
- ✅ `goalType: OPENING` - Correct
- ✅ `isAttractionSensitive: true`, `targetRomanticGender: FEMALE` - Correct

**Missing aiContract:**
- ❌ `aiContract` is `null` - Must be set to valid `{ missionConfigV1: {...} }`

**Required aiContract Structure:**
```typescript
{
  missionConfigV1: {
    version: 1,
    dynamics: {
      mode: "CHAT", // or "REAL_LIFE"
      locationTag: "APP_CHAT", // or other valid tag
      hasPerMessageTimer: true, // matches timeLimitSec: 30
      defaultEntryRoute: "TEXT_CHAT"
    },
    objective: {
      kind: "PRACTICE_OPENING", // or "GET_NUMBER", etc.
      userTitle: "First Safe Opener", // or custom title
      userDescription: "Send a simple, casual opener in under 30 seconds." // or custom description
    },
    difficulty: {
      level: "EASY" // must match template.difficulty
    },
    style: {
      aiStyleKey: "PLAYFUL" // must match template's AiStyle.key (MAYA_PLAYFUL → PLAYFUL)
    },
    statePolicy: {
      maxMessages: 3, // matches template.maxMessages
      maxStrikes: 3, // default
      allowTimerExtension: true, // default
      successScoreThreshold: 70, // deprecated but required
      failScoreThreshold: 40, // deprecated but required
      enableGateSequence: true,
      enableMoodCollapse: true,
      enableObjectiveAutoSuccess: false,
      allowedEndReasons: ["SUCCESS_OBJECTIVE", "FAIL_MAX_MESSAGES", "FAIL_TIMER_EXPIRED", "ABORT_USER_EXIT"]
    }
  }
}
```

**Additional Considerations:**
- `template.aiStyleId` must link to an `AiStyle` row with `key: "PLAYFUL"` (or adjust `style.aiStyleKey` to match)
- `template.personaId` must link to an active `AiPersona` row (already correct: MAYA_PLAYFUL)

---

## D. SUMMARY — FACTUAL SNAPSHOT FOR PHASE 2 PART 2

### 1. Current Canonical missionConfigV1/aiContract Shape

**Key Types/Interfaces:**
- `MissionConfigV1` - Root interface (version: 1)
- `MissionConfigV1Dynamics` - Mode, location, timer, entry route, tuning parameters
- `MissionConfigV1Objective` - Kind, userTitle, userDescription
- `MissionConfigV1Difficulty` - Level, recommended thresholds, tuning parameters
- `MissionConfigV1Style` - aiStyleKey, optional styleIntensity
- `MissionConfigV1StatePolicy` - Max messages, strikes, timers, gates, end reasons, feature toggles
- `MissionConfigV1Openings` - Optional (style, energy, curiosity, personaInitMood)
- `MissionConfigV1ResponseArchitecture` - Optional (reflection, validation, emotionalMirroring, etc.)
- `MissionConfigV1AiRuntimeProfile` - Optional (model, temperature, maxTokens, etc.)

**5-10 Most Important Fields That Drive Runtime Behavior:**
1. `dynamics.mode` - CHAT vs REAL_LIFE (affects prompt)
2. `dynamics.hasPerMessageTimer` - Controls timer UI
3. `dynamics.defaultEntryRoute` - TEXT_CHAT vs VOICE_SIM
4. `objective.kind` - Determines objective evaluation logic
5. `objective.userTitle` / `userDescription` - Shown in UI
6. `difficulty.level` - Used for policy resolution
7. `style.aiStyleKey` - Maps to AiStyle table, affects AI behavior
8. `statePolicy.maxMessages` - Hard cap for mission length
9. `statePolicy.enableGateSequence` - Controls gate evaluation
10. `statePolicy.allowedEndReasons` - Filters valid end reasons

---

### 2. Where Validation Currently Happens

**Validation Functions:**
- `validateMissionConfigV1Shape(aiContract: any): MissionConfigValidationError[]`
  - **File:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts` (lines 364-985)
  - Validates structure, types, enums, ranges, required fields

**Normalization Functions:**
- `normalizeMissionConfigV1(aiContractUnknown: unknown): NormalizeResult`
  - **File:** `backend/src/modules/practice/mission-config-runtime.ts` (lines 67-178)
  - Calls `validateMissionConfigV1Shape()` internally
  - Normalizes to `NormalizedMissionConfigV1` (JSON-safe)

**Validation Triggers:**

**At Save Time:**
- **File:** `backend/src/modules/missions-admin/missions-admin.service.ts` (lines 471-484)
- `createMission()` / `updateMission()` calls `normalizeMissionConfigV1()` before saving
- Throws `MISSION_TEMPLATE_INVALID_CONFIG` if validation fails

**At Start Time:**
- **File:** `backend/src/modules/missions/missions.service.ts` (lines 287-307)
- `startMissionForUser()` calls `normalizeMissionConfigV1()` before allowing start
- Throws `MISSION_TEMPLATE_INVALID_AT_START` if validation fails

**At Runtime (Session Creation):**
- **File:** `backend/src/modules/practice/practice.service.ts` (lines 884-905)
- `runPracticeSession()` calls `normalizeMissionConfigV1()` when `templateId` is provided
- Throws `MISSION_CONFIG_MISSING` or `MISSION_CONFIG_INVALID` if validation fails

**Error Codes:**
- `MISSION_TEMPLATE_INVALID_CONFIG` - Admin save/update validation failure
- `MISSION_TEMPLATE_INVALID_AT_START` - Mission start validation failure
- `MISSION_CONFIG_MISSING` - Runtime session creation (missing aiContract)
- `MISSION_CONFIG_INVALID` - Runtime session creation (invalid structure)

---

### 3. How the Two-Lane Engine Actually Uses missionConfigV1

**Lane A Usage (Chat Behavior):**

1. **AiChatService.buildSystemPrompt()** reads:
   - `dynamics` → Builds dynamics instruction block (mode, location, tuning parameters)
   - `difficulty` → Builds difficulty instruction block (level, strictness, etc.)
   - `openings` → Builds openings instruction block (if provided)
   - `responseArchitecture` → Builds response architecture instruction block (if provided)
   - `objective` → Builds objective instruction block (kind, userTitle, userDescription)
   - `aiRuntimeProfile` → Used for model selection, temperature, etc. (if provided)

2. **PracticeService.runPracticeSession()** passes:
   - `unifiedMissionConfig` built from `normalizedMissionConfigV1` to `aiChat.generateReply()`
   - Includes all optional layers (openings, responseArchitecture, aiRuntimeProfile)

3. **Style/Persona Selection:**
   - `style.aiStyleKey` → Maps to `AiStyle` table via `template.aiStyleId`
   - `template.personaId` → Used for persona selection (not directly from missionConfigV1)

**Lane B & Insights Usage (Scoring, Mood, Gates, Insights):**

1. **MessageAnalysisWorker** loads:
   - `session.payload.normalizedMissionConfigV1` (if persisted)
   - Passes to scoring, mood, gates services (indirectly via EngineConfig)

2. **AiScoringRuntimeService** uses:
   - `session.scoringRuntimeProfileKey` (may be set from `missionConfigV1.scoringProfileCode`, not explicitly found)
   - Falls back to `engineConfig.defaultScoringProfileCode`

3. **GatesService** uses:
   - `statePolicy.enableGateSequence` → Controls whether gates are evaluated
   - `statePolicy.allowedEndReasons` → Filters valid end reasons
   - `statePolicy.endReasonPrecedence` → Overrides global precedence

4. **MoodService** uses:
   - `statePolicy.enableMoodCollapse` → Controls mood collapse behavior

5. **PracticeService.computeMissionState()** uses:
   - `statePolicy.maxMessages` → Progress calculation
   - `statePolicy.minMessagesBeforeEnd` → End timing
   - **Note:** Mission state is checklist-driven (Phase 3), not numeric-score-driven

6. **InsightsWorker** uses:
   - Indirectly via InsightsService (may read from session payload)

---

### 4. Seed/Default Missions and Their Status

**Total Seeded Missions:** 6

**Breakdown:**
- 4 missions in lane 0 (OPENERS category, orderIndex 0-1 for FEMALE_PATH and MALE_PATH)
- 2 missions in lane 1 (FLIRTING category, orderIndex 0-1)

**Validation Status:**
- ❌ **0 missions are valid** - All 6 missions are missing `aiContract` field
- **Would Fail With:** `MISSION_TEMPLATE_INVALID_AT_START` when calling `startMissionForUser()`

**Best Phase 2 Demo Candidate:**
- **OPENERS_L1_M1** ("First Safe Opener")
- **Reason:** Simplest mission (EASY, OPENING), first in lane 0, has persona/category, clear objective
- **Issues to Fix:**
  - Missing `aiContract` field (must be set to valid `{ missionConfigV1: {...} }`)
  - Must match `template.difficulty` (EASY)
  - Must match `template.aiStyleId` → `AiStyle.key` (PLAYFUL for MAYA_PLAYFUL)
  - Must set `statePolicy.maxMessages` to match `template.maxMessages` (3)
  - Must set `objective.kind` to match `template.goalType` (PRACTICE_OPENING or GET_NUMBER)

---

**END OF SCOUT REPORT**

