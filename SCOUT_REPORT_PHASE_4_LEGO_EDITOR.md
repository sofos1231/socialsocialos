# SCOUT REPORT — PHASE 4: LEGO Editor + Starter Seed Pack

**Date**: Phase 4 Readiness Assessment  
**Mode**: READ-ONLY SCOUT (no code changes)  
**Mission**: Produce court-proof evidence map for Phase 4 implementation readiness

---

## EXECUTIVE SUMMARY

**Status**: ❌ **NOT READY** — Critical gaps identified

**Critical Blockers**:
1. ❌ No `backend/docs/PHASE_4_SCOPE.md` exists (mandatory first deliverable)
2. ❌ Engine Config tabs not clickable (DOM timing/selector issue)
3. ❌ No structured MissionConfigV1 editors (only JSON textarea exists)
4. ❌ AI Styles admin may be broken (needs endpoint verification)
5. ❌ Persona admin may be broken (needs verification)
6. ❌ No structured DP Insights editor
7. ⚠️ Seed pack incomplete (missing starter missions/styles/insights/config)

---

## A. SCOPE DOCUMENT STATUS

### A1. Current State

**Status**: ❌ **FAIL**

**Evidence**:
- Searched: `**/PHASE_4*.md`, `backend/docs/**`
- Found: `PHASE_4_DEFENSE_REPORT.md`, `PHASE_4_SCOUT_REPORT.md` (in root)
- **MISSING**: `backend/docs/PHASE_4_SCOPE.md`

**Files Verified**:
```
backend/docs/
  - PHASE_2_SCOPE.md ✅ EXISTS
  - PHASE_3_SCOPE.md ✅ EXISTS
  - PHASE_4_SCOPE.md ❌ NOT FOUND
```

**Gap**: Mandatory scope authority document does not exist. Phase 4 cannot proceed without explicit IN SCOPE / OUT OF SCOPE boundaries.

---

## B. LEGO EDITOR STATUS — MissionConfigV1

### B1. Dynamics Editor

**Status**: ❌ **FAIL**

**Evidence**:

**Schema Location**:
```147:162:backend/src/modules/missions-admin/mission-config-v1.schema.ts
export interface MissionConfigV1Dynamics {
  mode: MissionMode; // CHAT vs REAL_LIFE
  locationTag: MissionLocationTag;
  hasPerMessageTimer: boolean; // whether a timer is active at all
  defaultEntryRoute: 'TEXT_CHAT' | 'VOICE_SIM';
  
  // Step 6.1: Dynamics tuning parameters (0-100)
  pace?: number | null; // Controls response speed and urgency (0=slow, 100=fast)
  emojiDensity?: number | null; // Controls emoji usage frequency (0=none, 100=heavy)
  flirtiveness?: number | null; // Controls flirtatious behavior level (0=platonic, 100=very flirty)
  hostility?: number | null; // Controls pushback/resistance level (0=friendly, 100=hostile)
  dryness?: number | null; // Controls humor style (0=warm, 100=dry/sarcastic)
  vulnerability?: number | null; // Controls openness and emotional depth (0=guarded, 100=open)
  escalationSpeed?: number | null; // Controls how quickly conversation escalates (0=slow, 100=fast)
  randomness?: number | null; // Controls unpredictability in responses (0=predictable, 100=chaotic)
}
```

**Runtime Usage**:
- Used in `AiChatService.buildSystemPrompt()` → builds dynamics instruction block
- See: `backend/src/modules/ai/providers/ai-chat.service.ts:129` (missionConfig.dynamics)

**Current Editor**: ❌ **NOT FOUND**
- Dev dashboard has JSON textarea only (`aiContractJsonTextarea`)
- No structured form for dynamics fields

**Gap**: No structured UI to edit dynamics without raw JSON.

---

### B2. Objective Editor

**Status**: ❌ **FAIL**

**Evidence**:

**Schema Location**:
```174:179:backend/src/modules/missions-admin/mission-config-v1.schema.ts
export interface MissionConfigV1Objective {
  kind: MissionObjectiveKind;
  userTitle: string; // shown in mission UI
  userDescription: string; // short explanation of what the user should achieve
  // We intentionally do NOT embed full AI contract here, only meta.
}
```

**Runtime Usage**:
- Used in `AiChatService.buildSystemPrompt()` → builds objective instruction block
- See: `backend/src/modules/practice/practice.service.ts:1303` (missionConfig.objective)

**Current Editor**: ❌ **NOT FOUND**
- Only JSON textarea exists

**Gap**: No structured form for objective.kind + fields.

---

### B3. State Policy Editor

**Status**: ❌ **FAIL**

**Evidence**:

**Schema Location**:
```201:221:backend/src/modules/missions-admin/mission-config-v1.schema.ts
export interface MissionConfigV1StatePolicy {
  maxMessages: number; // hard cap
  minMessagesBeforeEnd?: number | null;
  maxStrikes: number; // bad-move strikes
  timerSecondsPerMessage?: number | null;
  allowTimerExtension: boolean; // whether MORE_TIME powerup is allowed
  /** @deprecated Phase 3: Mission success/fail is now checklist-driven, not numeric-score-driven. This field is retained for backward compatibility only. */
  successScoreThreshold: number; // 0–100
  /** @deprecated Phase 3: Mission success/fail is now checklist-driven, not numeric-score-driven. This field is retained for backward compatibility only. */
  failScoreThreshold: number; // 0–100
  enableGateSequence: boolean;
  enableMoodCollapse: boolean;
  enableObjectiveAutoSuccess: boolean;
  allowedEndReasons: MissionEndReasonCode[]; // subset of the full enum
  endReasonPrecedence?: MissionEndReasonCode[] | null; // optional override; if missing, use global PRECEDENCE
  // Step 6.10: Feature toggles for AI layers (all default to true for backward compatibility)
  enableMicroDynamics?: boolean; // Default: true
  enableModifiers?: boolean; // Default: true
  enableArcDetection?: boolean; // Default: true
  enablePersonaDriftDetection?: boolean; // Default: true
}
```

**Runtime Usage**:
- `maxMessages` → used for progress calculation
- `timerSecondsPerMessage` → used for timer enforcement
- `allowedEndReasons` → filters end reasons
- `endReasonPrecedence` → overrides global precedence
- See: `backend/src/modules/practice/mission-config-runtime.ts:34` (endReasonPrecedenceResolved)

**Current Editor**: ❌ **NOT FOUND**

**Gap**: No structured form for statePolicy fields.

---

### B4. Response Architecture Editor

**Status**: ❌ **FAIL**

**Evidence**:

**Schema Location**:
```232:242:backend/src/modules/missions-admin/mission-config-v1.schema.ts
// Step 6.4: Response Architecture Configuration
export interface MissionConfigV1ResponseArchitecture {
  reflection?: number | null; // 0–1
  validation?: number | null; // 0–1
  emotionalMirroring?: number | null; // 0–1
  pushPullFactor?: number | null; // 0–1
  riskTaking?: number | null; // 0–1
  clarity?: number | null; // 0–1
  reasoningDepth?: number | null; // 0–1
  personaConsistency?: number | null; // 0–1
}
```

**Runtime Usage**:
- Used in `AiChatService.buildSystemPrompt()` → builds response architecture instruction block
- See: `backend/src/modules/practice/practice.service.ts:1302` (missionConfig.responseArchitecture)
- **Note**: Optional field, runtime gracefully handles null

**Current Editor**: ❌ **NOT FOUND**

**Gap**: No structured form for responseArchitecture.

---

### B5. Scoring Profile Editor (EngineConfig)

**Status**: ✅ **PASS** (partial)

**Evidence**:

**Schema Location**:
```7:104:backend/src/modules/engine-config/engine-config.types.ts
export interface EngineScoringProfile {
  code: string; // "DEFAULT_DATING_V1"
  name: string;
  description?: string;
  active: boolean;

  // Trait weights for charismaIndex calculation
  traitWeights: {
    confidence: number; // 0-1, sum should be ~1.0
    clarity: number;
    humor: number;
    tensionControl: number;
    emotionalWarmth: number;
    dominance: number;
  };

  // Base scoring thresholds
  lengthThresholds: { ... };
  punctuationBonuses: { ... };
  positionBonuses: number[];
  rarityThresholds: { ... };
  xpMultipliers: { ... };
  coinsMultipliers: { ... };
  // ... more fields
}
```

**Current Editor**: ✅ **EXISTS** (structured UI)

**UI Location**:
```4640:4838:backend/public/dev-dashboard.html
function renderScoringTab() {
  if (!engineConfigState.config) return;
  const profiles = engineConfigState.config.scoringProfiles || [];
  engineConfigUI.scoringProfilesList.innerHTML = "";
  for (const profile of profiles) {
    // ... renders structured list + editor form
  }
}
```

**Status**: ✅ Editor exists with full structured form (weights, thresholds, bonuses, multipliers).

---

### B6. Mood Policy Editor (EngineConfig)

**Status**: ✅ **PASS** (partial)

**Evidence**:

**Schema Location**:
```252:271:backend/src/modules/engine-config/engine-config.types.ts
export interface EngineMoodConfig {
  emaAlpha: number; // 0.35
  
  moodStateThresholds: {
    flow: { minScore: 80; minFlow: 70; maxTension: 40; };
    tense: { minTension: 70; orLowScore: { maxScore: 50; minTension: 50; }; };
    warm: { minScore: 60; maxScore: 80; minWarmth: 50; };
    cold: { maxScore: 30; maxWarmth: 40; };
  };
  
  bands: Array<{
    key: string; // "CRITICAL", "LOW", "OK", "HIGH"
    minPercent: number;
    maxPercent: number;
  }>;
  
  decayPerTurn?: number;
  boostOnGoodMessage?: number;
  penaltyOnBadMessage?: number;
}
```

**Current Editor**: ✅ **EXISTS** (structured UI)

**UI Location**: `backend/public/dev-dashboard.html` — "Mood & State Policy" tab in Engine Config section

**Status**: ✅ Editor exists.

---

### B7. Difficulty Editor

**Status**: ❌ **FAIL**

**Evidence**:

**Schema Location**:
```181:194:backend/src/modules/missions-admin/mission-config-v1.schema.ts
export interface MissionConfigV1Difficulty {
  level: MissionDifficulty; // from @prisma/client
  recommendedMaxMessages?: number | null;
  recommendedSuccessScore?: number | null; // 0–100
  recommendedFailScore?: number | null; // 0–100
  
  // Step 6.2: Difficulty tuning parameters (0-100)
  strictness?: number | null; // How strictly to grade responses (0=lenient, 100=strict)
  ambiguityTolerance?: number | null; // How much ambiguity is acceptable (0=no tolerance, 100=high tolerance)
  emotionalPenalty?: number | null; // Penalty for emotional missteps (0=none, 100=severe)
  bonusForCleverness?: number | null; // Bonus for clever/witty responses (0=none, 100=high bonus)
  failThreshold?: number | null; // Score below which mission fails (0-100, overrides statePolicy if set)
  recoveryDifficulty?: number | null; // How hard it is to recover from mistakes (0=easy, 100=hard)
}
```

**Current Editor**: ❌ **NOT FOUND**
- Mission form has `difficultySelect` (EASY/MEDIUM/HARD/ELITE dropdown)
- **MISSING**: Structured editor for tuning parameters (strictness, tolerance, penalties, etc.)

**Gap**: Only level selector exists; no structured editor for difficulty tuning parameters.

---

### B8. AI Styles Editor

**Status**: ⚠️ **PARTIAL** (broken)

**Evidence**:

**Backend Endpoint**:
```74:146:backend/src/modules/ai-styles/ai-styles-admin.controller.ts
@Controller('admin/ai-styles')
export class AiStylesAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('activeOnly') activeOnly?: string) { ... }

  @Get(':id')
  async get(@Param('id') id: string) { ... }

  @Post()
  async create(@Body() body: any) { ... }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) { ... }
}
```

**Frontend UI**:
```5780:5906:backend/public/dev-dashboard.html
// AI Styles Admin state
const aiStylesAdminState = {
  styles: [],
  selectedStyleId: null,
};

// AI Styles Admin functions
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

**Wiring**:
```6015:6026:backend/public/dev-dashboard.html
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
  // ...
}
```

**Boot Sequence**:
```6312:6319:backend/public/dev-dashboard.html
function boot() {
  wireMissions();
  wirePracticeHub();
  wireEngineConfig(); // Step 7.2: Add Engine Config wiring
  loadEngineConfig(); // Auto-load engine config on startup
  wireAdminSections(); // Wire AI Styles and Personas admin
}
```

**Status**: ⚠️ **PARTIAL**
- Endpoint exists ✅
- UI exists ✅
- Wiring exists ✅
- **BUT**: User reports "AI styles admin broken" — requires verification:
  - Endpoint may return 404/500
  - UI may fail to render table
  - JS errors may suppress errors
  - Route mismatch (e.g., `/admin/ai-styles` vs `/v1/admin/ai-styles`)

**Gap**: Needs investigation to identify exact failure mode.

---

## C. DP INSIGHTS EDITOR STATUS

**Status**: ❌ **FAIL**

**Evidence**:

**Insight Catalog Structure**:
```187:200:backend/src/modules/insights/insights.types.ts
export interface InsightTemplate {
  id: string; // Stable unique ID
  kind: InsightKind;
  category: string;
  weight: number; // For weighted selection
  cooldownMissions: number; // 3-5 typical
  title: string;
  body: string;
  requires?: {
    gateKey?: string;
    hookKey?: string;
    patternKey?: string;
  };
}
```

**Catalog Implementation**:
```10:424:backend/src/modules/insights/catalog/insight-catalog.v1.ts
export class InsightCatalog {
  private templates: Map<string, InsightTemplate> = new Map();

  constructor() {
    this.initializeCatalog();
  }

  // Methods: get(), getByKind(), getGateInsights(), getHookInsights(), getPatternInsights(), getGeneralTips()
  // ...
}
```

**Hook Schema** (for positive/negative hooks):
```101:127:backend/src/modules/prompts/prompts.types.ts
export interface PromptHookPayload {
  id: string;
  name: string;
  type: PromptType; // POSITIVE / NEGATIVE / NEUTRAL
  textTemplate: string;
  conditions: PromptHookConditions;
  category: string;
  tags: string[];
  priority: number; // 1-100
  isEnabled: boolean;
  // ...
  meta?: {
    cooldownSeconds?: number;
    maxTriggersPerSession?: number;
    description?: string;
  };
}
```

**Admin Endpoint**:
```9:42:backend/src/modules/insights/insights-admin.controller.ts
@Controller('admin/insights')
export class InsightsAdminController {
  // Minimal implementation - needs expansion
}
```

**Engine Config Dashboard Tab**:
```911:912:backend/public/dev-dashboard.html
<button class="engineConfigTab" data-tab="insights" style="...">Insights Catalog</button>
```

**UI Rendering**:
```4620:4621:backend/public/dev-dashboard.html
} else if (engineConfigState.currentTab === 'insights') {
  renderInsightsTab();
}
```

**Current Editor**: ❌ **NOT FOUND**
- Insights tab exists but no structured editor for:
  - Insight prompts/templates
  - Positive hooks
  - Negative hooks
  - Trigger rules / priority / suppression / cooldowns

**Gap**: No structured UI to edit DP insights content. Catalog is hard-coded in TypeScript.

---

## D. VALIDATION & SAFETY STATUS

**Status**: ✅ **PASS** (partial)

**Evidence**:

**MissionConfigV1 Validation**:
```364:985:backend/src/modules/missions-admin/mission-config-v1.schema.ts
export function validateMissionConfigV1Shape(
  aiContract: any,
): MissionConfigValidationError[] {
  const errors: MissionConfigValidationError[] = [];
  // ... comprehensive validation for all fields
  // Returns array of { path, message }
}
```

**Error Format**:
```278:281:backend/src/modules/missions-admin/mission-config-v1.schema.ts
export interface MissionConfigValidationError {
  path: string
  message: string;
}
```

**Validation Usage**:
```1736:1792:backend/src/modules/missions-admin/missions-admin.service.ts
async validateConfig(aiContractRaw: any) {
  // Sanitize aiContract
  const aiContract = this.sanitizeAiContract(aiContractRaw);
  // Coerce to wrapped format
  const wrappedAiContract = this.coerceAiContractToWrapped(aiContract);
  // Validate structure
  const validationErrors = validateMissionConfigV1Shape(wrappedAiContract);
  if (validationErrors.length > 0) {
    throw new BadRequestException({
      code: 'VALIDATION',
      message: 'Invalid aiContract.missionConfigV1',
      details: validationErrors,
    });
  }
  // ...
}
```

**Status**: ✅ Per-layer validation exists for MissionConfigV1.

**Missing**:
- ❌ Cross-layer validation (compatibility between layers)
- ❌ EngineConfig validation (no explicit schema validation found)
- ❌ AI Styles validation (only basic type checks in controller)
- ❌ Hooks/Insights validation (no schema validation found)

**Gap**: Cross-layer and EngineConfig validation missing.

---

## E. VERSIONING & BACKWARD COMPATIBILITY STATUS

**Status**: ✅ **PASS**

**Evidence**:

**MissionConfigV1 Versioning**:
```256:272:backend/src/modules/missions-admin/mission-config-v1.schema.ts
export interface MissionConfigV1 {
  version: 1;
  dynamics: MissionConfigV1Dynamics;
  objective: MissionConfigV1Objective;
  difficulty: MissionConfigV1Difficulty;
  style: MissionConfigV1Style;
  statePolicy: MissionConfigV1StatePolicy;
  // Step 6.3: Openings layer (optional for backward compatibility)
  openings?: MissionConfigV1Openings | null;
  // Step 6.4: Response architecture (optional for backward compatibility)
  responseArchitecture?: MissionConfigV1ResponseArchitecture | null;
  // Step 6.9: AI runtime profile (optional for backward compatibility)
  aiRuntimeProfile?: MissionConfigV1AiRuntimeProfile | null;
  // Step 7.2: Engine config profile references (optional for backward compatibility)
  scoringProfileCode?: string | null;
  dynamicsProfileCode?: string | null;
}
```

**Normalization** (handles legacy):
```67:198:backend/src/modules/practice/mission-config-runtime.ts
export function normalizeMissionConfigV1(
  aiContractUnknown: unknown,
): NormalizeResult {
  // Phase 2: Accept raw MissionConfigV1 format (wrap it internally)
  let wrappedContract: any;
  if ('missionConfigV1' in aiContractUnknown) {
    // Already wrapped
    wrappedContract = aiContractUnknown;
  } else {
    // Check if it's raw MissionConfigV1 (has version:1 and required fields)
    const raw = aiContractUnknown as any;
    if (
      raw.version === 1 &&
      typeof raw.dynamics === 'object' &&
      // ... checks all required fields
    ) {
      // Wrap it internally
      wrappedContract = { missionConfigV1: raw };
    } else {
      return { ok: false, reason: 'missing' };
    }
  }
  // ... validation and normalization
}
```

**EngineConfig Versioning**: ⚠️ **UNKNOWN**
- No explicit version field found in `EngineConfigJson`
- Database model: `EngineConfig.key` (e.g., "GLOBAL_V1") suggests versioning via key

**Status**: ✅ MissionConfigV1 versioning and backward compatibility handled. EngineConfig versioning unclear.

---

## F. STARTER SEED PACK STATUS

**Status**: ⚠️ **PARTIAL**

**Evidence**:

**Seed Script Location**:
```1:461:backend/prisma/seed.ts
// backend/prisma/seed.ts
import { PrismaClient, MissionDifficulty, MissionGoalType, Gender, AttractionPath, AiStyleKey } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  buildOpenersMissionConfigV1,
  buildFlirtingMissionConfigV1,
} from '../src/modules/missions-admin/mission-config-v1.builders';

async function main() {
  // Creates demo user, categories, personas, AI styles, missions, EngineConfig
  // ...
}
```

**Current Seeds**:

**Missions**: ⚠️ **PARTIAL**
- `OPENERS_L1_M1` ✅ (Openers mission)
- `FLIRTING_L2_M1` ✅ (Flirting mission)
- **MISSING**: Neutral/social mission (only 2 of 3 required)

**AI Styles**: ❌ **UNKNOWN**
- Seed script does NOT create AI styles explicitly
- Only references `AiStyleKey` enum import
- **Gap**: No starter AI styles seeded

**Personas**: ✅ **PASS**
```118:184:backend/prisma/seed.ts
const [maya, noa, dan, omer] = await Promise.all([
  prisma.aiPersona.upsert({
    where: { code: 'MAYA_PLAYFUL' },
    // ...
  }),
  // ... 3 more personas
]);
```

**EngineConfig**: ✅ **PASS**
```440:454:backend/prisma/seed.ts
const { EngineConfigService } = await import('../src/modules/engine-config/engine-config.service');
const engineConfigService = new EngineConfigService(prisma);
const defaultConfig = engineConfigService.getDefaultConfig();
await prisma.engineConfig.upsert({
  where: { key: 'GLOBAL_V1' },
  create: {
    key: 'GLOBAL_V1',
    configJson: defaultConfig as any,
  },
  update: {
    configJson: defaultConfig as any,
  },
});
```

**Insights/Hooks**: ❌ **NOT FOUND**
- No seed script for insights catalog
- No seed script for hooks
- Catalog is hard-coded in `insight-catalog.v1.ts`

**Gap**:
- ❌ Missing neutral/social mission (need 3 total)
- ❌ Missing AI styles seed (need at least 3: neutral/friendly/challenging)
- ❌ Missing insights/hooks seed (need starter pack)

---

## G. BROKEN TABS INVESTIGATION

### G1. Engine Config Tabs Not Clickable

**Status**: ⚠️ **IDENTIFIED ISSUE**

**Evidence**:

**Tab Initialization**:
```4499:4503:backend/public/dev-dashboard.html
const engineConfigUI = {
  loadBtn: document.getElementById("engineConfigLoadBtn"),
  saveBtn: document.getElementById("engineConfigSaveBtn"),
  tabs: document.querySelectorAll(".engineConfigTab"),
  tabContents: document.querySelectorAll(".engineConfigTabContent"),
  // ...
};
```

**Tab Wiring**:
```6041:6074:backend/public/dev-dashboard.html
function wireEngineConfig() {
  // Tab switching
  engineConfigUI.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const tabName = tab.getAttribute("data-tab");
      engineConfigState.currentTab = tabName;
      // ... tab switching logic
      renderEngineConfigTabs();
    });
  });
  
  // Set first tab as active
  if (engineConfigUI.tabs.length > 0) {
    engineConfigUI.tabs[0].click();
  }
  // ...
}
```

**Boot Sequence**:
```6313:6319:backend/public/dev-dashboard.html
function boot() {
  wireMissions();
  wirePracticeHub();
  wireEngineConfig(); // Step 7.2: Add Engine Config wiring
  loadEngineConfig(); // Auto-load engine config on startup
  wireAdminSections(); // Wire AI Styles and Personas admin
}
```

**Problem Identified**:
1. `engineConfigUI` is initialized at script parse time (line 4499)
2. `querySelectorAll(".engineConfigTab")` may return empty NodeList if DOM not ready
3. `wireEngineConfig()` is called in `boot()` which runs on `DOMContentLoaded`
4. **BUT**: `engineConfigUI` object is created BEFORE `boot()` runs, so `tabs` may be empty

**Root Cause**: **DOM Timing Issue**
- `engineConfigUI.tabs` is populated before DOM is ready
- `querySelectorAll` returns empty NodeList
- `wireEngineConfig()` tries to iterate over empty array → no listeners attached
- Tab click handler never fires

**Fix Required**: Move `engineConfigUI` initialization inside `wireEngineConfig()` or after DOM ready.

---

### G2. AI Styles Admin Broken

**Status**: ⚠️ **NEEDS VERIFICATION**

**Potential Issues**:
1. **Route Mismatch**: Frontend calls `/admin/ai-styles`, backend expects `/v1/admin/ai-styles`
2. **Endpoint Returns 404**: Controller may not be registered in module
3. **CORS/API Base**: `apiFetch()` may use wrong base URL
4. **JS Error Suppressed**: Try/catch may hide real error

**Needs Investigation**: Check browser console for exact error, verify endpoint registration.

---

### G3. Persona Admin Broken

**Status**: ⚠️ **NEEDS VERIFICATION**

**Similar Issues as AI Styles**:
- Same wiring pattern
- Same potential route mismatch
- Same potential endpoint registration issue

**Needs Investigation**: Check browser console for exact error.

---

## H. GAP LIST (EXACT)

| Requirement | Status | Evidence | Exact Files to Create/Change | Minimal Fix |
|-------------|--------|----------|------------------------------|-------------|
| **A) Scope Document** | ❌ FAIL | `backend/docs/PHASE_4_SCOPE.md` missing | CREATE: `backend/docs/PHASE_4_SCOPE.md` | Document with IN SCOPE / OUT OF SCOPE, editor list, config-only principle |
| **B1) Dynamics Editor** | ❌ FAIL | Only JSON textarea exists | CREATE: Structured form in `backend/public/dev-dashboard.html` | Form fields for mode, locationTag, timer, entryRoute, tuning params (0-100 sliders) |
| **B2) Objective Editor** | ❌ FAIL | Only JSON textarea exists | CREATE: Structured form in `backend/public/dev-dashboard.html` | Dropdown for kind, text inputs for userTitle/userDescription |
| **B3) State Policy Editor** | ❌ FAIL | Only JSON textarea exists | CREATE: Structured form in `backend/public/dev-dashboard.html` | Form for maxMessages, timerSecondsPerMessage, strikes, flags, endReason arrays |
| **B4) Response Architecture Editor** | ❌ FAIL | Only JSON textarea exists | CREATE: Structured form in `backend/public/dev-dashboard.html` | Sliders (0-1) for reflection, validation, mirroring, pushPull, risk, clarity, reasoning, consistency |
| **B5) Scoring Profile Editor** | ✅ PASS | Editor exists | N/A | Already implemented |
| **B6) Mood Policy Editor** | ✅ PASS | Editor exists | N/A | Already implemented |
| **B7) Difficulty Editor** | ❌ FAIL | Only level dropdown exists | CREATE: Structured form in `backend/public/dev-dashboard.html` | Sliders for strictness, tolerance, penalties, recovery (0-100) |
| **B8) AI Styles Editor Fix** | ⚠️ PARTIAL | UI exists but broken | FIX: `backend/public/dev-dashboard.html` + verify endpoint | Fix DOM timing, verify route `/v1/admin/ai-styles`, add error logging |
| **C) DP Insights Editor** | ❌ FAIL | Catalog is hard-coded | CREATE: Structured editor + admin endpoint | UI for insight templates, hooks (positive/negative), triggers, priority, cooldowns |
| **D) Cross-Layer Validation** | ❌ FAIL | Only per-layer exists | CREATE: `backend/src/modules/missions-admin/mission-config-v1.validation.ts` | Validate compatibility (e.g., difficulty.strictness vs dynamics.pace) |
| **E) EngineConfig Versioning** | ⚠️ UNKNOWN | No explicit version field | ADD: `version: number` to `EngineConfigJson` | Add version field, migration script |
| **F) Starter Seed Pack** | ⚠️ PARTIAL | Missing missions/styles/insights | UPDATE: `backend/prisma/seed.ts` | Add neutral mission, 3 AI styles, insights/hooks seed |
| **G1) Engine Config Tabs Fix** | ⚠️ BROKEN | DOM timing issue | FIX: `backend/public/dev-dashboard.html:4499` | Move `engineConfigUI` init inside `wireEngineConfig()` |
| **G2) AI Styles Admin Fix** | ⚠️ BROKEN | Needs verification | FIX: Route/endpoint registration | Verify `/v1/admin/ai-styles` route, check module registration |
| **G3) Persona Admin Fix** | ⚠️ BROKEN | Needs verification | FIX: Route/endpoint registration | Verify `/v1/admin/personas` route, check module registration |

---

## I. PROPOSED PHASE 4 BREAKDOWN

### Part 4.1: Scope Doc + Critical Fixes

**Definition of Done**:
- [ ] `backend/docs/PHASE_4_SCOPE.md` created with explicit IN/OUT scope
- [ ] Engine Config tabs clickable (DOM timing fix)
- [ ] AI Styles admin working (route/endpoint verification)
- [ ] Persona admin working (route/endpoint verification)

**Files Impacted**:
- CREATE: `backend/docs/PHASE_4_SCOPE.md`
- FIX: `backend/public/dev-dashboard.html` (engineConfigUI initialization)
- VERIFY: `backend/src/modules/ai-styles/ai-styles.module.ts` (controller registration)
- VERIFY: `backend/src/modules/missions-admin/missions-admin.personas.controller.ts` (route registration)

**Risks**: Low — fixes existing broken functionality

---

### Part 4.2: MissionConfigV1 LEGO Editor (Core Layers)

**Definition of Done**:
- [ ] Dynamics Editor: structured form (mode, locationTag, timer, entryRoute, 8 tuning sliders)
- [ ] Objective Editor: dropdown (kind) + text inputs (userTitle, userDescription)
- [ ] State Policy Editor: form (maxMessages, timerSecondsPerMessage, strikes, flags, endReason arrays)
- [ ] Response Architecture Editor: 8 sliders (0-1) for all fields
- [ ] Difficulty Editor: level dropdown + 6 tuning sliders (strictness, tolerance, etc.)
- [ ] All editors save to `aiContractJsonTextarea` as JSON (maintain compatibility)
- [ ] Validation on save (per-layer)

**Files Impacted**:
- CREATE: `backend/public/dev-dashboard.html` (structured forms)
- ADD: JS functions to sync form → JSON, JSON → form
- ADD: Validation calls on save

**Risks**: Medium — must maintain JSON textarea compatibility, form ↔ JSON sync complexity

---

### Part 4.3: EngineConfig Editors Completion

**Definition of Done**:
- [ ] Scoring Profile Editor: ✅ Already exists (no changes)
- [ ] Mood Policy Editor: ✅ Already exists (no changes)
- [ ] Dynamics Profiles Editor: ✅ Already exists (no changes)
- [ ] Gates Editor: ✅ Already exists (no changes)
- [ ] Hooks Editor: ✅ Already exists (no changes)
- [ ] Difficulty Profiles: ❌ **MISSING** — add if required (check if difficulty profiles exist in EngineConfig)

**Files Impacted**:
- VERIFY: All EngineConfig tabs functional
- ADD: Difficulty profiles editor if schema requires it

**Risks**: Low — most editors already exist

---

### Part 4.4: AI Styles Editor Fix + Structured UI

**Definition of Done**:
- [ ] AI Styles admin tab clickable
- [ ] Load/Save endpoints working
- [ ] Structured form for all AI Style fields:
  - Basic: key, name, description, active
  - Prompts: stylePrompt, forbiddenBehavior
  - Tags: tags array input
  - Examples: fewShotExamples (JSON editor or structured)
  - Parameters: maxChars, maxLines, questionRate, emojiRate, initiative, warmth, judgment, flirtTension, formality
  - Model: temperature, topP
- [ ] Validation on save

**Files Impacted**:
- FIX: `backend/public/dev-dashboard.html` (AI Styles admin section)
- VERIFY: `backend/src/modules/ai-styles/ai-styles-admin.controller.ts` (all fields handled)
- ADD: Form validation in frontend

**Risks**: Medium — endpoint may need field additions

---

### Part 4.5: DP Insights Editor

**Definition of Done**:
- [ ] Insights Catalog Editor: CRUD for insight templates
  - Fields: id, kind, category, weight, cooldownMissions, title, body, requires (gateKey/hookKey/patternKey)
- [ ] Hooks Editor: CRUD for positive/negative hooks
  - Fields: id, name, type, textTemplate, conditions, category, tags, priority, isEnabled, meta (cooldown, maxTriggers)
- [ ] Admin endpoints: `/admin/insights/templates`, `/admin/hooks`
- [ ] Structured UI in Engine Config "Insights Catalog" tab

**Files Impacted**:
- CREATE: `backend/src/modules/insights/insights-admin.controller.ts` (expand existing)
- CREATE: `backend/src/modules/prompts/prompts-admin.controller.ts` (if missing)
- CREATE: `backend/public/dev-dashboard.html` (structured editors)
- MIGRATE: `backend/src/modules/insights/catalog/insight-catalog.v1.ts` → database-backed

**Risks**: High — catalog is hard-coded, needs database migration

---

### Part 4.6: Validation & Safety

**Definition of Done**:
- [ ] Cross-layer validation: compatibility checks (e.g., difficulty.strictness vs dynamics.pace)
- [ ] EngineConfig validation: schema validation on save
- [ ] AI Styles validation: schema validation on save
- [ ] Hooks/Insights validation: schema validation on save
- [ ] Structured error reporting: `{ code, message, details[] }` consistent with Phase 2/3
- [ ] No silent coercion: all validation errors surfaced to UI

**Files Impacted**:
- CREATE: `backend/src/modules/missions-admin/mission-config-v1.validation.ts` (cross-layer)
- CREATE: `backend/src/modules/engine-config/engine-config.validation.ts`
- UPDATE: All admin controllers to return structured errors

**Risks**: Medium — must ensure backward compatibility

---

### Part 4.7: Versioning & Backward Compatibility

**Definition of Done**:
- [ ] EngineConfig versioning: add `version: number` to `EngineConfigJson`
- [ ] Migration script: update existing EngineConfig records with version
- [ ] Legacy mission loading: verify `normalizeMissionConfigV1()` handles all legacy formats
- [ ] Upgrade path: document how to upgrade legacy configs
- [ ] Block incompatible versions: clear error message if version mismatch

**Files Impacted**:
- UPDATE: `backend/src/modules/engine-config/engine-config.types.ts` (add version)
- CREATE: `backend/prisma/migrations/XXXX_add_engine_config_version.sql`
- CREATE: `backend/scripts/migrate-engine-config-version.ts`
- UPDATE: `backend/src/modules/practice/mission-config-runtime.ts` (version checks)

**Risks**: Low — mostly documentation and migration

---

### Part 4.8: Starter Seed Pack

**Definition of Done**:
- [ ] At least 3 missions:
  - ✅ Openers (exists)
  - ✅ Flirting (exists)
  - ❌ Neutral/social (CREATE)
- [ ] Starter AI styles (at least 3):
  - ❌ Neutral (CREATE)
  - ❌ Friendly (CREATE)
  - ❌ Challenging (CREATE)
- [ ] Starter insights pack:
  - ❌ Positive hooks (at least 5) (CREATE)
  - ❌ Negative hooks (at least 5) (CREATE)
  - ❌ Insight templates (at least 10) (CREATE)
- [ ] Starter scoring + mood + difficulty profiles: ✅ Already seeded (EngineConfig)

**Files Impacted**:
- UPDATE: `backend/prisma/seed.ts` (add missions, AI styles, insights, hooks)
- CREATE: `backend/scripts/seed-insights-hooks.ts` (if separate)

**Risks**: Low — seed data only

---

## J. ACCEPTANCE TESTS (MANUAL)

### Test 4.1: Scope Doc + Critical Fixes
- [ ] Navigate to `backend/docs/PHASE_4_SCOPE.md` → file exists, contains IN SCOPE / OUT OF SCOPE
- [ ] Open dev dashboard → Engine Config tabs clickable
- [ ] Click "AI Styles" tab → loads styles table
- [ ] Click "Personas" tab → loads personas table

### Test 4.2: MissionConfigV1 LEGO Editor
- [ ] Open dev dashboard → select mission
- [ ] Click "Dynamics" editor → structured form appears
- [ ] Edit pace slider → JSON updates automatically
- [ ] Edit objective kind dropdown → JSON updates
- [ ] Edit statePolicy maxMessages → JSON updates
- [ ] Edit responseArchitecture reflection slider → JSON updates
- [ ] Edit difficulty strictness slider → JSON updates
- [ ] Click "Save Mission" → validation runs, errors shown if invalid

### Test 4.3: EngineConfig Editors
- [ ] Open Engine Config → all tabs clickable
- [ ] Edit scoring profile → save → reload → changes persist
- [ ] Edit mood policy → save → reload → changes persist
- [ ] Edit dynamics profile → save → reload → changes persist

### Test 4.4: AI Styles Editor
- [ ] Open AI Styles admin → table loads
- [ ] Click "Add Style" → form appears
- [ ] Fill all fields → click "Save" → style created
- [ ] Click "Edit" → form populates → modify → save → changes persist

### Test 4.5: DP Insights Editor
- [ ] Open Engine Config → "Insights Catalog" tab
- [ ] Click "Add Insight" → form appears
- [ ] Fill fields (kind, category, title, body, requires) → save → insight created
- [ ] Click "Add Hook" → form appears
- [ ] Fill fields (type, textTemplate, conditions, priority) → save → hook created
- [ ] Start mission → insights/hooks trigger correctly

### Test 4.6: Validation
- [ ] Edit mission config → set invalid value (e.g., pace = 150) → save → error appears
- [ ] Edit engine config → set invalid value → save → error appears
- [ ] Edit AI style → set invalid value → save → error appears

### Test 4.7: Seed Pack
- [ ] Run `npx prisma db seed`
- [ ] Verify 3 missions exist (Openers, Flirting, Neutral)
- [ ] Verify 3 AI styles exist (Neutral, Friendly, Challenging)
- [ ] Verify insights/hooks exist in database
- [ ] Start mission → system uses seeded data

---

## K. SCOPE GUARD (OUT OF SCOPE)

**Explicit OUT OF SCOPE for Phase 4**:

1. ❌ **Runtime Logic Refactors**: No changes to how MissionConfigV1 is consumed at runtime (unless strictly required for editor compatibility)
2. ❌ **Mobile App Changes**: No frontend mobile app updates
3. ❌ **Advanced Features**: No AI-powered config suggestions, no config templates marketplace
4. ❌ **Import/Export**: No bulk import/export of configs (unless trivial JSON export)
5. ❌ **Config History/Versioning UI**: No UI for viewing config history (versioning exists but no UI)
6. ❌ **Permissions/RBAC**: No admin permissions system (assume single admin user)
7. ❌ **Config Testing**: No "test config" feature (editors are for configuration only)
8. ❌ **Performance Optimization**: No optimization of config loading/rendering (unless blocking)

**Phase 5 Features** (explicitly NOT in Phase 4):
- Config templates library
- AI-powered config suggestions
- Bulk operations (import/export)
- Config diff/merge tools
- Advanced validation rules engine
- Config performance profiling

---

## L. TOP 10 CRITICAL FINDINGS (VERBATIM)

### 1. Missing Scope Document
```
FILE: backend/docs/PHASE_4_SCOPE.md
STATUS: NOT FOUND
IMPACT: BLOCKER - Phase 4 cannot start without explicit scope boundaries
```

### 2. Engine Config Tabs DOM Timing
```4499:4503:backend/public/dev-dashboard.html
const engineConfigUI = {
  tabs: document.querySelectorAll(".engineConfigTab"),
  // ...
};
// Problem: Initialized before DOM ready → empty NodeList
```

### 3. No Structured MissionConfigV1 Editors
```
FILE: backend/public/dev-dashboard.html
STATUS: Only JSON textarea exists (aiContractJsonTextarea)
MISSING: Structured forms for dynamics, objective, statePolicy, responseArchitecture, difficulty
```

### 4. AI Styles Admin Broken
```6015:6026:backend/public/dev-dashboard.html
function wireAdminSections() {
  // Wiring exists but may fail due to:
  // 1. Route mismatch (/admin/ai-styles vs /v1/admin/ai-styles)
  // 2. Endpoint not registered
  // 3. JS error suppressed
}
```

### 5. DP Insights Catalog Hard-Coded
```10:424:backend/src/modules/insights/catalog/insight-catalog.v1.ts
export class InsightCatalog {
  private templates: Map<string, InsightTemplate> = new Map();
  // Problem: Templates hard-coded in TypeScript, no database-backed editor
}
```

### 6. Missing Cross-Layer Validation
```
FILE: backend/src/modules/missions-admin/mission-config-v1.validation.ts
STATUS: NOT FOUND
MISSING: Compatibility checks (e.g., difficulty.strictness vs dynamics.pace)
```

### 7. Missing Starter Seed Pack
```1:461:backend/prisma/seed.ts
// MISSING:
// - Neutral/social mission (only 2 of 3)
// - AI styles seed (none created)
// - Insights/hooks seed (catalog is hard-coded)
```

### 8. Difficulty Editor Incomplete
```
FILE: backend/public/dev-dashboard.html
STATUS: Only level dropdown exists
MISSING: Structured editor for tuning parameters (strictness, tolerance, penalties, recovery)
```

### 9. EngineConfig Versioning Unclear
```
FILE: backend/src/modules/engine-config/engine-config.types.ts
STATUS: No explicit version field
PROBLEM: Versioning implied via key ("GLOBAL_V1") but no schema-level version
```

### 10. Response Architecture Runtime Usage
```232:242:backend/src/modules/missions-admin/mission-config-v1.schema.ts
export interface MissionConfigV1ResponseArchitecture {
  reflection?: number | null; // 0–1
  // ... 7 more optional fields
}
// Status: Used in runtime (buildSystemPrompt), but optional
// Note: Runtime gracefully handles null, editor still needed
```

---

## M. CONCLUSION

**Phase 4 Readiness**: ❌ **NOT READY**

**Critical Blockers**: 3
1. Missing scope document
2. Engine Config tabs broken
3. No structured MissionConfigV1 editors

**Major Gaps**: 7
1. AI Styles admin broken
2. Persona admin broken
3. DP Insights editor missing
4. Cross-layer validation missing
5. Starter seed pack incomplete
6. Difficulty editor incomplete
7. EngineConfig versioning unclear

**Estimated Effort**:
- Part 4.1 (Scope + Fixes): 1-2 days
- Part 4.2 (MissionConfigV1 Editors): 5-7 days
- Part 4.3 (EngineConfig Completion): 1-2 days
- Part 4.4 (AI Styles Fix): 2-3 days
- Part 4.5 (DP Insights Editor): 5-7 days
- Part 4.6 (Validation): 3-4 days
- Part 4.7 (Versioning): 1-2 days
- Part 4.8 (Seed Pack): 2-3 days

**Total**: ~20-30 days (assuming single developer)

**Recommendation**: Start with Part 4.1 (scope doc + critical fixes) before proceeding to editor implementation.

---

**END OF SCOUT REPORT**


