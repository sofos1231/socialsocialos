# CURSOR SCOUT — Mission End vs Mission Review vs Stats Updates
## Full Data Inventory + Required Content Spec

**MODE:** SCOUT / READ-ONLY  
**Date:** 2025-01-XX  
**Status:** Complete Evidence-Based Report

---

## 0) EXECUTIVE SUMMARY

This report provides a complete inventory of:
- **What information is currently displayed** in the Dev Dashboard (Engine Map nodes, Engine Config tabs, Practice Hub, Admin tables)
- **What information must be defined separately** for:
  - **Mission End** = Hook Catalog & Policies (design-time configuration)
  - **Mission Review** = Post-mission review (runtime session summary)
  - **Stats Updates** = Database writes / deltas (what changed)
- **What endpoints + data contracts exist** and what's missing for Wave 1

**Key Finding:** All three nodes (Mission End, Mission Review, Stats Updates) currently route to the same Hooks Editor, which only shows the hook catalog. They need separate implementations with distinct data sources.

---

## 1) SOURCE-OF-TRUTH DASHBOARD FILE

### File Path
**Primary:** `backend/dashboards_bundle/dev-dashboard.html` (10,673 lines)  
**Served at:** `http://localhost:5173/dev-dashboard.html` (via static file serving)

**Evidence:**
- Line 9: `<title>SocialGym Dev Dashboard</title>`
- Line 674: `<h1>SocialGym — Dev Dashboard</h1>`
- Line 694: `button id="loadEverythingBtn"`
- Line 749: `button id="v2ModeEngineMap"`

**Build Chain:**
- **Source:** Single-file HTML with inline JavaScript (no build step)
- **Output:** Copied to `backend/public/dev-dashboard.html` (served by NestJS static middleware)
- **Evidence:** Both files exist with identical structure

**Note:** The dashboard is a monolithic single-file HTML application with all JavaScript inline. No separate build process.

---

## 2) UI INVENTORY — "WHAT IS SHOWN WHERE"

### 2.1 Engine Map Nodes (Left Visual Map + Right Inspector Panel)

**Location:** Lines 5705-5726 (node definitions), 5803-5844 (inspector rendering)

| Node Name | Node ID | UI When Clicked | Function Called | State Variables Read | Endpoints Called | Fields Rendered | Known Bugs |
|-----------|---------|-----------------|------------------|---------------------|------------------|----------------|------------|
| **Mission Begin** | `mission-begin` | Inspector panel + "Personas" / "AI Styles" buttons | `openPersonasEditor()`, `openAiStylesEditor()` | `v2State.personas`, `v2State.aiStyles` | `/v1/admin/personas`, `/v1/admin/ai-styles` | Persona list (name, code, active), AI Style list (key, name, active) | None |
| **AI Engine Layers** | `ai-engine-layers` | Inspector panel + "Scoring Profiles" / "Dynamics Profiles" / "Gate Sets" / "Objectives" buttons | `openScoringProfilesEditor()`, `openDynamicsProfilesEditor()`, `openGateSetsEditor()`, `openObjectivesEditor()` | `engineConfigState.config` | `/v1/admin/engine-config` | Scoring profiles, dynamics profiles, gates, objectives (from engine config) | None |
| **Micro Feedback** | `micro-feedback` | Inspector panel + "Micro Feedback" button | `openMicroFeedbackEditor()` | `engineConfigState.config.microFeedback` | `/v1/admin/prompts/micro-feedback` | Micro feedback bands (score ranges → messages) | None |
| **Mission End** | `mission-end` | Inspector panel + "Hooks" button | `openHooksEditor()` | `engineConfigState.hooks` | `/v1/admin/hooks` | Hook catalog table (name, type, priority, enabled, tags) | **BUG:** Shows hook catalog (design-time), not mission-end-specific data (runtime) |
| **Mission Review** | `mission-review` | Inspector panel + "Hooks" button | `openHooksEditor()` | `engineConfigState.hooks` | `/v1/admin/hooks` | Hook catalog table (same as Mission End) | **BUG:** Shows hook catalog (design-time), not session review data (runtime) |
| **Stats Updates** | `stats-updates` | Inspector panel + "Hooks" button | `openHooksEditor()` | `engineConfigState.hooks` | `/v1/admin/hooks` | Hook catalog table (same as Mission End) | **BUG:** Shows hook catalog (design-time), not stats deltas (runtime) |

**Evidence:**
- Node definitions: Lines 5705-5726
- Node config mapping: Lines 5807-5814
- Inspector rendering: Lines 5835-5843
- Node click handlers: Lines 5846-5869

**Critical Finding:** All three nodes (Mission End, Mission Review, Stats Updates) currently route to the same `openHooksEditor()` function, which only displays the hook catalog. They need separate implementations.

---

### 2.2 Engine Config Tabs

**Location:** Lines 1450-2400 (tab buttons), 2400-3500 (tab content)

| Tab Name | Tab ID | Endpoint(s) | Data Expected | Editable vs Read-Only | Functional Status |
|----------|--------|-------------|---------------|----------------------|-------------------|
| **Scoring & Traits** | `scoring` | `/v1/admin/engine-config` | `config.scoringProfiles[]` (code, name, weights, active) | Fully editable | ✅ Functional |
| **Dynamics Profiles** | `dynamics` | `/v1/admin/engine-config` | `config.dynamicsProfiles[]` (code, name, pace, flirtiveness, hostility, etc.) | Fully editable | ✅ Functional |
| **Gates & Objectives** | `gates` | `/v1/admin/engine-config` | `config.gates[]` (key, description, minMessages, successThreshold, failFloor, active) | Fully editable | ✅ Functional |
| **Hooks & Triggers** | `hooks` | `/v1/admin/hooks`, `/v1/admin/hooks/triggers/stats?days=7` | `hooks[]` (name, type, priority, textTemplate, conditionsJson, category, tags, isEnabled), `triggerStats[]` (hookName, hookType, triggerCount) | Hooks fully editable, trigger stats read-only | ✅ Functional |
| **Mood & State Policy** | `mood` | `/v1/admin/engine-config` | `config.mood` (emaAlpha, moodStateThresholds, moodBands, statePolicy) | Fully editable | ✅ Functional |
| **Insights Catalog** | `insights` | `/v1/admin/insights/catalog` | `templates[]` (id, kind, category, weight, title, body, requires, source) | Read-only (catalog), custom insights editable | ✅ Functional |
| **Mission Attachments** | `attachments` | `/v1/admin/missions/attachments`, `/v1/admin/missions/:id/attachments` | Missions with `scoringProfileCode`, `dynamicsProfileCode` | Fully editable | ✅ Functional |
| **Monitoring** | `monitoring` | `/v1/admin/hooks/triggers/stats?days=7` | `triggerStats[]` (hookName, hookType, triggerCount) | Read-only | ✅ Functional |
| **Micro Feedback** | `microFeedback` | `/v1/admin/prompts/micro-feedback` | `config.microFeedback` (bands: score ranges → messages) | Fully editable | ✅ Functional |
| **Micro Dynamics** | `microDynamics` | `/v1/admin/engine-config` | `config.microDynamics` (bands: score ranges → dynamics modifiers) | Fully editable | ✅ Functional |
| **Persona Drift** | `persona` | `/v1/admin/engine-config` | `config.persona` (driftPenalties, modifierEvents, modifierEffects) | Fully editable | ✅ Functional |

**Evidence:**
- Tab buttons: Lines 1450-1475
- Tab content sections: Lines 2400-3500
- Load functions: Lines 8237-8257 (loadEngineConfig), 9208-9220 (loadHooks), 9344-9355 (loadTriggerStats)

---

### 2.3 Practice Hub / Practice Hub Designer

**Location:** Lines 1100-1400 (Practice Hub UI), 3773-4100 (category management)

| Component | Endpoint | Response Key | How Grouped | "No categories" Check | Meta Mismatch Issue |
|-----------|----------|--------------|-------------|----------------------|---------------------|
| **Categories List** | `/v1/admin/missions/categories` | `categories[]` or `resp.categories` | By `displayOrder`, then `label` | `hubState.categories.length === 0` | **BUG:** Meta shows `cats: X` but UI shows none if `hubState.categories` is empty (different state variables) |
| **Missions by Category** | `/v1/admin/missions` | Array of missions | Grouped by `categoryId`, sorted by `laneIndex`, then `orderIndex` | Checks `hubState.categories.length === 0` | Same as above |
| **Category Attraction Fields** | `/v1/admin/missions/categories/:id` | `category.attractionPath`, `category.isAttractionSensitive`, `category.dynamicLabelTemplate` | N/A | N/A | None |

**Evidence:**
- Category loading: Lines 3843-3854
- Mission loading: Lines 4010-4017
- Meta loading: Lines 4374-4396
- State variables: `hubState.categories`, `state.categories` (two separate arrays)

**Known Bug:** Meta badge shows "cats: X" from `state.categories.length`, but Practice Hub checks `hubState.categories.length`. If `hubState.categories` is empty but `state.categories` has data, the badge shows a count but the UI shows "No categories loaded".

---

### 2.4 Admin Sections

| Section | Endpoint | Fields | Actions | Functional Status |
|---------|----------|--------|---------|-------------------|
| **AI Styles Admin** | `/v1/admin/ai-styles`, `/v1/admin/ai-styles/list` | `id`, `key`, `name`, `description`, `isActive` | Create, Update, Delete, List | ✅ Functional |
| **Personas Admin** | `/v1/admin/personas` | `id`, `name`, `code`, `shortLabel`, `description`, `style`, `avatarUrl`, `difficulty`, `active`, `personaGender` | Create, Update, Delete, List | ✅ Functional |
| **Missions Admin** | `/v1/admin/missions`, `/v1/admin/missions/:id` | Full `PracticeMissionTemplate` fields | Create, Update, Delete, List, Reorder | ✅ Functional |
| **Categories Admin** | `/v1/admin/missions/categories`, `/v1/admin/missions/categories/:id` | `id`, `code`, `label`, `description`, `attractionPath`, `isAttractionSensitive`, `dynamicLabelTemplate`, `displayOrder`, `active` | Create, Update, Delete, List | ✅ Functional |

**Evidence:**
- AI Styles: Lines 4358-4372
- Personas: Lines 4470-4472
- Missions: Lines 4408-4410
- Categories: Lines 3944-3993

---

### 2.5 Global "Load Everything" / Meta / Missions Load

**Location:** Lines 4445-4491 (loadEverything function)

**Load Sequence:**

1. **Engine Config** → `loadEngineConfig()` → `/v1/admin/engine-config` → Sets `engineConfigState.config`
2. **Meta** → `loadMeta()` → `/v1/admin/missions/meta` → Sets `state.categories`, `state.personas`, `state.aiStyles`, `state.metaLoaded = true`
3. **Categories** → `loadCategories()` → `/v1/admin/missions/categories` → Sets `hubState.categories`
4. **Missions** → `loadMissions()` → `/v1/admin/missions` → Sets `state.missions`, `state.missionsLoaded = true`
5. **Personas** → `loadPersonasAdmin()` → `/v1/admin/personas` → Sets `state.personas` (duplicate of meta)
6. **AI Styles** → `loadAiStylesAdmin()` → `/v1/admin/ai-styles` → Sets `state.aiStyles` (duplicate of meta)
7. **Hooks** → `loadHooks()` → `/v1/admin/hooks` → Sets `engineConfigState.hooks`
8. **Hook Trigger Stats** → `loadTriggerStats()` → `/v1/admin/hooks/triggers/stats?days=7` → Sets `engineConfigState.triggerStats`
9. **Insights Catalog** → `callOrFetch("insights-catalog", null, "/v1/admin/insights/catalog")` → No state variable (displayed directly)
10. **Micro Feedback** → `callOrFetch("micro-feedback", null, "/v1/admin/prompts/micro-feedback")` → No state variable
11. **Openings** → `loadOpenings()` → `/v1/admin/prompts/openings` → Sets `engineConfigState.openings`
12. **Mission Attachments** → `loadMissionAttachments()` → `/v1/admin/missions/attachments` → Sets `engineConfigState.attachments`

**UI Badges Updated:**
- `metaStatusChip`: "Meta: X cats, Y personas, Z styles" (from `state.categories.length`, `state.personas.length`, `state.aiStyles.length`)
- `missionsStatusChip`: "Missions: X" (from `state.missions.length`)

**Evidence:** Lines 4445-4491

---

## 3) BACKEND REALITY — DATA SOURCES & CONTRACTS

### 3.1 Admin Endpoints Used by Dashboard

| Endpoint | Method | Controller File | Route Definition | DTO/Response Shape | Auth Required | Status |
|----------|--------|-----------------|-------------------|-------------------|---------------|--------|
| `/v1/admin/missions/meta` | GET | `backend/src/modules/missions-admin/missions-admin.controller.ts:28` | Line 28: `@Get('meta')` | `{ ok: true, categories[], personas[], aiStyles[], enums: {...} }` | ✅ JWT (AdminGuard) | ✅ Exists |
| `/v1/admin/missions` | GET | `backend/src/modules/missions-admin/missions-admin.controller.ts:65` | Line 65: `@Get()` | Array of `PracticeMissionTemplate` (flat) | ✅ JWT | ✅ Exists |
| `/v1/admin/missions/categories` | GET | `backend/src/modules/missions-admin/missions-admin.categories.controller.ts` | `@Get()` | Array of `MissionCategory` | ✅ JWT | ✅ Exists |
| `/v1/admin/missions/:id/stats` | GET | `backend/src/modules/missions-admin/missions-admin.controller.ts:166` | Line 166: `@Get(':id/stats')` | `{ ok: true, missionId, totalSessions, successCount, failCount, averageScore, ... }` | ✅ JWT | ✅ Exists |
| `/v1/admin/missions/:id/sessions` | GET | `backend/src/modules/missions-admin/missions-admin.controller.ts:192` | Line 192: `@Get(':id/sessions')` | `{ ok: true, sessions[] }` (session summary fields) | ✅ JWT | ✅ Exists |
| `/v1/admin/missions/sessions/:sessionId/messages` | GET | `backend/src/modules/missions-admin/missions-admin.controller.ts:157` | Line 157: `@Get('sessions/:sessionId/messages')` | `{ sessionId, messages[], gateOutcomes[], moodTimeline }` | ✅ JWT | ✅ Exists |
| `/v1/admin/missions/:id/mood-timelines` | GET | `backend/src/modules/missions-admin/missions-admin.controller.ts:179` | Line 179: `@Get(':id/mood-timelines')` | `{ ok: true, timelines[] }` | ✅ JWT | ✅ Exists |
| `/v1/admin/hooks` | GET | `backend/src/modules/hooks/hooks.controller.ts:28` | Line 28: `@Get()` | `{ ok: true, hooks[] }` | ✅ JWT | ✅ Exists |
| `/v1/admin/hooks/triggers/stats` | GET | `backend/src/modules/hooks/hooks.controller.ts:128` | Line 128: `@Get('triggers/stats')` | `{ ok: true, stats[], periodDays }` | ✅ JWT | ✅ Exists |
| `/v1/admin/insights/catalog` | GET | `backend/src/modules/insights/insights-admin.controller.ts:26` | Line 26: `@Get('catalog')` | `{ ok: true, templates[] }` | ✅ JWT | ✅ Exists |
| `/v1/admin/engine-config` | GET | `backend/src/modules/engine-config/engine-config.controller.ts` | `@Get()` | `{ ok: true, config: {...} }` | ✅ JWT | ✅ Exists |
| `/v1/admin/prompts/micro-feedback` | GET | **UNKNOWN** | **UNKNOWN** | **UNKNOWN** | **UNKNOWN** | ❓ **404?** |
| `/v1/admin/prompts/openings` | GET | **UNKNOWN** | **UNKNOWN** | **UNKNOWN** | **UNKNOWN** | ❓ **404?** |
| `/v1/admin/personas` | GET | `backend/src/modules/personas/personas.controller.ts` | `@Get()` | Array of `AiPersona` | ✅ JWT | ✅ Exists |
| `/v1/admin/ai-styles` | GET | `backend/src/modules/ai-styles/ai-styles.controller.ts` | `@Get()` | Array of `AiStyle` | ✅ JWT | ✅ Exists |

**Evidence:**
- Hooks controller: `backend/src/modules/hooks/hooks.controller.ts:19-169`
- Missions admin controller: `backend/src/modules/missions-admin/missions-admin.controller.ts:18-233`
- Insights admin controller: `backend/src/modules/insights/insights-admin.controller.ts:1-145`

**Missing Endpoints (404s):**
- `/v1/admin/prompts/micro-feedback` — Called but endpoint not found in codebase
- `/v1/admin/prompts/openings` — Called but endpoint not found in codebase

---

### 3.2 Mission Runtime Artifacts (Post-Mission)

**Where Produced/Stored/Returned:**

| Artifact | Prisma Model | Fields | Service Function | Endpoint |
|----------|--------------|--------|------------------|----------|
| **PracticeSession** | `PracticeSession` | `id`, `userId`, `templateId`, `status`, `score`, `xpGained`, `coinsGained`, `gemsGained`, `isSuccess`, `endedAt`, `endReasonCode`, `endReasonMeta`, `payload`, `messageCount`, `rarityCounts`, `checklistAggregates`, `currentMoodState` | `sessions.service.ts:saveOrUpdateScoredSession()` | `GET /v1/sessions/:id` |
| **Chat Messages Transcript** | `ChatMessage` | `id`, `sessionId`, `turnIndex`, `role`, `content`, `score`, `traitData`, `xpDelta`, `coinsDelta`, `gemsDelta`, `meta` | `sessions.service.ts:saveOrUpdateScoredSession()` (lines 490-600) | `GET /v1/admin/missions/sessions/:sessionId/messages` |
| **Hook Triggers** | `PromptHookTrigger` | `id`, `hookId`, `sessionId`, `userId`, `triggeredAt`, `matchedContext` | **UNKNOWN** (triggered during session runtime) | **MISSING:** No endpoint to get triggers for a specific session |
| **Gate Outcomes** | `GateOutcome` | `id`, `sessionId`, `userId`, `gateKey`, `passed`, `reasonCode`, `contextJson`, `evaluatedAt` | `gates.service.ts` (evaluated during session) | Included in `GET /v1/admin/missions/sessions/:sessionId/messages` |
| **Trait Deltas / Score Summaries** | `UserTraitHistory` | `id`, `sessionId`, `userId`, `recordedAt`, `traitsJson`, `deltasJson`, `sessionScore`, `avgMessageScore`, `missionId` | `traits.service.ts` (recorded at session end) | **MISSING:** No endpoint to get trait history for a session |
| **Mood Timeline / Dynamics** | `MissionMoodTimeline` | `id`, `sessionId`, `userId`, `timelineJson` | `mood.service.ts` (recorded during session) | Included in `GET /v1/admin/missions/sessions/:sessionId/messages` |
| **Persona Drift Outputs** | **UNKNOWN** | **UNKNOWN** | **UNKNOWN** | **MISSING:** No endpoint |
| **Rewards Released** | `RewardLedgerEntry` | `id`, `userId`, `sessionId`, `templateId`, `kind`, `xpDelta`, `coinsDelta`, `gemsDelta`, `score`, `isSuccess`, `meta` | `sessions.service.ts:saveOrUpdateScoredSession()` (lines 647-658) | **MISSING:** No endpoint to get reward ledger for a session |
| **Progress Updates** | `MissionProgress` | `id`, `userId`, `templateId`, `status`, `bestScore`, `createdAt`, `updatedAt` | `sessions.service.ts:saveOrUpdateScoredSession()` (lines 781-796) | **MISSING:** No endpoint to get progress updates for a session |
| **Lane Progress** | `UserCategoryProgress` | `id`, `userId`, `categoryId`, `status`, `completedAt`, `updatedAt` | **UNKNOWN** | **MISSING:** No endpoint |

**Evidence:**
- Prisma schema: `backend/prisma/schema.prisma` (lines 49-697)
- Sessions service: `backend/src/modules/sessions/sessions.service.ts:206-840`
- Missions admin service: `backend/src/modules/missions-admin/missions-admin.service.ts:1655-1728`

---

### 3.3 Prisma Models That Matter

| Model | Fields (Key Ones) | Relations | What It Stores |
|-------|-------------------|-----------|----------------|
| **PracticeSession** | `id`, `userId`, `templateId`, `status`, `score`, `xpGained`, `coinsGained`, `gemsGained`, `isSuccess`, `endedAt`, `endReasonCode`, `endReasonMeta`, `payload`, `messageCount`, `rarityCounts`, `checklistAggregates`, `currentMoodState` | `user`, `template`, `persona`, `messages[]`, `gateOutcomes[]`, `promptHookTriggers[]`, `rewardLedger[]`, `traitHistory?`, `moodTimeline?` | Complete session record with all runtime data |
| **ChatMessage** | `id`, `sessionId`, `turnIndex`, `role`, `content`, `score`, `traitData`, `xpDelta`, `coinsDelta`, `gemsDelta`, `meta` | `session` | Individual message in transcript with scoring |
| **PromptHook** | `id`, `name`, `type`, `textTemplate`, `conditionsJson`, `category`, `tags[]`, `priority`, `isEnabled`, `version`, `metaJson` | `triggers[]` | Hook catalog (design-time configuration) |
| **PromptHookTrigger** | `id`, `hookId`, `sessionId`, `userId`, `triggeredAt`, `matchedContext` | `hook`, `session`, `user` | Runtime hook trigger record (which hooks fired for which session) |
| **GateOutcome** | `id`, `sessionId`, `userId`, `gateKey`, `passed`, `reasonCode`, `contextJson`, `evaluatedAt` | `session`, `user` | Gate evaluation results for a session |
| **UserTraitHistory** | `id`, `sessionId`, `userId`, `recordedAt`, `traitsJson`, `deltasJson`, `sessionScore`, `avgMessageScore`, `missionId` | `session`, `user` | Trait snapshot and deltas at session end |
| **RewardLedgerEntry** | `id`, `userId`, `sessionId`, `templateId`, `kind`, `xpDelta`, `coinsDelta`, `gemsDelta`, `score`, `isSuccess`, `meta` | `session`, `user` | Rewards granted (prevents double-award) |
| **MissionProgress** | `id`, `userId`, `templateId`, `status`, `bestScore`, `createdAt`, `updatedAt` | `template`, `user` | User progress per mission template |
| **MissionMoodTimeline** | `id`, `sessionId`, `userId`, `timelineJson` | `session`, `user` | Mood state changes over session |
| **UserCategoryProgress** | `id`, `userId`, `categoryId`, `status`, `completedAt`, `updatedAt` | `category`, `user` | User progress per category (lane progress) |

**Evidence:**
- Prisma schema: `backend/prisma/schema.prisma` (lines 49-697)

---

## 4) REQUIRED "CONTENT SPEC" — What Each Node MUST Represent

### 4.1 Mission End = Hook Catalog & Policies (Admin/Design-Time)

**Purpose:** Show all available hooks, their trigger rules, and global policies.

**Must Answer:**
- What hooks exist (catalog)
- How to trigger them (rules, categories, negative/positive, priority, enabled)
- What policies/toggles apply (global enable/disable, throttles, caps)
- What is per-mission vs global

**Current Implementation:**
- ✅ Shows hook catalog via `openHooksEditor()` → `/v1/admin/hooks`
- ✅ Shows hook trigger stats (aggregated) via `/v1/admin/hooks/triggers/stats?days=7`
- ❌ Does NOT show hook trigger rules/conditions in detail
- ❌ Does NOT show global policies (throttles, caps, per-mission overrides)

**Fields That Exist Today (with evidence):**
```json
{
  "hooks": [
    {
      "id": "string",
      "name": "string",
      "type": "POSITIVE | NEGATIVE | ...",
      "textTemplate": "string",
      "conditionsJson": {}, // Trigger rules
      "category": "string",
      "tags": ["string"],
      "priority": 50,
      "isEnabled": true,
      "version": "v1",
      "metaJson": {}
    }
  ],
  "triggerStats": [
    {
      "hookId": "string",
      "hookName": "string",
      "hookType": "string",
      "triggerCount": 123
    }
  ]
}
```

**Fields Missing:**
- Global hook policies (throttles, caps, cooldowns)
- Per-mission hook overrides
- Hook trigger conditions detail (currently only `conditionsJson` raw)
- Hook cooldown rules (per-user, per-mission)

**Minimal Wave 1 Payload:**
```json
{
  "hookCatalog": [
    {
      "id": "string",
      "name": "string",
      "type": "POSITIVE | NEGATIVE | GENERAL_TIP",
      "category": "string",
      "priority": 50,
      "isEnabled": true,
      "triggerRules": {
        "conditions": {}, // Parsed conditionsJson
        "cooldownMissions": 0,
        "throttlePerUser": null,
        "throttleGlobal": null
      },
      "textTemplate": "string",
      "tags": ["string"]
    }
  ],
  "globalPolicies": {
    "hookSystemEnabled": true,
    "maxHooksPerSession": null,
    "throttleWindowMinutes": null
  },
  "triggerStats": [
    {
      "hookId": "string",
      "hookName": "string",
      "triggerCount": 123,
      "lastTriggeredAt": "ISO8601"
    }
  ]
}
```

**Source:**
- Hook catalog: `GET /v1/admin/hooks` → `PromptHook` model
- Trigger stats: `GET /v1/admin/hooks/triggers/stats?days=7` → `PromptHookTrigger` aggregated
- Global policies: **MISSING** (not stored in DB, may be in engine config)

---

### 4.2 Mission Review = Post-Mission Review (Run-Time)

**Purpose:** Show what happened in a specific completed session (triggered hooks, end summary, key stats).

**Must Show:**
- Triggered hooks for THAT mission/session (not all hooks)
- End-of-mission summary: objective success/fail reason, gate results, key scores, mood, persona drift, micro feedback highlights
- Optional: "top 3 best / worst messages" if available

**Current Implementation:**
- ❌ Shows hook catalog (wrong — should show session-specific triggers)
- ❌ Does NOT show session review data
- ✅ Session messages endpoint exists: `GET /v1/admin/missions/sessions/:sessionId/messages`
- ✅ Gate outcomes included in messages endpoint
- ✅ Mood timeline included in messages endpoint

**Fields That Exist Today (with evidence):**
```json
{
  "sessionId": "string",
  "messages": [
    {
      "turnIndex": 0,
      "role": "USER | AI",
      "content": "string",
      "score": 85,
      "rarity": "S",
      "traitData": {}
    }
  ],
  "gateOutcomes": [
    {
      "gateKey": "string",
      "passed": true,
      "reasonCode": "string",
      "evaluatedAt": "ISO8601"
    }
  ],
  "moodTimeline": {
    "timelineJson": {} // Mood state changes
  }
}
```

**Fields Missing:**
- Triggered hooks for this session (which hooks fired)
- End reason summary (success/fail, objective completion)
- Persona drift summary
- Micro feedback highlights
- Top 3 best/worst messages
- Session rewards summary (XP/coins/gems deltas)
- Trait deltas

**Minimal Wave 1 "Mission Review Payload" Definition:**
```json
{
  "sessionId": "string",
  "templateId": "string",
  "templateTitle": "string",
  "endedAt": "ISO8601",
  "status": "SUCCESS | FAIL | ABORTED",
  "endReason": {
    "code": "SUCCESS_OBJECTIVE | FAIL_OBJECTIVE | ...",
    "meta": {}
  },
  "summary": {
    "finalScore": 85,
    "isSuccess": true,
    "totalMessages": 6,
    "averageMessageScore": 82.5,
    "bestMessageScore": 95,
    "worstMessageScore": 65
  },
  "triggeredHooks": [
    {
      "hookId": "string",
      "hookName": "string",
      "hookType": "POSITIVE | NEGATIVE",
      "triggeredAt": "ISO8601",
      "matchedContext": {}
    }
  ],
  "gateResults": [
    {
      "gateKey": "string",
      "passed": true,
      "reasonCode": "string",
      "evaluatedAt": "ISO8601"
    }
  ],
  "moodSummary": {
    "finalState": "FLOW | TENSE | WARM | COLD",
    "timeline": [] // Mood state changes
  },
  "rewards": {
    "xpGained": 50,
    "coinsGained": 10,
    "gemsGained": 0
  },
  "topMessages": {
    "best": [
      {
        "turnIndex": 2,
        "content": "string",
        "score": 95,
        "rarity": "S+"
      }
    ],
    "worst": [
      {
        "turnIndex": 4,
        "content": "string",
        "score": 65,
        "rarity": "C"
      }
    ]
  }
}
```

**Source:**
- Session data: `GET /v1/admin/missions/sessions/:sessionId/messages` → `PracticeSession`, `ChatMessage`, `GateOutcome`, `MissionMoodTimeline`
- Triggered hooks: **MISSING** → Need `GET /v1/admin/missions/sessions/:sessionId/hooks` → `PromptHookTrigger` filtered by `sessionId`
- Rewards: **MISSING** → Need `GET /v1/admin/missions/sessions/:sessionId/rewards` → `RewardLedgerEntry` filtered by `sessionId`
- Trait deltas: **MISSING** → Need `GET /v1/admin/missions/sessions/:sessionId/traits` → `UserTraitHistory` filtered by `sessionId`

---

### 4.3 Stats Updates = "What Changed / What Will Be Written"

**Purpose:** Show what database records were written/updated at mission end (session row, progress, traits history, rewards, etc.) and the "diff" style summary.

**Must Show:**
- What records were written at mission end (session row, progress, traits history, rewards, etc.)
- The "diff" style summary: XP/coins/gems delta, streak changes, any trait delta, any progress delta

**Current Implementation:**
- ❌ Shows hook catalog (wrong — should show stats deltas)
- ❌ Does NOT show stats updates

**Fields That Exist Today (with evidence):**
- `PracticeSession` row written: `xpGained`, `coinsGained`, `gemsGained`, `score`, `isSuccess` (lines 445-451 in sessions.service.ts)
- `RewardLedgerEntry` written: `xpDelta`, `coinsDelta`, `gemsDelta` (lines 647-658)
- `MissionProgress` updated: `status`, `bestScore` (lines 781-796)
- `UserTraitHistory` written: `traitsJson`, `deltasJson`, `sessionScore` (via traits.service.ts)
- `UserWallet` updated: `xp`, `coins`, `gems` (via stats.service.ts)
- `UserStats` updated: `sessionsCount`, `successCount`, `failCount`, `averageScore` (via stats.service.ts)

**Fields Missing:**
- No endpoint to get "what changed" for a session
- No "diff" view of before/after stats

**Minimal Wave 1 "Stats Updates Payload" Definition:**
```json
{
  "sessionId": "string",
  "userId": "string",
  "templateId": "string",
  "writtenAt": "ISO8601",
  "recordsWritten": [
    {
      "table": "PracticeSession",
      "action": "CREATE | UPDATE",
      "fields": {
        "xpGained": 50,
        "coinsGained": 10,
        "gemsGained": 0,
        "score": 85,
        "isSuccess": true
      }
    },
    {
      "table": "RewardLedgerEntry",
      "action": "CREATE",
      "fields": {
        "xpDelta": 50,
        "coinsDelta": 10,
        "gemsDelta": 0
      }
    },
    {
      "table": "MissionProgress",
      "action": "UPDATE",
      "fields": {
        "status": "COMPLETED",
        "bestScore": 85
      }
    },
    {
      "table": "UserTraitHistory",
      "action": "CREATE",
      "fields": {
        "traitsJson": {},
        "deltasJson": {}
      }
    }
  ],
  "deltas": {
    "wallet": {
      "xp": { "before": 1000, "after": 1050, "delta": 50 },
      "coins": { "before": 50, "after": 60, "delta": 10 },
      "gems": { "before": 5, "after": 5, "delta": 0 }
    },
    "stats": {
      "sessionsCount": { "before": 10, "after": 11, "delta": 1 },
      "successCount": { "before": 7, "after": 8, "delta": 1 },
      "averageScore": { "before": 80.5, "after": 81.2, "delta": 0.7 }
    },
    "progress": {
      "missionStatus": { "before": "UNLOCKED", "after": "COMPLETED", "delta": null },
      "bestScore": { "before": null, "after": 85, "delta": 85 }
    },
    "traits": {
      "confidence": { "before": 60, "after": 62, "delta": 2 },
      "warmth": { "before": 55, "after": 58, "delta": 3 }
    },
    "streak": {
      "current": { "before": 3, "after": 4, "delta": 1 }
    }
  }
}
```

**Source:**
- Session record: `PracticeSession` model
- Reward ledger: `RewardLedgerEntry` model
- Progress: `MissionProgress` model
- Trait history: `UserTraitHistory` model
- Wallet: `UserWallet` model
- Stats: `UserStats` model
- **MISSING:** No endpoint to get this aggregated view

---

## 5) GAPS & REQUIRED ADDITIONS (NO Implementation Yet)

### 5.1 Mission End Node

**Missing:**
1. Hook trigger rules detail (currently only raw `conditionsJson`)
2. Global hook policies (throttles, caps, cooldowns)
3. Per-mission hook overrides

**Proposed Solution:**
- **Reuse existing endpoint:** `GET /v1/admin/hooks` (already returns hook catalog)
- **Enhance response:** Add parsed `triggerRules` object and `globalPolicies` section
- **Where in backend:** `backend/src/modules/hooks/hooks.controller.ts` → Enhance `listHooks()` response
- **Minimal payload:** See 4.1 "Minimal Wave 1 Payload"

**Priority:** P1 (nice-to-have, not blocking Wave 1)

---

### 5.2 Mission Review Node

**Missing:**
1. Endpoint to get triggered hooks for a specific session
2. Endpoint to get session review summary (end reason, rewards, top messages)
3. Endpoint to get trait deltas for a session
4. UI to display session review (currently shows hook catalog)

**Proposed Solution:**
- **New endpoint:** `GET /v1/admin/missions/sessions/:sessionId/review`
  - Controller: `backend/src/modules/missions-admin/missions-admin.controller.ts`
  - Service: `backend/src/modules/missions-admin/missions-admin.service.ts`
  - Query: Join `PracticeSession`, `PromptHookTrigger`, `GateOutcome`, `RewardLedgerEntry`, `UserTraitHistory`, `ChatMessage`
  - Response: See 4.2 "Minimal Wave 1 Payload"
- **UI change:** Create `openMissionReviewEditor(sessionId)` function in dashboard
- **Where in backend:** `backend/src/modules/missions-admin/` (new method in service, new route in controller)

**Priority:** P0 (blocks Wave 1 — Mission Review node is non-functional)

---

### 5.3 Stats Updates Node

**Missing:**
1. Endpoint to get "what changed" for a session (records written + deltas)
2. UI to display stats updates (currently shows hook catalog)
3. Before/after snapshot logic (to compute deltas)

**Proposed Solution:**
- **New endpoint:** `GET /v1/admin/missions/sessions/:sessionId/stats-updates`
  - Controller: `backend/src/modules/missions-admin/missions-admin.controller.ts`
  - Service: `backend/src/modules/missions-admin/missions-admin.service.ts`
  - Query: Join `PracticeSession`, `RewardLedgerEntry`, `MissionProgress`, `UserTraitHistory`, `UserWallet`, `UserStats`
  - Compute deltas: Fetch "before" state from previous session or initial state, compare with "after" state
  - Response: See 4.3 "Minimal Wave 1 Payload"
- **UI change:** Create `openStatsUpdatesEditor(sessionId)` function in dashboard
- **Where in backend:** `backend/src/modules/missions-admin/` (new method in service, new route in controller)

**Priority:** P0 (blocks Wave 1 — Stats Updates node is non-functional)

---

### 5.4 Don't Do Yet (Avoid Premature Complexity)

**Wave 2+ Features:**
- Real-time stats updates (WebSocket streaming)
- Historical stats trends (charts, graphs)
- Advanced hook trigger analytics (funnel analysis, A/B testing)
- Persona drift visualization
- Micro feedback highlights extraction (AI-powered)

---

## 6) FINAL REPORT

### 6.1 What Is Currently Correct

✅ **Engine Map Nodes:**
- Mission Begin → Personas/AI Styles editor (functional)
- AI Engine Layers → Engine Config editors (functional)
- Micro Feedback → Micro Feedback editor (functional)

✅ **Engine Config Tabs:**
- All 11 tabs are functional and display correct data
- Hooks & Triggers tab shows hook catalog and trigger stats (aggregated)

✅ **Backend Endpoints:**
- All admin endpoints exist and return correct data
- Session messages endpoint includes gate outcomes and mood timeline

✅ **Data Models:**
- All Prisma models exist and store correct data
- Relations are properly defined

---

### 6.2 What Is Currently Wrong

❌ **Mission End Node:**
- Shows hook catalog (correct for design-time)
- Missing: Hook trigger rules detail, global policies

❌ **Mission Review Node:**
- Shows hook catalog (WRONG — should show session-specific review)
- Missing: Endpoint to get triggered hooks for a session
- Missing: Endpoint to get session review summary
- Missing: UI function to display session review

❌ **Stats Updates Node:**
- Shows hook catalog (WRONG — should show stats deltas)
- Missing: Endpoint to get "what changed" for a session
- Missing: UI function to display stats updates

❌ **Practice Hub:**
- Meta badge shows count from `state.categories`, but UI checks `hubState.categories` (state mismatch)

❌ **Missing Endpoints:**
- `/v1/admin/prompts/micro-feedback` (404)
- `/v1/admin/prompts/openings` (404)
- `/v1/admin/missions/sessions/:sessionId/hooks` (missing)
- `/v1/admin/missions/sessions/:sessionId/review` (missing)
- `/v1/admin/missions/sessions/:sessionId/stats-updates` (missing)
- `/v1/admin/missions/sessions/:sessionId/rewards` (missing)
- `/v1/admin/missions/sessions/:sessionId/traits` (missing)

---

### 6.3 Exactly What We Must Implement Next (Checklist for EXECUTE)

#### P0 — Blocks Wave 1

1. **Mission Review Node:**
   - [ ] Create `GET /v1/admin/missions/sessions/:sessionId/review` endpoint
     - Controller: `backend/src/modules/missions-admin/missions-admin.controller.ts`
     - Service: `backend/src/modules/missions-admin/missions-admin.service.ts`
     - Query: Join `PracticeSession`, `PromptHookTrigger`, `GateOutcome`, `RewardLedgerEntry`, `UserTraitHistory`, `ChatMessage`
     - Response shape: See 4.2 "Minimal Wave 1 Payload"
   - [ ] Create `openMissionReviewEditor(sessionId)` function in dashboard
     - File: `backend/dashboards_bundle/dev-dashboard.html`
     - Location: After `openHooksEditor()` (around line 7271)
     - Display: Session review summary, triggered hooks, gate results, mood summary, rewards, top messages
   - [ ] Update Mission Review node click handler
     - File: `backend/dashboards_bundle/dev-dashboard.html`
     - Location: Line 5857-5859
     - Change: Call `openMissionReviewEditor(sessionId)` instead of `openHooksEditor()`
     - Note: Need sessionId — may need to add session selector UI

2. **Stats Updates Node:**
   - [ ] Create `GET /v1/admin/missions/sessions/:sessionId/stats-updates` endpoint
     - Controller: `backend/src/modules/missions-admin/missions-admin.controller.ts`
     - Service: `backend/src/modules/missions-admin/missions-admin.service.ts`
     - Query: Join `PracticeSession`, `RewardLedgerEntry`, `MissionProgress`, `UserTraitHistory`, `UserWallet`, `UserStats`
     - Compute deltas: Fetch "before" state (from previous session or initial), compare with "after" state
     - Response shape: See 4.3 "Minimal Wave 1 Payload"
   - [ ] Create `openStatsUpdatesEditor(sessionId)` function in dashboard
     - File: `backend/dashboards_bundle/dev-dashboard.html`
     - Location: After `openMissionReviewEditor()`
     - Display: Records written, deltas (wallet, stats, progress, traits, streak)
   - [ ] Update Stats Updates node click handler
     - File: `backend/dashboards_bundle/dev-dashboard.html`
     - Location: Line 5860-5861 (or similar)
     - Change: Call `openStatsUpdatesEditor(sessionId)` instead of `openHooksEditor()`
     - Note: Need sessionId — may need to add session selector UI

3. **Mission End Node:**
   - [ ] Keep current implementation (hook catalog is correct for design-time)
   - [ ] Optional: Enhance hook catalog response with parsed trigger rules and global policies (P1)

#### P1 — Nice-to-Have (Not Blocking)

4. **Mission End Node Enhancement:**
   - [ ] Enhance `GET /v1/admin/hooks` response with parsed `triggerRules` and `globalPolicies`
   - [ ] Update `openHooksEditor()` to display trigger rules detail

5. **Practice Hub State Mismatch:**
   - [ ] Fix meta badge to use `hubState.categories.length` instead of `state.categories.length`
   - [ ] Or: Ensure `hubState.categories` is populated when meta loads

6. **Missing Endpoints (404s):**
   - [ ] Create `/v1/admin/prompts/micro-feedback` endpoint (if needed)
   - [ ] Create `/v1/admin/prompts/openings` endpoint (if needed)

---

## 7) EVIDENCE CITATIONS

### Dashboard File
- **File:** `backend/dashboards_bundle/dev-dashboard.html`
- **Total Lines:** 10,673
- **Key Sections:**
  - Engine Map nodes: Lines 5705-5726
  - Node config: Lines 5807-5814
  - Inspector rendering: Lines 5835-5843
  - Hooks editor: Lines 7271-7529
  - Load everything: Lines 4445-4491

### Backend Controllers
- **Hooks:** `backend/src/modules/hooks/hooks.controller.ts:19-169`
- **Missions Admin:** `backend/src/modules/missions-admin/missions-admin.controller.ts:18-233`
- **Insights Admin:** `backend/src/modules/insights/insights-admin.controller.ts:1-145`

### Backend Services
- **Sessions:** `backend/src/modules/sessions/sessions.service.ts:206-840` (saveOrUpdateScoredSession)
- **Missions Admin:** `backend/src/modules/missions-admin/missions-admin.service.ts:1655-1728` (getSessionMessages)

### Prisma Schema
- **File:** `backend/prisma/schema.prisma`
- **Models:** Lines 49-697
- **Key Models:**
  - `PracticeSession`: Lines 280-308
  - `PromptHook`: Lines 557-577
  - `PromptHookTrigger`: Lines 582-597
  - `GateOutcome`: Lines 602-616
  - `RewardLedgerEntry`: Lines 86-105
  - `MissionProgress`: Lines 394-406
  - `UserTraitHistory`: Lines 621-636

---

**END OF REPORT**

