# PHASE 4 WAVE 1 PROOF PACK (4.1 + 4.3 + 4.4 + 4.7)

**Mode**: READ-ONLY SCOUT (NO CODE CHANGES, NO COMMANDS)  
**Goal**: Execution-ready proof pack for Wave 1 only

---

## A) ENGINECONFIG TABS BUG — PROVE AND PROPOSE MINIMAL FIX

### Where wireEngineConfig() is Called

**Evidence**: `backend/public/dev-dashboard.html:6316`
```6316:6316:backend/public/dev-dashboard.html
wireEngineConfig(); // Step 7.2: Add Engine Config wiring
```

Called inside `boot()` function, which is invoked via `DOMContentLoaded` event listener at line 6321.

### Where engineConfigUI is Constructed

**Evidence**: `backend/public/dev-dashboard.html:4499-4569`
```4499:4502:backend/public/dev-dashboard.html
const engineConfigUI = {
  loadBtn: document.getElementById("engineConfigLoadBtn"),
  saveBtn: document.getElementById("engineConfigSaveBtn"),
  tabs: document.querySelectorAll(".engineConfigTab"),
  tabContents: document.querySelectorAll(".engineConfigTabContent"),
```

**Critical**: `engineConfigUI` is constructed at line 4499, which is **inside the main script block** that starts at line 2114. The script block is placed **after the HTML body** (HTML structure ends around line 2112, script starts at 2114).

### DOM Timing Proof

**HTML Tabs Location**: `backend/public/dev-dashboard.html:906-917`
```906:917:backend/public/dev-dashboard.html
<button class="engineConfigTab" data-tab="scoring" ...>Scoring & Traits</button>
<button class="engineConfigTab" data-tab="dynamics" ...>Dynamics Profiles</button>
...
<button class="engineConfigTab" data-tab="persona" ...>Persona Drift</button>
```

**Script Execution Order**:
1. HTML body loads (tabs exist in DOM)
2. Script block executes (line 2114+)
3. `engineConfigUI` constructed at line 4499 (queries `.engineConfigTab`)
4. `boot()` function defined at line 6313
5. `DOMContentLoaded` listener attached at line 6321
6. When DOM ready, `boot()` called → `wireEngineConfig()` called at line 6316

**Logical Proof**: The script block is **after** the HTML body, so when the script executes:
- If script executes **before** DOM is fully parsed: `document.querySelectorAll(".engineConfigTab")` returns **empty NodeList** (tabs not yet in DOM)
- If script executes **after** DOM is parsed: `document.querySelectorAll(".engineConfigTab")` returns **populated NodeList**

**Problem**: `engineConfigUI.tabs` is queried **immediately** when script executes (line 4502), not inside `wireEngineConfig()`. If script executes before DOM ready, `engineConfigUI.tabs` is empty, and `wireEngineConfig()` at line 6043 does `engineConfigUI.tabs.forEach(...)` on empty array → **no click handlers attached**.

**Evidence of Problem**: `backend/public/dev-dashboard.html:6043-6065`
```6043:6043:backend/public/dev-dashboard.html
engineConfigUI.tabs.forEach(tab => {
```
This forEach will iterate 0 times if `engineConfigUI.tabs` is empty.

### Minimal Patch Options

#### Option 1: Re-query Tabs Inside wireEngineConfig()

**Exact Lines to Change**:
- **Line 6041**: Change `function wireEngineConfig() {` to:
  ```javascript
  function wireEngineConfig() {
    // Re-query tabs and tabContents inside function (DOM guaranteed ready)
    const tabs = document.querySelectorAll(".engineConfigTab");
    const tabContents = document.querySelectorAll(".engineConfigTabContent");
  ```
- **Line 6043**: Change `engineConfigUI.tabs.forEach` to `tabs.forEach`
- **Line 6047**: Change `engineConfigUI.tabs.forEach` to `tabs.forEach`
- **Line 6053**: Change `engineConfigUI.tabContents.forEach` to `tabContents.forEach`
- **Line 6068**: Change `if (engineConfigUI.tabs.length > 0)` to `if (tabs.length > 0)`
- **Line 6069**: Change `engineConfigUI.tabs[0].click()` to `tabs[0].click()`

**Why It Fixes**: Tabs are queried **inside** `wireEngineConfig()` which is called **after** DOM ready (via `DOMContentLoaded`), so tabs are guaranteed to exist.

**What It Might Break**: None (tabs are only used in `wireEngineConfig()`, no other code references `engineConfigUI.tabs`).

#### Option 2: Move engineConfigUI Construction Inside boot()

**Exact Lines to Change**:
- **Line 4499-4569**: Move entire `const engineConfigUI = { ... }` block
- **New Location**: Inside `boot()` function, **before** `wireEngineConfig()` call (after line 6314)

**Why It Fixes**: `engineConfigUI` is constructed **after** DOM ready (inside `boot()`), so tabs are guaranteed to exist.

**What It Might Break**: 
- Any code that references `engineConfigUI` **before** `boot()` is called will fail (need to check if any code accesses `engineConfigUI` before line 6316)
- **Risk**: LOW - `engineConfigUI` is only used in functions that are called after `boot()`

**Recommendation**: **Option 1** (re-query inside function) is safer and more explicit.

---

## B) ADMIN SECTIONS WIRING — PROVE BUTTONS ARE WIRED

### AI Styles Admin

#### Button Elements (IDs)

| Button | ID | HTML Location (file:line) |
|--------|-----|---------------------------|
| Load | `aiStylesLoadBtn` | `backend/public/dev-dashboard.html:1997` |
| Add/Create | `aiStylesAddBtn` | `backend/public/dev-dashboard.html:1998` |
| Save | `aiStylesSaveBtn` | `backend/public/dev-dashboard.html:2038` |
| Cancel | `aiStylesCancelBtn` | `backend/public/dev-dashboard.html:2039` |

#### Wiring Function

**Evidence**: `backend/public/dev-dashboard.html:6016-6026`
```6016:6026:backend/public/dev-dashboard.html
function wireAdminSections() {
  // AI Styles
  const aiStylesLoadBtn = document.getElementById("aiStylesLoadBtn");
  const aiStylesAddBtn = document.getElementById("aiStylesAddBtn");
  const aiStylesSaveBtn = document.getElementById("aiStylesSaveBtn");
  const aiStylesCancelBtn = document.getElementById("aiStylesCancelBtn");
  
  if (aiStylesLoadBtn) aiStylesLoadBtn.addEventListener("click", loadAiStylesAdmin);
  if (aiStylesAddBtn) aiStylesAddBtn.addEventListener("click", addAiStyle);
  if (aiStylesSaveBtn) aiStylesSaveBtn.addEventListener("click", saveAiStyle);
  if (aiStylesCancelBtn) aiStylesCancelBtn.addEventListener("click", cancelAiStyleEdit);
```

#### Where Wiring Function is Invoked

**Evidence**: `backend/public/dev-dashboard.html:6318`
```6318:6318:backend/public/dev-dashboard.html
wireAdminSections(); // Wire AI Styles and Personas admin
```

Called inside `boot()` function, which is invoked after DOM ready.

### Personas Admin

#### Button Elements (IDs)

| Button | ID | HTML Location (file:line) |
|--------|-----|---------------------------|
| Load | `personasLoadBtn` | `backend/public/dev-dashboard.html:2053` |
| Add/Create | `personasAddBtn` | `backend/public/dev-dashboard.html:2054` |
| Save | `personasSaveBtn` | `backend/public/dev-dashboard.html:2090` |
| Cancel | `personasCancelBtn` | `backend/public/dev-dashboard.html:2091` |

#### Wiring Function

**Evidence**: `backend/public/dev-dashboard.html:6028-6037`
```6028:6037:backend/public/dev-dashboard.html
// Personas
const personasLoadBtn = document.getElementById("personasLoadBtn");
const personasAddBtn = document.getElementById("personasAddBtn");
const personasSaveBtn = document.getElementById("personasSaveBtn");
const personasCancelBtn = document.getElementById("personasCancelBtn");

if (personasLoadBtn) personasLoadBtn.addEventListener("click", loadPersonasAdmin);
if (personasAddBtn) personasAddBtn.addEventListener("click", addPersona);
if (personasSaveBtn) personasSaveBtn.addEventListener("click", savePersona);
if (personasCancelBtn) personasCancelBtn.addEventListener("click", cancelPersonaEdit);
```

#### Where Wiring Function is Invoked

Same as AI Styles: `backend/public/dev-dashboard.html:6318` (inside `boot()`).

### Potential JS Exceptions Before Wiring (Top 5)

1. **Missing `loadAiStylesAdmin` function** - `backend/public/dev-dashboard.html:6023` references `loadAiStylesAdmin` but if function not defined, `addEventListener` will throw `ReferenceError`
   - **Evidence**: Function exists at `backend/public/dev-dashboard.html:5793`
   - **Risk**: LOW (function is defined before `wireAdminSections()`)

2. **Missing `addAiStyle` function** - `backend/public/dev-dashboard.html:6024` references `addAiStyle`
   - **Evidence**: Function exists at `backend/public/dev-dashboard.html:5906`
   - **Risk**: LOW

3. **Missing `saveAiStyle` function** - `backend/public/dev-dashboard.html:6025` references `saveAiStyle`
   - **Evidence**: Function exists at `backend/public/dev-dashboard.html:5864`
   - **Risk**: LOW

4. **Missing `loadPersonasAdmin` function** - `backend/public/dev-dashboard.html:6034` references `loadPersonasAdmin`
   - **Evidence**: Function exists at `backend/public/dev-dashboard.html:5917`
   - **Risk**: LOW

5. **Missing `addPersona` function** - `backend/public/dev-dashboard.html:6035` references `addPersona`
   - **Evidence**: Function exists at `backend/public/dev-dashboard.html:6006` (likely, need to verify)
   - **Risk**: LOW

**All functions are defined before `wireAdminSections()` is called, so no exceptions expected.**

---

## C) HOOKS ADMIN REALITY CHECK (ENGINECONFIG TAB)

### Hooks UI Exists

**Tab Content Container**: `backend/public/dev-dashboard.html:1385`
```1385:1385:backend/public/dev-dashboard.html
<div id="engineConfigTabHooks" class="engineConfigTabContent" style="display: none;">
```

**Key Controls**:
- **Table Body ID**: `engineConfigHooksTableBody` - `backend/public/dev-dashboard.html:1408`
- **Editor ID**: `engineConfigHookEditor` - `backend/public/dev-dashboard.html:1410`
- **Save Button ID**: `engineConfigHookSaveBtn` - `backend/public/dev-dashboard.html:1448`
- **Load Button ID**: `engineConfigLoadHooksBtn` - `backend/public/dev-dashboard.html:1392`

### Hooks Functions Exist

| Function | Location (file:line) |
|----------|---------------------|
| `loadHooks()` | `backend/public/dev-dashboard.html:5215` |
| `renderHooksTable()` | `backend/public/dev-dashboard.html:5230` |
| `saveHook()` | `backend/public/dev-dashboard.html:5265` |
| `selectHook()` | `backend/public/dev-dashboard.html:5249` (window function) |
| `loadTriggerStats()` | `backend/public/dev-dashboard.html:5321` |

### How Hooks Load is Triggered

**Button Click**: `backend/public/dev-dashboard.html:6210`
```6210:6210:backend/public/dev-dashboard.html
engineConfigUI.loadHooksBtn.addEventListener("click", loadHooks);
```

**Tab Switch**: When "Hooks & Triggers" tab is clicked, `renderEngineConfigTabs()` is called, which calls `renderHooksTab()` if `currentTab === 'hooks'`. However, hooks are **not auto-loaded** on tab switch - user must click "Load Hooks" button.

**Evidence**: `backend/public/dev-dashboard.html:4616-4617`
```4616:4617:backend/public/dev-dashboard.html
} else if (engineConfigState.currentTab === 'hooks') {
  renderHooksTab();
```

But `renderHooksTab()` is not defined in visible code - likely just renders empty table until `loadHooks()` is called.

### Response Shape Confirmation

**Backend Returns**: `backend/src/modules/hooks/hooks.controller.ts:43`
```43:43:backend/src/modules/hooks/hooks.controller.ts
return { ok: true, hooks };
```

**Frontend Parsing**: `backend/public/dev-dashboard.html:5218-5219`
```5218:5219:backend/public/dev-dashboard.html
if (res.ok && res.hooks) {
  engineConfigState.hooks = res.hooks;
```

✅ **Match**: Backend returns `{ ok: true, hooks: [...] }`, frontend checks `res.ok && res.hooks` → **NO BREAK**.

---

## D) SEED ADDITIONS FEASIBILITY (4.7)

### AiStyle Required Fields + Defaults + Enum

**Schema Location**: `backend/prisma/schema.prisma:162-186`

**Required Fields** (no defaults):
- `id`: `String @id @default(cuid())` - Auto-generated
- `key`: `AiStyleKey @unique` - **REQUIRED** (enum value)
- `name`: `String` - **REQUIRED**
- `description`: `String` - **REQUIRED**
- `stylePrompt`: `String` - **REQUIRED**
- `forbiddenBehavior`: `String` - **REQUIRED**
- `maxChars`: `Int` - **REQUIRED**
- `maxLines`: `Int` - **REQUIRED**
- `questionRate`: `Int` - **REQUIRED**
- `emojiRate`: `Int` - **REQUIRED**
- `initiative`: `Int` - **REQUIRED**
- `warmth`: `Int` - **REQUIRED**
- `judgment`: `Int` - **REQUIRED**
- `flirtTension`: `Int` - **REQUIRED**
- `formality`: `Int` - **REQUIRED**

**Optional Fields** (with defaults):
- `tags`: `String[] @default([])` - Defaults to empty array
- `fewShotExamples`: `Json?` - Optional
- `temperature`: `Float?` - Optional
- `topP`: `Float?` - Optional
- `isActive`: `Boolean @default(true)` - Defaults to true
- `createdAt`: `DateTime @default(now())` - Auto-generated
- `updatedAt`: `DateTime @updatedAt` - Auto-generated

**AiStyleKey Enum**: `backend/prisma/schema.prisma:852-863`
```852:863:backend/prisma/schema.prisma
enum AiStyleKey {
  NEUTRAL
  FLIRTY
  PLAYFUL
  CHALLENGING
  WARM
  COLD
  SHY
  DIRECT
  JUDGMENTAL
  CHAOTIC
}
```

### PromptHook Required Fields + Defaults

**Schema Location**: `backend/prisma/schema.prisma:536-556`

**Required Fields** (no defaults):
- `id`: `String @id @default(cuid())` - Auto-generated
- `name`: `String` - **REQUIRED**
- `type`: `String` - **REQUIRED** (typically "POSITIVE", "NEGATIVE", "NEUTRAL")
- `textTemplate`: `String` - **REQUIRED**
- `conditionsJson`: `Json` - **REQUIRED** (can be `{}`)
- `category`: `String` - **REQUIRED**

**Optional Fields** (with defaults):
- `tags`: `String[] @default([])` - Defaults to empty array
- `priority`: `Int @default(50)` - Defaults to 50
- `isEnabled`: `Boolean @default(true)` - Defaults to true
- `version`: `String @default("v1")` - Defaults to "v1"
- `metaJson`: `Json?` - Optional
- `createdAt`: `DateTime @default(now())` - Auto-generated
- `updatedAt`: `DateTime @updatedAt` - Auto-generated

### PracticeMissionTemplate Required Fields for SOCIAL_NEUTRAL_L1_M1

**Schema Location**: `backend/prisma/schema.prisma:191-223`

**Required Fields** (no defaults):
- `id`: `String @id @default(cuid())` - Auto-generated
- `code`: `String @unique` - **REQUIRED** (e.g., "SOCIAL_NEUTRAL_L1_M1")
- `title`: `String` - **REQUIRED**
- `categoryId`: `String?` - Optional (can be null)
- `personaId`: `String?` - Optional (can be null)
- `aiContract`: `Json?` - **REQUIRED** (must contain valid `missionConfigV1`)

**Optional Fields** (with defaults):
- `description`: `String?` - Optional
- `timeLimitSec`: `Int @default(30)` - Defaults to 30
- `maxMessages`: `Int?` - Optional
- `active`: `Boolean @default(true)` - Defaults to true
- `baseCoinsReward`: `Int @default(10)` - Defaults to 10
- `baseGemsReward`: `Int @default(0)` - Defaults to 0
- `baseXpReward`: `Int @default(50)` - Defaults to 50
- `goalType`: `MissionGoalType?` - Optional
- `isVoiceSupported`: `Boolean @default(true)` - Defaults to true
- `laneIndex`: `Int @default(0)` - Defaults to 0
- `orderIndex`: `Int @default(0)` - Defaults to 0
- `wordLimit`: `Int?` - Optional
- `difficulty`: `MissionDifficulty @default(EASY)` - Defaults to EASY
- `aiStyleId`: `String?` - Optional
- `isAttractionSensitive`: `Boolean @default(false)` - Defaults to false (perfect for neutral mission)
- `targetRomanticGender`: `Gender?` - Optional (should be null for neutral)
- `moodConfigs`: `MissionMoodConfig?` - Optional
- `createdAt`: `DateTime @default(now())` - Auto-generated

**aiContract Shape**: Must be `{ missionConfigV1: MissionConfigV1 }` where `MissionConfigV1` is valid. Can use `buildOpenersMissionConfigV1()` or `buildFlirtingMissionConfigV1()` from `backend/src/modules/missions-admin/mission-config-v1.builders.ts`.

**Example** (using builder):
```typescript
const socialNeutralConfig = buildFlirtingMissionConfigV1({
  difficultyLevel: MissionDifficulty.EASY,
  aiStyleKey: AiStyleKey.NEUTRAL, // or WARM
  maxMessages: 5,
  timeLimitSec: 60,
  wordLimit: 50,
  userTitle: 'Casual Conversation',
  userDescription: 'Have a friendly, neutral conversation without any romantic pressure.',
});
```

### Where in seed.ts to Add Them

**Anchor Point**: `backend/prisma/seed.ts:454` (after EngineConfig seed, before `main()` ends)

**Exact Location**: After line 454 (`console.log('✅ EngineConfig seeded');`), before line 456 (`}` closing main function).

**Structure**:
```typescript
// After line 454
console.log('✅ EngineConfig seeded');

// Add here:
// 1. Seed 3 AI Styles
// 2. Seed 10 Hooks (5 positive, 5 negative)
// 3. Seed 1 neutral/social mission template

} // main function closes at line 456
```

---

## E) WAVE 1 "EXECUTION GATE CHECKLIST"

### EngineConfig Tabs (4.1)

- [ ] **All 11 EngineConfig tabs are clickable** - Open dev dashboard → Click each tab (Scoring, Dynamics, Gates, Hooks, Mood, Insights, Attachments, Monitoring, Micro Feedback, Micro Dynamics, Persona) → Verify tab content displays
- [ ] **Tab switching works** - Click tab → Verify active tab highlighted (background changes) → Verify previous tab content hidden
- [ ] **First tab auto-activates** - Reload page → Verify first tab (Scoring) is active on load

### AI Styles Admin (4.3)

- [ ] **AI Styles Load button works** - Click "Load Styles" → Verify table populates with AI styles → Verify "AI Styles loaded." message appears
- [ ] **AI Styles table displays** - After load → Verify table shows columns: Key, Name, Active, Actions
- [ ] **AI Styles Add button works** - Click "Add Style" → Verify editor form appears → Fill required fields → Click "Save" → Verify "AI Style created." message
- [ ] **AI Styles Edit button works** - Click "Edit" on existing style → Verify editor populates with style data → Modify fields → Click "Save" → Verify "AI Style updated." message
- [ ] **AI Styles persistence** - Create/edit style → Reload page → Click "Load Styles" → Verify changes persisted
- [ ] **AI Styles all fields editable** - Edit style → Verify all fields editable: key, name, description, stylePrompt, forbiddenBehavior, isActive (verify maxChars, maxLines, questionRate, emojiRate, initiative, warmth, judgment, flirtTension, formality, temperature, topP, fewShotExamples if UI supports them)

### Personas Admin (4.3)

- [ ] **Personas Load button works** - Click "Load Personas" → Verify table populates → Verify "Personas loaded." message
- [ ] **Personas table displays** - After load → Verify table shows columns: Code, Name, Active, Actions
- [ ] **Personas Add button works** - Click "Add Persona" → Verify editor form appears → Fill required fields → Click "Save" → Verify "Persona created." message
- [ ] **Personas Edit button works** - Click "Edit" on existing persona → Verify editor populates → Modify fields → Click "Save" → Verify "Persona updated." message
- [ ] **Personas persistence** - Create/edit persona → Reload page → Click "Load Personas" → Verify changes persisted

### Hooks Admin (4.4)

- [ ] **Hooks tab accessible** - Open EngineConfig section → Click "Hooks & Triggers" tab → Verify tab content displays
- [ ] **Hooks Load button works** - Click "Load Hooks" → Verify table populates → Verify "Hooks loaded." message
- [ ] **Hooks table displays** - After load → Verify table shows columns: Name, Type, Priority, Enabled, Tags, Actions
- [ ] **Hooks Add button works** - Click "Add Hook" → Verify editor form appears → Fill required fields → Click "Save Hook" → Verify "Hook created." message
- [ ] **Hooks Edit button works** - Click "Edit" on existing hook → Verify editor populates → Modify fields → Click "Save Hook" → Verify "Hook updated." message
- [ ] **Hooks persistence** - Create/edit hook → Reload page → Click "Load Hooks" → Verify changes persisted
- [ ] **Hooks trigger stats load** - Click "Refresh" in Triggers Monitor section → Verify stats table populates (if data exists)

### Seed Pack (4.7)

- [ ] **Seed creates ≥3 AI styles** - Run `npm run seed` (or `npx prisma db seed`) → Query DB: `SELECT COUNT(*) FROM "AiStyle" WHERE "isActive" = true` → Verify count >= 3
- [ ] **Seed creates ≥10 hooks** - After seed → Query DB: `SELECT COUNT(*) FROM "PromptHook" WHERE "isEnabled" = true AND type = 'POSITIVE'` → Verify count >= 5 → Query: `SELECT COUNT(*) FROM "PromptHook" WHERE "isEnabled" = true AND type = 'NEGATIVE'` → Verify count >= 5
- [ ] **Seed creates 1 neutral/social mission** - After seed → Query DB: `SELECT code, title, "isAttractionSensitive" FROM "PracticeMissionTemplate" WHERE "isAttractionSensitive" = false AND active = true` → Verify at least 1 row exists
- [ ] **Seeded AI styles are valid** - After seed → Query DB: `SELECT key, name FROM "AiStyle" WHERE "isActive" = true` → Verify all have valid `key` enum values (NEUTRAL, FLIRTY, PLAYFUL, etc.) → Verify all have non-empty `name`
- [ ] **Seeded hooks are valid** - After seed → Query DB: `SELECT name, type, category FROM "PromptHook" WHERE "isEnabled" = true` → Verify all have non-empty `name`, `type` in ['POSITIVE', 'NEGATIVE', 'NEUTRAL'], non-empty `category`
- [ ] **Seeded mission has valid aiContract** - After seed → Query DB: `SELECT code, "aiContract" FROM "PracticeMissionTemplate" WHERE "isAttractionSensitive" = false` → Verify `aiContract` is valid JSON → Verify `aiContract.missionConfigV1` exists and has required fields

### Error Handling

- [ ] **Errors are visible** - Trigger error (e.g., invalid API call) → Verify error message appears in error box (red box at top of dashboard)
- [ ] **No silent failures** - All API calls show success/error messages → No operations fail silently

---

## RISKS / UNKNOWNS

### Known Risks

1. **AI Styles endpoint response shape mismatch** - Frontend expects array (`if (Array.isArray(res))`), backend may return `{ ok: true, styles: [...] }` → **UNKNOWN** (need to verify backend controller)
   - **Evidence**: `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:87-91` returns array directly → **Should work**

2. **Personas endpoint response shape mismatch** - Same as AI Styles → **UNKNOWN** (need to verify)
   - **Evidence**: `backend/src/modules/missions-admin/missions-admin.personas.controller.ts:20-40` returns array directly → **Should work**

3. **Missing functions** - If `addPersona`, `cancelPersonaEdit` functions don't exist, wiring will fail → **UNKNOWN** (need to verify all functions exist)

### Unknowns

1. **renderHooksTab() function** - Referenced in `renderEngineConfigTabs()` but not found in code → **UNKNOWN** (may be missing or named differently)

2. **AI Styles full field coverage** - UI may not have inputs for all fields (maxChars, maxLines, etc.) → **UNKNOWN** (need to verify UI has all fields)

3. **Seed script execution** - Need to verify seed script runs without errors when adding new artifacts → **UNKNOWN** (will be known after implementation)

---

## SUMMARY

**Wave 1 Readiness**: ⚠️ **PARTIAL**

**Blockers**:
- EngineConfig tabs bug (DOM timing) - **FIXABLE** (Option 1 recommended)
- Need to verify AI Styles/Personas endpoint response shapes match frontend expectations

**Ready**:
- Hooks admin fully functional
- Wiring functions exist and are called correctly
- Seed structure is clear

**Next Steps**:
1. Fix EngineConfig tabs bug (Option 1: re-query inside function)
2. Verify AI Styles/Personas endpoints return expected shapes
3. Add seed data for AI styles, hooks, neutral mission
4. Test all checklines in Execution Gate Checklist

