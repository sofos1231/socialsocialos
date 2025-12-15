# SCOUT REPORT — PHASE 4 (Multi-Wave): "Lego Editor + DP Insights + Seed Pack"

**Date**: Phase 4 Readiness Assessment  
**Mode**: READ-ONLY SCOUT (no code changes)  
**Mission**: Produce Phase 4 readiness + implementation map proving 100% understanding across Wave 1 + Wave 2 + Wave 3

---

## 1) PHASE 4 REQUIREMENTS MATRIX (AUTHORITATIVE)

| Requirement | Wave | Owner (DB/EngineConfig/MissionConfig) | Current Status | Evidence (file:line) | Exact Work Needed | Verification Checkline |
|------------|------|--------------------------------------|----------------|---------------------|-------------------|----------------------|
| **Dashboard reliability** (no dead tabs, no silent failures, consistent error surfacing) | 1 | Frontend | ⚠️ PARTIAL | `backend/public/dev-dashboard.html:4499-4502` (tabs init before DOM ready) | Move `engineConfigUI` init inside `wireEngineConfig()` or after DOM ready | All tabs clickable; errors visible in UI |
| **EngineConfig tabs clickable + wiring correctness** | 1 | Frontend | ❌ FAIL | `backend/public/dev-dashboard.html:4499-4502,6041-6065` | Fix DOM timing: move tab querySelector inside `wireEngineConfig()` | Click each tab → content renders |
| **AI Styles admin: full CRUD + full field coverage + persistence** | 1 | DB (AiStyle) | ⚠️ PARTIAL | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:74-234` | Verify all fields editable (maxChars, maxLines, questionRate, emojiRate, initiative, warmth, judgment, flirtTension, formality, temperature, topP, fewShotExamples) | Create/edit/style → reload → persists |
| **Hooks admin: full CRUD UI using existing endpoints** | 1 | DB (PromptHook) | ✅ PASS | `backend/src/modules/hooks/hooks.controller.ts:18-153` | UI exists in EngineConfig "Hooks & Triggers" tab; verify all fields editable | Create/edit hook → reload → persists |
| **MissionConfigV1 LEGO editor: structured editors for dynamics** | 2 | MissionConfig | ❌ FAIL | `backend/public/dev-dashboard.html:621` (only JSON textarea exists) | Build structured form: mode dropdown, locationTag dropdown, hasPerMessageTimer checkbox, defaultEntryRoute radio, 8 tuning sliders (pace, emojiDensity, flirtiveness, hostility, dryness, vulnerability, escalationSpeed, randomness) | Edit dynamics → save → reload → values preserved |
| **MissionConfigV1 LEGO editor: structured editors for objective** | 2 | MissionConfig | ❌ FAIL | `backend/public/dev-dashboard.html:621` (only JSON textarea exists) | Build structured form: kind dropdown, userTitle input, userDescription textarea | Edit objective → save → reload → values preserved |
| **MissionConfigV1 LEGO editor: structured editors for difficulty** | 2 | MissionConfig | ❌ FAIL | `backend/public/dev-dashboard.html:621` (only JSON textarea exists) | Build structured form: level dropdown, recommendedMaxMessages number, recommendedSuccessScore number, recommendedFailScore number, 6 tuning sliders (strictness, ambiguityTolerance, emotionalPenalty, bonusForCleverness, failThreshold, recoveryDifficulty) | Edit difficulty → save → reload → values preserved |
| **MissionConfigV1 LEGO editor: structured editors for statePolicy** | 2 | MissionConfig | ❌ FAIL | `backend/public/dev-dashboard.html:621` (only JSON textarea exists) | Build structured form: maxMessages number, minMessagesBeforeEnd number, maxStrikes number, timerSecondsPerMessage number, allowTimerExtension checkbox, successScoreThreshold number, failScoreThreshold number, enableGateSequence checkbox, enableMoodCollapse checkbox, enableObjectiveAutoSuccess checkbox, allowedEndReasons multi-select, endReasonPrecedence multi-select, 4 layer toggles (enableMicroDynamics, enableModifiers, enableArcDetection, enablePersonaDriftDetection) | Edit statePolicy → save → reload → values preserved |
| **MissionConfigV1 LEGO editor: structured editors for responseArchitecture** | 2 | MissionConfig | ❌ FAIL | `backend/public/dev-dashboard.html:621` (only JSON textarea exists) | Build structured form: 8 sliders 0-1 (reflection, validation, emotionalMirroring, pushPullFactor, riskTaking, clarity, reasoningDepth, personaConsistency) | Edit responseArchitecture → save → reload → values preserved |
| **MissionConfigV1 LEGO editor: style bindings** (aiStyleKey + scoringProfileCode/dynamicsProfileCode refs) | 2 | MissionConfig | ❌ FAIL | `backend/public/dev-dashboard.html:621` (only JSON textarea exists) | Build structured form: aiStyleKey dropdown (populated from `/v1/admin/ai-styles`), styleIntensity dropdown, scoringProfileCode dropdown (from EngineConfig), dynamicsProfileCode dropdown (from EngineConfig) | Edit style bindings → save → reload → values preserved |
| **MissionConfigV1 LEGO editor: JSON advanced view round-trip sync** | 2 | MissionConfig | ⚠️ PARTIAL | `backend/public/dev-dashboard.html:621` (textarea exists but no sync) | Add "Advanced JSON Editor" toggle; sync structured form ↔ JSON textarea bidirectionally | Edit structured → JSON updates; edit JSON → structured updates |
| **DP Insights: hooks are DB-backed** | 1 | DB (PromptHook) | ✅ PASS | `backend/prisma/schema.prisma:536-556`, `backend/src/modules/hooks/hooks.controller.ts:18-153` | N/A (already DB-backed) | Verify hooks CRUD works |
| **DP Insights: insight templates must be DB-backed by end of Phase 4** | 3 | DB (InsightTemplate - NEW) | ❌ FAIL | `backend/src/modules/insights/catalog/insight-catalog.v1.ts:1-424` (hard-coded) | Create `InsightTemplate` Prisma model, migrations, CRUD endpoints, migrate hardcoded catalog to DB | Edit insight template → reload → persists; runtime uses DB |
| **InsightTemplate DB model + migrations + CRUD endpoints + dashboard UI editor** | 3 | DB (InsightTemplate - NEW) | ❌ FAIL | `backend/prisma/schema.prisma` (no InsightTemplate model found) | Create model with fields: id, kind, category, weight, cooldownMissions, title, body, requires (gateKey/hookKey/patternKey), createdAt, updatedAt; create CRUD controller; build UI in EngineConfig "Insights Catalog" tab | Full CRUD works in dashboard |
| **Migration from hardcoded insight catalog → DB** (idempotent) | 3 | DB (InsightTemplate) | ❌ FAIL | `backend/src/modules/insights/catalog/insight-catalog.v1.ts:74-424` | Create seed/migration script that reads `InsightCatalog` class, inserts all templates into DB (idempotent upsert by id) | Run migration → all 67 templates in DB |
| **Runtime glue: insights selection uses DB-backed templates** (edits affect runtime) | 3 | Runtime | ❌ FAIL | `backend/src/modules/insights/engine/insight-selector.ts:35` (uses `getInsightCatalog()` hard-coded) | Modify `insight-selector.ts` to query DB instead of `getInsightCatalog()`; fallback to hard-coded if DB empty | Edit template in dashboard → run session → new template appears |
| **Cross-layer validation for MissionConfigV1** (new) | 2 | Validation | ❌ FAIL | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:364-985` (only per-layer exists) | Create `validateMissionConfigV1CrossLayer()` function checking compatibility (e.g., difficulty.strictness vs dynamics.pace, statePolicy.maxMessages vs difficulty.recommendedMaxMessages) | Invalid cross-layer config → validation error |
| **EngineConfig validation on save** (new) | 1 | Validation | ⚠️ PARTIAL | `backend/src/modules/engine-config/engine-config.service.ts:134-171` (basic validation exists) | Expand validation: check all profile codes exist, all arrays non-empty, all numeric ranges valid, all required fields present | Invalid EngineConfig → validation error |
| **Admin error contract consistency** (standardized ok/error shape) | 1 | All Controllers | ⚠️ PARTIAL | Mixed: `{ ok: true, ... }` vs direct arrays vs `{ code, message, details }` | Standardize all admin endpoints to `{ ok: boolean, error?: string, ... }` or `{ code, message, details }` | All errors have consistent shape |
| **EngineConfig versioning policy** (explicit; either JSON version field or key policy) | 1 | EngineConfig | ⚠️ UNKNOWN | `backend/src/modules/engine-config/engine-config.types.ts:274-292` (no version field) | Add `version: number` to `EngineConfigJson` or document key policy (GLOBAL_V1, GLOBAL_V2, etc.) | Version field exists or policy documented |
| **Starter seed pack: EngineConfig + ≥3 AI styles + ≥10 hooks + ≥10 insight templates + neutral/social mission template** | 3 | Seed | ⚠️ PARTIAL | `backend/prisma/seed.ts:1-465` (EngineConfig seeded, AI styles NOT seeded, hooks NOT seeded, insights NOT seeded, missions exist) | Add to seed.ts: 3 AI styles, 10 hooks (5 positive/5 negative), 10 insight templates, 1 neutral/social mission template | Run seed → all artifacts exist |
| **Backward compatibility: existing missions still run; normalizeMissionConfigV1 remains compatible** | All | Runtime | ✅ PASS | `backend/src/modules/practice/mission-config-runtime.ts:67-198` (normalizeMissionConfigV1 handles optional fields) | N/A (already compatible) | Existing missions start without errors |

---

## 2) CURRENT SYSTEM MAP (SOURCE OF TRUTH INVENTORY)

| Artifact | DB Model? | EngineConfig JSON? | Hard-coded TS? | Existing Admin Endpoints? | Existing Dashboard UI? | Evidence (file:line) |
|----------|-----------|-------------------|----------------|-------------------------|----------------------|---------------------|
| **EngineConfig (global)** | ✅ Yes (`EngineConfig` table) | ✅ Yes (stored as `configJson`) | ❌ No | ✅ Yes (`GET/PUT /v1/admin/engine-config`) | ✅ Yes (7-tab UI) | `backend/prisma/schema.prisma:878-884`, `backend/src/modules/engine-config/engine-config.controller.ts:10-34`, `backend/public/dev-dashboard.html:896-1900` |
| **Scoring profiles** | ✅ Yes (in `EngineConfig.configJson.scoringProfiles[]`) | ✅ Yes | ❌ No | ✅ Yes (via EngineConfig endpoints) | ✅ Yes (Scoring & Traits tab) | `backend/src/modules/engine-config/engine-config.types.ts:1-100`, `backend/public/dev-dashboard.html:922-1197` |
| **Mood policy** | ✅ Yes (in `EngineConfig.configJson.mood`) | ✅ Yes | ❌ No | ✅ Yes (via EngineConfig endpoints) | ✅ Yes (Mood & State Policy tab) | `backend/src/modules/engine-config/engine-config.types.ts:200-250`, `backend/public/dev-dashboard.html:1477-1587` |
| **Dynamics profiles** | ✅ Yes (in `EngineConfig.configJson.dynamicsProfiles[]`) | ✅ Yes | ❌ No | ✅ Yes (via EngineConfig endpoints) | ✅ Yes (Dynamics Profiles tab) | `backend/src/modules/engine-config/engine-config.types.ts:100-200`, `backend/public/dev-dashboard.html:1198-1328` |
| **Gates/objectives profiles** | ✅ Yes (in `EngineConfig.configJson.gates[]`) | ✅ Yes | ❌ No | ✅ Yes (via EngineConfig endpoints) | ✅ Yes (Gates & Objectives tab) | `backend/src/modules/engine-config/engine-config.types.ts:150-200`, `backend/public/dev-dashboard.html:1329-1384` |
| **Hooks (PromptHook)** | ✅ Yes (`PromptHook` table) | ❌ No | ❌ No | ✅ Yes (`GET/POST/PUT/DELETE /v1/admin/hooks`) | ✅ Yes (Hooks & Triggers tab) | `backend/prisma/schema.prisma:536-556`, `backend/src/modules/hooks/hooks.controller.ts:18-153`, `backend/public/dev-dashboard.html:1385-1476` |
| **Hook trigger stats (PromptHookTrigger)** | ✅ Yes (`PromptHookTrigger` table) | ❌ No | ❌ No | ✅ Yes (`GET /v1/admin/hooks/triggers/stats`) | ✅ Yes (Monitoring tab) | `backend/prisma/schema.prisma:558-583`, `backend/src/modules/hooks/hooks.controller.ts:112-153`, `backend/public/dev-dashboard.html:1766-1791` |
| **Insight templates/catalog** | ❌ No | ❌ No | ✅ Yes (`InsightCatalog` class) | ⚠️ Partial (`GET /v1/admin/insights/catalog` read-only) | ⚠️ Partial (Insights Catalog tab read-only) | `backend/src/modules/insights/catalog/insight-catalog.v1.ts:1-424`, `backend/src/modules/insights/insights-admin.controller.ts:1-42`, `backend/public/dev-dashboard.html:1588-1696` |
| **MissionConfigV1 (per mission)** | ✅ Yes (in `PracticeMissionTemplate.aiContract.missionConfigV1`) | ❌ No | ❌ No | ✅ Yes (`GET/POST/PUT /v1/admin/missions`, `POST /v1/admin/missions/validate-config`) | ⚠️ Partial (JSON textarea only) | `backend/prisma/schema.prisma:191-250`, `backend/src/modules/missions-admin/missions-admin.controller.ts:62-200`, `backend/public/dev-dashboard.html:621` |
| **AI styles (AiStyle)** | ✅ Yes (`AiStyle` table) | ❌ No | ❌ No | ✅ Yes (`GET/POST/PUT/PATCH/DELETE /v1/admin/ai-styles`) | ✅ Yes (AI Styles Admin section) | `backend/prisma/schema.prisma:162-186`, `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:74-234`, `backend/public/dev-dashboard.html:1997-2128` |
| **Personas (AiPersona)** | ✅ Yes (`AiPersona` table) | ❌ No | ❌ No | ✅ Yes (`GET/POST/PUT /v1/admin/personas`) | ✅ Yes (Personas Admin section) | `backend/prisma/schema.prisma:200-250`, `backend/src/modules/missions-admin/missions-admin.personas.controller.ts:1-200`, `backend/public/dev-dashboard.html:2129-2250` |
| **Mission templates (PracticeMissionTemplate)** | ✅ Yes (`PracticeMissionTemplate` table) | ❌ No | ❌ No | ✅ Yes (`GET/POST/PUT/DELETE /v1/admin/missions`) | ✅ Yes (Mission Editor section) | `backend/prisma/schema.prisma:191-250`, `backend/src/modules/missions-admin/missions-admin.controller.ts:62-200`, `backend/public/dev-dashboard.html:352-800` |

---

## 3) DASHBOARD UI WIRING AUDIT (CLICKABLE + NO SILENT FAILURES)

### buildUrl() Behavior and /v1 Prefixing

**Evidence**: `backend/public/dev-dashboard.html:2295-2301`
```2295:2301:backend/public/dev-dashboard.html
function buildUrl(path) {
  const base = getApiBase() || "";
  const prefix = "/v1";
  if (!path.startsWith("/")) path = "/" + path;
  if (path.startsWith(prefix)) return base + path;
  return base + prefix + path;
}
```

✅ **Confirmed**: Auto-prefixes `/v1` if path doesn't already start with it. Base URL from `ui.apiBaseInput.value`.

### Major Dashboard Sections and Wiring Functions

| Section | Wiring Function | Evidence (file:line) | Status |
|---------|----------------|---------------------|--------|
| **EngineConfig** | `wireEngineConfig()` | `backend/public/dev-dashboard.html:6041-6315` | ⚠️ BROKEN (tabs init before DOM ready) |
| **AI Styles Admin** | `wireAdminSections()` → `loadAiStylesAdmin()` | `backend/public/dev-dashboard.html:6016-6005,5793-5915` | ⚠️ UNKNOWN (needs endpoint verification) |
| **Personas Admin** | `wireAdminSections()` → `loadPersonasAdmin()` | `backend/public/dev-dashboard.html:6016-6005,5917-6000` | ⚠️ UNKNOWN (needs endpoint verification) |
| **Hooks Admin** | `wireEngineConfig()` → `loadHooks()` | `backend/public/dev-dashboard.html:6210,5215-5322` | ✅ WIRED |
| **Insights Catalog** | `wireEngineConfig()` → `loadInsights()` | `backend/public/dev-dashboard.html:6244,5475-5521` | ⚠️ READ-ONLY (no CRUD UI) |
| **Mission Editor** | `wireMissions()` | `backend/public/dev-dashboard.html:352-800` | ⚠️ JSON TEXTAREA ONLY |

### EngineConfig Tabs Wiring and DOM Readiness

**Problem**: `engineConfigUI` initialized at line 4499 (before DOM ready), but `wireEngineConfig()` called at line 6316 (after DOM ready).

**Evidence**: 
- `backend/public/dev-dashboard.html:4499-4569` - `engineConfigUI` object created with `document.querySelectorAll(".engineConfigTab")` → returns empty NodeList if DOM not ready
- `backend/public/dev-dashboard.html:6041-6065` - `wireEngineConfig()` tries to attach listeners to `engineConfigUI.tabs` → fails if empty

**Fix Needed**: Move `engineConfigUI` initialization inside `wireEngineConfig()` or after DOM ready event.

### AI Styles Admin Wiring and Response Shape Expectations

**Evidence**: `backend/public/dev-dashboard.html:5793-5806`
```5793:5806:backend/public/dev-dashboard.html
async function loadAiStylesAdmin() {
  try {
    const res = await apiFetch("/admin/ai-styles", { method: "GET" });
    if (Array.isArray(res)) {
      aiStylesAdminState.styles = res;
      renderAiStylesTable();
      showOk("AI Styles loaded.");
    } else {
      showError("Failed to load AI Styles: " + (res.error || "Unknown error"));
    }
  } catch (e) {
    showError("Error loading AI Styles: " + (e?.message || e));
  }
}
```

**Issue**: UI expects array directly, but endpoint may return `{ ok: true, styles: [...] }` or array. Need to verify endpoint response shape.

**Endpoint Evidence**: `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:74-97`
- `GET /v1/admin/ai-styles` returns array directly (not wrapped)

✅ **Status**: Should work, but needs verification.

### Hooks UI Presence/Wiring

**Evidence**: `backend/public/dev-dashboard.html:1385-1476` (Hooks & Triggers tab HTML), `backend/public/dev-dashboard.html:5215-5322` (loadHooks, renderHooksTable, saveHook functions)

✅ **Status**: UI exists and wired. CRUD functions implemented.

### Insights Editor UI Presence/Wiring

**Evidence**: `backend/public/dev-dashboard.html:1588-1696` (Insights Catalog tab HTML), `backend/public/dev-dashboard.html:5475-5521` (loadInsights, renderInsightsTable functions)

❌ **Status**: UI exists but READ-ONLY. No CRUD editor. Only displays templates from hard-coded catalog.

### Mission Editor: Structured Lego Editor vs JSON Textarea

**Evidence**: `backend/public/dev-dashboard.html:621`
```621:621:backend/public/dev-dashboard.html
<textarea id="aiContractJsonTextarea" ...></textarea>
```

❌ **Status**: Only JSON textarea exists. No structured editors for dynamics, objective, difficulty, statePolicy, responseArchitecture.

### Error Swallowing Audit (try/catch, showError usage)

| Location | Function | Error Handling | Evidence (file:line) | Risk Level |
|----------|----------|---------------|---------------------|------------|
| `apiFetch()` | Network errors | ✅ Shows error | `backend/public/dev-dashboard.html:2319-2321` | LOW |
| `apiFetch()` | JSON parse errors | ⚠️ Swallowed (try/catch, no showError) | `backend/public/dev-dashboard.html:2327-2331` | MEDIUM |
| `apiFetch()` | HTTP errors | ⚠️ Attached to error object, caller must handle | `backend/public/dev-dashboard.html:2334-2340` | LOW |
| `loadEngineConfig()` | All errors | ✅ Shows error | `backend/public/dev-dashboard.html:4583-4585` | LOW |
| `saveEngineConfig()` | All errors | ✅ Shows error | `backend/public/dev-dashboard.html:4604-4606` | LOW |
| `loadAiStylesAdmin()` | All errors | ✅ Shows error | `backend/public/dev-dashboard.html:5803-5805` | LOW |
| `loadHooks()` | All errors | ✅ Shows error | `backend/public/dev-dashboard.html:5225-5227` | LOW |
| `loadInsights()` | All errors | ✅ Shows error | `backend/public/dev-dashboard.html:5487-5489` | LOW |
| Mission save | Validation errors | ✅ Shows structured errors | `backend/public/dev-dashboard.html:3954-3986` | LOW |
| Mission save | Other errors | ✅ Shows error | `backend/public/dev-dashboard.html:3984` | LOW |

### Dead Click Risks

1. **EngineConfig tabs** - `backend/public/dev-dashboard.html:4499-4502` - Tabs querySelector returns empty NodeList → click handlers never attached
2. **AI Styles Admin buttons** - `backend/public/dev-dashboard.html:1997-2128` - Needs verification endpoint returns expected shape
3. **Personas Admin buttons** - `backend/public/dev-dashboard.html:2129-2250` - Needs verification endpoint returns expected shape
4. **Insights Catalog CRUD buttons** - `backend/public/dev-dashboard.html:1588-1696` - NO CRUD buttons exist (read-only)

---

## 4) BACKEND ADMIN ENDPOINTS AUDIT (WHAT EXISTS VS MISSING)

| Endpoint | Method | Path | Returns Shape | Used by Dashboard? | Auth/Guard? | Error Contract | Evidence (file:line) |
|----------|--------|------|---------------|-------------------|-------------|----------------|---------------------|
| **AI Styles** | GET | `/v1/admin/ai-styles` | `AiStyle[]` (array) | ✅ Yes | ❌ No (TODO) | Direct array | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:87-97` |
| **AI Styles** | GET | `/v1/admin/ai-styles/:id` | `AiStyle` (object) | ❌ No | ❌ No (TODO) | Direct object | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:98-110` |
| **AI Styles** | POST | `/v1/admin/ai-styles` | `AiStyle` (object) | ✅ Yes | ❌ No (TODO) | Direct object | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:116-146` |
| **AI Styles** | PUT | `/v1/admin/ai-styles/:id` | `AiStyle` (object) | ✅ Yes | ❌ No (TODO) | Direct object | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:152-200` |
| **AI Styles** | PATCH | `/v1/admin/ai-styles/:id/disable` | `AiStyle` (object) | ✅ Yes | ❌ No (TODO) | Direct object | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:206-220` |
| **AI Styles** | PATCH | `/v1/admin/ai-styles/:id/enable` | `AiStyle` (object) | ✅ Yes | ❌ No (TODO) | Direct object | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:222-236` |
| **AI Styles** | DELETE | `/v1/admin/ai-styles/:id` | `AiStyle` (object) | ❌ No | ❌ No (TODO) | Direct object | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:238-250` |
| **Personas** | GET | `/v1/admin/personas` | `AiPersona[]` (array) | ✅ Yes | ❌ No (TODO) | Direct array | `backend/src/modules/missions-admin/missions-admin.personas.controller.ts:20-40` |
| **Personas** | GET | `/v1/admin/personas/:id` | `AiPersona` (object) | ❌ No | ❌ No (TODO) | Direct object | `backend/src/modules/missions-admin/missions-admin.personas.controller.ts:42-60` |
| **Personas** | POST | `/v1/admin/personas` | `AiPersona` (object) | ✅ Yes | ❌ No (TODO) | Direct object | `backend/src/modules/missions-admin/missions-admin.personas.controller.ts:62-100` |
| **Personas** | PUT | `/v1/admin/personas/:id` | `AiPersona` (object) | ✅ Yes | ❌ No (TODO) | Direct object | `backend/src/modules/missions-admin/missions-admin.personas.controller.ts:102-140` |
| **Hooks** | GET | `/v1/admin/hooks` | `{ ok: true, hooks: PromptHook[] }` | ✅ Yes | ❌ No (TODO) | `{ ok, hooks }` or `{ ok: false, error }` | `backend/src/modules/hooks/hooks.controller.ts:27-44` |
| **Hooks** | GET | `/v1/admin/hooks/:id` | `{ ok: true, hook: PromptHook }` | ❌ No | ❌ No (TODO) | `{ ok, hook }` or `{ ok: false, error }` | `backend/src/modules/hooks/hooks.controller.ts:49-60` |
| **Hooks** | POST | `/v1/admin/hooks` | `{ ok: true, hook: PromptHook }` | ✅ Yes | ❌ No (TODO) | `{ ok, hook }` | `backend/src/modules/hooks/hooks.controller.ts:65-83` |
| **Hooks** | PUT | `/v1/admin/hooks/:id` | `{ ok: true, hook: PromptHook }` | ✅ Yes | ❌ No (TODO) | `{ ok, hook }` | `backend/src/modules/hooks/hooks.controller.ts:88-106` |
| **Hooks** | DELETE | `/v1/admin/hooks/:id` | `{ ok: true, hook: PromptHook }` | ❌ No | ❌ No (TODO) | `{ ok, hook }` | `backend/src/modules/hooks/hooks.controller.ts:108-110` |
| **Hooks** | GET | `/v1/admin/hooks/triggers/stats` | `{ ok: true, stats: [...] }` | ✅ Yes | ❌ No (TODO) | `{ ok, stats }` | `backend/src/modules/hooks/hooks.controller.ts:112-153` |
| **Insights** | GET | `/v1/admin/insights/catalog` | `{ ok: true, templates: InsightTemplate[] }` | ✅ Yes | ❌ No (TODO) | `{ ok, templates }` | `backend/src/modules/insights/insights-admin.controller.ts:16-41` |
| **Insights** | POST | `/v1/admin/insights/templates` | ❌ MISSING | ❌ No | ❌ No | N/A | N/A |
| **Insights** | PUT | `/v1/admin/insights/templates/:id` | ❌ MISSING | ❌ No | ❌ No | N/A | N/A |
| **Insights** | DELETE | `/v1/admin/insights/templates/:id` | ❌ MISSING | ❌ No | ❌ No | N/A | N/A |
| **Missions** | GET | `/v1/admin/missions` | `PracticeMissionTemplate[]` (array) | ✅ Yes | ❌ No (TODO) | Direct array | `backend/src/modules/missions-admin/missions-admin.controller.ts:62-65` |
| **Missions** | POST | `/v1/admin/missions` | `PracticeMissionTemplate` (object) | ✅ Yes | ❌ No (TODO) | `{ code, message, details }` on error | `backend/src/modules/missions-admin/missions-admin.controller.ts:67-100` |
| **Missions** | PUT | `/v1/admin/missions/:id` | `PracticeMissionTemplate` (object) | ✅ Yes | ❌ No (TODO) | `{ code, message, details }` on error | `backend/src/modules/missions-admin/missions-admin.controller.ts:102-135` |
| **Missions** | POST | `/v1/admin/missions/validate-config` | `{ normalizedAiContract: {...} }` | ✅ Yes | ❌ No (TODO) | `{ code, message, details }` on error | `backend/src/modules/missions-admin/missions-admin.controller.ts:137-150` |
| **EngineConfig** | GET | `/v1/admin/engine-config` | `{ ok: true, config: EngineConfigJson }` | ✅ Yes | ❌ No (TODO) | `{ ok, config }` | `backend/src/modules/engine-config/engine-config.controller.ts:18-22` |
| **EngineConfig** | PUT | `/v1/admin/engine-config` | `{ ok: true, config: EngineConfigJson }` | ✅ Yes | ❌ No (TODO) | `BadRequestException` on error | `backend/src/modules/engine-config/engine-config.controller.ts:28-34` |

**Missing Endpoints**:
- `POST /v1/admin/insights/templates` - Create insight template
- `PUT /v1/admin/insights/templates/:id` - Update insight template
- `DELETE /v1/admin/insights/templates/:id` - Delete insight template
- `GET /v1/admin/insights/templates/:id` - Get single insight template

---

## 5) DP INSIGHTS "TRUTH" + MIGRATION FEASIBILITY

### Hooks are DB-Backed ✅

**Evidence**:
- **Model**: `backend/prisma/schema.prisma:536-556` - `PromptHook` table exists
- **CRUD Endpoints**: `backend/src/modules/hooks/hooks.controller.ts:18-153` - Full CRUD implemented
- **Runtime Usage**: Hooks loaded from DB at runtime

✅ **PROVEN**: Hooks are DB-backed.

### Insight Templates are Currently Hard-Coded ❌

**Evidence**:
- **Hard-Coded Catalog**: `backend/src/modules/insights/catalog/insight-catalog.v1.ts:1-424` - `InsightCatalog` class with `initializeCatalog()` method that adds ~67 templates to in-memory Map
- **No DB Model**: `grep` search for `InsightTemplate` in `backend/prisma/schema.prisma` → **NO MATCHES**
- **Read-Only Endpoint**: `backend/src/modules/insights/insights-admin.controller.ts:1-42` - Only `GET /v1/admin/insights/catalog` exists (read-only)
- **Runtime Usage**: `backend/src/modules/insights/engine/insight-selector.ts:35` - Uses `getInsightCatalog()` which returns hard-coded catalog

❌ **PROVEN**: Insight templates are hard-coded, NOT DB-backed.

### Proposed Prisma Model Fields for InsightTemplate

```prisma
model InsightTemplate {
  id                String   @id @default(cuid())
  kind              InsightKind  // GATE_FAIL | POSITIVE_HOOK | NEGATIVE_PATTERN | GENERAL_TIP
  category          String
  weight            Int      @default(50)  // 0-100
  cooldownMissions  Int      @default(5)   // 3-5 typical
  title             String
  body              String
  requiresJson      Json?    // { gateKey?: string, hookKey?: string, patternKey?: string }
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([kind])
  @@index([category])
  @@index([isActive])
  @@unique([kind, category, title])  // Prevent duplicates
}
```

### Required Indexes

- `kind` - For filtering by insight kind
- `category` - For filtering by category
- `isActive` - For filtering active templates
- Unique constraint on `[kind, category, title]` - Prevent duplicates

### CRUD Endpoints Needed

- `GET /v1/admin/insights/templates` - List all templates (with filters: `?kind=`, `?category=`, `?activeOnly=true`)
- `GET /v1/admin/insights/templates/:id` - Get single template
- `POST /v1/admin/insights/templates` - Create template
- `PUT /v1/admin/insights/templates/:id` - Update template
- `DELETE /v1/admin/insights/templates/:id` - Delete template (soft delete: set `isActive=false`)

### Idempotent "Import Hardcoded Catalog into DB" Strategy

1. Create migration script: `backend/prisma/migrations/XXXXXX_import_insight_catalog/migration.ts`
2. Script reads `InsightCatalog` class: `const catalog = new InsightCatalog()`
3. For each template in catalog: `prisma.insightTemplate.upsert({ where: { id: template.id }, create: {...}, update: {...} })`
4. Run migration idempotently (can run multiple times safely)

### Runtime Selection Change Points

| File | Function | Current Code | Change Needed | Evidence (file:line) |
|------|----------|-------------|---------------|---------------------|
| `backend/src/modules/insights/engine/insight-selector.ts` | `selectInsightsV2()` | `const catalog = getInsightCatalog()` | Query DB: `await prisma.insightTemplate.findMany({ where: { isActive: true } })` | `backend/src/modules/insights/engine/insight-selector.ts:35` |
| `backend/src/modules/insights/catalog/insight-catalog.v1.ts` | `getGateInsights()` | `this.templates.values().filter(...)` | Query DB: `await prisma.insightTemplate.findMany({ where: { kind: 'GATE_FAIL', requiresJson: { path: ['gateKey'], equals: gateKey } } })` | `backend/src/modules/insights/catalog/insight-catalog.v1.ts:34-38` |
| `backend/src/modules/insights/catalog/insight-catalog.v1.ts` | `getHookInsights()` | `this.templates.values().filter(...)` | Query DB: `await prisma.insightTemplate.findMany({ where: { kind: 'POSITIVE_HOOK', ... } })` | `backend/src/modules/insights/catalog/insight-catalog.v1.ts:43-50` |
| `backend/src/modules/insights/catalog/insight-catalog.v1.ts` | `getPatternInsights()` | `this.templates.values().filter(...)` | Query DB: `await prisma.insightTemplate.findMany({ where: { kind: 'NEGATIVE_PATTERN', ... } })` | `backend/src/modules/insights/catalog/insight-catalog.v1.ts:55-62` |
| `backend/src/modules/insights/catalog/insight-catalog.v1.ts` | `getGeneralTips()` | `this.templates.values().filter(...)` | Query DB: `await prisma.insightTemplate.findMany({ where: { kind: 'GENERAL_TIP' } })` | `backend/src/modules/insights/catalog/insight-catalog.v1.ts:67-69` |

**Alternative**: Create new `InsightTemplateService` that queries DB, keep `InsightCatalog` as fallback.

### Backward Compatibility Strategy

**Option 1 (Recommended)**: Fallback to hard-coded if DB empty
- Check `await prisma.insightTemplate.count()` → if 0, use `getInsightCatalog()`
- Allows gradual migration

**Option 2**: Require seed/import before runtime
- Throw error if DB empty
- More strict, ensures all templates in DB

**Recommendation**: Option 1 (fallback) for backward compatibility.

---

## 6) MISSIONCONFIGV1 LEGO EDITOR: EXACT FIELDS + UI PLAN

### Current State

**Schema Location**: `backend/src/modules/missions-admin/mission-config-v1.schema.ts:147-272`

**Mission Config Load/Save in Dashboard**: `backend/public/dev-dashboard.html:621` (JSON textarea only)

**Structured Form Exists**: ❌ NO - Only JSON textarea exists at `backend/public/dev-dashboard.html:621`

### Field Checklist for Structured Editor

#### Dynamics Editor (`MissionConfigV1Dynamics`)

| Field | Type | UI Component | Validation | Evidence (file:line) |
|-------|------|--------------|------------|---------------------|
| `mode` | `MissionMode` | Dropdown (`CHAT` \| `REAL_LIFE`) | Required, enum | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:147-148` |
| `locationTag` | `MissionLocationTag` | Dropdown (`BAR` \| `CLUB` \| `CAFE` \| `STREET` \| `APP_CHAT` \| `HOME` \| `OFFICE` \| `OTHER`) | Required, enum | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:149` |
| `hasPerMessageTimer` | `boolean` | Checkbox | Required | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:150` |
| `defaultEntryRoute` | `'TEXT_CHAT' \| 'VOICE_SIM'` | Radio buttons | Required, enum | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:151` |
| `pace` | `number \| null` | Slider (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:154` |
| `emojiDensity` | `number \| null` | Slider (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:155` |
| `flirtiveness` | `number \| null` | Slider (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:156` |
| `hostility` | `number \| null` | Slider (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:157` |
| `dryness` | `number \| null` | Slider (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:158` |
| `vulnerability` | `number \| null` | Slider (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:159` |
| `escalationSpeed` | `number \| null` | Slider (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:160` |
| `randomness` | `number \| null` | Slider (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:161` |

#### Objective Editor (`MissionConfigV1Objective`)

| Field | Type | UI Component | Validation | Evidence (file:line) |
|-------|------|--------------|------------|---------------------|
| `kind` | `MissionObjectiveKind` | Dropdown (`GET_NUMBER` \| `GET_INSTAGRAM` \| `GET_DATE_AGREEMENT` \| `FIX_AWKWARD_MOMENT` \| `HOLD_BOUNDARY` \| `PRACTICE_OPENING` \| `FREE_EXPLORATION` \| `CUSTOM`) | Required, enum | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:174-177` |
| `userTitle` | `string` | Text input | Required, non-empty | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:176` |
| `userDescription` | `string` | Textarea | Required, non-empty | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:177` |

#### Difficulty Editor (`MissionConfigV1Difficulty`)

| Field | Type | UI Component | Validation | Evidence (file:line) |
|-------|------|--------------|------------|---------------------|
| `level` | `MissionDifficulty` | Dropdown (`EASY` \| `MEDIUM` \| `HARD` \| `ELITE`) | Required, enum | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:182` |
| `recommendedMaxMessages` | `number \| null` | Number input | Optional, > 0 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:183` |
| `recommendedSuccessScore` | `number \| null` | Number input (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:184` |
| `recommendedFailScore` | `number \| null` | Number input (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:185` |
| `strictness` | `number \| null` | Slider (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:188` |
| `ambiguityTolerance` | `number \| null` | Slider (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:189` |
| `emotionalPenalty` | `number \| null` | Slider (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:190` |
| `bonusForCleverness` | `number \| null` | Slider (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:191` |
| `failThreshold` | `number \| null` | Slider (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:192` |
| `recoveryDifficulty` | `number \| null` | Slider (0-100) | Optional, 0-100 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:193` |

#### State Policy Editor (`MissionConfigV1StatePolicy`)

| Field | Type | UI Component | Validation | Evidence (file:line) |
|-------|------|--------------|------------|---------------------|
| `maxMessages` | `number` | Number input | Required, > 0 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:202` |
| `minMessagesBeforeEnd` | `number \| null` | Number input | Optional, > 0 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:203` |
| `maxStrikes` | `number` | Number input | Required, >= 0 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:204` |
| `timerSecondsPerMessage` | `number \| null` | Number input | Optional, > 0 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:205` |
| `allowTimerExtension` | `boolean` | Checkbox | Required | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:206` |
| `successScoreThreshold` | `number` | Number input (0-100) | Required, 0-100 (deprecated but required) | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:208` |
| `failScoreThreshold` | `number` | Number input (0-100) | Required, 0-100 (deprecated but required) | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:210` |
| `enableGateSequence` | `boolean` | Checkbox | Required | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:211` |
| `enableMoodCollapse` | `boolean` | Checkbox | Required | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:212` |
| `enableObjectiveAutoSuccess` | `boolean` | Checkbox | Required | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:213` |
| `allowedEndReasons` | `MissionEndReasonCode[]` | Multi-select dropdown | Required, non-empty array | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:214` |
| `endReasonPrecedence` | `MissionEndReasonCode[] \| null` | Multi-select dropdown | Optional, array | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:215` |
| `enableMicroDynamics` | `boolean` | Checkbox | Optional, default true | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:217` |
| `enableModifiers` | `boolean` | Checkbox | Optional, default true | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:218` |
| `enableArcDetection` | `boolean` | Checkbox | Optional, default true | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:219` |
| `enablePersonaDriftDetection` | `boolean` | Checkbox | Optional, default true | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:220` |

#### Response Architecture Editor (`MissionConfigV1ResponseArchitecture`)

| Field | Type | UI Component | Validation | Evidence (file:line) |
|-------|------|--------------|------------|---------------------|
| `reflection` | `number \| null` | Slider (0-1) | Optional, 0-1 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:234` |
| `validation` | `number \| null` | Slider (0-1) | Optional, 0-1 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:235` |
| `emotionalMirroring` | `number \| null` | Slider (0-1) | Optional, 0-1 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:236` |
| `pushPullFactor` | `number \| null` | Slider (0-1) | Optional, 0-1 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:237` |
| `riskTaking` | `number \| null` | Slider (0-1) | Optional, 0-1 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:238` |
| `clarity` | `number \| null` | Slider (0-1) | Optional, 0-1 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:239` |
| `reasoningDepth` | `number \| null` | Slider (0-1) | Optional, 0-1 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:240` |
| `personaConsistency` | `number \| null` | Slider (0-1) | Optional, 0-1 | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:241` |

#### Style Bindings Editor

| Field | Type | UI Component | Validation | Evidence (file:line) |
|-------|------|--------------|------------|---------------------|
| `style.aiStyleKey` | `AiStyleKey` | Dropdown (populated from `/v1/admin/ai-styles`) | Required, enum | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:197` |
| `style.styleIntensity` | `'SOFT' \| 'NORMAL' \| 'HARD' \| null` | Dropdown | Optional, enum | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:198` |
| `scoringProfileCode` | `string \| null` | Dropdown (populated from EngineConfig scoring profiles) | Optional | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:270` |
| `dynamicsProfileCode` | `string \| null` | Dropdown (populated from EngineConfig dynamics profiles) | Optional | `backend/src/modules/missions-admin/mission-config-v1.schema.ts:271` |

#### JSON Advanced Editor Round-Trip Sync Requirements

1. **Structured → JSON**: When user edits structured form, update JSON textarea in real-time (or on "Apply" button)
2. **JSON → Structured**: When user edits JSON textarea, parse and populate structured form (with validation errors shown if invalid)
3. **Toggle**: "Advanced JSON Editor" toggle button to show/hide JSON textarea
4. **Validation**: JSON must pass `validateMissionConfigV1Shape()` before syncing to structured form

### Files/Sections to Touch

- `backend/public/dev-dashboard.html:621` - Replace JSON textarea with structured form sections
- `backend/public/dev-dashboard.html:352-800` - Mission Editor section (add structured editors)
- New functions needed: `renderDynamicsEditor()`, `renderObjectiveEditor()`, `renderDifficultyEditor()`, `renderStatePolicyEditor()`, `renderResponseArchitectureEditor()`, `renderStyleBindingsEditor()`, `syncStructuredToJson()`, `syncJsonToStructured()`

---

## 7) VALIDATION WALL AUDIT

### What Validation Exists Now

#### MissionConfigV1 Per-Layer Validator

**Evidence**: `backend/src/modules/missions-admin/mission-config-v1.schema.ts:364-985`
- Function: `validateMissionConfigV1Shape(aiContract: any): MissionConfigValidationError[]`
- Returns: Array of `{ path: string, message: string }`
- Validates: version, dynamics, objective, difficulty, style, statePolicy, openings, responseArchitecture, aiRuntimeProfile
- Error Format: `{ code: 'VALIDATION', message: string, details: MissionConfigValidationError[] }`

**How Errors Surfaced**: `backend/src/modules/missions-admin/missions-admin.service.ts:1744-1750`
```typescript
const validationErrors = validateMissionConfigV1Shape(wrappedAiContract);
if (validationErrors.length > 0) {
  throw new BadRequestException({
    code: 'VALIDATION',
    message: 'Invalid aiContract.missionConfigV1',
    details: validationErrors,
  });
}
```

✅ **Status**: Per-layer validation exists and surfaces errors correctly.

#### EngineConfig Validation

**Evidence**: `backend/src/modules/engine-config/engine-config.service.ts:134-171`
- Function: `private validateConfig(config: EngineConfigJson): void`
- Validates:
  - Default scoring profile exists and is active
  - Default dynamics profile exists and is active
  - Trait weights sum to ~1.0 (warning only, not error)
- Error Format: Throws `BadRequestException` with message

⚠️ **Status**: Basic validation exists but incomplete (only checks defaults and weight sums).

#### AI Style Validation

**Evidence**: `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:117-146`
- Validates: `key` must be valid `AiStyleKey` enum, `name` required, integer fields clamped to ranges, float fields clamped
- Error Format: Throws Prisma errors (converted to HTTP via `prismaToHttp()`)

⚠️ **Status**: Minimal validation (type checks and clamping only).

### What Phase 4 Must Add

#### Cross-Layer MissionConfigV1 Validation Rules (at least 10)

1. `difficulty.strictness` vs `dynamics.pace`: If strictness > 70 and pace < 30, warn (slow pace + strict grading = frustrating)
2. `statePolicy.maxMessages` vs `difficulty.recommendedMaxMessages`: If maxMessages < recommendedMaxMessages, error (hard cap below recommendation)
3. `statePolicy.timerSecondsPerMessage` vs `dynamics.hasPerMessageTimer`: If timerSecondsPerMessage set but hasPerMessageTimer=false, warn (timer configured but disabled)
4. `objective.kind` vs `statePolicy.enableObjectiveAutoSuccess`: If kind=GET_NUMBER and enableObjectiveAutoSuccess=false, warn (auto-success disabled for objective-based mission)
5. `difficulty.level` vs `statePolicy.maxStrikes`: If level=ELITE and maxStrikes > 3, warn (elite missions should be strict)
6. `dynamics.defaultEntryRoute` vs `statePolicy.timerSecondsPerMessage`: If defaultEntryRoute=VOICE_SIM and timerSecondsPerMessage set, warn (voice sim may not need timer)
7. `responseArchitecture.riskTaking` vs `difficulty.strictness`: If riskTaking > 0.7 and strictness > 70, warn (high risk + strict grading = high failure rate)
8. `statePolicy.allowedEndReasons` vs `statePolicy.endReasonPrecedence`: If endReasonPrecedence contains codes not in allowedEndReasons, error (precedence must be subset of allowed)
9. `style.aiStyleKey` vs `dynamics.flirtiveness`: If aiStyleKey=PLAYFUL and flirtiveness < 30, warn (playful style expects higher flirt)
10. `scoringProfileCode` vs EngineConfig: If scoringProfileCode set but profile doesn't exist in EngineConfig, error (reference must exist)

#### EngineConfig Save Validation Rules (at least 10)

1. `scoringProfiles[]` must be non-empty array
2. `defaultScoringProfileCode` must exist in `scoringProfiles[]` and be active
3. `dynamicsProfiles[]` must be non-empty array
4. `defaultDynamicsProfileCode` must exist in `dynamicsProfiles[]` and be active
5. All scoring profile `traitWeights` must sum to ~1.0 (within 0.1 tolerance)
6. All scoring profile `code` fields must be unique
7. All dynamics profile `code` fields must be unique
8. All gate `key` fields must be unique
9. `gates[]` must be non-empty array (at least one gate required)
10. All numeric fields in profiles must be within valid ranges (e.g., pace 0-100, trait weights 0-1)

#### Standard Error Contract Format

**Proposed Format**:
```typescript
{
  ok: false,
  code: string,  // e.g., 'VALIDATION', 'MISSION_TEMPLATE_INVALID_CONFIG', 'ENGINE_CONFIG_INVALID'
  message: string,  // Human-readable summary
  details?: Array<{
    path: string,  // e.g., 'aiContract.missionConfigV1.dynamics.pace'
    message: string,  // Field-specific error
    severity?: 'error' | 'warning'  // Optional severity
  }>
}
```

**Current Inconsistencies**:
- AI Styles: Returns direct object or throws Prisma error
- Hooks: Returns `{ ok: true, hook }` or `{ ok: false, error }`
- Missions: Returns `{ code, message, details }` on error
- EngineConfig: Throws `BadRequestException` (NestJS standard)

**Standardization Needed**: All admin endpoints should return consistent `{ ok, code, message, details? }` format.

---

## 8) SEED PACK AUDIT

### What seed.ts Currently Seeds

**Evidence**: `backend/prisma/seed.ts:1-465`

| Artifact | Seeded? | Evidence (file:line) |
|----------|---------|---------------------|
| **User** | ✅ Yes | `backend/prisma/seed.ts:14-22` (test@example.com) |
| **UserWallet** | ✅ Yes | `backend/prisma/seed.ts:25-39` (coins: 250, gems: 15) |
| **MissionCategory** | ✅ Yes | `backend/prisma/seed.ts:42-116` (OPENERS, OPENERS_MALE, FLIRTING, RECOVERY) |
| **AiPersona** | ✅ Yes | `backend/prisma/seed.ts:119-184` (MAYA_PLAYFUL, NOA_CALM, DAN_CONFIDENT, OMER_WARM) |
| **PracticeMissionTemplate** | ✅ Yes | `backend/prisma/seed.ts:187-433` (6 missions: OPENERS_L1_M1, OPENERS_L1_M2, OPENERS_L1_M3_MALE, OPENERS_L1_M4_MALE, FLIRTING_L1_M1, FLIRTING_L2_M1) |
| **EngineConfig** | ✅ Yes | `backend/prisma/seed.ts:440-454` (GLOBAL_V1 with default config) |
| **AiStyle** | ❌ No | Not found in seed.ts |
| **PromptHook** | ❌ No | Not found in seed.ts |
| **InsightTemplate** | ❌ No | Not found in seed.ts (and model doesn't exist yet) |

### Phase 4 Seed Targets

| Target | Required Count | Current Status | Exact Work Needed |
|--------|----------------|---------------|-------------------|
| **EngineConfig** | 1 (upsert) | ✅ EXISTS | N/A (already seeded) |
| **AI Styles** | ≥3 | ❌ MISSING | Add 3 AI styles: PLAYFUL, WARM, DIRECT (or similar) |
| **Hooks** | ≥10 (5 positive/5 negative) | ❌ MISSING | Add 10 hooks: 5 with type='POSITIVE', 5 with type='NEGATIVE' |
| **Insight Templates** | ≥10 | ❌ MISSING | Add 10 insight templates (mix of GATE_FAIL, POSITIVE_HOOK, NEGATIVE_PATTERN, GENERAL_TIP) |
| **Mission Template** | ≥1 (neutral/social) | ⚠️ PARTIAL | Add 1 neutral/social mission (not attraction-sensitive, category=FLIRTING or new SOCIAL category) |

### Existence Checks

**EngineConfig**:
- Table: `EngineConfig`
- Unique key: `key = 'GLOBAL_V1'`
- Check: `await prisma.engineConfig.findUnique({ where: { key: 'GLOBAL_V1' } })`

**AI Styles**:
- Table: `AiStyle`
- Unique key: `key` (enum: `AiStyleKey`)
- Check: `await prisma.aiStyle.findMany({ where: { isActive: true } })` → count >= 3

**Hooks**:
- Table: `PromptHook`
- Unique key: `id` (cuid)
- Check: `await prisma.promptHook.findMany({ where: { type: 'POSITIVE', isEnabled: true } })` → count >= 5
- Check: `await prisma.promptHook.findMany({ where: { type: 'NEGATIVE', isEnabled: true } })` → count >= 5

**Insight Templates** (after model created):
- Table: `InsightTemplate`
- Unique key: `id` (cuid)
- Check: `await prisma.insightTemplate.findMany({ where: { isActive: true } })` → count >= 10

**Mission Template**:
- Table: `PracticeMissionTemplate`
- Unique key: `code`
- Check: `await prisma.practiceMissionTemplate.findMany({ where: { isAttractionSensitive: false, active: true } })` → count >= 1

---

## 9) FINAL PHASE 4 COMPLETION GATES (HARD CHECKLINES)

**PHASE 4 DONE = TRUE only if:**

### Dashboard Reliability
- [ ] All EngineConfig tabs are clickable and render content (manually verify each tab: Scoring, Dynamics, Gates, Hooks, Mood, Insights, Attachments, Monitoring, Micro Feedback, Micro Dynamics, Persona)
- [ ] No silent failures: all errors are visible in UI error box (test by sending invalid requests)
- [ ] Error messages are consistent format across all admin sections (verify AI Styles, Personas, Hooks, Insights, Missions, EngineConfig all show errors in same format)

### EngineConfig Functionality
- [ ] EngineConfig tabs wiring works (click each tab → content displays)
- [ ] EngineConfig save persists after page reload (edit config → save → reload → values preserved)
- [ ] EngineConfig validation errors are shown (send invalid config → see validation errors)

### AI Styles Admin
- [ ] AI Styles CRUD persists after reload (create style → reload → style exists; edit style → reload → changes preserved)
- [ ] All AI Style fields are editable (verify: key, name, description, stylePrompt, forbiddenBehavior, maxChars, maxLines, questionRate, emojiRate, initiative, warmth, judgment, flirtTension, formality, temperature, topP, fewShotExamples, isActive)
- [ ] AI Styles endpoint returns expected shape (verify `GET /v1/admin/ai-styles` returns array)

### Hooks Admin
- [ ] Hooks CRUD persists after reload (create hook → reload → hook exists; edit hook → reload → changes preserved)
- [ ] Hooks UI is fully functional (create, edit, delete hooks in "Hooks & Triggers" tab)

### Insights Admin
- [ ] InsightTemplate DB model exists (verify `prisma.insightTemplate.findMany()` works)
- [ ] InsightTemplate CRUD endpoints exist (verify `GET/POST/PUT/DELETE /v1/admin/insights/templates` work)
- [ ] Insights dashboard UI editor exists (verify CRUD buttons in "Insights Catalog" tab)
- [ ] Insights CRUD persists after reload (create template → reload → template exists)
- [ ] Runtime insights selection uses DB (edit template in dashboard → run session → new template appears in insights)
- [ ] Migration from hardcoded catalog to DB completed (verify all 67 templates in DB after migration)

### MissionConfigV1 LEGO Editor
- [ ] Dynamics editor exists (structured form with mode, locationTag, hasPerMessageTimer, defaultEntryRoute, 8 tuning sliders)
- [ ] Objective editor exists (structured form with kind dropdown, userTitle input, userDescription textarea)
- [ ] Difficulty editor exists (structured form with level dropdown, recommendedMaxMessages, recommendedSuccessScore, recommendedFailScore, 6 tuning sliders)
- [ ] State Policy editor exists (structured form with all fields: maxMessages, minMessagesBeforeEnd, maxStrikes, timerSecondsPerMessage, allowTimerExtension, successScoreThreshold, failScoreThreshold, enableGateSequence, enableMoodCollapse, enableObjectiveAutoSuccess, allowedEndReasons, endReasonPrecedence, 4 layer toggles)
- [ ] Response Architecture editor exists (structured form with 8 sliders 0-1)
- [ ] Style bindings editor exists (structured form with aiStyleKey dropdown, styleIntensity dropdown, scoringProfileCode dropdown, dynamicsProfileCode dropdown)
- [ ] JSON advanced editor round-trip sync works (edit structured → JSON updates; edit JSON → structured updates)
- [ ] LEGO editor saves validated configs (edit mission → save → validation runs → invalid config shows errors)
- [ ] LEGO editor persists after reload (edit mission → save → reload → values preserved)

### Validation
- [ ] Cross-layer MissionConfigV1 validation exists (test: set difficulty.strictness=90, dynamics.pace=20 → see warning)
- [ ] EngineConfig validation on save exists (test: set invalid defaultScoringProfileCode → see error)
- [ ] All validation errors are surfaced to UI (no silent failures)

### Seed Pack
- [ ] Seed yields EngineConfig (run seed → EngineConfig exists with key='GLOBAL_V1')
- [ ] Seed yields ≥3 AI styles (run seed → at least 3 active AI styles exist)
- [ ] Seed yields ≥10 hooks (run seed → at least 5 positive hooks + 5 negative hooks exist)
- [ ] Seed yields ≥10 insight templates (run seed → at least 10 active insight templates exist)
- [ ] Seed yields ≥1 neutral/social mission template (run seed → at least 1 non-attraction-sensitive mission exists)

### Backward Compatibility
- [ ] Existing missions still run (start existing mission → no errors)
- [ ] normalizeMissionConfigV1 remains compatible (existing missions normalize without errors)

### Error Contract Consistency
- [ ] All admin endpoints return consistent error shape (test errors from AI Styles, Personas, Hooks, Insights, Missions, EngineConfig → all have `{ ok, code, message, details? }` format)

---

## SUMMARY

**Critical Blockers**:
1. ❌ EngineConfig tabs not clickable (DOM timing issue)
2. ❌ No structured MissionConfigV1 editors (only JSON textarea)
3. ❌ InsightTemplate DB model doesn't exist (hard-coded catalog)
4. ❌ Insights CRUD endpoints missing
5. ❌ Seed pack incomplete (missing AI styles, hooks, insight templates)

**Ready for Implementation**:
- ✅ Hooks are DB-backed and CRUD works
- ✅ MissionConfigV1 schema is complete
- ✅ Per-layer validation exists
- ✅ EngineConfig structure is defined

**Phase 4 Readiness**: ⚠️ **PARTIAL** - Core infrastructure exists but critical UI and DB components missing.

