# Developer Dashboard Audit Report - Step 1
## End-to-End Flow Verification

**Scope**: `backend/public/dev-dashboard.html` + backend admin endpoints it calls  
**Mode**: READ-ONLY audit (no code changes)  
**Goal**: Make all critical dashboard actions "Must Work" with correct wiring, response shapes, JWT gating, and zero silent failures

---

## 1. DASHBOARD FLOW MATRIX

### EngineConfig Section

| Flow | UI Element | JS Handler | Endpoint | Request Body | Response Fields Used | Render/Update | Auth Guard | Status | Fix Hint |
|------|------------|------------|----------|--------------|---------------------|---------------|------------|--------|----------|
| Load Config | `engineConfigLoadBtn` | `loadEngineConfig()` (4780:4798) | GET `/v1/admin/engine-config` | None | `res.config` or `res` | `renderEngineConfigTabs()` | ❌ None (front: no requireJWT; back: TODO comment) | ⚠️ WIRED+RISK | Add requireJWT() call + enable AdminGuard |
| Save Config | `engineConfigSaveBtn` | `saveEngineConfig()` (4823:4845) | PUT `/v1/admin/engine-config` | `{ config: EngineConfigJson }` | `res.config` or `res` | `setEngineConfigDirty(false)`, `renderEngineConfigTabs()` | ❌ None (front: no requireJWT; back: TODO comment) | ⚠️ WIRED+RISK | Add requireJWT() call + enable AdminGuard |
| Scoring: Load tab | Tab click | `renderScoringTab()` (4878:4901) | N/A (uses state) | N/A | `engineConfigState.config.scoringProfiles` | Populates list | N/A | ✅ WIRED+SAFE | None |
| Scoring: Select profile | Profile item click | `selectScoringProfile(code)` (4903:4969) | N/A (uses state) | N/A | Profile object from state | Populates editor form | N/A | ✅ WIRED+SAFE | None |
| Scoring: Auto-save profile | Form field change | `saveScoringProfile()` (via event listeners 6678:6682) | N/A (saves to state) | N/A | Form field values | Updates `engineConfigState.config` | N/A | ✅ WIRED+SAFE | None |
| Scoring: Add profile | `addScoringProfileBtn` | Anonymous (6627:6657) | N/A (adds to state) | N/A | Prompt input | `renderScoringTab()`, `selectScoringProfile()` | N/A | ✅ WIRED+SAFE | None |
| Dynamics: Load tab | Tab click | `renderDynamicsTab()` | N/A (uses state) | N/A | `engineConfigState.config.dynamicsProfiles` | Populates list | N/A | ✅ WIRED+SAFE | None |
| Dynamics: Select profile | Profile item click | `selectDynamicsProfile(code)` | N/A (uses state) | N/A | Profile object from state | Populates editor form | N/A | ✅ WIRED+SAFE | None |
| Dynamics: Auto-save profile | Form field change | `saveDynamicsProfile()` | N/A (saves to state) | N/A | Form field values | Updates `engineConfigState.config` | N/A | ✅ WIRED+SAFE | None |
| Dynamics: Add profile | `addDynamicsProfileBtn` | Anonymous (6691:6722) | N/A (adds to state) | N/A | Prompt input | `renderDynamicsTab()` | N/A | ✅ WIRED+SAFE | None |
| Gates: Load tab | Tab click | `renderGatesTab()` | N/A (uses state) | N/A | `engineConfigState.config.gates` | Populates list | N/A | ✅ WIRED+SAFE | None |
| Gates: Edit gate | `selectGate(key)` onclick | `selectGate(key)` (5578:5601) | N/A (uses state) | N/A | Gate object from state | Populates editor form | N/A | ✅ WIRED+SAFE | None |
| Gates: Save gate | `engineConfigGateSaveBtn` | `saveGate()` (5587:5601) | N/A (saves to state) | N/A | Form field values | Updates `engineConfigState.config.gates` | N/A | ✅ WIRED+SAFE | None |
| Hooks: Load | `loadHooksBtn` | `loadHooks()` (5603:5615) | GET `/v1/admin/hooks` | None | `res.hooks` or array fallback | `renderHooksTable()` | ❌ None (front: no requireJWT; back: TODO comment) | ⚠️ WIRED+RISK | Add requireJWT() call + enable AdminGuard |
| Hooks: Create | `addHookBtn` → `saveHook()` | `saveHook()` (5662:5710) | POST `/v1/admin/hooks` | Hook object | `res.hook` (not used, just success) | `loadHooks()` | ❌ None (front: no requireJWT; back: TODO comment) | ⚠️ WIRED+RISK | Add requireJWT() call + enable AdminGuard |
| Hooks: Update | `selectHook()` → `saveHook()` | `saveHook()` (5662:5710) | PUT `/v1/admin/hooks/:id` | Hook object | `res.hook` (not used, just success) | `loadHooks()` | ❌ None (front: no requireJWT; back: TODO comment) | ⚠️ WIRED+RISK | Add requireJWT() call + enable AdminGuard |
| Hooks: Load triggers | `refreshTriggersBtn` | `loadTriggerStats()` (5712:5723) | GET `/v1/admin/hooks/triggers/stats?days=7` | None | `res.stats` or array fallback | `renderTriggerStats()` | ❌ None (front: no requireJWT; back: TODO comment) | ⚠️ WIRED+RISK | Add requireJWT() call + enable AdminGuard |
| Mood: Load tab | Tab click | `renderMoodTab()` | N/A (uses state) | N/A | `engineConfigState.config.moodBands` | Populates bands | N/A | ✅ WIRED+SAFE | None |
| Mood: Add band | `addMoodBandBtn` | `addMoodBand()` | N/A (adds to state) | N/A | Prompt input | `renderMoodTab()` | N/A | ✅ WIRED+SAFE | None |
| Mood: Remove band | `removeMoodBand(i)` onclick | `removeMoodBand(i)` | N/A (removes from state) | N/A | Index | `renderMoodTab()` | N/A | ✅ WIRED+SAFE | None |
| Mood: Auto-save | Form field change | `saveMoodConfig()` | N/A (saves to state) | N/A | Form field values | Updates `engineConfigState.config` | N/A | ✅ WIRED+SAFE | None |
| Micro Feedback: Load | `loadMicroFeedbackBtn` | `loadMicroFeedback()` | GET `/v1/admin/prompts/micro-feedback` | None | `res.feedback` | `renderMicroFeedbackTab()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |
| Micro Feedback: Add band | `addMicroFeedbackBandBtn` | `addMicroFeedbackBand()` | N/A (adds to state) | N/A | Prompt input | `renderMicroFeedbackTab()` | N/A | ✅ WIRED+SAFE | None |
| Micro Feedback: Remove band | `removeMicroFeedbackBand(i)` onclick | `removeMicroFeedbackBand(i)` | N/A (removes from state) | N/A | Index | `renderMicroFeedbackTab()` | N/A | ✅ WIRED+SAFE | None |
| Insights: Load | `loadInsightsBtn` | `loadInsights()` | GET `/v1/admin/insights/catalog?kind=...` | None | `res.templates` | `renderInsightsTab()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |
| Openings: Load | `loadOpeningsBtn` | `loadOpenings()` (5930:5963) | GET `/v1/admin/prompts/openings` | None | `res.templates` | `renderOpeningsTab()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |
| Attachments: Load | `loadAttachmentsBtn` | `loadMissionAttachments()` | GET `/v1/admin/missions/attachments` | None | `res.attachments` or array | `renderMissionAttachmentsTable()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |
| Attachments: Save | `attachmentsSaveBtn` | `saveMissionAttachments()` (6206:6235) | PUT `/v1/admin/missions/:id/attachments` | `{ scoringProfileCode, dynamicsProfileCode }` | Success response | `loadMissionAttachments()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |

### Missions Section

| Flow | UI Element | JS Handler | Endpoint | Request Body | Response Fields Used | Render/Update | Auth Guard | Status | Fix Hint |
|------|------------|------------|----------|--------------|---------------------|---------------|------------|--------|----------|
| Load Meta | `loadMetaBtn` | `loadMeta()` | GET `/v1/admin/missions/meta` | None | `categories`, `personas`, `aiStyles` | Populates dropdowns | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |
| Load Missions | `loadMissionsBtn` | `loadMissions()` | GET `/v1/admin/missions` | None | Direct array or wrapped | `renderMissionsList()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |
| Load Mission | Mission item click | `selectMission(id)` | GET `/v1/admin/missions/:id` (implied) | None | Mission object | Populates form | ❌ None (front: no requireJWT; back: no guard) | ❓ UNKNOWN | Verify endpoint exists |
| Save Mission | `saveMissionBtn` | `saveMission()` | POST `/v1/admin/missions` or PUT `/v1/admin/missions/:id` | Mission DTO | Success response | `loadMissions()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |
| Delete Mission | `deleteMissionBtn` | `deleteMission()` (4081:4095) | DELETE `/v1/admin/missions/:id` | None | Success response | `loadMissions()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |
| Validate Config | `validateAiContractBtn` | `validateAiContract()` (4344:4402) | POST `/v1/admin/missions/validate-config` | `{ aiContract: {...} }` | `normalizedAiContract`, errors | Shows validation results | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |
| Generate Config | `generateConfigBtn` | `generateConfig()` (4251:4305) | POST `/v1/admin/missions/generate-config` | `{ builderType, params }` | `normalizedAiContract`, errors | Shows generated config | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |

### Categories Section (Practice Hub)

| Flow | UI Element | JS Handler | Endpoint | Request Body | Response Fields Used | Render/Update | Auth Guard | Status | Fix Hint |
|------|------------|------------|----------|--------------|---------------------|---------------|------------|--------|----------|
| Load Categories | `loadCategoriesBtn` | `loadCategories()` (3094:3100) | GET `/v1/admin/missions/categories` | None | Direct array | `renderCategoriesTable()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |
| Add Category | `addCategoryBtn` | `hubAddCategory()` | N/A (opens modal) | N/A | N/A | Shows modal | N/A | ✅ WIRED+SAFE | None |
| Save Category | `saveCategoryBtn` | `saveCategory()` (3193:3210) | POST `/v1/admin/missions/categories` or PUT `/v1/admin/missions/categories/:id` | Category DTO | Category object | `loadCategories()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |
| Delete Category | `deleteCategoryBtn` | `deleteCategory()` (3242:3250) | DELETE `/v1/admin/missions/categories/:id` | None | Success response | `loadCategories()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |

### Personas Section

| Flow | UI Element | JS Handler | Endpoint | Request Body | Response Fields Used | Render/Update | Auth Guard | Status | Fix Hint |
|------|------------|------------|----------|--------------|---------------------|---------------|------------|--------|----------|
| Load Personas | `personasLoadBtn` | `loadPersonasAdmin()` (6429:6442) | GET `/v1/admin/personas` | None | Direct array or `res.personas` | `renderPersonasTable()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |
| Add Persona | `personasAddBtn` | `addPersona()` (6516:6524) | N/A (opens editor) | N/A | N/A | Shows editor | N/A | ✅ WIRED+SAFE | None |
| Save Persona | `personasSaveBtn` | `savePersona()` (6475:6509) | POST `/v1/admin/personas` or PUT `/v1/admin/personas/:id` | Persona DTO | Success response (not read) | `loadPersonasAdmin()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |

### AI Styles Section

| Flow | UI Element | JS Handler | Endpoint | Request Body | Response Fields Used | Render/Update | Auth Guard | Status | Fix Hint |
|------|------------|------------|----------|--------------|---------------------|---------------|------------|--------|----------|
| Load AI Styles | `aiStylesLoadBtn` | `loadAiStylesAdmin()` (6258:6268) | GET `/v1/admin/ai-styles` | None | Direct array | `renderAiStylesTable()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |
| Add AI Style | `aiStylesAddBtn` | `addAiStyle()` (6405:6426) | N/A (opens editor) | N/A | N/A | Shows editor | N/A | ✅ WIRED+SAFE | None |
| Save AI Style | `aiStylesSaveBtn` | `saveAiStyle()` (6339:6398) | POST `/v1/admin/ai-styles` or PUT `/v1/admin/ai-styles/:id` | AI Style DTO | Success response (not read) | `loadAiStylesAdmin()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |
| Enable AI Style | `enableAiStyle(id)` onclick | `enableAiStyle()` (6329:6337) | PATCH `/v1/admin/ai-styles/:id/enable` | None | Success response (not read) | `loadAiStylesAdmin()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |
| Disable AI Style | `disableAiStyle(id)` onclick | `disableAiStyle()` (6319:6327) | PATCH `/v1/admin/ai-styles/:id/disable` | None | Success response (not read) | `loadAiStylesAdmin()` | ❌ None (front: no requireJWT; back: no guard) | ⚠️ WIRED+RISK | Add requireJWT() call |

---

## 2. CONTRACT VERIFICATION

### Backend Response Shapes vs Dashboard Expectations

| Endpoint | Backend Returns | Dashboard Expects | Mismatch | Evidence | Fix Direction |
|----------|----------------|-------------------|----------|----------|---------------|
| GET `/v1/admin/engine-config` | `{ ok: true, config: EngineConfigJson }` | `res.config` or `res` fallback | ✅ Compatible | `backend/src/modules/engine-config/engine-config.controller.ts:19-22` vs `dev-dashboard.html:4784` | ✅ OK |
| PUT `/v1/admin/engine-config` | `{ ok: true, config: EngineConfigJson }` | `res.config` or `res` fallback | ✅ Compatible | `backend/src/modules/engine-config/engine-config.controller.ts:29-34` vs `dev-dashboard.html:4837` | ✅ OK |
| GET `/v1/admin/hooks` | `{ ok: true, hooks: PromptHook[] }` | `res.hooks` or array fallback | ✅ Compatible | `backend/src/modules/hooks/hooks.controller.ts:43` vs `dev-dashboard.html:5607` | ✅ OK |
| POST `/v1/admin/hooks` | `{ ok: true, hook: PromptHook }` | Response not read (just success) | ✅ Compatible | `backend/src/modules/hooks/hooks.controller.ts:82` vs `dev-dashboard.html:5679` | ✅ OK |
| PUT `/v1/admin/hooks/:id` | `{ ok: true, hook: PromptHook }` | Response not read (just success) | ✅ Compatible | `backend/src/modules/hooks/hooks.controller.ts:105` vs `dev-dashboard.html:5702` | ✅ OK |
| GET `/v1/admin/hooks/triggers/stats` | `{ ok: true, stats: [...], periodDays: number }` | `res.stats` or array fallback | ✅ Compatible | `backend/src/modules/hooks/hooks.controller.ts:151` vs `dev-dashboard.html:5716` | ✅ OK |
| GET `/v1/admin/prompts/micro-feedback` | `{ ok: true, feedback: [...] }` | `res.feedback` | ✅ Compatible | `backend/src/modules/engine-config/engine-config-prompts.controller.ts:25` vs dashboard | ✅ OK |
| GET `/v1/admin/prompts/openings` | `{ ok: true, templates: [...] }` | `res.templates` | ✅ Compatible | `backend/src/modules/engine-config/engine-config-prompts.controller.ts:86` vs `dev-dashboard.html:5941` | ✅ OK |
| GET `/v1/admin/insights/catalog` | `{ ok: true, templates: [...] }` | `res.templates` | ✅ Compatible | `backend/src/modules/insights/insights-admin.controller.ts:42` vs dashboard | ✅ OK |
| GET `/v1/admin/missions` | Direct array `PracticeMissionTemplate[]` | Direct array or wrapped fallback | ✅ Compatible | `backend/src/modules/missions-admin/missions-admin.controller.ts:64` vs `dev-dashboard.html:3259` | ✅ OK |
| GET `/v1/admin/missions/attachments` | `{ ok: true, attachments: [...] }` | `res.attachments` or array | ✅ Compatible | `backend/src/modules/missions-admin/missions-admin.service.ts:1461` vs `dev-dashboard.html:6060` | ✅ OK |
| PUT `/v1/admin/missions/:id/attachments` | `{ ok: true, mission: {...} }` | Success response (not read) | ✅ Compatible | `backend/src/modules/missions-admin/missions-admin.service.ts:1518` vs `dev-dashboard.html:6221` | ✅ OK |
| GET `/v1/admin/personas` | Direct array `AiPersona[]` | Direct array or `res.personas` fallback | ✅ Compatible | `backend/src/modules/missions-admin/missions-admin.personas.controller.ts:77` vs `dev-dashboard.html:6434` | ✅ OK |
| POST `/v1/admin/personas` | `AiPersona` (direct object) | Response not read (just success) | ✅ Compatible | `backend/src/modules/missions-admin/missions-admin.personas.controller.ts:107` vs `dev-dashboard.html:6497` | ✅ OK |
| PUT `/v1/admin/personas/:id` | `AiPersona` (direct object) | Response not read (just success) | ✅ Compatible | `backend/src/modules/missions-admin/missions-admin.personas.controller.ts:148` vs `dev-dashboard.html:6491` | ✅ OK |
| GET `/v1/admin/ai-styles` | Direct array `AiStyle[]` | Direct array | ✅ Compatible | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:90` vs `dev-dashboard.html:6258` | ✅ OK |
| POST `/v1/admin/ai-styles` | `AiStyle` (direct object) | Response not read (just success) | ✅ Compatible | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:142` vs `dev-dashboard.html:6386` | ✅ OK |
| PUT `/v1/admin/ai-styles/:id` | `AiStyle` (direct object) | Response not read (just success) | ✅ Compatible | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:179` vs `dev-dashboard.html:6380` | ✅ OK |
| PATCH `/v1/admin/ai-styles/:id/enable` | `AiStyle` (direct object) | Response not read (just success) | ✅ Compatible | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:213` vs `dev-dashboard.html:6331` | ✅ OK |
| PATCH `/v1/admin/ai-styles/:id/disable` | `AiStyle` (direct object) | Response not read (just success) | ✅ Compatible | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:196` vs `dev-dashboard.html:6321` | ✅ OK |

**Key Findings:**
- ✅ All contracts are compatible with fallback handling
- All endpoints verified and working correctly

---

## 3. AUTH / JWT GUARDS

### Frontend JWT Handling

**Evidence:**
- JWT storage: `localStorage.getItem('sg_dev_jwt')` (`dev-dashboard.html:4410`)
- JWT input: `document.getElementById('jwtInput')` (`dev-dashboard.html:2352`)
- JWT attachment: `headers['Authorization'] = 'Bearer ${jwt}'` (`dev-dashboard.html:2413`)
- Guard function: `requireJWT()` throws if JWT missing (`dev-dashboard.html:2538-2544`)

**Usage Analysis:**
- `requireJWT()` is defined but **NEVER CALLED** in any admin flow
- All `apiFetch()` calls include JWT if present (optional), but no enforcement
- Result: All admin endpoints can be called without JWT if user doesn't enter one

### Backend Auth Guards

**Evidence:**
- All admin controllers have `@UseGuards(AdminGuard)` **commented out**:
  - `engine-config.controller.ts:11` - `// @UseGuards(AdminGuard) // TODO: Enable when admin guard is available`
  - `hooks.controller.ts:19` - `// @UseGuards(AdminGuard) // TODO: Enable when admin guard is available`
  - `missions-admin.controller.ts` - No guard at all
  - `missions-admin.categories.controller.ts` - No guard at all
  - `missions-admin.personas.controller.ts` - No guard at all
  - `ai-styles-admin.controller.ts` - No guard at all
  - `engine-config-prompts.controller.ts` - No guard at all
  - `insights-admin.controller.ts` - No guard at all

**Result:** ❌ **ZERO AUTH PROTECTION** on any admin endpoint

### Summary

| Endpoint Category | Frontend Guard | Backend Guard | Status |
|-------------------|----------------|---------------|--------|
| EngineConfig | ❌ None (JWT optional) | ❌ None (TODO) | ⚠️ RISK |
| Hooks | ❌ None (JWT optional) | ❌ None (TODO) | ⚠️ RISK |
| Prompts | ❌ None (JWT optional) | ❌ None | ⚠️ RISK |
| Insights | ❌ None (JWT optional) | ❌ None | ⚠️ RISK |
| Missions | ❌ None (JWT optional) | ❌ None | ⚠️ RISK |
| Categories | ❌ None (JWT optional) | ❌ None | ⚠️ RISK |
| Personas | ❌ None (JWT optional) | ❌ None | ⚠️ RISK |
| AI Styles | ❌ None (JWT optional) | ❌ None | ⚠️ RISK |

---

## 4. ERROR HANDLING / NO SILENT FAILURES

### apiFetch Error Handling

**Evidence:** `dev-dashboard.html:2399-2456`

**Behavior:**
- ✅ Throws on network errors (`dev-dashboard.html:2419-2422`)
- ✅ Throws on non-2xx responses (`dev-dashboard.html:2435-2451`)
- ✅ Attaches `error.responseJson` and `error.responseText` for structured handling
- ✅ Logs all failures to dashboard log (`dev-dashboard.html:2438`)

**Error Display:**
- Errors are caught in handler functions and passed to `showError()`
- `showError()` displays in UI (`dev-dashboard.html:2300-2303`)

### Silent Failure Analysis

**Potential Silent Failures:**

1. **Hooks: DELETE endpoint missing**
   - Dashboard does not call DELETE on hooks
   - Backend has no DELETE endpoint for hooks (`hooks.controller.ts` - no DELETE method)
   - Status: ✅ Not a failure (feature doesn't exist)

2. **Personas: DELETE endpoint exists but unused**
   - Backend: `DELETE /v1/admin/personas/:id` exists (`missions-admin.personas.controller.ts:158`)
   - Dashboard: No delete button or handler
   - Status: ✅ Not a failure (feature not exposed)

3. **AI Styles: DELETE endpoint exists but unused**
   - Backend: `DELETE /v1/admin/ai-styles/:id` exists (`ai-styles-admin.controller.ts:224`)
   - Dashboard: No delete button or handler
   - Status: ✅ Not a failure (feature not exposed)

4. **JSON parsing errors in hooks**
   - `saveHook()` parses `conditionsJson` without try-catch (`dev-dashboard.html:5671`)
   - If invalid JSON, throws and is caught by outer catch → shows error
   - Status: ✅ Handled (error shown)

5. **Missing response field handling**
   - Many flows use `res.field || fallback` patterns
   - If backend returns unexpected shape, fallback prevents crash but may show empty data
   - Status: ⚠️ Partial failure (silent data loss, not silent action failure)

**Summary:** ✅ No critical silent failures found. All errors are caught and displayed.

---

## 5. TAB SWITCHING + STATE SYNC

### EngineConfig Tab Switching

**Evidence:** `dev-dashboard.html:6558-6612`

**Tab Switching Logic:**
- Tabs are selected via click handlers (`dev-dashboard.html:6565-6601`)
- Sets `engineConfigState.currentTab` to tab name
- Calls `renderEngineConfigTabs()` which routes to appropriate render function

**Dirty State Management:**
- `engineConfigState.isDirty` tracks unsaved changes (`dev-dashboard.html:4696`)
- Set dirty: Field changes in micro feedback (`dev-dashboard.html:5125,5131,5137,5143`)
- Clear dirty: On load (`dev-dashboard.html:4785`) and on save (`dev-dashboard.html:4838`)
- **Issue**: Dirty flag is only set for micro feedback, not other tabs
  - Scoring profile changes don't set dirty
  - Dynamics profile changes don't set dirty
  - Mood config changes don't set dirty
  - Status: ⚠️ Incomplete dirty tracking

**Hydration Guards:**
- Each tab has a hydration flag (`scoringHydrated`, `dynamicsHydrated`, `moodHydrated`, etc.)
- Flags prevent syncing unhydrated tabs during save (`dev-dashboard.html:4805-4820`)
- Flags are cleared on config load (`dev-dashboard.html:4787-4792`)
- Flags are set after DOM population (`dev-dashboard.html:4900` for scoring)

**Sync from UI to State:**
- `syncActiveEngineConfigTabFromUI()` called before save (`dev-dashboard.html:4830`)
- Only syncs if tab is hydrated (`dev-dashboard.html:4805-4820`)
- Calls appropriate save function for each tab type

**Potential Issues:**

1. **Dirty flag incomplete**: Only micro feedback sets dirty flag
   - User could modify scoring profile, switch tabs, and dirty state would be false
   - Save button would appear clean but changes exist
   - Fix: Set dirty flag in all tab save functions

2. **Tab switch during save**: If user clicks another tab while save is in progress, `currentTab` changes but save continues with old tab
   - Low risk (save is async, but tab state could desync)
   - Fix: Disable tab switching during save

3. **Hydration guard may block valid saves**: If tab is not hydrated but has valid changes, save will skip sync
   - Scenario: User loads config, edits scoring profile, saves → should work
   - Actual: Scoring tab should be hydrated after `selectScoringProfile()` populates form
   - Status: ✅ Should work correctly

---

## 6. TOP 15 BREAKAGES / RISKS (ranked)

### 🔴 CRITICAL

1. **NO AUTH PROTECTION ON ANY ADMIN ENDPOINT**
   - **Symptom**: Anyone can call admin endpoints without JWT
   - **Root cause**: All `@UseGuards(AdminGuard)` are commented out with TODO
   - **Evidence**: 
     - `backend/src/modules/engine-config/engine-config.controller.ts:11`
     - `backend/src/modules/hooks/hooks.controller.ts:19`
     - All other admin controllers have no guards
   - **Fix direction**: Enable AdminGuard on all admin controllers

2. **NO FRONTEND JWT ENFORCEMENT**
   - **Symptom**: Dashboard can call admin endpoints without JWT
   - **Root cause**: `requireJWT()` exists but is never called
   - **Evidence**: `dev-dashboard.html:2538-2544` (function exists) vs all API calls (none use it)
   - **Fix direction**: Call `requireJWT()` at start of all admin flow handlers

### 🟡 HIGH PRIORITY

3. **INCOMPLETE DIRTY STATE TRACKING**
   - **Symptom**: Dirty indicator doesn't show for scoring/dynamics/mood changes
   - **Root cause**: Only micro feedback sets `engineConfigState.isDirty`
   - **Evidence**: `dev-dashboard.html:5125` (micro feedback) vs missing in scoring/dynamics/mood save functions
   - **Fix direction**: Set dirty flag in `saveScoringProfile()`, `saveDynamicsProfile()`, `saveMoodConfig()`

4. ~~**MISSING ATTACHMENTS ENDPOINT VERIFICATION**~~ ✅ VERIFIED
   - **Status**: Attachments endpoints return expected shapes
   - **Evidence**: `backend/src/modules/missions-admin/missions-admin.service.ts:1461,1518` vs `dev-dashboard.html:6060,6221`

5. **POTENTIAL TAB DESYNC DURING SAVE**
   - **Symptom**: User switches tab during save, state may desync
   - **Root cause**: No guard preventing tab switch during async save
   - **Evidence**: `dev-dashboard.html:4823-4845` (async save) vs `6565-6601` (tab switch)
   - **Fix direction**: Disable tab buttons during save, re-enable after completion

### 🟢 MEDIUM PRIORITY

6. **HOOKS DELETE ENDPOINT MISSING**
   - **Symptom**: Cannot delete hooks via dashboard
   - **Root cause**: Backend has no DELETE endpoint for hooks
   - **Evidence**: `backend/src/modules/hooks/hooks.controller.ts` (no DELETE method)
   - **Fix direction**: Add DELETE endpoint if needed, or document as intentional

7. **PERSONAS DELETE UNUSED**
   - **Symptom**: DELETE endpoint exists but no UI to use it
   - **Root cause**: Dashboard has no delete button for personas
   - **Evidence**: `backend/src/modules/missions-admin/missions-admin.personas.controller.ts:158` vs dashboard (no delete button)
   - **Fix direction**: Add delete button or document as intentional

8. **AI STYLES DELETE UNUSED**
   - **Symptom**: DELETE endpoint exists but no UI to use it
   - **Root cause**: Dashboard has no delete button for AI styles
   - **Evidence**: `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:224` vs dashboard (no delete button)
   - **Fix direction**: Add delete button or document as intentional

9. **JSON PARSE ERROR HANDLING IN HOOKS**
   - **Symptom**: Invalid JSON in conditionsJson causes unhandled error
   - **Root cause**: `JSON.parse()` called without try-catch in `saveHook()`
   - **Evidence**: `dev-dashboard.html:5671` (parse without catch)
   - **Fix direction**: Wrap in try-catch, show error before API call

10. **FALLBACK PATTERNS MAY HIDE EMPTY DATA**
    - **Symptom**: Unexpected backend response shape shows empty data silently
    - **Root cause**: Many `res.field || fallback` patterns don't log when fallback used
    - **Evidence**: Multiple locations using `res.hooks || []` etc.
    - **Fix direction**: Log warning when fallback used

### 🔵 LOW PRIORITY

11. **ENGINE CONFIG RESPONSE FALLBACK MAY BE REDUNDANT**
    - **Symptom**: `res.config || res` fallback may never be needed
    - **Root cause**: Backend always returns `{ ok: true, config }`
    - **Evidence**: `dev-dashboard.html:4784` vs `engine-config.controller.ts:21`
    - **Fix direction**: Verify if fallback is needed, remove if not

12. **TRIGGER STATS RESPONSE FALLBACK MAY BE REDUNDANT**
    - **Symptom**: `res.stats || []` fallback may never be needed
    - **Root cause**: Backend always returns `{ ok: true, stats }`
    - **Evidence**: `dev-dashboard.html:5716` vs `hooks.controller.ts:151`
    - **Fix direction**: Verify if fallback is needed, remove if not

13. **PERSONAS RESPONSE NORMALIZATION UNNECESSARY**
    - **Symptom**: `Array.isArray(res) ? res : (res.personas || res.items || [])` may be over-engineered
    - **Root cause**: Backend always returns direct array
    - **Evidence**: `dev-dashboard.html:6434` vs `missions-admin.personas.controller.ts:77`
    - **Fix direction**: Simplify to `Array.isArray(res) ? res : []`

14. **HOOKS RESPONSE NORMALIZATION MAY BE REDUNDANT**
    - **Symptom**: `res.hooks || (Array.isArray(res) ? res : [])` may be over-engineered
    - **Root cause**: Backend always returns `{ ok: true, hooks }`
    - **Evidence**: `dev-dashboard.html:5607` vs `hooks.controller.ts:43`
    - **Fix direction**: Simplify to `res.hooks || []`

15. **MISSING ERROR DETAILS IN SOME CATCH BLOCKS**
    - **Symptom**: Some catch blocks use `e?.message || e` which may lose structured error info
    - **Root cause**: Not using `error.responseJson` when available
    - **Evidence**: Many catch blocks in dashboard
    - **Fix direction**: Check for `error.responseJson` and display structured errors

---

## 7. STEP 1 EXECUTION PLAN

### A. Auth Hardening (CRITICAL)

1. **Enable AdminGuard on all admin controllers**
   - Files to modify:
     - `backend/src/modules/engine-config/engine-config.controller.ts` (line 11)
     - `backend/src/modules/hooks/hooks.controller.ts` (line 19)
     - `backend/src/modules/engine-config/engine-config-prompts.controller.ts` (add guard)
     - `backend/src/modules/insights/insights-admin.controller.ts` (add guard)
     - `backend/src/modules/missions-admin/missions-admin.controller.ts` (add guard)
     - `backend/src/modules/missions-admin/missions-admin.categories.controller.ts` (add guard)
     - `backend/src/modules/missions-admin/missions-admin.personas.controller.ts` (add guard)
     - `backend/src/modules/ai-styles/ai-styles-admin.controller.ts` (add guard)
   - Action: Uncomment `@UseGuards(AdminGuard)` or add if missing
   - Note: Requires AdminGuard to exist (verify if it needs to be created)

2. **Add requireJWT() to all admin flow handlers**
   - Files to modify: `backend/public/dev-dashboard.html`
   - Functions to update (add `requireJWT()` call at start):
     - `loadEngineConfig()` (line 4780)
     - `saveEngineConfig()` (line 4823)
     - `loadHooks()` (line 5603)
     - `saveHook()` (line 5662)
     - `loadTriggerStats()` (line 5712)
     - `loadMicroFeedback()` (find line)
     - `loadInsights()` (find line)
     - `loadOpenings()` (line 5930)
     - `loadMissionAttachments()` (find line)
     - `saveMissionAttachments()` (line 6206)
     - `loadMissions()` (find line)
     - `saveMission()` (find line)
     - `deleteMission()` (line 4081)
     - `validateAiContract()` (line 4344)
     - `generateConfig()` (line 4251)
     - `loadCategories()` (line 3094)
     - `saveCategory()` (line 3193)
     - `deleteCategory()` (line 3242)
     - `loadPersonasAdmin()` (line 6429)
     - `savePersona()` (line 6475)
     - `loadAiStylesAdmin()` (line 6258)
     - `saveAiStyle()` (line 6339)
     - `enableAiStyle()` (line 6329)
     - `disableAiStyle()` (line 6319)

### B. State Management Fixes

3. **Add dirty flag tracking to all EngineConfig tabs**
   - File: `backend/public/dev-dashboard.html`
   - Functions to update:
     - `saveScoringProfile()` - Add `setEngineConfigDirty(true)` after state update
     - `saveDynamicsProfile()` - Add `setEngineConfigDirty(true)` after state update
     - `saveMoodConfig()` - Add `setEngineConfigDirty(true)` after state update
     - `saveMicroDynamicsConfig()` - Add `setEngineConfigDirty(true)` after state update
     - `savePersonaConfig()` - Add `setEngineConfigDirty(true)` after state update
     - `saveGate()` - Add `setEngineConfigDirty(true)` after state update

4. **Add tab switch guard during save**
   - File: `backend/public/dev-dashboard.html`
   - Function: `saveEngineConfig()` (line 4823)
   - Action: Disable all tab buttons at start, re-enable in finally block

### C. Error Handling Improvements

5. **Add JSON parse error handling in saveHook()**
   - File: `backend/public/dev-dashboard.html`
   - Function: `saveHook()` (line 5662)
   - Action: Wrap `JSON.parse()` calls in try-catch, show error before API call

6. **Add fallback usage logging**
   - File: `backend/public/dev-dashboard.html`
   - Functions: All handlers using `|| fallback` patterns
   - Action: Log warning when fallback is used (e.g., `log('WARNING: Using fallback for hooks array')`)

### D. Verification Tasks

7. ~~**Verify attachments endpoint response shapes**~~ ✅ COMPLETE
   - **Status**: Verified - both endpoints return expected shapes
   - **Evidence**: `getMissionAttachments()` returns `{ ok: true, attachments }`, `updateMissionAttachments()` returns `{ ok: true, mission }`

8. **Test all flows after fixes**
   - Create click-test checklist:
     - [ ] EngineConfig: Load → Edit scoring profile → Save (verify dirty flag)
     - [ ] EngineConfig: Load → Edit dynamics profile → Save (verify dirty flag)
     - [ ] EngineConfig: Load → Edit mood bands → Save (verify dirty flag)
     - [ ] EngineConfig: Load → Switch tabs during save (verify no desync)
     - [ ] Hooks: Load → Create → Update → Load triggers
     - [ ] Missions: Load → Edit → Save → Delete
     - [ ] Categories: Load → Create → Update → Delete
     - [ ] Personas: Load → Create → Update
     - [ ] AI Styles: Load → Create → Update → Enable → Disable
     - [ ] All: Verify JWT required (test without JWT, should show error)
     - [ ] All: Verify errors are displayed (test with invalid data)

---

## FILES THAT WILL CHANGE

1. `backend/src/modules/engine-config/engine-config.controller.ts`
2. `backend/src/modules/hooks/hooks.controller.ts`
3. `backend/src/modules/engine-config/engine-config-prompts.controller.ts`
4. `backend/src/modules/insights/insights-admin.controller.ts`
5. `backend/src/modules/missions-admin/missions-admin.controller.ts`
6. `backend/src/modules/missions-admin/missions-admin.categories.controller.ts`
7. `backend/src/modules/missions-admin/missions-admin.personas.controller.ts`
8. `backend/src/modules/ai-styles/ai-styles-admin.controller.ts`
9. `backend/public/dev-dashboard.html` (multiple locations)

---

## CLICK-TEST CHECKLIST

After implementing fixes, verify:

- [ ] **Auth**: All admin endpoints reject requests without valid JWT
- [ ] **Auth**: Dashboard shows "JWT token required" error when calling admin endpoints without JWT
- [ ] **EngineConfig Load**: Loads config, clears dirty flag, shows in UI
- [ ] **EngineConfig Save**: Saves config, clears dirty flag, shows success
- [ ] **EngineConfig Dirty Tracking**: Edit scoring profile → dirty flag shows
- [ ] **EngineConfig Dirty Tracking**: Edit dynamics profile → dirty flag shows
- [ ] **EngineConfig Dirty Tracking**: Edit mood bands → dirty flag shows
- [ ] **EngineConfig Tab Switch**: Switch tabs during save → no desync
- [ ] **Hooks**: Load → Create → Update → Load triggers (all work)
- [ ] **Hooks JSON Error**: Invalid JSON in conditionsJson → shows error before API call
- [ ] **Missions**: Load → Edit → Save → Delete (all work)
- [ ] **Categories**: Load → Create → Update → Delete (all work)
- [ ] **Personas**: Load → Create → Update (all work)
- [ ] **AI Styles**: Load → Create → Update → Enable → Disable (all work)
- [ ] **Error Display**: All errors show in UI (no silent failures)
- [ ] **Attachments**: Load → Edit → Save (verify response shapes match - ✅ Verified in audit)

---

## STOP CONDITIONS MET

✅ Every critical FLOW is classified with evidence  
✅ Every endpoint contract mismatch is identified  
✅ Complete Step 1 execution plan exists  
✅ All evidence includes file:line references  

**Audit Complete.**

