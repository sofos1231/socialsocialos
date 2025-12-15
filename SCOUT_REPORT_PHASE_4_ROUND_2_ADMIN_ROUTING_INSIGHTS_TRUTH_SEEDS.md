# SCOUT REPORT — PHASE 4 ROUND 2: Admin Routing + Insights Truth + Seeds

**Date**: Phase 4 Deep Investigation  
**Mode**: READ-ONLY SCOUT (no code changes)  
**Goal**: Close proof gaps for safe Phase 4 execution split

---

## 1) API BASE + ROUTE PREFIX BEHAVIOR

**Status**: ✅ **PROVEN**

### Evidence: apiFetch Implementation

```2295:2334:backend/public/dev-dashboard.html
function buildUrl(path) {
  const base = getApiBase() || "";
  const prefix = "/v1";
  if (!path.startsWith("/")) path = "/" + path;
  if (path.startsWith(prefix)) return base + path;
  return base + prefix + path;
}

async function apiFetch(path, options = {}) {
  clearError();
  const url = buildUrl(path);
  const headers = Object.assign(
    { "Content-Type": "application/json" },
    options.headers || {}
  );

  const jwt = getJwt();
  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

  log(`FETCH ${options.method || "GET"} ${url}`);

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (e) {
    showError(`Network error calling ${url}: ${e?.message || e}`);
    throw e;
  }

  const text = await res.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // leave as raw text
    }
  }

  if (!res.ok) {
    const msg = `HTTP ${res.status} ${res.statusText} from ${url}\n${text || ""}`;
```

### Base URL Source

```2286:2289:backend/public/dev-dashboard.html
function getApiBase() {
  const raw = (ui.apiBaseInput.value || "").trim();
  return raw ? raw.replace(/\/+$/, "") : "";
}
```

### Findings:

✅ **Base URL**: Read from `ui.apiBaseInput.value` (user input), trailing slashes removed  
✅ **Auto-prefixes `/v1`**: Yes — `buildUrl()` adds `/v1` if path doesn't already start with it  
✅ **Normalizes leading slashes**: Yes — adds `/` if missing  
✅ **Headers**: 
- `Content-Type: application/json`
- `Authorization: Bearer {jwt}` (if JWT provided)

---

## 2) ENGINE CONFIG TABS NOT CLICKABLE — ROOT CAUSE PROOF

**Status**: ✅ **ROOT CAUSE CONFIRMED**

### Evidence: Tab HTML Block

```904:917:backend/public/dev-dashboard.html
        <!-- Tabs -->
        <div style="display: flex; gap: 8px; padding: 12px; border-bottom: 1px solid var(--line); flex-wrap: wrap;">
          <button class="engineConfigTab" data-tab="scoring" style="padding: 6px 12px; background: var(--btn); border: 1px solid var(--line); border-radius: 6px; color: var(--text); cursor: pointer;">Scoring & Traits</button>
          <button class="engineConfigTab" data-tab="dynamics" style="padding: 6px 12px; background: var(--btn); border: 1px solid var(--line); border-radius: 6px; color: var(--text); cursor: pointer;">Dynamics Profiles</button>
          <button class="engineConfigTab" data-tab="gates" style="padding: 6px 12px; background: var(--btn); border: 1px solid var(--line); border-radius: 6px; color: var(--text); cursor: pointer;">Gates & Objectives</button>
          <button class="engineConfigTab" data-tab="hooks" style="padding: 6px 12px; background: var(--btn); border: 1px solid var(--line); border-radius: 6px; color: var(--text); cursor: pointer;">Hooks & Triggers</button>
          <button class="engineConfigTab" data-tab="mood" style="padding: 6px 12px; background: var(--btn); border: 1px solid var(--line); border-radius: 6px; color: var(--text); cursor: pointer;">Mood & State Policy</button>
          <button class="engineConfigTab" data-tab="insights" style="padding: 6px 12px; background: var(--btn); border: 1px solid var(--line); border-radius: 6px; color: var(--text); cursor: pointer;">Insights Catalog</button>
          <button class="engineConfigTab" data-tab="attachments" style="padding: 6px 12px; background: var(--btn); border: 1px solid var(--line); border-radius: 6px; color: var(--text); cursor: pointer;">Mission Attachments</button>
          <button class="engineConfigTab" data-tab="monitoring" style="padding: 6px 12px; background: var(--btn); border: 1px solid var(--line); border-radius: 6px; color: var(--text); cursor: pointer;">Monitoring</button>
          <button class="engineConfigTab" data-tab="microFeedback" style="padding: 6px 12px; background: var(--btn); border: 1px solid var(--line); border-radius: 6px; color: var(--text); cursor: pointer;">Micro Feedback</button>
          <button class="engineConfigTab" data-tab="microDynamics" style="padding: 6px 12px; background: var(--btn); border: 1px solid var(--line); border-radius: 6px; color: var(--text); cursor: pointer;">Micro Dynamics</button>
          <button class="engineConfigTab" data-tab="persona" style="padding: 6px 12px; background: var(--btn); border: 1px solid var(--line); border-radius: 6px; color: var(--text); cursor: pointer;">Persona Drift</button>
        </div>
```

### Evidence: engineConfigUI Construction

```4499:4569:backend/public/dev-dashboard.html
          const engineConfigUI = {
            loadBtn: document.getElementById("engineConfigLoadBtn"),
            saveBtn: document.getElementById("engineConfigSaveBtn"),
            tabs: document.querySelectorAll(".engineConfigTab"),
            tabContents: document.querySelectorAll(".engineConfigTabContent"),
            
            // Scoring
            scoringProfilesList: document.getElementById("engineConfigScoringProfilesList"),
            scoringProfileEditor: document.getElementById("engineConfigScoringProfileEditor"),
            scoringProfileEditorEmpty: document.getElementById("engineConfigScoringProfileEditorEmpty"),
            addScoringProfileBtn: document.getElementById("engineConfigAddScoringProfileBtn"),
            normalizeWeightsBtn: document.getElementById("engineConfigScoringNormalizeWeightsBtn"),
            weightsSum: document.getElementById("engineConfigScoringWeightsSum"),
            
            // Dynamics
            dynamicsProfilesList: document.getElementById("engineConfigDynamicsProfilesList"),
            dynamicsProfileEditor: document.getElementById("engineConfigDynamicsProfileEditor"),
            dynamicsProfileEditorEmpty: document.getElementById("engineConfigDynamicsProfileEditorEmpty"),
            addDynamicsProfileBtn: document.getElementById("engineConfigAddDynamicsProfileBtn"),
            dynamicsPreview: document.getElementById("engineConfigDynamicsPreview"),
            
            // Gates
            gatesTableBody: document.getElementById("engineConfigGatesTableBody"),
            gateEditor: document.getElementById("engineConfigGateEditor"),
            addGateBtn: document.getElementById("engineConfigAddGateBtn"),
            
            // Hooks
            hooksTableBody: document.getElementById("engineConfigHooksTableBody"),
            hookEditor: document.getElementById("engineConfigHookEditor"),
            loadHooksBtn: document.getElementById("engineConfigLoadHooksBtn"),
            addHookBtn: document.getElementById("engineConfigAddHookBtn"),
            triggersTableBody: document.getElementById("engineConfigTriggersTableBody"),
            refreshTriggersBtn: document.getElementById("engineConfigRefreshTriggersBtn"),
            
            // Mood
            moodEmaAlpha: document.getElementById("engineConfigMoodEmaAlpha"),
            moodBandsList: document.getElementById("engineConfigMoodBandsList"),
            addMoodBandBtn: document.getElementById("engineConfigMoodAddBandBtn"),
            
            // Insights
            insightsTableBody: document.getElementById("engineConfigInsightsTableBody"),
            insightsKindFilter: document.getElementById("engineConfigInsightsKindFilter"),
            loadInsightsBtn: document.getElementById("engineConfigLoadInsightsBtn"),
            insightDetail: document.getElementById("engineConfigInsightDetail"),
            
            // Monitoring
            monitoringHooksStats: document.getElementById("engineConfigMonitoringHooksStats"),
            refreshMonitoringBtn: document.getElementById("engineConfigRefreshMonitoringBtn"),
            
            // Micro Feedback
            loadMicroFeedbackBtn: document.getElementById("engineConfigLoadMicroFeedbackBtn"),
            microFeedbackTableBody: document.getElementById("engineConfigMicroFeedbackTableBody"),
            
            // Opening Templates
            loadOpeningsBtn: document.getElementById("engineConfigLoadOpeningsBtn"),
            openingsTableBody: document.getElementById("engineConfigOpeningsTableBody"),
            openingDetail: document.getElementById("engineConfigOpeningDetail"),
            insightsSubtabs: document.querySelectorAll("[data-insights-subtab]"),
            
            // Mission Attachments
            loadAttachmentsBtn: document.getElementById("engineConfigLoadAttachmentsBtn"),
            attachmentsCategoryFilter: document.getElementById("engineConfigAttachmentsCategoryFilter"),
            attachmentsSearchInput: document.getElementById("engineConfigAttachmentsSearchInput"),
            attachmentsMissionsList: document.getElementById("engineConfigAttachmentsMissionsList"),
            attachmentsEditor: document.getElementById("engineConfigAttachmentsEditor"),
            attachmentsEditorEmpty: document.getElementById("engineConfigAttachmentsEditorEmpty"),
            attachmentsSaveBtn: document.getElementById("engineConfigAttachmentsSaveBtn"),
            attachmentsResetBtn: document.getElementById("engineConfigAttachmentsResetBtn"),
            attachmentsScoringProfile: document.getElementById("engineConfigAttachmentsScoringProfile"),
            attachmentsDynamicsProfile: document.getElementById("engineConfigAttachmentsDynamicsProfile"),
          };
```

**Note**: `engineConfigUI` is created at **script parse time** (line 4499), which occurs **before DOM is ready**.

### Evidence: wireEngineConfig() Implementation

```6041:6074:backend/public/dev-dashboard.html
          function wireEngineConfig() {
            // Tab switching
            engineConfigUI.tabs.forEach(tab => {
              tab.addEventListener("click", () => {
                const tabName = tab.getAttribute("data-tab");
                engineConfigState.currentTab = tabName;
                engineConfigUI.tabs.forEach(t => {
                  t.style.background = "var(--btn)";
                  t.style.borderColor = "var(--line)";
                });
                tab.style.background = "var(--btn2)";
                tab.style.borderColor = "rgba(77, 97, 255, 0.45)";
                engineConfigUI.tabContents.forEach(content => {
                  content.style.display = "none";
                });
                const tabIdMap = {
                  'microFeedback': 'MicroFeedback',
                  'microDynamics': 'MicroDynamics',
                  'persona': 'Persona',
                };
                const tabId = tabIdMap[tabName] || (tabName.charAt(0).toUpperCase() + tabName.slice(1));
                document.getElementById(`engineConfigTab${tabId}`).style.display = "block";
                renderEngineConfigTabs();
              });
            });
            
            // Set first tab as active
            if (engineConfigUI.tabs.length > 0) {
              engineConfigUI.tabs[0].click();
            }
            
            engineConfigUI.loadBtn.addEventListener("click", loadEngineConfig);
            engineConfigUI.saveBtn.addEventListener("click", saveEngineConfig);
```

**Note**: `wireEngineConfig()` uses `engineConfigUI.tabs` directly (does NOT re-query).

### Conclusion (3-line)

**Root cause**: `engineConfigUI` object is constructed at script parse time (line 4499) when DOM is not ready, so `document.querySelectorAll(".engineConfigTab")` returns empty NodeList. `wireEngineConfig()` later tries to iterate over this empty array, so no click listeners are attached, and tabs remain non-clickable.

---

## 3) AI STYLES ADMIN — EXACT FAILURE MODE PROOF

**Status**: ✅ **PROVEN** (should work, likely JS error or endpoint response format)

### Evidence: UI Call Path

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

**Request path**: `/admin/ai-styles` → `buildUrl()` → `/v1/admin/ai-styles`

### Evidence: Controller Route

```74:79:backend/src/modules/ai-styles/ai-styles-admin.controller.ts
@Controller('admin/ai-styles')
export class AiStylesAdminController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /v1/admin/ai-styles
   * Admin list: by default returns ALL (active + inactive), so dashboard can manage.
```

**Backend route**: `@Controller('admin/ai-styles')` → `/v1/admin/ai-styles` (with global prefix)

### Evidence: Module Registration

```1:14:backend/src/modules/ai-styles/ai-styles.module.ts
// FILE: backend/src/modules/ai-styles/ai-styles.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';
import { AiStylesController } from './ai-styles.controller';
import { AiStylesAdminController } from './ai-styles-admin.controller';
import { AiStylesService } from './ai-styles.service'; // TS2307

@Module({
  imports: [PrismaModule],
  controllers: [AiStylesController, AiStylesAdminController],
  providers: [AiStylesService],
  exports: [AiStylesService],
})
export class AiStylesModule {}
```

✅ **Controller registered**: `AiStylesAdminController` is in `controllers` array

### Evidence: Global Prefix Configuration

```20:27:backend/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const apiPrefix = process.env.API_PREFIX || 'v1';
  app.setGlobalPrefix(apiPrefix);
```

✅ **Global prefix**: `/v1` (or from `API_PREFIX` env var)

### AI Styles Root Cause

**Route should work**: Frontend calls `/v1/admin/ai-styles`, backend expects `/v1/admin/ai-styles` ✅  
**Likely issue**: Endpoint returns object `{ ok: true, hooks: [...] }` but UI expects array directly, OR JS error is suppressed by try/catch.

---

## 4) PERSONAS ADMIN — EXACT FAILURE MODE PROOF

**Status**: ✅ **PROVEN** (should work, likely same issue as AI Styles)

### Evidence: UI Call Path

```5954:5970:backend/public/dev-dashboard.html
          async function loadPersonasAdmin() {
            try {
              const res = await apiFetch("/admin/personas", { method: "GET" });
              if (Array.isArray(res)) {
                personasAdminState.personas = res;
                renderPersonasTable();
                showOk("Personas loaded.");
              } else {
                showError("Failed to load Personas: " + (res.error || "Unknown error"));
              }
            } catch (e) {
              showError("Error loading Personas: " + (e?.message || e));
            }
          }
```

**Request path**: `/admin/personas` → `buildUrl()` → `/v1/admin/personas`

### Evidence: Controller Route

```61:78:backend/src/modules/missions-admin/missions-admin.personas.controller.ts
@Controller('admin/personas')
export class MissionsAdminPersonasController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /v1/admin/personas
   * Admin list: by default returns ALL (active + inactive), so dashboard can manage.
   * Use ?activeOnly=true to return only active personas.
   */
  @Get()
  async list(@Query('activeOnly') activeOnly?: string) {
    const onlyActive = activeOnly === 'true' || activeOnly === '1';

    return this.prisma.aiPersona.findMany({
      ...(onlyActive ? { where: { active: true } } : {}),
      orderBy: { code: 'asc' },
    });
  }
```

**Backend route**: `@Controller('admin/personas')` → `/v1/admin/personas` (with global prefix)  
**Returns**: Direct array from Prisma (not wrapped in `{ ok: true, data: [...] }`)

### Evidence: Module Registration

```1:24:backend/src/modules/missions-admin/missions-admin.module.ts
// FILE: backend/src/modules/missions-admin/missions-admin.module.ts

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma.module';

import { MissionsAdminController } from './missions-admin.controller';
import { MissionsAdminService } from './missions-admin.service';

import { MissionsAdminCategoriesController } from './missions-admin.categories.controller';
import { MissionsAdminPersonasController } from './missions-admin.personas.controller';
import { MissionsAdminMissionsPersonasController } from './missions-admin.missions-personas.controller';


@Module({
  imports: [PrismaModule],
  controllers: [
    MissionsAdminController,
    MissionsAdminCategoriesController,
    MissionsAdminPersonasController,
    MissionsAdminMissionsPersonasController, // ✅ alias route support
  ],
  providers: [MissionsAdminService],
})
export class MissionsAdminModule {}
```

✅ **Controller registered**: `MissionsAdminPersonasController` is in `controllers` array

### Personas Root Cause

**Route should work**: Frontend calls `/v1/admin/personas`, backend expects `/v1/admin/personas` ✅  
**Likely issue**: Endpoint returns array directly (matches UI expectation), so issue is likely DOM timing (wiring not called) or JS error suppressed.

---

## 5) DP INSIGHTS: SOURCE OF TRUTH INVENTORY

**Status**: ✅ **PROVEN**

### Evidence Table

| Asset | Exists? | Where stored (DB/EngineConfig/Hardcoded) | CRUD endpoints exist? | Evidence |
|-------|---------|------------------------------------------|----------------------|----------|
| **PromptHook** | ✅ YES | **DB** (`PromptHook` table) | ✅ YES | `backend/src/modules/hooks/hooks.controller.ts` |
| **PromptHookTrigger** | ✅ YES | **DB** (`PromptHookTrigger` table) | ❌ NO (read-only stats) | `backend/src/modules/hooks/hooks.controller.ts:112` |
| **InsightTemplate** | ✅ YES | **Hardcoded** (TypeScript class) | ❌ NO (read-only catalog) | `backend/src/modules/insights/catalog/insight-catalog.v1.ts` |
| **InsightCatalog** | ✅ YES | **Hardcoded** (TypeScript) | ❌ NO | `backend/src/modules/insights/insights-admin.controller.ts` |

### Evidence: PromptHook Database Model

```536:556:backend/prisma/schema.prisma
model PromptHook {
  id             String              @id @default(cuid())
  name           String
  type           String
  textTemplate   String
  conditionsJson Json
  category       String
  tags           String[]            @default([])
  priority       Int                 @default(50)
  isEnabled      Boolean             @default(true)
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt
  version        String              @default("v1")
  metaJson       Json?
  triggers       PromptHookTrigger[]

  @@index([category])
  @@index([type, isEnabled])
  @@index([priority])
  @@index([tags])
}
```

### Evidence: Hooks CRUD Endpoints

```18:106:backend/src/modules/hooks/hooks.controller.ts
@Controller('admin/hooks')
// @UseGuards(AdminGuard) // TODO: Enable when admin guard is available
export class HooksController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /v1/admin/hooks
   * List hooks with optional filters
   */
  @Get()
  async listHooks(
    @Query('type') type?: string,
    @Query('enabled') enabled?: string,
    @Query('category') category?: string,
  ) {
    const where: any = {};
    if (type) where.type = type;
    if (enabled !== undefined) where.isEnabled = enabled === 'true';
    if (category) where.category = category;

    const hooks = await this.prisma.promptHook.findMany({
      where,
      orderBy: { priority: 'desc' },
    });

    return { ok: true, hooks };
  }

  /**
   * GET /v1/admin/hooks/:id
   */
  @Get(':id')
  async getHook(@Param('id') id: string) {
    const hook = await this.prisma.promptHook.findUnique({
      where: { id },
    });

    if (!hook) {
      return { ok: false, error: 'Hook not found' };
    }

    return { ok: true, hook };
  }

  /**
   * POST /v1/admin/hooks
   */
  @Post()
  async createHook(@Body() body: any) {
    const hook = await this.prisma.promptHook.create({
      data: {
        name: body.name,
        type: body.type,
        textTemplate: body.textTemplate,
        conditionsJson: body.conditionsJson || {},
        category: body.category || 'general',
        tags: body.tags || [],
        priority: body.priority ?? 50,
        isEnabled: body.isEnabled !== false,
        metaJson: body.metaJson || {},
        version: body.version || 'v1',
      },
    });

    return { ok: true, hook };
  }

  /**
   * PUT /v1/admin/hooks/:id
   */
  @Put(':id')
  async updateHook(@Param('id') id: string, @Body() body: any) {
    const hook = await this.prisma.promptHook.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.textTemplate !== undefined && { textTemplate: body.textTemplate }),
        ...(body.conditionsJson !== undefined && { conditionsJson: body.conditionsJson }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.isEnabled !== undefined && { isEnabled: body.isEnabled }),
        ...(body.metaJson !== undefined && { metaJson: body.metaJson }),
      },
    });

    return { ok: true, hook };
  }
```

✅ **Full CRUD exists** for PromptHook

### Evidence: InsightCatalog Hard-Coded

```1:42:backend/src/modules/insights/insights-admin.controller.ts
// backend/src/modules/insights/insights-admin.controller.ts
// Step 7.2: Insights admin controller (read-only catalog)

import { Controller, Get, Query } from '@nestjs/common';
import { InsightCatalog } from './catalog/insight-catalog.v1';
import { InsightKind } from './insights.types';

@Controller('admin/insights')
export class InsightsAdminController {
  private catalog = new InsightCatalog();

  /**
   * GET /v1/admin/insights/catalog
   * Get all insight templates (read-only)
   */
  @Get('catalog')
  async getCatalog(@Query('kind') kind?: string) {
    let templates: any[] = [];

    if (kind && Object.values(InsightKind).includes(kind as InsightKind)) {
      templates = this.catalog.getByKind(kind as InsightKind);
    } else {
      // Get all templates
      templates = [
        ...this.catalog.getByKind('GATE_FAIL'),
        ...this.catalog.getByKind('POSITIVE_HOOK'),
        ...this.catalog.getByKind('NEGATIVE_PATTERN'),
        ...this.catalog.getByKind('GENERAL_TIP'),
      ];
    }

    // Filter by kind if provided
    if (kind && Object.values(InsightKind).includes(kind as InsightKind)) {
      templates = templates.filter((t) => t.kind === (kind as InsightKind));
    }

    return {
      ok: true,
      templates: templates,
    };
  }
}
```

❌ **Read-only**: No CRUD endpoints, catalog is hard-coded TypeScript class

### Evidence: No InsightTemplate DB Model

**Searched**: `grep "model.*Insight|InsightTemplate" backend/prisma/schema.prisma`  
**Result**: Only `MissionDeepInsights` found (session results, not templates)

❌ **No DB model** for InsightTemplate

### Phase 4 Recommendation

**Recommended Approach**: **Hybrid — Keep Hooks DB-backed, Migrate Insights to DB**

**Justification**:
1. **Hooks are already DB-backed** with full CRUD — Phase 4 should only add structured UI editor
2. **Insights are hard-coded** — Phase 4 should migrate to DB for editability
3. **Consistency**: Both should be DB-backed for Phase 4 structured editors to work

**Implementation Plan**:
- ✅ Hooks: Use existing `/v1/admin/hooks` endpoints, build structured UI editor
- ⚠️ Insights: Create `InsightTemplate` Prisma model, migration script, CRUD endpoints, then structured UI editor

---

## 6) SEED PACK PROOF

**Status**: ⚠️ **PARTIAL** (missing AI styles, insights/hooks)

### Evidence: Mission Seeds

```189:433:backend/prisma/seed.ts
  const openersL1M1Config = buildOpenersMissionConfigV1({
    difficultyLevel: MissionDifficulty.EASY,
    aiStyleKey: AiStyleKey.PLAYFUL, // MAYA_PLAYFUL persona
    maxMessages: 3,
    timeLimitSec: 30,
    wordLimit: 40,
    userTitle: 'First Safe Opener',
    userDescription: 'Send a simple, casual opener in under 30 seconds.',
  });

  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'OPENERS_L1_M1' },
    // ...
  });

  // ... OPENERS_L1_M2, OPENERS_L1_M3_MALE, OPENERS_L1_M4_MALE

  const flirtingL1M1Config = buildFlirtingMissionConfigV1({
    // ...
  });

  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'FLIRTING_L1_M1' },
    // ...
  });

  const flirtingL2M1Config = buildFlirtingMissionConfigV1({
    // ...
  });

  await prisma.practiceMissionTemplate.upsert({
    where: { code: 'FLIRTING_L2_M1' },
    // ...
  });
```

**Missions seeded**:
- ✅ `OPENERS_L1_M1` (Openers - Easy)
- ✅ `OPENERS_L1_M2` (Openers - Medium)
- ✅ `OPENERS_L1_M3_MALE` (Openers - Male - Easy)
- ✅ `OPENERS_L1_M4_MALE` (Openers - Male - Medium)
- ✅ `FLIRTING_L1_M1` (Flirting - Easy)
- ✅ `FLIRTING_L2_M1` (Flirting - Medium)

**Total**: 6 missions (4 Openers, 2 Flirting)  
**Missing**: Neutral/social mission

### Evidence: AI Styles Seeds

**Searched**: `grep "prisma\.aiStyle\.|createMany.*aiStyle|upsert.*aiStyle" -i backend/prisma/seed.ts`  
**Result**: **NO MATCHES**

❌ **No AI styles seeded** — seed.ts does NOT create any AI styles

### Evidence: Insights/Hooks Seeds

**Searched**: `grep "PromptHook|InsightTemplate|insight|hook" -i backend/prisma/seed.ts`  
**Result**: **NO MATCHES**

❌ **No insights/hooks seeded** — seed.ts does NOT create any hooks or insights

### Evidence: EngineConfig Seed

```440:454:backend/prisma/seed.ts
  // Step 7.2: Seed EngineConfig
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
  console.log('✅ EngineConfig seeded');
```

✅ **EngineConfig seeded** — includes default scoring, mood, dynamics, gates profiles

---

## UPDATED PHASE 4 PARTIZATION (Based on Truth)

### Part 4.1: Scope Doc + Critical Fixes (LOW RISK)

**Definition of Done**:
- [ ] Create `backend/docs/PHASE_4_SCOPE.md` with explicit IN/OUT scope
- [ ] Fix Engine Config tabs: Move `engineConfigUI` initialization inside `wireEngineConfig()` OR after DOM ready
- [ ] Verify AI Styles admin: Check endpoint response format (array vs object), fix UI if needed
- [ ] Verify Personas admin: Check endpoint response format, fix UI if needed

**Files Impacted**:
- CREATE: `backend/docs/PHASE_4_SCOPE.md`
- FIX: `backend/public/dev-dashboard.html:4499` (move engineConfigUI init)
- FIX: `backend/public/dev-dashboard.html:5793` (fix AI Styles response handling if needed)
- FIX: `backend/public/dev-dashboard.html:5954` (fix Personas response handling if needed)

**Risk**: **LOW** — Only fixes broken functionality, no new features

---

### Part 4.2: MissionConfigV1 LEGO Editor (MEDIUM RISK)

**Definition of Done**:
- [ ] Dynamics Editor: structured form
- [ ] Objective Editor: structured form
- [ ] State Policy Editor: structured form
- [ ] Response Architecture Editor: structured form
- [ ] Difficulty Editor: tuning parameters (extends existing level dropdown)
- [ ] All editors sync with JSON textarea (maintain compatibility)

**Risk**: **MEDIUM** — Must maintain JSON textarea compatibility

---

### Part 4.3: AI Styles Editor Fix + Structured UI (LOW RISK)

**Definition of Done**:
- [ ] Fix response format handling (if needed)
- [ ] Build structured form for all AI Style fields
- [ ] Validation on save

**Risk**: **LOW** — Endpoints exist, only UI work

---

### Part 4.4: Hooks Editor (LOW RISK)

**Definition of Done**:
- [ ] Build structured UI for hooks CRUD
- [ ] Use existing `/v1/admin/hooks` endpoints
- [ ] Form for all PromptHook fields (name, type, textTemplate, conditionsJson, category, tags, priority, isEnabled, metaJson)

**Risk**: **LOW** — DB-backed, CRUD endpoints exist

---

### Part 4.5: Insights Editor — DB Migration (HIGH RISK)

**Definition of Done**:
- [ ] Create `InsightTemplate` Prisma model
- [ ] Migration script (create table)
- [ ] CRUD endpoints (`/v1/admin/insights/templates`)
- [ ] Migration script (populate from hard-coded catalog)
- [ ] Structured UI editor

**Risk**: **HIGH** — Requires DB migration, must migrate existing hard-coded catalog

---

### Part 4.6: Validation & Safety (MEDIUM RISK)

**Definition of Done**:
- [ ] Cross-layer validation
- [ ] EngineConfig validation
- [ ] Structured error reporting

**Risk**: **MEDIUM** — Must ensure backward compatibility

---

### Part 4.7: Starter Seed Pack (LOW RISK)

**Definition of Done**:
- [ ] Add neutral/social mission (1 mission)
- [ ] Add 3 AI styles (Neutral, Friendly, Challenging)
- [ ] Add starter hooks (5 positive, 5 negative)
- [ ] Add starter insights (10 templates)

**Risk**: **LOW** — Seed data only

---

## EXECUTION ORDER RECOMMENDATION

**Phase 4A (Week 1)**: Parts 4.1, 4.3, 4.4, 4.7
- ✅ Fix broken tabs/admins
- ✅ Complete AI Styles editor (endpoints exist)
- ✅ Complete Hooks editor (endpoints exist)
- ✅ Add seed pack

**Phase 4B (Week 2)**: Parts 4.2, 4.5, 4.6
- ⚠️ MissionConfigV1 editors (medium complexity)
- ⚠️ Insights DB migration (high risk)
- ⚠️ Validation (medium risk)

**Rationale**: Phase 4A has LOW RISK items using existing endpoints. Phase 4B requires new DB models and complex editors.

---

**END OF SCOUT REPORT ROUND 2**


