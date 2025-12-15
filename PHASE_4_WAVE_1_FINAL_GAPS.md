# PHASE 4 WAVE 1 FINAL GAPS (BLOCKERS)

**Mode**: READ-ONLY SCOUT (NO EDITS, NO COMMANDS)

---

## 1) ENGINECONFIG TAB ROOT-CAUSE PROOF (NO HAND-WAVING)

### HTML Excerpt: EngineConfig Tabs Markup

**Evidence**: `backend/public/dev-dashboard.html:904-917`
```904:917:backend/public/dev-dashboard.html
<!-- Tabs -->
<div style="display: flex; gap: 8px; padding: 12px; border-bottom: 1px solid var(--line); flex-wrap: wrap;">
  <button class="engineConfigTab" data-tab="scoring" style="...">Scoring & Traits</button>
  <button class="engineConfigTab" data-tab="dynamics" style="...">Dynamics Profiles</button>
  <button class="engineConfigTab" data-tab="gates" style="...">Gates & Objectives</button>
  <button class="engineConfigTab" data-tab="hooks" style="...">Hooks & Triggers</button>
  <button class="engineConfigTab" data-tab="mood" style="...">Mood & State Policy</button>
  <button class="engineConfigTab" data-tab="insights" style="...">Insights Catalog</button>
  <button class="engineConfigTab" data-tab="attachments" style="...">Mission Attachments</button>
  <button class="engineConfigTab" data-tab="monitoring" style="...">Monitoring</button>
  <button class="engineConfigTab" data-tab="microFeedback" style="...">Micro Feedback</button>
  <button class="engineConfigTab" data-tab="microDynamics" style="...">Micro Dynamics</button>
  <button class="engineConfigTab" data-tab="persona" style="...">Persona Drift</button>
</div>
```

### Script Tag Opening

**Evidence**: `backend/public/dev-dashboard.html:2112-2114`
```2112:2114:backend/public/dev-dashboard.html
    </div>

    <script>
      (function () {
```

**HTML Structure**:
- Line 2112: `</div>` closes the main content wrapper
- Line 2114: `<script>` tag opens (IIFE pattern)
- **Script is at END of `<body>`** (not in `<head>`)

### Script Placement Analysis

**HTML Body Structure**:
1. Lines 1-2112: HTML body content (including EngineConfig tabs at lines 904-917)
2. Line 2114: `<script>` tag opens
3. Line 4499: `const engineConfigUI = { ... tabs: document.querySelectorAll(".engineConfigTab") }` executes

**Browser Parsing Order**:
- Browser parses HTML **sequentially** (top to bottom)
- When `<script>` tag is encountered **without `defer` or `async`**, script execution **blocks** HTML parsing
- However, if script is at **end of body**, all HTML above it is **already parsed and in DOM**

**Conclusion**: Since script is at **end of `<body>`** (line 2114), and tabs are **before** script (lines 904-917), `document.querySelectorAll(".engineConfigTab")` at line 4502 **CANNOT be empty** - tabs are guaranteed to be in DOM when script executes.

### Correction of Previous Claim

**Previous Claim**: "engineConfigUI.tabs queried before DOM ready → empty NodeList"

**CORRECTION**: This claim was **SPECULATIVE**. The script is at end of body, so tabs are **guaranteed** to exist when `engineConfigUI` is constructed.

**Actual Root Cause**: The issue is **NOT** DOM timing. The real issue is:
- `engineConfigUI.tabs` is a **static NodeList** (snapshot at construction time)
- If tabs are **dynamically added/removed** after construction, `engineConfigUI.tabs` won't update
- However, tabs are **static HTML**, so this shouldn't be an issue

**Alternative Root Cause**: If tabs are not clickable, it's likely:
1. `wireEngineConfig()` is not being called (but evidence shows it is called at line 6316)
2. `engineConfigUI.tabs` is somehow null/undefined (but querySelectorAll returns empty NodeList, not null)
3. Event listeners are being attached but something else prevents clicks

**UNKNOWN**: Need to verify if `wireEngineConfig()` actually runs and if `engineConfigUI.tabs.length > 0` at runtime.

---

## 2) RESOLVE renderHooksTab() DEFINITIVELY

### Search Results

**Function Definition Search**: `grep "function renderHooksTab"` → **NO MATCHES**

**Function Reference Search**: `grep "renderHooksTab"` → **1 MATCH** at `backend/public/dev-dashboard.html:4617`

**Evidence of Reference**: `backend/public/dev-dashboard.html:4616-4617`
```4616:4617:backend/public/dev-dashboard.html
} else if (engineConfigState.currentTab === 'hooks') {
  renderHooksTab();
```

### Function Does NOT Exist

**Proof of Absence**:
- Search for `function renderHooksTab` → **0 matches**
- Search for `const renderHooksTab` → **0 matches**
- Search for `renderHooksTab =` → **0 matches**

**What EXISTS Instead**:
- `renderHooksTable()` exists at `backend/public/dev-dashboard.html:5230`
- `loadHooks()` exists at `backend/public/dev-dashboard.html:5215`
- `saveHook()` exists at `backend/public/dev-dashboard.html:5265`

### Runtime Impact

**Would clicking "Hooks & Triggers" tab throw ReferenceError?**

**YES** - When user clicks "Hooks & Triggers" tab:
1. Tab click handler calls `renderEngineConfigTabs()` (line 6063)
2. `renderEngineConfigTabs()` checks `if (engineConfigState.currentTab === 'hooks')` (line 4616)
3. Calls `renderHooksTab()` (line 4617)
4. **ReferenceError**: `renderHooksTab is not defined`

**Would that stop subsequent UI wiring / actions?**

**YES** - ReferenceError is **fatal** and stops JavaScript execution. All subsequent code in that execution context fails.

**However**: The error occurs **inside** `renderEngineConfigTabs()`, which is called **after** wiring is complete. So:
- Wiring functions (`wireEngineConfig()`, `wireAdminSections()`) complete successfully
- Error only occurs when user **clicks** the Hooks tab
- Other tabs continue to work (they call different render functions)

### Other renderXTab() Functions Referenced

| Function | Referenced At | Exists? | Location |
|----------|---------------|---------|----------|
| `renderScoringTab()` | `backend/public/dev-dashboard.html:4611` | ✅ YES | `backend/public/dev-dashboard.html:4640` |
| `renderDynamicsTab()` | `backend/public/dev-dashboard.html:4613` | ✅ YES | `backend/public/dev-dashboard.html:5053` |
| `renderGatesTab()` | `backend/public/dev-dashboard.html:4615` | ✅ YES | `backend/public/dev-dashboard.html:5158` |
| `renderHooksTab()` | `backend/public/dev-dashboard.html:4617` | ❌ **NO** | **MISSING** |
| `renderMoodTab()` | `backend/public/dev-dashboard.html:4619` | ✅ YES | `backend/public/dev-dashboard.html:5351` |
| `renderInsightsTab()` | `backend/public/dev-dashboard.html:4621` | ⚠️ UNKNOWN | Not found, but `renderInsightsTable()` exists at line 5492 |
| `renderMonitoringTab()` | `backend/public/dev-dashboard.html:4623` | ✅ YES | `backend/public/dev-dashboard.html:5590` |
| `renderMicroFeedbackTab()` | `backend/public/dev-dashboard.html:4632` | ✅ YES | `backend/public/dev-dashboard.html:4840` |
| `renderMicroDynamicsTab()` | `backend/public/dev-dashboard.html:4634` | ✅ YES | `backend/public/dev-dashboard.html:4917` |
| `renderPersonaTab()` | `backend/public/dev-dashboard.html:4636` | ✅ YES | `backend/public/dev-dashboard.html:4991` |

**Missing Functions**:
- `renderHooksTab()` - **MISSING** (should call `renderHooksTable()` or be alias)
- `renderInsightsTab()` - **MISSING** (should call `renderInsightsTable()` or be alias)

---

## 3) TOP 10 FATAL JS EXCEPTIONS (CLICK DOES NOTHING)

### Missing Function References

1. **`renderHooksTab()` is not defined**
   - **File:Line**: `backend/public/dev-dashboard.html:4617`
   - **Expression**: `renderHooksTab();`
   - **Error**: `ReferenceError: renderHooksTab is not defined`
   - **Trigger**: Clicking "Hooks & Triggers" tab

2. **`renderInsightsTab()` is not defined**
   - **File:Line**: `backend/public/dev-dashboard.html:4621`
   - **Expression**: `renderInsightsTab();`
   - **Error**: `ReferenceError: renderInsightsTab is not defined`
   - **Trigger**: Clicking "Insights Catalog" tab

### Missing Element IDs Accessed Without Null Checks

3. **`engineConfigTab${tabId}` element missing**
   - **File:Line**: `backend/public/dev-dashboard.html:6062`
   - **Expression**: `document.getElementById(`engineConfigTab${tabId}`).style.display = "block";`
   - **Error**: `TypeError: Cannot read property 'style' of null`
   - **Trigger**: Clicking tab with invalid `data-tab` value (tabIdMap mismatch)

4. **`engineConfigScoringCode` element missing**
   - **File:Line**: `backend/public/dev-dashboard.html:4673`
   - **Expression**: `document.getElementById("engineConfigScoringCode").value = profile.code || "";`
   - **Error**: `TypeError: Cannot set property 'value' of null`
   - **Trigger**: Selecting scoring profile if HTML element missing

5. **`engineConfigScoringWeightConfidence` element missing**
   - **File:Line**: `backend/public/dev-dashboard.html:4679`
   - **Expression**: `document.getElementById("engineConfigScoringWeightConfidence").value = w.confidence || 0;`
   - **Error**: `TypeError: Cannot set property 'value' of null`
   - **Trigger**: Selecting scoring profile if HTML element missing

6. **`engineConfigDynamicsPace` element missing**
   - **File:Line**: `backend/public/dev-dashboard.html:5090`
   - **Expression**: `document.getElementById("engineConfigDynamicsPace").value = profile.pace || 50;`
   - **Error**: `TypeError: Cannot set property 'value' of null`
   - **Trigger**: Selecting dynamics profile if HTML element missing

7. **`engineConfigHookName` element missing**
   - **File:Line**: `backend/public/dev-dashboard.html:5255`
   - **Expression**: `document.getElementById("engineConfigHookName").value = hook.name || "";`
   - **Error**: `TypeError: Cannot set property 'value' of null`
   - **Trigger**: Editing hook if HTML element missing

### Calling Methods on Null

8. **`engineConfigUI.tabs` is empty NodeList, calling forEach**
   - **File:Line**: `backend/public/dev-dashboard.html:6043`
   - **Expression**: `engineConfigUI.tabs.forEach(tab => {`
   - **Error**: None (forEach on empty array is safe, but no handlers attached)
   - **Trigger**: If `engineConfigUI.tabs` is empty (shouldn't happen per analysis above)

9. **`engineConfigUI.loadBtn` is null**
   - **File:Line**: `backend/public/dev-dashboard.html:6072`
   - **Expression**: `engineConfigUI.loadBtn.addEventListener("click", loadEngineConfig);`
   - **Error**: `TypeError: Cannot read property 'addEventListener' of null`
   - **Trigger**: If `engineConfigLoadBtn` element missing from HTML

10. **`engineConfigUI.saveBtn` is null**
    - **File:Line**: `backend/public/dev-dashboard.html:6073`
    - **Expression**: `engineConfigUI.saveBtn.addEventListener("click", saveEngineConfig);`
    - **Error**: `TypeError: Cannot read property 'addEventListener' of null`
    - **Trigger**: If `engineConfigSaveBtn` element missing from HTML

### Additional Critical Exceptions

11. **`engineConfigUI.hooksTableBody` is null**
    - **File:Line**: `backend/public/dev-dashboard.html:5231`
    - **Expression**: `engineConfigUI.hooksTableBody.innerHTML = "";`
    - **Error**: `TypeError: Cannot set property 'innerHTML' of null`
    - **Trigger**: Loading hooks if HTML element missing

12. **`engineConfigUI.scoringProfilesList` is null**
    - **File:Line**: `backend/public/dev-dashboard.html:4643`
    - **Expression**: `engineConfigUI.scoringProfilesList.innerHTML = "";`
    - **Error**: `TypeError: Cannot set property 'innerHTML' of null`
    - **Trigger**: Rendering scoring tab if HTML element missing

---

## 4) SEED CORRECTNESS CLEANUP (SCHEMA TRUTH)

### PracticeMissionTemplate: Required vs Optional Fields

**Schema Location**: `backend/prisma/schema.prisma:191-223`

**REQUIRED Fields** (no `?` and no `@default`):
- `id`: `String @id @default(cuid())` - **Auto-generated** (not required in seed)
- `code`: `String @unique` - **REQUIRED**
- `title`: `String` - **REQUIRED**

**OPTIONAL Fields** (have `?` or `@default`):
- `description`: `String?` - **OPTIONAL**
- `timeLimitSec`: `Int @default(30)` - **OPTIONAL** (defaults to 30)
- `maxMessages`: `Int?` - **OPTIONAL**
- `active`: `Boolean @default(true)` - **OPTIONAL** (defaults to true)
- `createdAt`: `DateTime @default(now())` - **Auto-generated**
- `baseCoinsReward`: `Int @default(10)` - **OPTIONAL** (defaults to 10)
- `baseGemsReward`: `Int @default(0)` - **OPTIONAL** (defaults to 0)
- `baseXpReward`: `Int @default(50)` - **OPTIONAL** (defaults to 50)
- `categoryId`: `String?` - **OPTIONAL**
- `goalType`: `MissionGoalType?` - **OPTIONAL**
- `isVoiceSupported`: `Boolean @default(true)` - **OPTIONAL** (defaults to true)
- `laneIndex`: `Int @default(0)` - **OPTIONAL** (defaults to 0)
- `orderIndex`: `Int @default(0)` - **OPTIONAL** (defaults to 0)
- `personaId`: `String?` - **OPTIONAL**
- `wordLimit`: `Int?` - **OPTIONAL**
- `difficulty`: `MissionDifficulty @default(EASY)` - **OPTIONAL** (defaults to EASY)
- `aiContract`: `Json?` - **OPTIONAL** (but should be provided for valid mission)
- `aiStyleId`: `String?` - **OPTIONAL**
- `isAttractionSensitive`: `Boolean @default(false)` - **OPTIONAL** (defaults to false)
- `targetRomanticGender`: `Gender?` - **OPTIONAL**
- `moodConfigs`: `MissionMoodConfig?` - **OPTIONAL**

**Minimum Required for Seed**:
```typescript
{
  code: "SOCIAL_NEUTRAL_L1_M1",
  title: "Casual Conversation",
  // Optional but recommended:
  description: "...",
  aiContract: { missionConfigV1: {...} },
  isAttractionSensitive: false, // Explicit for neutral mission
}
```

### AiStyle: Required Fields + Defaults

**Schema Location**: `backend/prisma/schema.prisma:162-186`

**REQUIRED Fields** (no `?` and no `@default`):
- `id`: `String @id @default(cuid())` - **Auto-generated**
- `key`: `AiStyleKey @unique` - **REQUIRED** (enum: NEUTRAL, FLIRTY, PLAYFUL, CHALLENGING, WARM, COLD, SHY, DIRECT, JUDGMENTAL, CHAOTIC)
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

**OPTIONAL Fields** (have `?` or `@default`):
- `tags`: `String[] @default([])` - **OPTIONAL** (defaults to empty array)
- `fewShotExamples`: `Json?` - **OPTIONAL**
- `temperature`: `Float?` - **OPTIONAL**
- `topP`: `Float?` - **OPTIONAL**
- `isActive`: `Boolean @default(true)` - **OPTIONAL** (defaults to true)
- `createdAt`: `DateTime @default(now())` - **Auto-generated**
- `updatedAt`: `DateTime @updatedAt` - **Auto-generated**

### PromptHook: Required Fields + Defaults

**Schema Location**: `backend/prisma/schema.prisma:536-556`

**REQUIRED Fields** (no `?` and no `@default`):
- `id`: `String @id @default(cuid())` - **Auto-generated**
- `name`: `String` - **REQUIRED**
- `type`: `String` - **REQUIRED** (typically "POSITIVE", "NEGATIVE", "NEUTRAL")
- `textTemplate`: `String` - **REQUIRED**
- `conditionsJson`: `Json` - **REQUIRED** (can be `{}`)
- `category`: `String` - **REQUIRED**

**OPTIONAL Fields** (have `?` or `@default`):
- `tags`: `String[] @default([])` - **OPTIONAL** (defaults to empty array)
- `priority`: `Int @default(50)` - **OPTIONAL** (defaults to 50)
- `isEnabled`: `Boolean @default(true)` - **OPTIONAL** (defaults to true)
- `version`: `String @default("v1")` - **OPTIONAL** (defaults to "v1")
- `metaJson`: `Json?` - **OPTIONAL**
- `createdAt`: `DateTime @default(now())` - **Auto-generated**
- `updatedAt`: `DateTime @updatedAt` - **Auto-generated**

---

## CONCLUSIONS

### EngineConfig Tab Root Cause

**CORRECTED**: Previous claim about DOM timing was **SPECULATIVE**. Script is at end of body, so tabs are guaranteed to exist. The actual issue is likely:
- Missing `renderHooksTab()` function causing ReferenceError when Hooks tab is clicked
- This prevents tab switching from working properly

### renderHooksTab() Resolution

**CONFIRMED**: Function **DOES NOT EXIST**. This is a **CRITICAL BLOCKER**:
- Clicking "Hooks & Triggers" tab throws `ReferenceError`
- This breaks tab switching functionality
- Fix: Add `renderHooksTab()` function that calls `renderHooksTable()` or make it an alias

### Fatal JS Exceptions

**Top 10 Most Likely**:
1. `renderHooksTab()` missing → ReferenceError (CRITICAL)
2. `renderInsightsTab()` missing → ReferenceError (CRITICAL)
3. Missing tab content element → TypeError (if tabIdMap mismatch)
4-10. Missing form elements → TypeError (if HTML incomplete)

### Seed Correctness

**CORRECTED**: PracticeMissionTemplate only requires `code` and `title`. All other fields are optional (have defaults or `?`). Previous claim that many fields were "required" was **INCORRECT**.

---

## EXECUTE READY?

**NO** - Critical blockers identified:

1. **`renderHooksTab()` is missing** - Will throw ReferenceError when Hooks tab clicked
2. **`renderInsightsTab()` is missing** - Will throw ReferenceError when Insights tab clicked
3. **EngineConfig tab root cause unclear** - Need runtime verification (may not be DOM timing issue)

**Required Fixes Before Execution**:
1. Add `renderHooksTab()` function (can be alias to `renderHooksTable()` or wrapper)
2. Add `renderInsightsTab()` function (can be alias to `renderInsightsTable()` or wrapper)
3. Verify `engineConfigUI.tabs.length > 0` at runtime (add console.log or defensive check)

**After Fixes**: **YES** - Execute ready (assuming seed data structure is correct per schema)

