# Dev Dashboard v2 Full Implementation Plan

**Date:** 2025-01-15  
**Mode:** SCOUT / READ-ONLY  
**Status:** COMPREHENSIVE AUDIT COMPLETE

---

## A) Current State Inventory (Evidence-based)

### A.1) Dashboard File Serving

**Primary Dashboard File:**
- **Path:** `backend/dashboards_bundle/dev-dashboard.html` (8,092 lines)
- **Served via:** Vite dev server (port 5173)
- **Vite Config:** `backend/vite.config.ts` (root: `dashboards_bundle/`)
- **URL:** `http://localhost:5173/dev-dashboard.html`
- **Legacy File:** `backend/public/dev-dashboard.html` exists but is a redirect stub (lines 38-62)

**Decision:** The active dashboard is `backend/dashboards_bundle/dev-dashboard.html`. This is the target file for v2 implementation.

### A.2) Current Dashboard Tabs/Sections

Based on `backend/dashboards_bundle/dev-dashboard.html` inspection:

1. **Header Section** (lines 364-420)
   - API status chips
   - Settings panel with API base URL, JWT input, **Login UI (TO BE REMOVED)**
   - Ping/Load Meta/Load Missions buttons

2. **Mission Editor** (lines 422-825)
   - Left panel: Mission list with search
   - Right panel: Mission form editor
   - Mission Builder integration (Phase 3)
   - Dynamics structured editor
   - AI Contract JSON textarea

3. **Mission Monitor / Deep Insights** (lines 826-937)
   - Session message log viewer
   - Stats display

4. **Practice Hub Designer** (lines 938-1051)
   - Category grid view
   - Category editor modal
   - Missions view modal
   - Category CRUD operations

5. **Engine Config Section** (lines 1052-2113)
   - 11 tabs:
     - Scoring & Traits
     - Dynamics Profiles
     - Gates & Objectives
     - Hooks & Triggers
     - Mood & State Policy
     - Insights Catalog
     - Mission Attachments
     - Monitoring
     - Micro Feedback
     - Micro Dynamics
     - Persona Drift

### A.3) All Endpoints Currently Used

**Evidence:** `grep -r "/v1/admin" backend/dashboards_bundle/dev-dashboard.html` + controller inspection

| Endpoint | Method | Response Shape | Controller | Status |
|----------|--------|----------------|------------|--------|
| `/v1/health` | GET | `{ ok: true, ts: string }` | `backend/src/health/health.controller.ts` | ✅ Exists |
| `/v1/auth/login` | POST | `{ accessToken: string }` | `backend/src/modules/auth/auth.controller.ts` | ✅ Exists |
| `/v1/admin/missions/meta` | GET | `{ categories, personas, aiStyles }` | `missions-admin.controller.ts:28-30` | ✅ Exists |
| `/v1/admin/missions` | GET | `PracticeMissionTemplate[]` (array) | `missions-admin.controller.ts:65-68` | ✅ Exists |
| `/v1/admin/missions/list` | GET | Wrapped format | `missions-admin.controller.ts:74-77` | ✅ Exists |
| `/v1/admin/missions` | POST | `PracticeMissionTemplate` | `missions-admin.controller.ts:82-85` | ✅ Exists |
| `/v1/admin/missions/:id` | PUT | `PracticeMissionTemplate` | `missions-admin.controller.ts:90-93` | ✅ Exists |
| `/v1/admin/missions/:id` | DELETE | Success response | `missions-admin.controller.ts:106-109` | ✅ Exists |
| `/v1/admin/missions/reorder` | POST | Success response | `missions-admin.controller.ts:114-117` | ✅ Exists |
| `/v1/admin/missions/attachments` | GET | `{ ok: true, attachments: [...] }` | `missions-admin.controller.ts:135-138` | ✅ Exists |
| `/v1/admin/missions/:id/attachments` | PUT | `{ ok: true, mission: {...} }` | `missions-admin.controller.ts:144-150` | ✅ Exists |
| `/v1/admin/missions/:id/stats` | GET | Stats object | `missions-admin.controller.ts:166-173` | ✅ Exists |
| `/v1/admin/missions/:id/mood-timelines` | GET | Timeline array | `missions-admin.controller.ts:179-186` | ✅ Exists |
| `/v1/admin/missions/:id/sessions` | GET | Sessions array | `missions-admin.controller.ts:192-199` | ✅ Exists |
| `/v1/admin/missions/sessions/:sessionId/messages` | GET | Messages array | `missions-admin.controller.ts:157-160` | ✅ Exists |
| `/v1/admin/missions/validate-config` | POST | Validation result | `missions-admin.controller.ts:205-208` | ✅ Exists |
| `/v1/admin/missions/generate-config` | POST | Generated config | `missions-admin.controller.ts:214-232` | ✅ Exists |
| `/v1/admin/missions/categories` | GET | `MissionCategory[]` | `missions-admin.categories.controller.ts:32-35` | ✅ Exists |
| `/v1/admin/missions/categories` | POST | `MissionCategory` | `missions-admin.categories.controller.ts:41-44` | ✅ Exists |
| `/v1/admin/missions/categories/:id` | PUT | `MissionCategory` | `missions-admin.categories.controller.ts:62-68` | ✅ Exists |
| `/v1/admin/missions/categories/:id` | PATCH | `MissionCategory` | `missions-admin.categories.controller.ts:50-56` | ✅ Exists |
| `/v1/admin/missions/categories/:id` | DELETE | Success response | `missions-admin.categories.controller.ts:74-77` | ✅ Exists |
| `/v1/admin/engine-config` | GET | `{ ok: true, config: EngineConfigJson }` | `engine-config.controller.ts:17-21` | ✅ Exists |
| `/v1/admin/engine-config` | PUT | `{ ok: true, config: EngineConfigJson }` | `engine-config.controller.ts:27-33` | ✅ Exists |
| `/v1/admin/hooks` | GET | `{ ok: true, hooks: PromptHook[] }` | `hooks.controller.ts:28-45` | ✅ Exists |
| `/v1/admin/hooks/:id` | GET | `{ ok: true, hook: PromptHook }` | `hooks.controller.ts:50-61` | ✅ Exists |
| `/v1/admin/hooks` | POST | `{ ok: true, hook: PromptHook }` | `hooks.controller.ts:66-84` | ✅ Exists |
| `/v1/admin/hooks/:id` | PUT | `{ ok: true, hook: PromptHook }` | `hooks.controller.ts:89-107` | ✅ Exists |
| `/v1/admin/hooks/:id` | DELETE | `{ ok: true, message: string }` | `hooks.controller.ts:112-122` | ✅ Exists |
| `/v1/admin/hooks/triggers/stats` | GET | `{ ok: true, stats: [...], periodDays: number }` | `hooks.controller.ts:128-169` | ✅ Exists |
| `/v1/admin/prompts/micro-feedback` | GET | `{ ok: true, feedback: [...] }` | `engine-config-prompts.controller.ts:17-64` | ✅ Exists |
| `/v1/admin/prompts/openings` | GET | `{ ok: true, templates: [...] }` | `engine-config-prompts.controller.ts:70-91` | ✅ Exists |
| `/v1/admin/insights/catalog` | GET | `{ ok: true, templates: [...] }` | `insights-admin.controller.ts:26-78` | ✅ Exists |
| `/v1/admin/insights` | POST | `{ ok: true, template: {...} }` | `insights-admin.controller.ts:84-123` | ✅ Exists |
| `/v1/admin/insights/:id` | DELETE | `{ ok: true, deleted: {...} }` | `insights-admin.controller.ts:129-144` | ✅ Exists |
| `/v1/admin/ai-styles` | GET | `AiStyle[]` | `ai-styles-admin.controller.ts:86-94` | ✅ Exists |
| `/v1/admin/ai-styles/:id` | GET | `AiStyle` | `ai-styles-admin.controller.ts:100-113` | ✅ Exists |
| `/v1/admin/ai-styles` | POST | `AiStyle` | `ai-styles-admin.controller.ts:119-149` | ✅ Exists |
| `/v1/admin/ai-styles/:id` | PUT | `AiStyle` | `ai-styles-admin.controller.ts:155-186` | ✅ Exists |
| `/v1/admin/ai-styles/:id/disable` | PATCH | `AiStyle` | `ai-styles-admin.controller.ts:192-203` | ✅ Exists |
| `/v1/admin/ai-styles/:id/enable` | PATCH | `AiStyle` | `ai-styles-admin.controller.ts:209-220` | ✅ Exists |
| `/v1/admin/ai-styles/:id` | DELETE | `{ ok: true, message: string }` | `ai-styles-admin.controller.ts:226-237` | ✅ Exists |
| `/v1/admin/personas` | GET | `AiPersona[]` | `missions-admin.personas.controller.ts:73-81` | ✅ Exists |
| `/v1/admin/personas` | POST | `AiPersona` | `missions-admin.personas.controller.ts:88-114` | ✅ Exists |
| `/v1/admin/personas/:id` | PUT | `AiPersona` | `missions-admin.personas.controller.ts:120-155` | ✅ Exists |
| `/v1/admin/personas/:id` | DELETE | `{ ok: true }` | `missions-admin.personas.controller.ts:161-174` | ✅ Exists |

### A.4) Database Models Used by Dashboard

**Evidence:** `backend/prisma/schema.prisma` + endpoint inspection

| Model | Table | Used By Endpoints | Dashboard Usage |
|-------|-------|-------------------|-----------------|
| `PracticeMissionTemplate` | `PracticeMissionTemplate` | Missions CRUD | Mission editor, Practice Hub |
| `MissionCategory` | `MissionCategory` | Categories CRUD | Practice Hub, category selector |
| `AiPersona` | `AiPersona` | Personas CRUD | Persona selector, Personas Admin |
| `AiStyle` | `AiStyle` | AI Styles CRUD | AI Style selector, AI Styles Admin |
| `EngineConfig` | `EngineConfig` | Engine Config GET/PUT | Engine Config section |
| `PromptHook` | `PromptHook` | Hooks CRUD | Hooks & Triggers tab |
| `PromptHookTrigger` | `PromptHookTrigger` | Trigger stats | Monitoring tab |
| `CustomInsightTemplate` | `CustomInsightTemplate` | Insights CRUD | Insights Catalog tab |
| `PracticeSession` | `PracticeSession` | Session queries | Mission Monitor, stats |
| `ChatMessage` | `ChatMessage` | Message queries | Mission Monitor |
| `MissionMoodTimeline` | `MissionMoodTimeline` | Timeline queries | Mission Monitor |
| `GateOutcome` | `GateOutcome` | Gate evaluation | Stats display |

### A.5) Duplicated/Overlapping Dashboards

**Found:**
- `backend/dashboards_bundle/dev-dashboard.html` (8,092 lines) - **ACTIVE**
- `backend/public/dev-dashboard.html` (62 lines) - **REDIRECT STUB ONLY**

**Decision:** Replace `backend/dashboards_bundle/dev-dashboard.html` with v2 implementation. The `public/` version is not used.

---

## B) Dev Dashboard v2 Feature Map (100% Coverage Checklist)

### B.1) Engine Map Features

| Feature (v2) | Where It Lives | Existing Equivalent? | Existing File(s) | Existing Endpoint(s) | Gaps / What's Missing |
|--------------|----------------|---------------------|------------------|----------------------|----------------------|
| **Mission Begin Node** | Engine Map | ❌ NO | N/A | N/A | **MISSING** - No visual node representation |
| **AI Engine Layers** | Engine Map | ⚠️ PARTIAL | `dev-dashboard.html:1052-2113` (Engine Config tabs) | `/v1/admin/engine-config` | **MISSING** - No visual layer map, only tabs |
| **MicroFeedback Node** | Engine Map | ⚠️ PARTIAL | `dev-dashboard.html:2006-2030` (Micro Feedback tab) | `/v1/admin/prompts/micro-feedback` | **MISSING** - No visual node, only tab editor |
| **Mission End Payload** | Engine Map | ❌ NO | N/A | N/A | **MISSING** - No visualization |
| **Mission Review Insights** | Engine Map | ⚠️ PARTIAL | `dev-dashboard.html:1749-1910` (Insights Catalog tab) | `/v1/admin/insights/catalog` | **MISSING** - No visual node, only list |
| **Stats Updates** | Engine Map | ⚠️ PARTIAL | `dev-dashboard.html:1980-2004` (Monitoring tab) | `/v1/admin/hooks/triggers/stats` | **MISSING** - No visual flow |
| **Personas Library** | Engine Map | ✅ YES | `dev-dashboard.html:7392-7631` (Personas Admin) | `/v1/admin/personas` | ✅ Complete |
| **Styles Library** | Engine Map | ✅ YES | `dev-dashboard.html:7392-7631` (AI Styles Admin) | `/v1/admin/ai-styles` | ✅ Complete |
| **Objectives Library** | Engine Map | ⚠️ PARTIAL | `dev-dashboard.html:1489-1544` (Gates & Objectives tab) | Via EngineConfig | **MISSING** - No standalone CRUD, only in config JSON |
| **GateSets Library** | Engine Map | ⚠️ PARTIAL | `dev-dashboard.html:1489-1544` (Gates & Objectives tab) | Via EngineConfig | **MISSING** - No standalone CRUD, only in config JSON |
| **Dynamics Library** | Engine Map | ⚠️ PARTIAL | `dev-dashboard.html:1358-1488` (Dynamics Profiles tab) | Via EngineConfig | **MISSING** - No standalone CRUD, only in config JSON |
| **Scoring Library** | Engine Map | ⚠️ PARTIAL | `dev-dashboard.html:1083-1357` (Scoring & Traits tab) | Via EngineConfig | **MISSING** - No standalone CRUD, only in config JSON |
| **Difficulty Profiles** | Engine Map | ❌ NO | N/A | N/A | **MISSING** - Not implemented |
| **Insight Packs** | Engine Map | ⚠️ PARTIAL | `dev-dashboard.html:1749-1910` (Insights Catalog) | `/v1/admin/insights/catalog` | **MISSING** - No "pack" concept, only individual templates |
| **Hooks & Triggers** | Engine Map | ✅ YES | `dev-dashboard.html:1546-1636` (Hooks & Triggers tab) | `/v1/admin/hooks`, `/v1/admin/hooks/triggers/stats` | ✅ Complete |
| **Signal Registry** | Engine Map | ❌ NO | N/A | N/A | **MISSING** - No endpoint or UI |
| **Hook Catalog** | Engine Map | ✅ YES | `dev-dashboard.html:1546-1570` (Hooks table) | `/v1/admin/hooks` | ✅ Complete |
| **Trigger Rules** | Engine Map | ⚠️ PARTIAL | `dev-dashboard.html:1613-1636` (Triggers table) | `/v1/admin/hooks/triggers/stats` (read-only stats) | **MISSING** - No CRUD for trigger rules, only stats |
| **Prompt Library** | Engine Map | ⚠️ PARTIAL | `dev-dashboard.html:1859-1909` (Opening Templates) | `/v1/admin/prompts/openings` | **MISSING** - No CRUD, only read-only catalog |
| **Prompt Packs** | Engine Map | ❌ NO | N/A | N/A | **MISSING** - No concept of "packs" |
| **Seeds/Templates** | Engine Map | ⚠️ PARTIAL | `dev-dashboard.html:1859-1909` | `/v1/admin/prompts/openings` | **MISSING** - No CRUD, only read |
| **Config Slots** | Engine Map | ❌ NO | N/A | N/A | **MISSING** - No save/load slots functionality |

### B.2) Practice Hub Features

| Feature (v2) | Where It Lives | Existing Equivalent? | Existing File(s) | Existing Endpoint(s) | Gaps / What's Missing |
|--------------|----------------|---------------------|------------------|----------------------|----------------------|
| **Netflix-style Categories** | Practice Hub | ⚠️ PARTIAL | `dev-dashboard.html:938-1051` (Practice Hub Designer) | `/v1/admin/missions/categories` | **MISSING** - No Netflix UI, only grid |
| **Netflix-style Missions** | Practice Hub | ⚠️ PARTIAL | `dev-dashboard.html:938-1051` (Practice Hub Designer) | `/v1/admin/missions` | **MISSING** - No Netflix rows, only table |
| **Category Reorder** | Practice Hub | ❌ NO | N/A | N/A | **MISSING** - No reorder UI |
| **Mission Reorder** | Practice Hub | ⚠️ PARTIAL | `dev-dashboard.html:114-117` (reorder endpoint exists) | `/v1/admin/missions/reorder` | **MISSING** - Endpoint exists but no UI |
| **Category Edit** | Practice Hub | ✅ YES | `dev-dashboard.html:957-1017` (Category Modal) | `/v1/admin/missions/categories/:id` PUT/PATCH | ✅ Complete |
| **Category Create** | Practice Hub | ✅ YES | `dev-dashboard.html:957-1017` (Category Modal) | `/v1/admin/missions/categories` POST | ✅ Complete |
| **Mission Create** | Practice Hub | ✅ YES | `dev-dashboard.html:422-825` (Mission Editor) | `/v1/admin/missions` POST | ✅ Complete |
| **Mission Edit** | Practice Hub | ✅ YES | `dev-dashboard.html:422-825` (Mission Editor) | `/v1/admin/missions/:id` PUT | ✅ Complete |

### B.3) Mission Builder Modal Features

| Feature (v2) | Where It Lives | Existing Equivalent? | Existing File(s) | Existing Endpoint(s) | Gaps / What's Missing |
|--------------|----------------|---------------------|------------------|----------------------|----------------------|
| **Modal Open from Hub** | Mission Builder | ⚠️ PARTIAL | `dev-dashboard.html:1018-1051` (Missions View Modal) | N/A | **MISSING** - Modal exists but not full Mission Builder |
| **Edit Mode** | Mission Builder | ✅ YES | `dev-dashboard.html:422-825` (Mission Editor) | `/v1/admin/missions/:id` PUT | ✅ Complete |
| **Create Mode** | Mission Builder | ✅ YES | `dev-dashboard.html:422-825` (Mission Editor) | `/v1/admin/missions` POST | ✅ Complete |
| **Category Defaults** | Mission Builder | ❌ NO | N/A | N/A | **MISSING** - No default category config |
| **Required Picks: Meta** | Mission Builder | ⚠️ PARTIAL | `dev-dashboard.html:473-496` (Category/Persona selects) | `/v1/admin/missions/meta` | **MISSING** - No validation glow |
| **Required Picks: Openings** | Mission Builder | ⚠️ PARTIAL | `dev-dashboard.html:1859-1909` (Opening templates) | `/v1/admin/prompts/openings` | **MISSING** - No picker in mission editor |
| **Required Picks: Limits** | Mission Builder | ✅ YES | `dev-dashboard.html:527-542` (Time/Max Messages/Word Limit) | N/A | ✅ Complete |
| **Required Picks: Persona** | Mission Builder | ✅ YES | `dev-dashboard.html:491-496` (Persona select) | `/v1/admin/missions/meta` | ✅ Complete |
| **Required Picks: AI Style** | Mission Builder | ✅ YES | `dev-dashboard.html:555-561` (AI Style select) | `/v1/admin/ai-styles` | ✅ Complete |
| **Required Picks: Objective** | Mission Builder | ⚠️ PARTIAL | `dev-dashboard.html:500-511` (Goal Type select) | N/A | **MISSING** - Goal Type exists but not full Objective picker |
| **Required Picks: Gate Set** | Mission Builder | ❌ NO | N/A | N/A | **MISSING** - No Gate Set picker |
| **Required Field Validation + Glow** | Mission Builder | ❌ NO | N/A | N/A | **MISSING** - No visual validation |
| **Save/Create Behavior** | Mission Builder | ✅ YES | `dev-dashboard.html:453` (Save Mission button) | `/v1/admin/missions` POST/PUT | ✅ Complete |

### B.4) Inspector Features

| Feature (v2) | Where It Lives | Existing Equivalent? | Existing File(s) | Existing Endpoint(s) | Gaps / What's Missing |
|--------------|----------------|---------------------|------------------|----------------------|----------------------|
| **Node Inspector** | Inspector | ❌ NO | N/A | N/A | **MISSING** - No inspector panel |
| **Config Viewer** | Inspector | ⚠️ PARTIAL | `dev-dashboard.html:422-825` (Mission Editor JSON) | N/A | **MISSING** - Only textarea, no structured viewer |

---

## C) "Load Everything" Button Plan

### C.1) Exact List of Resources to Load

**Dependency Order (what must load first):**

1. **Health Check** (no dependencies)
   - Endpoint: `GET /v1/health`
   - Purpose: Verify API is alive

2. **Auth Check** (optional, can fail gracefully)
   - Endpoint: `GET /v1/auth/me` (if exists) OR verify JWT in localStorage
   - Purpose: Check if user is authenticated

3. **Engine Config** (foundation for other configs)
   - Endpoint: `GET /v1/admin/engine-config`
   - Purpose: Load global engine configuration

4. **Meta Data** (needed for dropdowns)
   - Endpoint: `GET /v1/admin/missions/meta`
   - Purpose: Categories, personas, AI styles for selectors

5. **Categories** (needed for Practice Hub)
   - Endpoint: `GET /v1/admin/missions/categories`
   - Purpose: Category list for Practice Hub

6. **Missions** (needed for Practice Hub)
   - Endpoint: `GET /v1/admin/missions`
   - Purpose: Mission list for Practice Hub

7. **Personas** (needed for Engine Map library)
   - Endpoint: `GET /v1/admin/personas`
   - Purpose: Personas library

8. **AI Styles** (needed for Engine Map library)
   - Endpoint: `GET /v1/admin/ai-styles`
   - Purpose: AI Styles library

9. **Hooks** (needed for Engine Map)
   - Endpoint: `GET /v1/admin/hooks`
   - Purpose: Hook catalog

10. **Hook Trigger Stats** (needed for Engine Map monitoring)
    - Endpoint: `GET /v1/admin/hooks/triggers/stats?days=7`
    - Purpose: Trigger statistics

11. **Insight Catalog** (needed for Engine Map)
    - Endpoint: `GET /v1/admin/insights/catalog`
    - Purpose: Insight templates

12. **Micro Feedback** (needed for Engine Map)
    - Endpoint: `GET /v1/admin/prompts/micro-feedback`
    - Purpose: Micro feedback definitions

13. **Opening Templates** (needed for Engine Map)
    - Endpoint: `GET /v1/admin/prompts/openings`
    - Purpose: Opening prompt templates

14. **Mission Attachments** (needed for Engine Map)
    - Endpoint: `GET /v1/admin/missions/attachments`
    - Purpose: Mission profile attachments

### C.2) Missing Endpoints (Resources Without Dedicated Endpoints)

| Resource | Status | Notes |
|----------|--------|-------|
| **Objectives** | ⚠️ PARTIAL | Only via EngineConfig JSON, no standalone endpoint |
| **Gate Sets** | ⚠️ PARTIAL | Only via EngineConfig JSON, no standalone endpoint |
| **Dynamics Profiles** | ⚠️ PARTIAL | Only via EngineConfig JSON, no standalone endpoint |
| **Scoring Profiles** | ⚠️ PARTIAL | Only via EngineConfig JSON, no standalone endpoint |
| **Difficulty Profiles** | ❌ NO | Not implemented |
| **Insight Packs** | ❌ NO | No "pack" concept, only individual templates |
| **Signal Registry** | ❌ NO | Not implemented |
| **Trigger Rules CRUD** | ❌ NO | Only stats endpoint exists, no CRUD |
| **Prompt Packs** | ❌ NO | Not implemented |
| **Prompt Seeds/Templates CRUD** | ❌ NO | Only read-only openings endpoint |
| **Config Slots** | ❌ NO | Not implemented |

### C.3) Error Handling + Logging Spec

**Unified Error Log Format:**
```typescript
{
  resource: string,           // e.g., "Engine Config"
  endpoint: string,            // e.g., "GET /v1/admin/engine-config"
  statusCode: number | null,   // HTTP status or null if network error
  errorBody: any,              // Response body or error message
  isFatal: boolean,            // true if blocks core functionality
  missingInUI: string[]        // Array of UI features that won't work
}
```

**Fatal vs Non-Fatal:**
- **Fatal:** Health check, Engine Config, Meta Data, Categories, Missions
- **Non-Fatal:** Hooks, Insights, Micro Feedback, Opening Templates, Attachments, Trigger Stats

**Error Display:**
- Show unified log panel at bottom of dashboard
- Group by fatal/non-fatal
- Show resource name, endpoint, status code, error message
- List affected UI features

### C.4) Where in UI This Button Lives

**Location:** Header section, next to "Ping API" button

**Implementation:**
- Add button: `<button id="loadEverythingBtn" class="btn">Load Everything</button>`
- Place in header panel (line 365-406 area)
- Show loading spinner while executing
- Display results in unified log panel

### C.5) How to Keep It Non-Breaking

**Strategy:**
1. **Orchestration Only:** Button calls existing load functions, doesn't replace them
2. **Parallel Execution:** Load independent resources in parallel (with dependency order respected)
3. **Graceful Degradation:** Non-fatal failures don't block UI
4. **State Preservation:** Don't clear existing state if load fails
5. **Individual Loaders Still Work:** Keep all existing "Load X" buttons functional

---

## D) "Do Not Break Existing Logic" Plan

### D.1) What Logic Is "Existing and Must Remain"

**Admin Endpoints:**
- All `/v1/admin/*` endpoints must maintain current response shapes
- `GET /v1/admin/missions` must return array (not wrapped)
- `GET /v1/admin/missions/meta` must return `{ categories, personas, aiStyles }`
- Engine Config must return `{ ok: true, config: EngineConfigJson }`

**Auth/JWT:**
- JWT stored in localStorage key `sg_dev_jwt`
- JWT sent as `Authorization: Bearer <token>` header
- `AdminGuard` protects all admin endpoints
- Login endpoint: `POST /v1/auth/login` returns `{ accessToken: string }`

**Seed Behavior:**
- Default EngineConfig seeded on first run
- Default categories/personas/styles seeded via Prisma seed script
- Seed logic in `backend/prisma/seed.ts` (assumed, not verified)

**Engine Config Fallbacks:**
- Services fall back to hard-coded defaults if EngineConfig missing
- Default config matches current production behavior

### D.2) Migration Plan

**Phase 1: Add New UI in Parallel (Behind Toggle)**
- Create new dashboard file: `backend/dashboards_bundle/dev-dashboard-v2.html`
- Add feature flag: `?v2=true` URL parameter
- Keep existing dashboard fully functional
- New dashboard calls same endpoints

**Phase 2: Rewire to Same Endpoints**
- Verify all v2 features work with existing endpoints
- Add missing endpoints only if absolutely required
- Maintain backward compatibility

**Phase 3: Remove Old Tabs**
- After v2 verified, remove old UI sections
- Keep backend endpoints unchanged
- Update `dev-dashboard.html` to be v2 (or swap files)

**Alternative (Recommended):**
- **Replace in place:** Update `backend/dashboards_bundle/dev-dashboard.html` directly
- **Incremental replacement:** Replace sections one at a time
- **Test after each section:** Verify no regressions

### D.3) Top 10 Break Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Response shape mismatches** | Medium | High | Test all endpoints before v2, add response shape adapters if needed |
| **Auth header handling** | Low | High | Reuse existing `apiFetch()` function, test JWT flow |
| **Missing endpoints** | High | Medium | Identify gaps early, implement missing endpoints before v2 UI |
| **Mission config schema mismatch** | Medium | High | Validate against `MissionConfigV1` schema, test validation endpoint |
| **Bundle/public mismatch** | Low | Low | Only edit `dashboards_bundle/dev-dashboard.html` |
| **Caching/stale config slots** | Medium | Medium | Implement config slots with versioning, clear cache on load |
| **Engine Config JSON structure changes** | Low | High | Don't change EngineConfig structure, only add new fields |
| **Category/mission reorder breaking** | Medium | Medium | Test reorder endpoint thoroughly, add UI validation |
| **JWT expiration handling** | Medium | Medium | Add token refresh logic, show clear error on 401 |
| **Practice Hub state corruption** | Medium | Medium | Add state validation, reset on error |

---

## E) Removals Required

### E.1) Login → Get JWT UI Removal

**Found At:**
- **File:** `backend/dashboards_bundle/dev-dashboard.html`
- **Lines:** 386-403
- **HTML:**
```html
<div style="margin-top: 8px; padding: 8px; border: 1px solid var(--line); border-radius: 4px; background: var(--bg2);">
  <div class="mini" style="margin-bottom: 4px;">Login → Get JWT:</div>
  <div style="display: flex; gap: 4px; align-items: center;">
    <input id="loginEmailInput" type="email" placeholder="Email" style="width: 200px; padding: 4px;" />
    <input id="loginPasswordInput" type="password" placeholder="Password" style="width: 150px; padding: 4px;" />
    <button id="loginBtn" type="button" class="btn" style="padding: 4px 12px;">Login</button>
  </div>
</div>
```

**JavaScript References:**
- Lines 2428-2429: `loginEmailInput`, `loginPasswordInput` element references
- Lines 5072-5137: `handleLogin()` function
- Lines 5173-5174: Login button event binding
- Lines 5393-5394: Element initialization

**Current Usage:**
- Login button calls `handleLogin()` which posts to `/v1/auth/login`
- On success, JWT is stored in `localStorage` and `jwtInput.value`
- Password field is cleared after login

**Replacement Strategy:**
1. **Remove HTML:** Delete lines 386-403
2. **Remove JS References:** Remove element references (lines 2428-2429, 5393-5394)
3. **Keep JWT Input:** Keep `jwtInput` field (line 380-384) for manual JWT entry
4. **Silent Auth:** Optionally add silent JWT check on page load (check localStorage, verify token still valid)
5. **Remove Login Handler:** Remove `handleLogin()` function and button binding

**What Will Replace It:**
- JWT can still be manually pasted into `jwtInput` field
- JWT is loaded from localStorage on page load (already exists, line 5061-5062)
- No visible login UI - authentication handled behind the scenes or via external tool

---

## F) Missing Endpoint Report

### F.1) Objectives CRUD

**Resource Name:** Objectives  
**Needed CRUD:** GET (list), GET (by id), POST (create), PUT (update), DELETE  
**Proposed Endpoint Path:** `/v1/admin/objectives`  
**Controller Module:** `backend/src/modules/objectives/objectives-admin.controller.ts` (NEW)  
**DB Model:** Currently in `EngineConfig.configJson.objectives[]`, needs `Objective` table OR keep in config  
**Status:** ⚠️ Can use EngineConfig for now, but standalone CRUD would be better

### F.2) Gate Sets CRUD

**Resource Name:** Gate Sets  
**Needed CRUD:** GET (list), GET (by id), POST (create), PUT (update), DELETE  
**Proposed Endpoint Path:** `/v1/admin/gate-sets`  
**Controller Module:** `backend/src/modules/gates/gate-sets-admin.controller.ts` (NEW)  
**DB Model:** Currently in `EngineConfig.configJson.gates[]`, needs `GateSet` table OR keep in config  
**Status:** ⚠️ Can use EngineConfig for now, but standalone CRUD would be better

### F.3) Dynamics Profiles CRUD

**Resource Name:** Dynamics Profiles  
**Needed CRUD:** GET (list), GET (by id), POST (create), PUT (update), DELETE  
**Proposed Endpoint Path:** `/v1/admin/dynamics-profiles`  
**Controller Module:** `backend/src/modules/dynamics/dynamics-profiles-admin.controller.ts` (NEW)  
**DB Model:** Currently in `EngineConfig.configJson.dynamicsProfiles[]`, needs `DynamicsProfile` table OR keep in config  
**Status:** ⚠️ Can use EngineConfig for now, but standalone CRUD would be better

### F.4) Scoring Profiles CRUD

**Resource Name:** Scoring Profiles  
**Needed CRUD:** GET (list), GET (by id), POST (create), PUT (update), DELETE  
**Proposed Endpoint Path:** `/v1/admin/scoring-profiles`  
**Controller Module:** `backend/src/modules/scoring/scoring-profiles-admin.controller.ts` (NEW)  
**DB Model:** Currently in `EngineConfig.configJson.scoringProfiles[]`, needs `ScoringProfile` table OR keep in config  
**Status:** ⚠️ Can use EngineConfig for now, but standalone CRUD would be better

### F.5) Config Slots Save/Load

**Resource Name:** Config Slots  
**Needed CRUD:** GET (list slots), GET (load slot), POST (save slot), DELETE (delete slot)  
**Proposed Endpoint Path:** `/v1/admin/engine-config/slots`  
**Controller Module:** Extend `engine-config.controller.ts`  
**DB Model:** New `EngineConfigSlot` table with `slotNumber` (1-5), `name`, `configJson`, `createdAt`, `updatedAt`  
**Status:** ❌ **MISSING** - Must be implemented

### F.6) Signal Registry

**Resource Name:** Signal Registry  
**Needed CRUD:** GET (list), GET (by id), POST (create), PUT (update), DELETE  
**Proposed Endpoint Path:** `/v1/admin/signals`  
**Controller Module:** `backend/src/modules/signals/signals-admin.controller.ts` (NEW)  
**DB Model:** New `Signal` table with signal definitions  
**Status:** ❌ **MISSING** - Must be implemented

### F.7) Trigger Rules CRUD

**Resource Name:** Trigger Rules  
**Needed CRUD:** GET (list), GET (by id), POST (create), PUT (update), DELETE  
**Proposed Endpoint Path:** `/v1/admin/trigger-rules`  
**Controller Module:** `backend/src/modules/triggers/trigger-rules-admin.controller.ts` (NEW)  
**DB Model:** Currently only stats exist, needs `TriggerRule` table  
**Status:** ❌ **MISSING** - Must be implemented

### F.8) Prompt Packs CRUD

**Resource Name:** Prompt Packs  
**Needed CRUD:** GET (list), GET (by id), POST (create), PUT (update), DELETE  
**Proposed Endpoint Path:** `/v1/admin/prompt-packs`  
**Controller Module:** `backend/src/modules/prompts/prompt-packs-admin.controller.ts` (NEW)  
**DB Model:** New `PromptPack` table with pack definitions  
**Status:** ❌ **MISSING** - Must be implemented

### F.9) Prompt Templates CRUD

**Resource Name:** Prompt Templates (Seeds)  
**Needed CRUD:** GET (list), GET (by id), POST (create), PUT (update), DELETE  
**Proposed Endpoint Path:** `/v1/admin/prompt-templates`  
**Controller Module:** `backend/src/modules/prompts/prompt-templates-admin.controller.ts` (NEW)  
**DB Model:** New `PromptTemplate` table OR extend existing registry  
**Status:** ❌ **MISSING** - Currently only read-only openings endpoint

---

## G) Final Deliverable Plan (Execution-ready, but NO CODE)

### Step 1: Remove Login UI

**Files to Edit:**
- `backend/dashboards_bundle/dev-dashboard.html`

**What Will Be Added/Removed:**
- **Remove:** Lines 386-403 (Login UI HTML)
- **Remove:** Lines 2428-2429 (login element references in state)
- **Remove:** Lines 5072-5137 (`handleLogin()` function)
- **Remove:** Lines 5173-5174 (login button event binding)
- **Remove:** Lines 5393-5394 (login element initialization)

**Acceptance Criteria:**
- No visible "Login → Get JWT" UI in header
- JWT input field still exists for manual entry
- JWT still loads from localStorage on page load
- No JavaScript errors

### Step 2: Add "Load Everything" Button

**Files to Edit:**
- `backend/dashboards_bundle/dev-dashboard.html`

**What Will Be Added/Removed:**
- **Add:** "Load Everything" button in header (line ~370 area)
- **Add:** `loadEverything()` function that orchestrates all loads
- **Add:** Unified error log panel at bottom of page
- **Add:** Error logging format as specified in Section C.3

**Acceptance Criteria:**
- Button exists in header
- Clicking button loads all resources in dependency order
- Errors are logged in unified format
- Fatal vs non-fatal errors are clearly marked
- UI shows which features are missing due to failures

### Step 3: Implement Engine Map UI

**Files to Edit:**
- `backend/dashboards_bundle/dev-dashboard.html`

**What Will Be Added/Removed:**
- **Add:** Engine Map visual node diagram
- **Add:** Clickable nodes that open editors
- **Add:** Library sections for all resources (personas, styles, objectives, gates, dynamics, scoring, etc.)
- **Replace:** Current Engine Config tabs with Engine Map view
- **Keep:** All existing editors accessible from nodes

**Acceptance Criteria:**
- Engine Map shows all nodes (Mission Begin, AI Engine Layers, MicroFeedback, Mission End, Review Insights, Stats)
- All libraries are visible and clickable
- Clicking nodes opens correct editors
- All existing functionality preserved

### Step 4: Implement Practice Hub Netflix UI

**Files to Edit:**
- `backend/dashboards_bundle/dev-dashboard.html`

**What Will Be Added/Removed:**
- **Replace:** Current Practice Hub Designer grid with Netflix-style rows
- **Add:** Horizontal scrolling category rows
- **Add:** Mission cards within each row
- **Add:** Drag-and-drop reorder for categories and missions
- **Keep:** Category and mission CRUD modals

**Acceptance Criteria:**
- Categories display as horizontal scrolling rows
- Missions display as cards within category rows
- Reorder works for both categories and missions
- Create/edit modals still work
- Visual matches Netflix-style UI

### Step 5: Implement Mission Builder Modal

**Files to Edit:**
- `backend/dashboards_bundle/dev-dashboard.html`

**What Will Be Added/Removed:**
- **Add:** Mission Builder modal component
- **Add:** Required field validation with visual glow
- **Add:** Required picks: Meta, Openings, Limits, Persona, AI Style, Objective, Gate Set
- **Add:** Category defaults (Dynamics + Scoring + MicroFeedback + Insight Packs)
- **Modify:** Existing mission editor to work as modal
- **Add:** Modal opens from Practice Hub (click mission or plus button)

**Acceptance Criteria:**
- Modal opens from Practice Hub mission click
- Modal opens from category plus button (create mode)
- Required fields show validation glow when missing
- All required picks are available
- Save/create works correctly
- AI Style is mission-level (not category-level)

### Step 6: Implement Config Slots

**Files to Edit:**
- `backend/dashboards_bundle/dev-dashboard.html`
- `backend/src/modules/engine-config/engine-config.controller.ts` (NEW endpoints)
- `backend/prisma/schema.prisma` (NEW model)

**What Will Be Added/Removed:**
- **Add:** `EngineConfigSlot` Prisma model
- **Add:** Config slots endpoints (GET list, GET load, POST save, DELETE)
- **Add:** Config slots UI in Engine Map
- **Add:** Save/Load buttons for slots 1-5

**Acceptance Criteria:**
- Can save current engine config to slot 1-5
- Can load engine config from slot 1-5
- Slots persist across page reloads
- Slot names are editable

### Step 7: Add Missing Endpoints (If Required)

**Files to Edit:**
- Various controller files (NEW)

**What Will Be Added/Removed:**
- **Add:** Objectives CRUD endpoints (if standalone needed)
- **Add:** Gate Sets CRUD endpoints (if standalone needed)
- **Add:** Dynamics Profiles CRUD endpoints (if standalone needed)
- **Add:** Scoring Profiles CRUD endpoints (if standalone needed)
- **Add:** Signal Registry CRUD endpoints
- **Add:** Trigger Rules CRUD endpoints
- **Add:** Prompt Packs CRUD endpoints
- **Add:** Prompt Templates CRUD endpoints

**Acceptance Criteria:**
- All endpoints follow existing patterns
- All endpoints use `AdminGuard`
- Response shapes match existing conventions
- Endpoints are tested and working

### Step 8: Testing and Verification

**Files to Edit:**
- None (testing only)

**What Will Be Added/Removed:**
- **Test:** All existing endpoints still work
- **Test:** All new UI features work
- **Test:** No regressions in existing functionality
- **Test:** "Load Everything" button works
- **Test:** Config slots save/load work
- **Test:** Mission Builder modal works
- **Test:** Practice Hub Netflix UI works
- **Test:** Engine Map is fully clickable

**Acceptance Criteria:**
- All tests pass
- No console errors
- No broken functionality
- All features from v2 spec are implemented

---

## H) Acceptance Criteria (Definition of "Done")

### H.1) Engine Map

- ✅ Engine Map fully clickable → opens correct editors
- ✅ All libraries visible: Personas, Styles, Objectives, GateSets, Dynamics, Scoring, Difficulty Profiles, Insight Packs, Hooks, Signal Registry, Trigger Rules, Prompt Library, Prompt Packs, Seeds
- ✅ Visual nodes for: Mission Begin, AI Engine Layers, MicroFeedback, Mission End payload, Mission Review insights, Stats Updates
- ✅ Config slots save/load work (slots 1-5)

### H.2) Practice Hub

- ✅ Netflix-style UI with horizontal scrolling rows
- ✅ Categories display as rows
- ✅ Missions display as cards within rows
- ✅ Full CRUD: Create, Read, Update, Delete for categories and missions
- ✅ Reorder works for categories and missions
- ✅ Category edit modal works
- ✅ Mission create/edit opens Mission Builder modal

### H.3) Mission Builder Modal

- ✅ Modal only opens from Practice Hub (click mission or plus button)
- ✅ Edit mode: Opens with existing mission data
- ✅ Create mode: Opens empty for new mission
- ✅ Required field validation + glow: Meta, Openings, Limits, Persona, AI Style, Objective, Gate Set
- ✅ Category defaults: Dynamics + Scoring + MicroFeedback + Insight Packs
- ✅ AI Style is mission-level (NOT category-level)
- ✅ Save/create behavior works correctly

### H.4) Load Everything Button

- ✅ Button exists in header
- ✅ Loads all resources in correct dependency order
- ✅ Logs all failures with unified format
- ✅ Shows which resource failed, endpoint, status code, error body
- ✅ Marks fatal vs non-fatal errors
- ✅ Lists missing UI features due to failures

### H.5) No Regressions

- ✅ Existing endpoints still behave correctly
- ✅ Existing seed behavior still works
- ✅ Existing admin logic unchanged
- ✅ JWT auth still works
- ✅ Engine config fallbacks still work

### H.6) Removals

- ✅ No "Login → Get JWT" UI remains visible
- ✅ JWT can still be manually entered
- ✅ JWT still loads from localStorage

---

## Summary

**Current State:**
- Dashboard: `backend/dashboards_bundle/dev-dashboard.html` (8,092 lines)
- 51 admin endpoints identified and verified
- 12 Prisma models used by dashboard
- Login UI found at lines 386-403 (TO BE REMOVED)

**Gaps Identified:**
- Engine Map visual representation: **MISSING**
- Practice Hub Netflix UI: **MISSING**
- Mission Builder modal with validation: **MISSING**
- Config slots: **MISSING** (no endpoints)
- Signal Registry: **MISSING** (no endpoints)
- Trigger Rules CRUD: **MISSING** (only stats exist)
- Prompt Packs: **MISSING** (no concept)
- Objectives/Gates/Dynamics/Scoring standalone CRUD: **PARTIAL** (only in EngineConfig JSON)

**Implementation Strategy:**
- Replace `dev-dashboard.html` in place (incremental)
- Keep all existing endpoints unchanged
- Add missing endpoints only if required
- Remove Login UI completely
- Add "Load Everything" button
- Implement v2 features incrementally

**Risk Level:** Medium (many missing endpoints, but core functionality exists)

**Estimated Effort:** High (significant UI work + some backend endpoints)

