# SCOUT REPORT — Dynamics Templates + Gate Requirement Templates

**Date:** 2025-01-XX  
**Mode:** READ-ONLY SCOUT (No code changes, no commands)  
**Goal:** Map current state of Dynamics and Gate Requirements in mission builder, identify what exists vs what's missing for LEGO-style template system.

---

## 1. What Exists Today

### A) Mission Builder UI — Dynamics Section

**File:** `backend/dashboards_bundle/dev-dashboard.html`

- **Location:** Lines 667-722
- **HTML Elements:**
  - Section label: "Dynamics Tuning (0-100)" (line 667)
  - Slider inputs with IDs:
    - `missionDynPace` (line 670)
    - `missionDynEmojiDensity` (line 679)
    - `missionDynFlirtiveness` (line 688)
    - `missionDynHostility` (line 697)
    - `missionDynDryness` (line 706)
    - `missionDynVulnerability` (line 715)
    - `missionDynEscalationSpeed` (line 722)
    - `missionDynRandomness` (line 722)
  - Value display spans: `missionDynPaceVal`, `missionDynEmojiDensityVal`, etc. (lines 673, 682, etc.)
- **JS Functions:**
  - `syncMissionDynamicsFromJson()` (lines 4045-4099) — Reads from `aiContractJsonTextarea` and populates sliders
  - `writeMissionDynamicsToJson()` (lines 4101-4181) — Writes slider values back to `aiContractJsonTextarea`
  - `getMissionFormValues()` (lines 3051-3288) — Collects all form values including dynamics sliders (lines 3218-3253)
- **Event Handlers:**
  - Slider `input` events update value spans (lines 5084-5092)
  - `missionDynSyncFromJsonBtn` click → `syncMissionDynamicsFromJson()` (line 5062-5065)
  - `missionDynWriteToJsonBtn` click → `writeMissionDynamicsToJson()` (line 5067-5070)
- **Payload Shape:**
  - Dynamics values stored in `aiContract.missionConfigV1.dynamics` JSON field
  - Fields: `pace`, `emojiDensity`, `flirtiveness`, `hostility`, `dryness`, `vulnerability`, `escalationSpeed`, `randomness` (all 0-100, optional)
  - Saved via `POST /v1/admin/missions` or `PUT /v1/admin/missions/:id` with `aiContract` in payload (lines 4618-4630)

### B) Mission Builder UI — Gate Requirements Section

**File:** `backend/dashboards_bundle/dev-dashboard.html`

- **Location:** Lines 743-744
- **HTML Elements:**
  - Checkbox: `missionEnableGateSequenceCheckbox` (line 743)
  - Label: "Enable Gate Sequence" (line 744)
- **JS Functions:**
  - `getMissionFormValues()` reads checkbox state (line 3252-3253)
  - `writeMissionDynamicsToJson()` writes checkbox to `cfg.statePolicy.enableGateSequence` (line 4166-4167)
  - `syncMissionDynamicsFromJson()` reads from config and sets checkbox (lines 4020-4023, 4090-4093)
- **Payload Shape:**
  - Gate sequence toggle stored in `aiContract.missionConfigV1.statePolicy.enableGateSequence` (boolean)
  - **NOTE:** No UI for selecting specific gate requirement templates; only a boolean toggle exists
- **Engine Config Tab — Gates Management:**
  - **Location:** Lines 1464-1514
  - **HTML Elements:**
    - Tab button: "Gates & Objectives" (line 1044)
    - Table: `engineConfigGatesTableBody` (line 1486)
    - Editor: `engineConfigGateEditor` (line 1488)
    - Fields: `engineConfigGateKey`, `engineConfigGateDescription`, `engineConfigGateActive`, `engineConfigGateMinMessages`, `engineConfigGateSuccessThreshold`, `engineConfigGateFailFloor` (lines 1490-1511)
  - **JS Functions:**
    - `renderGatesTab()` (lines 6308-6330) — Renders gates from `engineConfigState.config.gates`
    - `selectGate(key)` (lines 6332-6346) — Loads gate into editor
    - `saveGate()` (lines 6347-6363) — Updates gate in memory (requires "Save Config" to persist)
  - **Storage:** Gates stored in EngineConfig JSON (not per-mission, global config)

### C) Backend & DB — Dynamics

**Prisma Schema:**
- **File:** `backend/prisma/schema.prisma`
- **Model:** `PracticeMissionTemplate` (lines 191-223)
  - Field: `aiContract Json?` (line 211) — Stores full `{ missionConfigV1: {...} }` including dynamics
- **NO separate table for DynamicsTemplate** — Dynamics are stored per-mission in JSON

**EngineConfig Structure:**
- **File:** `backend/src/modules/engine-config/engine-config.types.ts`
- **Interface:** `EngineDynamicsProfile` (lines 110-125)
  - Fields: `code`, `name`, `description`, `active`, `pace`, `emojiDensity`, `flirtiveness`, `hostility`, `dryness`, `vulnerability`, `escalationSpeed`, `randomness`
- **File:** `backend/src/modules/engine-config/engine-config.service.ts`
  - Method: `getDynamicsProfile(code?: string | null)` (lines 140-145) — Loads profile from EngineConfig JSON
  - Default profiles: `NEUTRAL`, `COLD_APPROACH_EASY`, `COLD_APPROACH_HARD` (lines 291-334)
- **MissionConfigV1 Schema:**
  - **File:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts`
  - **Interface:** `MissionConfigV1Dynamics` (lines 147-162)
    - Required: `mode`, `locationTag`, `hasPerMessageTimer`, `defaultEntryRoute`
    - Optional: `pace`, `emojiDensity`, `flirtiveness`, `hostility`, `dryness`, `vulnerability`, `escalationSpeed`, `randomness` (all 0-100, nullable)
  - **Field:** `dynamicsProfileCode?: string | null` (line 271) — Optional reference to EngineConfig profile
- **Runtime Usage:**
  - **File:** `backend/src/modules/ai/providers/ai-chat.service.ts` (lines 441-461)
    - If `dynamicsProfileCode` is set, loads profile from EngineConfig and merges with mission-specific overrides
- **Dev Dashboard — Dynamics Profiles Tab:**
  - **File:** `backend/dashboards_bundle/dev-dashboard.html` (lines 1333-1457, 6198-6305)
  - UI exists for managing EngineConfig dynamics profiles (CRUD in memory, requires "Save Config" to persist)
  - **NO UI for selecting a dynamics profile when creating/editing a mission** — Only sliders exist

### D) Backend & DB — Gate Requirements

**Prisma Schema:**
- **File:** `backend/prisma/schema.prisma`
- **Model:** `GateOutcome` (lines 602-616)
  - Fields: `id`, `sessionId`, `userId`, `gateKey` (String), `passed` (Boolean), `reasonCode`, `contextJson`, `evaluatedAt`
  - **Purpose:** Records per-session gate evaluation results (not templates)
- **Model:** `PracticeMissionTemplate` (lines 191-223)
  - Field: `aiContract Json?` (line 211) — Stores `statePolicy.enableGateSequence` (boolean)
  - **NO field for gate requirement template IDs/keys**
- **NO separate table for GateRequirementTemplate**

**Gate Evaluation Service:**
- **File:** `backend/src/modules/gates/gates.service.ts`
- **Type:** `GateKey` (lines 12-17) — Enum: `'GATE_MIN_MESSAGES' | 'GATE_SUCCESS_THRESHOLD' | 'GATE_FAIL_FLOOR' | 'GATE_DISQUALIFIED' | 'GATE_OBJECTIVE_PROGRESS'`
- **Method:** `evaluateGatesForActiveSession(context, requiredGates)` (lines 138-263)
  - Evaluates gates based on session context
  - Returns `GateEvaluationResult[]`
- **Method:** `evaluateAndPersist(sessionId)` (lines 271-428)
  - Evaluates all gates and saves to `GateOutcome` table

**Objective → Gate Mapping Registry:**
- **File:** `backend/src/modules/ai-engine/registries/objective-gate-mappings.registry.ts`
- **Interface:** `ObjectiveGateRequirement` (lines 11-24)
  - Fields: `objectiveKind`, `difficultyLevel`, `requiredGates: GateKey[]`, `additionalConditions?`, `description`
- **Registry:** `OBJECTIVE_GATE_MAPPINGS` (lines 32-278) — Hardcoded array mapping objective + difficulty → required gates
- **Function:** `getGateRequirementsForObjective(objectiveKind, difficultyLevel)` (lines 283-293)
  - Returns gate requirements for a specific objective/difficulty combo
- **Usage:** Called at mission start in `practice.service.ts` (line 1056) to determine which gates are required

**EngineConfig Structure:**
- **File:** `backend/src/modules/engine-config/engine-config.types.ts`
- **Interface:** `EngineGateConfig` (lines 183-198)
  - Fields: `key`, `description`, `active`, `minMessages?`, `successThreshold?`, `failFloor?`, `minScore?`, `requiredTraitLevels?`, `maxFailures?`
- **File:** `backend/src/modules/engine-config/engine-config.service.ts`
  - Default gates defined in `getDefaultConfig()` (lines 336-362)
- **Storage:** Gates stored in EngineConfig JSON (global config, not per-mission templates)

**MissionConfigV1 Schema:**
- **File:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts`
- **Interface:** `MissionConfigV1StatePolicy` (lines 201-221)
  - Field: `enableGateSequence: boolean` (line 211) — Toggle for gate evaluation
  - **NO field for gate requirement template IDs/keys**
  - **NO field for required gates list**

**Tips/Hints Mapping:**
- **File:** `backend/src/modules/insights/catalog/insight-catalog.v1.ts`
- **Gate Fail Insights:** Lines 88-168
  - Hardcoded `InsightTemplate[]` with `requires: { gateKey: 'GATE_MIN_MESSAGES' }`, etc.
  - Examples: `gate_min_messages_insufficient`, `gate_success_threshold_too_low`, `gate_fail_floor_too_low`, `gate_disqualified_violation`, `gate_objective_progress_insufficient`
- **Storage:** Currently hardcoded in TypeScript class (not in DB, not mapped to gate requirement templates)
- **Model:** `CustomInsightTemplate` (Prisma schema lines 495-511)
  - Fields: `id`, `key`, `kind`, `category`, `title`, `body`, `weight`, `cooldownMissions`, `tags`, `requiresJson` (can contain `gateKey`)
  - **Purpose:** DB-backed insights, but no explicit relationship to gate requirement templates

### E) Endpoints

**Mission CRUD:**
- **File:** `backend/src/modules/missions-admin/missions-admin.controller.ts`
- `POST /v1/admin/missions` (line 82-85) — Creates mission with `aiContract` in body
- `PUT /v1/admin/missions/:id` (line 90-93) — Updates mission with `aiContract` in body
- **Service:** `MissionsAdminService.createMission()` / `updateMission()` (lines 452-828)
  - Validates and normalizes `aiContract.missionConfigV1` before saving

**EngineConfig Endpoints:**
- **File:** `backend/src/modules/engine-config/engine-config.controller.ts` (not found in search, but referenced)
- EngineConfig is loaded/saved via dev dashboard UI (not REST API endpoints found)

**Gate Requirements Endpoints:**
- **NOT FOUND** — No endpoints for listing/selecting gate requirement templates
- Gate requirements are determined at runtime via `getGateRequirementsForObjective()` based on objective kind + difficulty

---

## 2. What Is Missing

### A) Dynamics Templates

- **Missing:** `DynamicsTemplate` Prisma model/table
  - **Evidence:** No model in `backend/prisma/schema.prisma` (searched lines 1-906)
- **Missing:** Relationship field on `PracticeMissionTemplate` to reference dynamics template
  - **Evidence:** `PracticeMissionTemplate` has no `dynamicsTemplateId` or `dynamicsTemplateKey` field (lines 191-223)
- **Missing:** UI in mission builder for selecting a dynamics template (dropdown/table)
  - **Evidence:** Only sliders exist (lines 667-722), no template selector
- **Missing:** Endpoints for listing/CRUD dynamics templates
  - **Evidence:** No controller endpoints found (only EngineConfig JSON management exists)
- **Partially Implemented:** Dynamics profiles exist in EngineConfig JSON, but:
  - Not stored as separate DB table
  - Not selectable in mission builder UI
  - Only referenceable via `dynamicsProfileCode` string in `MissionConfigV1` (line 271), but UI doesn't expose this

### B) Gate Requirement Templates

- **Missing:** `GateRequirementTemplate` Prisma model/table
  - **Evidence:** No model in `backend/prisma/schema.prisma` (searched lines 1-906)
- **Missing:** Relationship field on `PracticeMissionTemplate` to reference gate requirement templates
  - **Evidence:** `PracticeMissionTemplate` has no `gateRequirementTemplateIds` or `gateRequirementTemplateKeys` field (lines 191-223)
- **Missing:** UI in mission builder for selecting gate requirement templates (multi-select/checkboxes)
  - **Evidence:** Only `enableGateSequence` checkbox exists (line 743), no template selector
- **Missing:** Endpoints for listing/CRUD gate requirement templates
  - **Evidence:** No controller endpoints found
- **Partially Implemented:** Gate requirements are determined via hardcoded registry (`objective-gate-mappings.registry.ts`), but:
  - Not stored as templates in DB
  - Not selectable per-mission (automatically determined by objective + difficulty)
  - No UI for customizing which gates are required for a mission

### C) Tips/Hints Mapping

- **Missing:** Explicit relationship between `GateRequirementTemplate` and tips/hints
  - **Evidence:** `CustomInsightTemplate.requiresJson` can contain `gateKey`, but no foreign key relationship
- **Missing:** UI for associating tips/hints with gate requirement templates
  - **Evidence:** No UI found in dev dashboard
- **Partially Implemented:** Hardcoded insights exist in `insight-catalog.v1.ts` with `requires: { gateKey }`, but:
  - Not stored as templates linked to gate requirement templates
  - No UI for managing gate-specific tips

---

## 3. Dynamics: End-to-End Mapping Table

| UI Control | JS Function | API Endpoint | Backend Controller/Service | DB Table/Model | Current Storage Shape | Notes |
|------------|-------------|--------------|----------------------------|----------------|----------------------|-------|
| Slider: `missionDynPace` | `writeMissionDynamicsToJson()` (line 4141) | `POST /v1/admin/missions` or `PUT /v1/admin/missions/:id` | `MissionsAdminController.createMission()` / `updateMission()` | `PracticeMissionTemplate.aiContract` (JSON) | `{ missionConfigV1: { dynamics: { pace: 50 } } }` | Per-mission, stored in JSON |
| Slider: `missionDynEmojiDensity` | `writeMissionDynamicsToJson()` (line 4144) | Same | Same | Same | `{ missionConfigV1: { dynamics: { emojiDensity: 30 } } }` | Per-mission, stored in JSON |
| Slider: `missionDynFlirtiveness` | `writeMissionDynamicsToJson()` (line 4147) | Same | Same | Same | `{ missionConfigV1: { dynamics: { flirtiveness: 40 } } }` | Per-mission, stored in JSON |
| Slider: `missionDynHostility` | `writeMissionDynamicsToJson()` (line 4150) | Same | Same | Same | `{ missionConfigV1: { dynamics: { hostility: 10 } } }` | Per-mission, stored in JSON |
| Slider: `missionDynDryness` | `writeMissionDynamicsToJson()` (line 4153) | Same | Same | Same | `{ missionConfigV1: { dynamics: { dryness: 40 } } }` | Per-mission, stored in JSON |
| Slider: `missionDynVulnerability` | `writeMissionDynamicsToJson()` (line 4156) | Same | Same | Same | `{ missionConfigV1: { dynamics: { vulnerability: 50 } } }` | Per-mission, stored in JSON |
| Slider: `missionDynEscalationSpeed` | `writeMissionDynamicsToJson()` (line 4159) | Same | Same | Same | `{ missionConfigV1: { dynamics: { escalationSpeed: 50 } } }` | Per-mission, stored in JSON |
| Slider: `missionDynRandomness` | `writeMissionDynamicsToJson()` (line 4162) | Same | Same | Same | `{ missionConfigV1: { dynamics: { randomness: 25 } } }` | Per-mission, stored in JSON |
| Button: "Sync from JSON" | `syncMissionDynamicsFromJson()` (line 4045) | N/A (reads from textarea) | N/A | N/A | Reads from `aiContractJsonTextarea.value` | UI-only, no API call |
| Button: "Write to JSON" | `writeMissionDynamicsToJson()` (line 4101) | N/A (writes to textarea) | N/A | N/A | Writes to `aiContractJsonTextarea.value` | UI-only, no API call |
| EngineConfig Tab: Dynamics Profiles | `renderDynamicsProfilesTab()`, `saveDynamicsProfile()` (lines 6198-6305) | N/A (in-memory only) | `EngineConfigService` (loads/saves JSON) | EngineConfig JSON (not DB table) | `{ dynamicsProfiles: [{ code: "NEUTRAL", pace: 50, ... }] }` | Global config, not per-mission templates |
| Mission Config: `dynamicsProfileCode` | Not exposed in UI | `POST /v1/admin/missions` | `MissionsAdminService` | `PracticeMissionTemplate.aiContract` (JSON) | `{ missionConfigV1: { dynamicsProfileCode: "NEUTRAL" } }` | Optional reference, but UI doesn't expose it |

---

## 4. Gate Requirements: End-to-End Mapping Table

| UI Control | JS Function | API Endpoint | Backend Controller/Service | DB Table/Model | Current Storage Shape | Notes |
|------------|-------------|--------------|----------------------------|----------------|----------------------|-------|
| Checkbox: `missionEnableGateSequenceCheckbox` | `writeMissionDynamicsToJson()` (line 4166) | `POST /v1/admin/missions` or `PUT /v1/admin/missions/:id` | `MissionsAdminController.createMission()` / `updateMission()` | `PracticeMissionTemplate.aiContract` (JSON) | `{ missionConfigV1: { statePolicy: { enableGateSequence: true } } }` | Boolean toggle only, no template selection |
| EngineConfig Tab: Gates Table | `renderGatesTab()`, `saveGate()` (lines 6308-6363) | N/A (in-memory only) | `EngineConfigService` (loads/saves JSON) | EngineConfig JSON (not DB table) | `{ gates: [{ key: "GATE_MIN_MESSAGES", description: "...", active: true }] }` | Global config, defines gate definitions (not requirements) |
| Runtime: Gate Requirements | `getGateRequirementsForObjective()` (registry) | N/A (runtime logic) | `PracticeService.startMissionForUser()` → `objective-gate-mappings.registry.ts` | Hardcoded TypeScript registry | `OBJECTIVE_GATE_MAPPINGS` array | Automatically determined by objective kind + difficulty, not selectable |
| Runtime: Gate Evaluation | `GatesService.evaluateGatesForActiveSession()` | N/A (runtime logic) | `PracticeService.onUserMessage()` → `GatesService` | `GateOutcome` table | `{ sessionId, gateKey, passed, reasonCode, contextJson }` | Per-session outcomes, not templates |
| Insights: Gate Fail Tips | `InsightCatalog.addGateInsights()` (hardcoded) | N/A (runtime logic) | `InsightsService.selectInsights()` → `InsightCatalog` | Hardcoded TypeScript class | `{ id: "gate_min_messages_insufficient", requires: { gateKey: "GATE_MIN_MESSAGES" } }` | Hardcoded, not linked to gate requirement templates |

---

## 5. Schema Reality

### Prisma Models (Relevant Snippets)

**File:** `backend/prisma/schema.prisma`

```prisma
// Lines 191-223
model PracticeMissionTemplate {
  id                    String             @id @default(cuid())
  code                  String             @unique
  title                 String
  description           String?
  timeLimitSec          Int                @default(30)
  maxMessages           Int?
  active                Boolean            @default(true)
  createdAt             DateTime           @default(now())
  baseCoinsReward       Int                @default(10)
  baseGemsReward        Int                @default(0)
  baseXpReward          Int                @default(50)
  categoryId            String?
  goalType              MissionGoalType?
  isVoiceSupported      Boolean            @default(true)
  laneIndex             Int                @default(0)
  orderIndex            Int                @default(0)
  personaId             String?
  wordLimit             Int?
  difficulty            MissionDifficulty  @default(EASY)
  aiContract            Json?              // ⚠️ Stores dynamics + gate config here
  aiStyleId             String?
  isAttractionSensitive Boolean            @default(false)
  targetRomanticGender  Gender?
  moodConfigs           MissionMoodConfig?
  progress              MissionProgress[]
  aiStyle               AiStyle?           @relation(fields: [aiStyleId], references: [id])
  category              MissionCategory?   @relation(fields: [categoryId], references: [id])
  persona               AiPersona?         @relation(fields: [personaId], references: [id])
  sessions              PracticeSession[]

  @@index([aiStyleId])
}

// Lines 602-616
model GateOutcome {
  id          String          @id @default(cuid())
  sessionId   String
  userId      String
  gateKey     String          // ⚠️ String, not FK to template
  passed      Boolean
  reasonCode  String?
  contextJson Json?
  evaluatedAt DateTime        @default(now())
  session     PracticeSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([sessionId, gateKey])
  @@index([sessionId, evaluatedAt])
}

// Lines 495-511
model CustomInsightTemplate {
  id            String   @id @default(cuid())
  key           String   @unique
  kind          String   // 'GATE_FAIL' | 'POSITIVE_HOOK' | ...
  category      String   @default("general")
  title         String
  body          String
  weight        Int      @default(50)
  cooldownMissions Int   @default(3)
  tags          String[] @default([])
  requiresJson  Json?    // ⚠️ Can contain { gateKey }, but no FK relationship
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([kind])
  @@index([category])
}
```

**Migrations Involved:**
- `20250115000000_add_attraction_routing/migration.sql` — Created `PracticeMissionTemplate` table
- `20251118024642_add_grand_plan_core_models/migration.sql` — Added `aiContract` JSON field
- Gate evaluation infrastructure added in Step 5.1 (migration not found in search, but `GateOutcome` model exists)

---

## 6. Risk/Impact Notes

### Factual Coupling Notes

1. **Dynamics stored per-mission in JSON:**
   - `PracticeMissionTemplate.aiContract` stores `missionConfigV1.dynamics` with all 8 slider values (pace, emojiDensity, etc.)
   - **Impact:** Cannot reuse dynamics profiles across missions without copying JSON
   - **Current workaround:** `dynamicsProfileCode` exists in schema but UI doesn't expose it

2. **Gate requirements determined automatically:**
   - `objective-gate-mappings.registry.ts` hardcodes which gates are required for each objective kind + difficulty combo
   - **Impact:** Cannot customize gate requirements per-mission; all missions with same objective/difficulty have same gates
   - **Current workaround:** `enableGateSequence` toggle exists, but doesn't change which gates are required

3. **No table exists for templates:**
   - `DynamicsTemplate` model: **NOT FOUND**
   - `GateRequirementTemplate` model: **NOT FOUND**
   - **Impact:** Cannot create reusable templates; must duplicate config per mission

4. **Gate outcomes stored but not linked to templates:**
   - `GateOutcome.gateKey` is a String (not FK)
   - **Impact:** Cannot query "which missions use this gate template" or "show all gate outcomes for this template"

5. **Tips/hints hardcoded, not template-linked:**
   - `InsightCatalog` has hardcoded gate fail insights with `requires: { gateKey }`
   - `CustomInsightTemplate.requiresJson` can contain `gateKey`, but no FK relationship
   - **Impact:** Cannot manage gate-specific tips as templates; must hardcode or manually link via JSON

6. **EngineConfig has dynamics profiles but not gate requirement templates:**
   - `EngineConfig.dynamicsProfiles` exists (JSON array)
   - `EngineConfig.gates` exists (JSON array) but defines gate **definitions** (thresholds), not gate **requirement templates**
   - **Impact:** Dynamics profiles exist but not selectable in mission builder; gate requirements have no template system at all

---

## 7. Minimal Next Step Candidates

### Dynamics Templates

1. **Add `DynamicsTemplate` Prisma model**
   - Fields: `id`, `code` (unique), `name`, `description`, `active`, `pace`, `emojiDensity`, `flirtiveness`, `hostility`, `dryness`, `vulnerability`, `escalationSpeed`, `randomness`, `createdAt`, `updatedAt`
   - Migration: Create table + seed default profiles (NEUTRAL, COLD_APPROACH_EASY, COLD_APPROACH_HARD)

2. **Add `dynamicsTemplateId` field to `PracticeMissionTemplate`**
   - Migration: Add nullable FK to `DynamicsTemplate`
   - Update `CreateMissionDto` / `UpdateMissionDto` to accept `dynamicsTemplateId`

3. **Add dynamics template selector to mission builder UI**
   - Replace sliders with dropdown + "Override" toggle
   - If template selected: load values from template, allow per-field overrides
   - If no template: show sliders (backward compatibility)

4. **Add endpoints for dynamics templates CRUD**
   - `GET /v1/admin/dynamics-templates` — List all templates
   - `GET /v1/admin/dynamics-templates/:id` — Get single template
   - `POST /v1/admin/dynamics-templates` — Create template
   - `PUT /v1/admin/dynamics-templates/:id` — Update template
   - `DELETE /v1/admin/dynamics-templates/:id` — Delete template

5. **Migrate existing dynamics from EngineConfig JSON to `DynamicsTemplate` table**
   - Script: Read `EngineConfig.dynamicsProfiles`, create `DynamicsTemplate` rows
   - Update missions: If `dynamicsProfileCode` exists, find template by code and set `dynamicsTemplateId`

### Gate Requirement Templates

1. **Add `GateRequirementTemplate` Prisma model**
   - Fields: `id`, `code` (unique), `name`, `description`, `active`, `requiredGates` (String[]), `additionalConditions` (String[]), `createdAt`, `updatedAt`
   - Migration: Create table + seed templates based on `OBJECTIVE_GATE_MAPPINGS` registry

2. **Add `gateRequirementTemplateIds` field to `PracticeMissionTemplate`**
   - Migration: Add `gateRequirementTemplateIds String[]` (array of template IDs)
   - Update `CreateMissionDto` / `UpdateMissionDto` to accept `gateRequirementTemplateIds: string[]`

3. **Add gate requirement template selector to mission builder UI**
   - Multi-select table showing all active templates
   - Show which gates each template requires
   - Allow selecting multiple templates (union of required gates)

4. **Add endpoints for gate requirement templates CRUD**
   - `GET /v1/admin/gate-requirement-templates` — List all templates
   - `GET /v1/admin/gate-requirement-templates/:id` — Get single template
   - `POST /v1/admin/gate-requirement-templates` — Create template
   - `PUT /v1/admin/gate-requirement-templates/:id` — Update template
   - `DELETE /v1/admin/gate-requirement-templates/:id` — Delete template

5. **Update gate evaluation to use selected templates instead of registry**
   - Modify `PracticeService.startMissionForUser()` to read `gateRequirementTemplateIds` from mission
   - Load templates from DB, extract `requiredGates` arrays, union them
   - Fallback: If no templates selected, use `getGateRequirementsForObjective()` (backward compatibility)

6. **Add tips/hints relationship to gate requirement templates**
   - Option A: Add `gateRequirementTemplateId` field to `CustomInsightTemplate`
   - Option B: Create junction table `GateRequirementTemplateInsight` (many-to-many)
   - Update insights selection logic to filter by selected gate requirement templates

---

## Summary

**Current State:**
- Dynamics: Stored per-mission in JSON, sliders in UI, EngineConfig has profiles but not selectable
- Gate Requirements: Determined automatically by objective+difficulty, no templates, only boolean toggle in UI

**Missing Primitives:**
- `DynamicsTemplate` table
- `GateRequirementTemplate` table
- Relationship fields on `PracticeMissionTemplate`
- UI for selecting templates
- Endpoints for template CRUD
- Tips/hints linked to gate requirement templates

**Next Steps:**
- Create Prisma models for templates
- Add relationship fields to mission template
- Build UI for template selection
- Create CRUD endpoints
- Migrate existing data from JSON/registry to tables

