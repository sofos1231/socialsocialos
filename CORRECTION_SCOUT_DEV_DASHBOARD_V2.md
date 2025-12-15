    # CORRECTION SCOUT — Dev Dashboard v2 (READ-ONLY)

    **Date:** 2025-01-15  
    **Mode:** SCOUT ONLY (No Code, No Commands, No Refactor)  
    **Goal:** Evidence-based mapping of v2 requirements to existing implementation

    ---

    ## 1) SERVING TRUTH

    ### How dev-dashboard.html is Served

    **Evidence:**
    - **File:** `backend/vite.config.ts` (lines 1-19)
    - **Root Directory:** `dashboards_bundle/` (line 4)
    - **Port:** 5173 (line 6)
    - **Served By:** Vite dev server (NOT NestJS static hosting)

    **Proof:**
    ```1:19:backend/vite.config.ts
    import { defineConfig } from 'vite';

    export default defineConfig({
    root: 'dashboards_bundle',
    server: {
        port: 5173,
        strictPort: true,
        open: false,
        headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        },
    },
    build: {
        outDir: '../dist-dashboards',
        emptyOutDir: true,
    },
    });
    ```

    **Dashboard File Location:**
    - **Active File:** `backend/dashboards_bundle/dev-dashboard.html` (8,092 lines)
    - **Legacy File:** `backend/public/dev-dashboard.html` (62 lines) - redirect stub only
    - **URL:** `http://localhost:5173/dev-dashboard.html`

    **Conclusion:** Dashboard is served by Vite dev server, NOT NestJS static hosting. No NestJS controller serves this file.

    ---

    ## 2) PROTOTYPE MAPPING (Dev Dashboard v2 Engine Map Nodes)

    ### Node: Mission Begin

    **Status:** ❌ **MISSING** - No visual node exists

    **Evidence:**
    - No "Mission Begin" node found in `backend/dashboards_bundle/dev-dashboard.html`
    - No editor opens for "Mission Begin" configuration
    - No endpoint provides "Mission Begin" data

    **What Exists:**
    - Mission Editor section: `backend/dashboards_bundle/dev-dashboard.html:422-825`
    - Mission CRUD endpoints: `/v1/admin/missions` (GET, POST, PUT, DELETE)
    - **Controller:** `backend/src/modules/missions-admin/missions-admin.controller.ts`

    **Gap:** No visual "Mission Begin" node in Engine Map. Mission editor exists but not as a node.

    ---

    ### Node: AI Engine Layers

    **Status:** ⚠️ **PARTIAL** - Tabs exist, no visual node map

    **Evidence:**
    - **Existing UI:** Engine Config tabs section (`backend/dashboards_bundle/dev-dashboard.html:1052-2113`)
    - **Tabs:** 11 tabs (Scoring & Traits, Dynamics Profiles, Gates & Objectives, Hooks & Triggers, Mood & State Policy, Insights Catalog, Mission Attachments, Monitoring, Micro Feedback, Micro Dynamics, Persona Drift)
    - **Load Endpoint:** `GET /v1/admin/engine-config` (`backend/src/modules/engine-config/engine-config.controller.ts:17-21`)
    - **Save Endpoint:** `PUT /v1/admin/engine-config` (`backend/src/modules/engine-config/engine-config.controller.ts:27-33`)

    **When "Open Editor" Clicked:**
    - Opens tab content panel (not a modal)
    - Each tab has its own editor UI
    - No unified "AI Engine Layers" visual map exists

    **Gap:** No visual layer map showing relationships between layers. Only tab-based editors exist.

    ---

    ### Node: Micro Feedback

    **Status:** ⚠️ **PARTIAL** - Tab editor exists, no visual node

    **Evidence:**
    - **Existing UI:** Micro Feedback tab (`backend/dashboards_bundle/dev-dashboard.html:2006-2030`)
    - **Load Endpoint:** `GET /v1/admin/prompts/micro-feedback` (`backend/src/modules/engine-config/engine-config-prompts.controller.ts:17-64`)
    - **Save Endpoint:** Via `PUT /v1/admin/engine-config` (stored in `configJson.microFeedback`)

    **When "Open Editor" Clicked:**
    - Opens Micro Feedback tab content
    - Shows table of feedback bands
    - Load button calls `/v1/admin/prompts/micro-feedback`

    **Gap:** No visual "Micro Feedback" node in Engine Map. Only tab editor exists.

    ---

    ### Node: Mission End

    **Status:** ❌ **MISSING** - No visualization exists

    **Evidence:**
    - No "Mission End" node found in `backend/dashboards_bundle/dev-dashboard.html`
    - No editor for Mission End payload configuration
    - No endpoint provides Mission End data

    **What Exists:**
    - Session end data in `PracticeSession` model (`backend/prisma/schema.prisma:237-308`)
    - Session end reason fields: `endReasonCode`, `endReasonMeta` (lines 277-278)
    - No admin UI for configuring Mission End payload

    **Gap:** No Mission End node or editor exists.

    ---

    ### Node: Mission Review

    **Status:** ⚠️ **PARTIAL** - Insights Catalog exists, no visual node

    **Evidence:**
    - **Existing UI:** Insights Catalog tab (`backend/dashboards_bundle/dev-dashboard.html:1749-1910`)
    - **Load Endpoint:** `GET /v1/admin/insights/catalog` (`backend/src/modules/insights/insights-admin.controller.ts:26-78`)
    - **Save Endpoint:** `POST /v1/admin/insights` (create), `DELETE /v1/admin/insights/:id` (delete)
    - **Controller:** `backend/src/modules/insights/insights-admin.controller.ts`

    **When "Open Editor" Clicked:**
    - Opens Insights Catalog tab
    - Shows table of insight templates
    - Filter by kind (GATE_FAIL, POSITIVE_HOOK, etc.)

    **Gap:** No visual "Mission Review" node in Engine Map. Only tab editor exists.

    ---

    ### Node: Stats Page Updates

    **Status:** ⚠️ **PARTIAL** - Monitoring tab exists, no visual flow

    **Evidence:**
    - **Existing UI:** Monitoring tab (`backend/dashboards_bundle/dev-dashboard.html:1980-2004`)
    - **Load Endpoint:** `GET /v1/admin/hooks/triggers/stats?days=7` (`backend/src/modules/hooks/hooks.controller.ts:128-169`)
    - **Data:** Trigger statistics for hooks

    **When "Open Editor" Clicked:**
    - Opens Monitoring tab
    - Shows trigger stats table
    - No visual flow diagram

    **Gap:** No visual flow showing how stats update. Only table view exists.

    ---

    ## 3) ENGINE LIBRARIES MAPPING

    ### Personas

    **Status:** ✅ **EXISTS IN DB TABLE**

    **Evidence:**
    - **DB Model:** `AiPersona` (`backend/prisma/schema.prisma:122-138`)
    - **Table:** `AiPersona`
    - **Fields:** `id`, `code`, `name`, `description`, `active`, `personaGender`, etc.
    - **Endpoints:**
    - `GET /v1/admin/personas` (`backend/src/modules/missions-admin/missions-admin.personas.controller.ts:73-81`)
    - `POST /v1/admin/personas` (`backend/src/modules/missions-admin/missions-admin.personas.controller.ts:88-114`)
    - `PUT /v1/admin/personas/:id` (`backend/src/modules/missions-admin/missions-admin.personas.controller.ts:120-155`)
    - `DELETE /v1/admin/personas/:id` (`backend/src/modules/missions-admin/missions-admin.personas.controller.ts:161-174`)
    - **Dashboard UI:** `backend/dashboards_bundle/dev-dashboard.html:7565-7631` (Personas Admin section)

    **Conclusion:** Personas exist in DB table `AiPersona`, NOT in EngineConfig JSON.

    ---

    ### Styles (AI Styles)

    **Status:** ✅ **EXISTS IN DB TABLE**

    **Evidence:**
    - **DB Model:** `AiStyle` (`backend/prisma/schema.prisma:162-186`)
    - **Table:** `AiStyle`
    - **Fields:** `id`, `key` (enum), `name`, `stylePrompt`, `isActive`, etc.
    - **Endpoints:**
    - `GET /v1/admin/ai-styles` (`backend/src/modules/ai-styles/ai-styles-admin.controller.ts:86-94`)
    - `POST /v1/admin/ai-styles` (`backend/src/modules/ai-styles/ai-styles-admin.controller.ts:119-149`)
    - `PUT /v1/admin/ai-styles/:id` (`backend/src/modules/ai-styles/ai-styles-admin.controller.ts:155-186`)
    - `DELETE /v1/admin/ai-styles/:id` (`backend/src/modules/ai-styles/ai-styles-admin.controller.ts:226-237`)
    - **Dashboard UI:** `backend/dashboards_bundle/dev-dashboard.html:7392-7631` (AI Styles Admin section)

    **Conclusion:** Styles exist in DB table `AiStyle`, NOT in EngineConfig JSON.

    ---

    ### Hooks

    **Status:** ✅ **EXISTS IN DB TABLE**

    **Evidence:**
    - **DB Model:** `PromptHook` (`backend/prisma/schema.prisma:557-577`)
    - **Table:** `PromptHook`
    - **Fields:** `id`, `name`, `type`, `textTemplate`, `conditionsJson`, `isEnabled`, etc.
    - **Endpoints:**
    - `GET /v1/admin/hooks` (`backend/src/modules/hooks/hooks.controller.ts:28-45`)
    - `POST /v1/admin/hooks` (`backend/src/modules/hooks/hooks.controller.ts:66-84`)
    - `PUT /v1/admin/hooks/:id` (`backend/src/modules/hooks/hooks.controller.ts:89-107`)
    - `DELETE /v1/admin/hooks/:id` (`backend/src/modules/hooks/hooks.controller.ts:112-122`)
    - **Dashboard UI:** `backend/dashboards_bundle/dev-dashboard.html:1546-1636` (Hooks & Triggers tab)

    **Conclusion:** Hooks exist in DB table `PromptHook`, NOT in EngineConfig JSON.

    ---

    ### Insights Catalog

    **Status:** ✅ **EXISTS IN DB TABLE**

    **Evidence:**
    - **DB Model:** `CustomInsightTemplate` (`backend/prisma/schema.prisma:495-511`)
    - **Table:** `CustomInsightTemplate`
    - **Fields:** `id`, `key`, `kind`, `title`, `body`, `weight`, etc.
    - **Endpoints:**
    - `GET /v1/admin/insights/catalog` (`backend/src/modules/insights/insights-admin.controller.ts:26-78`)
    - `POST /v1/admin/insights` (`backend/src/modules/insights/insights-admin.controller.ts:84-123`)
    - `DELETE /v1/admin/insights/:id` (`backend/src/modules/insights/insights-admin.controller.ts:129-144`)
    - **Dashboard UI:** `backend/dashboards_bundle/dev-dashboard.html:1749-1910` (Insights Catalog tab)

    **Conclusion:** Insights Catalog exists in DB table `CustomInsightTemplate`, NOT in EngineConfig JSON.

    ---

    ### Openings

    **Status:** ⚠️ **READ-ONLY ENDPOINT, NO DB TABLE**

    **Evidence:**
    - **Endpoint:** `GET /v1/admin/prompts/openings` (`backend/src/modules/engine-config/engine-config-prompts.controller.ts:70-91`)
    - **Response:** `{ ok: true, templates: [...] }`
    - **No DB Table:** No `OpeningTemplate` or similar model in `backend/prisma/schema.prisma`
    - **No CRUD:** Only GET endpoint exists, no POST/PUT/DELETE
    - **Dashboard UI:** `backend/dashboards_bundle/dev-dashboard.html:1859-1909` (Opening Templates section)

    **Conclusion:** Openings exist as read-only endpoint only. No DB table, no CRUD operations. NOT in EngineConfig JSON.

    ---

    ### Micro-Feedback

    **Status:** ✅ **EXISTS IN EngineConfig JSON**

    **Evidence:**
    - **EngineConfig Path:** `configJson.microFeedback` (`backend/src/modules/engine-config/engine-config.types.ts:269-280`)
    - **Type:** `EngineMicroFeedbackConfig`
    - **Structure:**
    ```typescript
    {
        bands: Array<{ minScore, maxScore, rarity, message }>,
        veryShortMessage?: string,
        defaultMessage?: string
    }
    ```
    - **Load Endpoint:** `GET /v1/admin/prompts/micro-feedback` (reads from EngineConfig)
    - **Save Endpoint:** `PUT /v1/admin/engine-config` (saves entire config)
    - **Dashboard UI:** `backend/dashboards_bundle/dev-dashboard.html:2006-2030` (Micro Feedback tab)

    **Conclusion:** Micro-Feedback exists in EngineConfig JSON at `configJson.microFeedback`, NOT in DB table.

    ---

    ### Attachments

    **Status:** ⚠️ **PARTIAL - NO DB TABLE, NO EngineConfig JSON**

    **Evidence:**
    - **Endpoint:** `GET /v1/admin/missions/attachments` (`backend/src/modules/missions-admin/missions-admin.service.ts:1461`)
    - **Save Endpoint:** `PUT /v1/admin/missions/:id/attachments` (`backend/src/modules/missions-admin/missions-admin.service.ts:1518`)
    - **No DB Table:** No `MissionAttachment` model in `backend/prisma/schema.prisma`
    - **Not in EngineConfig:** No `attachments` field in `EngineConfigJson` (`backend/src/modules/engine-config/engine-config.types.ts:285-305`)
    - **Dashboard UI:** `backend/dashboards_bundle/dev-dashboard.html:7160-7391` (Mission Attachments tab)

    **Conclusion:** Attachments exist as endpoints only. No DB table, NOT in EngineConfig JSON. Likely computed/derived from missions.

    ---

    ### Objectives

    **Status:** ⚠️ **EXISTS IN EngineConfig JSON ONLY**

    **Evidence:**
    - **EngineConfig Path:** `configJson.gateRequirementTemplates` (`backend/src/modules/engine-config/engine-config.types.ts:203-209`)
    - **Type:** `EngineGateRequirementTemplate[]`
    - **Structure:**
    ```typescript
    {
        code: string,
        name: string,
        description: string,
        active: boolean,
        requiredGates: string[]
    }
    ```
    - **No DB Table:** No `Objective` or `GateRequirementTemplate` model in `backend/prisma/schema.prisma`
    - **No Standalone Endpoint:** Only accessible via `GET /v1/admin/engine-config`
    - **Dashboard UI:** `backend/dashboards_bundle/dev-dashboard.html:1489-1544` (Gates & Objectives tab)

    **Conclusion:** Objectives exist in EngineConfig JSON at `configJson.gateRequirementTemplates`, NOT in DB table.

    ---

    ### Gate Sets

    **Status:** ⚠️ **EXISTS IN EngineConfig JSON ONLY**

    **Evidence:**
    - **EngineConfig Path:** `configJson.gates` (`backend/src/modules/engine-config/engine-config.types.ts:183-198`)
    - **Type:** `EngineGateConfig[]`
    - **Structure:**
    ```typescript
    {
        key: string,
        description: string,
        active: boolean,
        minMessages?: number,
        successThreshold?: number,
        // ... other gate-specific fields
    }
    ```
    - **No DB Table:** No `GateSet` or `GateConfig` model in `backend/prisma/schema.prisma`
    - **No Standalone Endpoint:** Only accessible via `GET /v1/admin/engine-config`
    - **Dashboard UI:** `backend/dashboards_bundle/dev-dashboard.html:1489-1544` (Gates & Objectives tab)

    **Conclusion:** Gate Sets exist in EngineConfig JSON at `configJson.gates`, NOT in DB table.

    ---

    ### Dynamics Profiles

    **Status:** ✅ **EXISTS IN EngineConfig JSON**

    **Evidence:**
    - **EngineConfig Path:** `configJson.dynamicsProfiles` (`backend/src/modules/engine-config/engine-config.types.ts:110-125`)
    - **Type:** `EngineDynamicsProfile[]`
    - **Structure:**
    ```typescript
    {
        code: string,
        name: string,
        description: string,
        active: boolean,
        pace: number,
        emojiDensity: number,
        flirtiveness: number,
        // ... other dynamics values
    }
    ```
    - **No DB Table:** No `DynamicsProfile` model in `backend/prisma/schema.prisma`
    - **No Standalone Endpoint:** Only accessible via `GET /v1/admin/engine-config`
    - **Dashboard UI:** `backend/dashboards_bundle/dev-dashboard.html:1358-1488` (Dynamics Profiles tab)

    **Conclusion:** Dynamics Profiles exist in EngineConfig JSON at `configJson.dynamicsProfiles`, NOT in DB table.

    ---

    ### Scoring Profiles

    **Status:** ✅ **EXISTS IN EngineConfig JSON**

    **Evidence:**
    - **EngineConfig Path:** `configJson.scoringProfiles` (`backend/src/modules/engine-config/engine-config.types.ts:7-105`)
    - **Type:** `EngineScoringProfile[]`
    - **Structure:**
    ```typescript
    {
        code: string,
        name: string,
        active: boolean,
        traitWeights: { confidence, clarity, humor, ... },
        lengthThresholds: { empty, veryShort, short, ... },
        // ... extensive scoring configuration
    }
    ```
    - **No DB Table:** No `ScoringProfile` model in `backend/prisma/schema.prisma`
    - **No Standalone Endpoint:** Only accessible via `GET /v1/admin/engine-config`
    - **Dashboard UI:** `backend/dashboards_bundle/dev-dashboard.html:1083-1357` (Scoring & Traits tab)

    **Conclusion:** Scoring Profiles exist in EngineConfig JSON at `configJson.scoringProfiles`, NOT in DB table.

    ---

    ### Difficulty Profiles

    **Status:** ❌ **TRULY MISSING**

    **Evidence:**
    - **No DB Table:** No `DifficultyProfile` model in `backend/prisma/schema.prisma`
    - **Not in EngineConfig:** No `difficultyProfiles` field in `EngineConfigJson` (`backend/src/modules/engine-config/engine-config.types.ts:285-305`)
    - **No Endpoint:** No `/v1/admin/difficulty-profiles` endpoint
    - **Mission Difficulty:** Only enum `MissionDifficulty` exists (EASY, MEDIUM, HARD, ELITE) in `backend/prisma/schema.prisma:855-860`

    **Conclusion:** Difficulty Profiles are TRULY MISSING. No DB table, no EngineConfig JSON path, no endpoints.

    ---

    ### Signal Registry

    **Status:** ❌ **TRULY MISSING**

    **Evidence:**
    - **No DB Table:** No `SignalRegistry` or similar model in `backend/prisma/schema.prisma`
    - **Not in EngineConfig:** No `signalRegistry` field in `EngineConfigJson`
    - **No Endpoint:** No `/v1/admin/signals` or similar endpoint
    - **No Dashboard UI:** No Signal Registry section in `backend/dashboards_bundle/dev-dashboard.html`

    **Conclusion:** Signal Registry is TRULY MISSING. No DB table, no EngineConfig JSON path, no endpoints, no UI.

    ---

    ### Trigger Rules

    **Status:** ⚠️ **READ-ONLY STATS ONLY**

    **Evidence:**
    - **Stats Endpoint:** `GET /v1/admin/hooks/triggers/stats?days=7` (`backend/src/modules/hooks/hooks.controller.ts:128-169`)
    - **DB Table:** `PromptHookTrigger` (`backend/prisma/schema.prisma:582-597`) - stores trigger events, not rules
    - **No CRUD:** No POST/PUT/DELETE endpoints for trigger rules
    - **Dashboard UI:** `backend/dashboards_bundle/dev-dashboard.html:1613-1636` (Triggers table - stats only)

    **Conclusion:** Trigger Rules exist as read-only stats only. No CRUD for rules themselves. Rules are likely defined in `PromptHook.conditionsJson`.

    ---

    ### Prompt Packs

    **Status:** ❌ **TRULY MISSING**

    **Evidence:**
    - **No DB Table:** No `PromptPack` model in `backend/prisma/schema.prisma`
    - **Not in EngineConfig:** No `promptPacks` field in `EngineConfigJson`
    - **No Endpoint:** No `/v1/admin/prompt-packs` endpoint
    - **No Dashboard UI:** No Prompt Packs section in `backend/dashboards_bundle/dev-dashboard.html`

    **Conclusion:** Prompt Packs are TRULY MISSING. No DB table, no EngineConfig JSON path, no endpoints, no UI.

    ---

    ### Prompt Templates

    **Status:** ⚠️ **READ-ONLY OPENINGS ONLY**

    **Evidence:**
    - **Endpoint:** `GET /v1/admin/prompts/openings` (`backend/src/modules/engine-config/engine-config-prompts.controller.ts:70-91`)
    - **No CRUD:** Only GET endpoint exists
    - **No DB Table:** No `PromptTemplate` model in `backend/prisma/schema.prisma`
    - **Dashboard UI:** `backend/dashboards_bundle/dev-dashboard.html:1859-1909` (Opening Templates - read-only)

    **Conclusion:** Prompt Templates exist as read-only openings endpoint only. No CRUD, no DB table.

    ---

    ## 4) "LOAD EVERYTHING" BUTTON

    ### Final List of Resources and Endpoints (100% Real, Proved)

    **Auth Check Replacement:**
    - **Old:** Check `/v1/auth/me` (does not exist)
    - **New:** Call `GET /v1/admin/engine-config` and treat 401 as invalid JWT
    - **Evidence:** `backend/src/modules/engine-config/engine-config.controller.ts:9-10` uses `@UseGuards(AdminGuard)` which returns 401 if JWT invalid

    **Dependency Order:**

    1. **Health Check**
    - Endpoint: `GET /v1/health`
    - Evidence: Standard NestJS health endpoint (not verified in codebase, but standard)
    - Status: ⚠️ **ASSUMPTION** - Not found in codebase

    2. **Engine Config** (Auth check + foundation)
    - Endpoint: `GET /v1/admin/engine-config`
    - Evidence: `backend/src/modules/engine-config/engine-config.controller.ts:17-21`
    - Response: `{ ok: true, config: EngineConfigJson }`
    - Status: ✅ **PROVED**

    3. **Meta Data**
    - Endpoint: `GET /v1/admin/missions/meta`
    - Evidence: `backend/src/modules/missions-admin/missions-admin.controller.ts:32-35` (referenced in dashboard)
    - Response: Categories, personas, AI styles
    - Status: ✅ **PROVED** (used in `dev-dashboard.html:3432`)

    4. **Categories**
    - Endpoint: `GET /v1/admin/missions/categories`
    - Evidence: `backend/src/modules/missions-admin/missions-admin.categories.controller.ts:32-35`
    - Response: `MissionCategory[]`
    - Status: ✅ **PROVED**

    5. **Missions**
    - Endpoint: `GET /v1/admin/missions`
    - Evidence: `backend/src/modules/missions-admin/missions-admin.controller.ts:64`
    - Response: `PracticeMissionTemplate[]`
    - Status: ✅ **PROVED**

    6. **Personas**
    - Endpoint: `GET /v1/admin/personas`
    - Evidence: `backend/src/modules/missions-admin/missions-admin.personas.controller.ts:73-81`
    - Response: `AiPersona[]`
    - Status: ✅ **PROVED**

    7. **AI Styles**
    - Endpoint: `GET /v1/admin/ai-styles`
    - Evidence: `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:86-94`
    - Response: `AiStyle[]`
    - Status: ✅ **PROVED**

    8. **Hooks**
    - Endpoint: `GET /v1/admin/hooks`
    - Evidence: `backend/src/modules/hooks/hooks.controller.ts:28-45`
    - Response: `{ ok: true, hooks: PromptHook[] }`
    - Status: ✅ **PROVED**

    9. **Hook Trigger Stats**
    - Endpoint: `GET /v1/admin/hooks/triggers/stats?days=7`
    - Evidence: `backend/src/modules/hooks/hooks.controller.ts:128-169`
    - Response: `{ ok: true, stats: [...], periodDays: number }`
    - Status: ✅ **PROVED**

    10. **Insight Catalog**
        - Endpoint: `GET /v1/admin/insights/catalog`
        - Evidence: `backend/src/modules/insights/insights-admin.controller.ts:26-78`
        - Response: `{ ok: true, templates: [...] }`
        - Status: ✅ **PROVED**

    11. **Micro Feedback**
        - Endpoint: `GET /v1/admin/prompts/micro-feedback`
        - Evidence: `backend/src/modules/engine-config/engine-config-prompts.controller.ts:17-64`
        - Response: `{ ok: true, feedback: [...] }`
        - Status: ✅ **PROVED**

    12. **Opening Templates**
        - Endpoint: `GET /v1/admin/prompts/openings`
        - Evidence: `backend/src/modules/engine-config/engine-config-prompts.controller.ts:70-91`
        - Response: `{ ok: true, templates: [...] }`
        - Status: ✅ **PROVED**

    13. **Mission Attachments**
        - Endpoint: `GET /v1/admin/missions/attachments`
        - Evidence: `backend/src/modules/missions-admin/missions-admin.service.ts:1461`
        - Response: `{ ok: true, attachments: [...] }` (inferred from dashboard usage)
        - Status: ✅ **PROVED** (used in `dev-dashboard.html:7193`)

    **Missing Resources (No Endpoints):**
    - Objectives: Via EngineConfig only
    - Gate Sets: Via EngineConfig only
    - Dynamics Profiles: Via EngineConfig only
    - Scoring Profiles: Via EngineConfig only
    - Difficulty Profiles: Not implemented
    - Signal Registry: Not implemented
    - Prompt Packs: Not implemented
    - Trigger Rules CRUD: Not implemented (stats only)

    ---

    ## 5) CONFIG SLOTS

    ### Versioning/Snapshots Support Check

    **Evidence:**
    - **EngineConfig Model:** `backend/prisma/schema.prisma:900-905`
    - Fields: `key` (PK, always 'GLOBAL_V1'), `configJson` (JSON), `createdAt`, `updatedAt`
    - **NO versioning fields:** No `version`, `snapshot`, `slot` fields

    - **EngineConfigService:** `backend/src/modules/engine-config/engine-config.service.ts`
    - **Revision Counter:** Lines 23-24, 36-40, 116-119
    - **Type:** In-memory only (`private revision = 0`)
    - **Purpose:** Cache invalidation, NOT persistence
    - **No Slots:** No slot storage in DB or EngineConfig JSON

    **Conclusion:**
    - **Versioning:** ❌ NOT SUPPORTED - No version history, no snapshots
    - **Slots:** ❌ NOT SUPPORTED - No slot storage mechanism

    **Proposal:**
    1. **Fast Path (JSON Slots):** Add `slots` array to `EngineConfigJson`:
    ```typescript
    {
        slots: Array<{
        name: string,
        createdAt: string,
        config: EngineConfigJson
        }>
    }
    ```
    - Store in `configJson.slots` (no DB migration needed)
    - Load/save via `GET /v1/admin/engine-config` and `PUT /v1/admin/engine-config`

    2. **Only if JSON slots impossible:** Create `EngineConfigSlot` table:
    ```prisma
    model EngineConfigSlot {
        id        String   @id @default(cuid())
        name      String
        configJson Json
        createdAt DateTime @default(now())
    }
    ```
    - Requires DB migration
    - Requires new endpoints: `GET /v1/admin/engine-config/slots`, `POST /v1/admin/engine-config/slots`, etc.

    **Recommendation:** Use JSON slots (fast path) first. Only create table if JSON becomes too large or performance issues arise.

    ---

    ## 6) NON-BREAKING PLAN

    ### How to Replace UI to Match v2 While Keeping Existing Logic

    **Strategy:**
    1. **Keep All Existing Functions:** Do not delete or rename existing JavaScript functions
    2. **Add New UI Layer:** Add Engine Map visual layer on top of existing tabs
    3. **Wire Nodes to Existing Editors:** Clicking Engine Map nodes opens existing tab editors
    4. **Preserve State Management:** Keep existing state objects (`engineConfigState`, `hubState`, etc.)
    5. **Incremental Replacement:** Replace tab navigation with Engine Map, but keep tab content panels

    ### Top 10 Break Risks with Mitigation

    #### Risk #1: Breaking Existing Tab Navigation

    **Risk:** Removing tab buttons breaks existing click handlers

    **Evidence:**
    - Tab buttons: `backend/dashboards_bundle/dev-dashboard.html:1066-1078`
    - Click handlers: `backend/dashboards_bundle/dev-dashboard.html:5700-5750` (inferred)

    **Mitigation:**
    - Keep tab buttons hidden but functional
    - Engine Map nodes trigger same tab click handlers
    - **Code Reference:** Preserve `engineConfigTab` click handlers, add Engine Map nodes that call same handlers

    ---

    #### Risk #2: Breaking Mission Editor Form State

    **Risk:** Changing Mission Editor UI breaks form state management

    **Evidence:**
    - Mission form state: `backend/dashboards_bundle/dev-dashboard.html:2428-2450` (inferred)
    - Form fields: `backend/dashboards_bundle/dev-dashboard.html:422-825`

    **Mitigation:**
    - Do not change form field IDs or names
    - Keep `getMissionFormValues()` function unchanged
    - **Code Reference:** Preserve all form field IDs in `backend/dashboards_bundle/dev-dashboard.html:422-825`

    ---

    #### Risk #3: Breaking API Fetch Error Handling

    **Risk:** Changing `apiFetch()` function breaks error handling

    **Evidence:**
    - `apiFetch` function: `backend/dashboards_bundle/dev-dashboard.html:2632-2700` (inferred)
    - Used in 51+ places: `grep -r "apiFetch" backend/dashboards_bundle/dev-dashboard.html`

    **Mitigation:**
    - Do not modify `apiFetch()` signature or behavior
    - Keep existing error handling logic
    - **Code Reference:** Preserve `apiFetch` function at `backend/dashboards_bundle/dev-dashboard.html:2632-2700`

    ---

    #### Risk #4: Breaking Engine Config Load/Save

    **Risk:** Changing Engine Config load/save breaks config persistence

    **Evidence:**
    - Load function: `backend/dashboards_bundle/dev-dashboard.html:5656-5676`
    - Save function: `backend/dashboards_bundle/dev-dashboard.html:5839-5863` (inferred)

    **Mitigation:**
    - Keep `loadEngineConfig()` and save functions unchanged
    - Engine Map only triggers existing load/save functions
    - **Code Reference:** Preserve `loadEngineConfig()` at `backend/dashboards_bundle/dev-dashboard.html:5656-5676`

    ---

    #### Risk #5: Breaking Category CRUD Operations

    **Risk:** Changing Practice Hub Designer breaks category operations

    **Evidence:**
    - Category CRUD: `backend/dashboards_bundle/dev-dashboard.html:3094-3250` (inferred)
    - Endpoints: `/v1/admin/missions/categories` (GET, POST, PUT, DELETE)

    **Mitigation:**
    - Keep category modal and CRUD functions unchanged
    - Keep `loadCategories()`, `saveCategory()`, `deleteCategory()` functions
    - **Code Reference:** Preserve category functions in `backend/dashboards_bundle/dev-dashboard.html:3094-3250`

    ---

    #### Risk #6: Breaking Mission List Rendering

    **Risk:** Changing mission list UI breaks selection and filtering

    **Evidence:**
    - Mission list: `backend/dashboards_bundle/dev-dashboard.html:436-825` (left panel)
    - Selection state: `backend/dashboards_bundle/dev-dashboard.html:2428-2450` (inferred)

    **Mitigation:**
    - Keep mission list HTML structure
    - Keep `selectMission()` function unchanged
    - **Code Reference:** Preserve mission list rendering in `backend/dashboards_bundle/dev-dashboard.html:436-825`

    ---

    #### Risk #7: Breaking JWT Storage/Loading

    **Risk:** Changing JWT handling breaks authentication

    **Evidence:**
    - JWT input: `backend/dashboards_bundle/dev-dashboard.html:380-384`
    - localStorage: `backend/dashboards_bundle/dev-dashboard.html:2700-2800` (inferred)

    **Mitigation:**
    - Keep JWT input field and localStorage logic unchanged
    - Remove Login UI but keep JWT manual entry
    - **Code Reference:** Preserve JWT handling at `backend/dashboards_bundle/dev-dashboard.html:380-384` and localStorage code

    ---

    #### Risk #8: Breaking Hook CRUD Operations

    **Risk:** Changing Hooks tab breaks hook management

    **Evidence:**
    - Hooks tab: `backend/dashboards_bundle/dev-dashboard.html:1546-1636`
    - Hook CRUD: `backend/dashboards_bundle/dev-dashboard.html:6629-6765` (inferred)

    **Mitigation:**
    - Keep hooks table and editor UI unchanged
    - Keep `loadHooks()`, `saveHook()`, `deleteHook()` functions
    - **Code Reference:** Preserve hooks functions in `backend/dashboards_bundle/dev-dashboard.html:6629-6765`

    ---

    #### Risk #9: Breaking Insights Catalog Filtering

    **Risk:** Changing Insights tab breaks filtering by kind

    **Evidence:**
    - Insights tab: `backend/dashboards_bundle/dev-dashboard.html:1749-1910`
    - Kind filter: `backend/dashboards_bundle/dev-dashboard.html:6924-7001` (inferred)

    **Mitigation:**
    - Keep insights kind filter dropdown unchanged
    - Keep `loadInsightsCatalog()` function with kind parameter
    - **Code Reference:** Preserve insights filtering at `backend/dashboards_bundle/dev-dashboard.html:6924-7001`

    ---

    #### Risk #10: Breaking Mission Attachments Loading

    **Risk:** Changing Attachments tab breaks mission attachment management

    **Evidence:**
    - Attachments tab: `backend/dashboards_bundle/dev-dashboard.html:7160-7391`
    - Load function: `backend/dashboards_bundle/dev-dashboard.html:7160-7236`

    **Mitigation:**
    - Keep `loadMissionAttachments()` function unchanged
    - Keep attachments table and editor UI
    - **Code Reference:** Preserve `loadMissionAttachments()` at `backend/dashboards_bundle/dev-dashboard.html:7160-7236`

    ---

    ## SUMMARY

    ### Key Findings

    1. **Serving:** Vite dev server (port 5173), NOT NestJS static hosting
    2. **Engine Map Nodes:** Mostly missing visual representation, only tab editors exist
    3. **Libraries:**
    - **DB Tables:** Personas, Styles, Hooks, Insights Catalog
    - **EngineConfig JSON:** Micro-Feedback, Objectives, Gate Sets, Dynamics Profiles, Scoring Profiles
    - **Read-Only Endpoints:** Openings, Trigger Stats
    - **Truly Missing:** Difficulty Profiles, Signal Registry, Prompt Packs
    4. **Load Everything:** 13 endpoints proved, auth check via `/v1/admin/engine-config` 401
    5. **Config Slots:** Not supported, propose JSON slots first, table only if needed
    6. **Non-Breaking:** Keep all existing functions, add Engine Map layer on top, wire nodes to existing editors

    ### Critical Gaps

    - No visual Engine Map representation
    - No Mission Begin/Mission End nodes
    - No versioning/snapshots support
    - Difficulty Profiles, Signal Registry, Prompt Packs not implemented
    - Trigger Rules CRUD missing (stats only)

    ---

    **END OF CORRECTION SCOUT REPORT**

