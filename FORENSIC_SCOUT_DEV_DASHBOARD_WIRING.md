# FORENSIC SCOUT — Dev Dashboard Wiring (READ-ONLY)

**Date:** 2025-01-15  
**Mode:** READ-ONLY (No Code, No Refactors, No Suggestions)  
**Goal:** Hard evidence of dev-dashboard wiring and "Load Everything" contract

---

## Section A: Serving Proof

### Vite Configuration

**File:** `backend/vite.config.ts`

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

**Directory Listing:** `backend/dashboards_bundle/`

- `dev-dashboard.html` ✅ EXISTS
- `control-panel.html`
- `frontend-dashboard.html`
- `middleware-dashboard.html`
- `backend-dashboard.html`
- (other files...)

**Conclusion:** Vite serves from `dashboards_bundle/` root. File `dev-dashboard.html` exists at `backend/dashboards_bundle/dev-dashboard.html`. URL: `http://localhost:5173/dev-dashboard.html`

---

## Section B: JWT Proof (Snippets)

### Storage Keys Definition

**File:** `backend/dashboards_bundle/dev-dashboard.html:2396-2399`

```2396:2399:backend/dashboards_bundle/dev-dashboard.html
        const STORAGE_KEYS = {
          apiBase: "sg_dev_api_base",
          jwt: "sg_dev_jwt",
        };
```

### JWT Load Logic

**File:** `backend/dashboards_bundle/dev-dashboard.html:5058-5063`

```5058:5063:backend/dashboards_bundle/dev-dashboard.html
        function loadSettings() {
          const apiBase = localStorage.getItem(STORAGE_KEYS.apiBase) || "";
          const jwt = localStorage.getItem(STORAGE_KEYS.jwt) || "";
          ui.apiBaseInput.value = apiBase;
          ui.jwtInput.value = jwt;
        }
```

**Reads from:** `localStorage.getItem(STORAGE_KEYS.jwt)` where `STORAGE_KEYS.jwt = "sg_dev_jwt"`

### JWT Save Logic

**File:** `backend/dashboards_bundle/dev-dashboard.html:5065-5069`

```5065:5069:backend/dashboards_bundle/dev-dashboard.html
        function saveSettings() {
          localStorage.setItem(STORAGE_KEYS.apiBase, getApiBase());
          localStorage.setItem(STORAGE_KEYS.jwt, getJwt());
          showOk("Settings saved.");
        }
```

**Writes to:** `localStorage.setItem(STORAGE_KEYS.jwt, getJwt())` where `STORAGE_KEYS.jwt = "sg_dev_jwt"`

### JWT from Login Response

**File:** `backend/dashboards_bundle/dev-dashboard.html:5122-5127`

```5122:5127:backend/dashboards_bundle/dev-dashboard.html
            if (json && json.accessToken) {
              const jwtInput = document.getElementById("jwtInput");
              if (jwtInput && jwtInput instanceof HTMLInputElement) {
                jwtInput.value = json.accessToken;
                localStorage.setItem(STORAGE_KEYS.jwt, json.accessToken);
                showOk("Login successful! JWT token saved.");
```

**Writes to:** `localStorage.setItem(STORAGE_KEYS.jwt, json.accessToken)` after successful login

### getJwt() Function

**File:** `backend/dashboards_bundle/dev-dashboard.html:2578-2580`

```2578:2580:backend/dashboards_bundle/dev-dashboard.html
        function getJwt() {
          return (ui.jwtInput.value || "").trim();
        }
```

**Reads from:** `ui.jwtInput.value` (the JWT input field)

---

## Section C: Load Everything Proof

### "Load Everything" Button HTML

**Status:** ❌ **NOT FOUND**

**Evidence:** Searched `backend/dashboards_bundle/dev-dashboard.html` for:
- `loadEverything` (case-insensitive): No matches
- `loadEverythingBtn`: No matches
- `load-everything`: No matches
- `Load Everything`: No matches

**Header Buttons Found:** `backend/dashboards_bundle/dev-dashboard.html:367-369`

```367:369:backend/dashboards_bundle/dev-dashboard.html
            <button id="pingApiBtn" type="button" class="btn">Ping API</button>
            <button id="loadMetaBtn" type="button" class="btn">Load Meta</button>
            <button id="loadMissionsBtn" type="button" class="btn">Load Missions</button>
```

**Conclusion:** "Load Everything" button does NOT exist in the dashboard HTML.

---

## Section D: Endpoint Proof Table

### apiFetch Function Full Body

**File:** `backend/dashboards_bundle/dev-dashboard.html:2626-2697`

```2626:2697:backend/dashboards_bundle/dev-dashboard.html
        async function apiFetch(path, options = {}) {
          clearError();
          const url = buildUrl(path);
          
          // Step 1: Enforce JWT for all admin endpoints
          const pathname = new URL(url, window.location.origin).pathname;
          if (pathname.startsWith('/v1/admin/')) {
            requireJWT(); // Throws if JWT missing
          }
          
          // Wave 1.2: Track endpoints
          window.__endpointsUsedRaw.add(path);
          window.__endpointsUsedBuilt.add(url);
          
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
            showError(`Network error calling ${url}: ${formatErrorForDisplay(e)}`);
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
            // Wave 1: Log error to dashboard log
            log(`FETCH FAILED: ${options.method || "GET"} ${url} - ${res.status} ${res.statusText}`);
            if (text && text.length < 500) {
              log(`Response body: ${text}`);
            }
            // Patch A: Always show visible UI error for HTTP failures
            const errorMsg = res.status === 401 
              ? "Token expired or invalid. Please login again."
              : json?.message || text || `HTTP ${res.status} ${res.statusText}`;
            showError(errorMsg);
            if (res.status === 401) {
              // Clear JWT on 401
              const jwtInput = document.getElementById("jwtInput");
              if (jwtInput) jwtInput.value = "";
            }
            const error = new Error(msg);
            // Attach parsed JSON if available for structured error handling
            if (json) {
              error.responseJson = json;
            } else if (text) {
              error.responseText = text;
            }
            throw error;
          }

          log(`FETCH OK: ${options.method || "GET"} ${url} - ${res.status}`);
          return json ?? text;
        }
```

---

### Endpoint Proof Table

| Endpoint | Method | Controller File:Line | Return Shape Keys | Guard |
|----------|--------|---------------------|-------------------|-------|
| `/v1/admin/engine-config` | GET | `backend/src/modules/engine-config/engine-config.controller.ts:17-21` | `{ ok: true, config: EngineConfigJson }` | `AdminGuard` (line 10) |
| `/v1/admin/engine-config` | PUT | `backend/src/modules/engine-config/engine-config.controller.ts:27-33` | `{ ok: true, config: EngineConfigJson }` | `AdminGuard` (line 10) |
| `/v1/admin/missions/meta` | GET | `backend/src/modules/missions-admin/missions-admin.controller.ts:28-30` | `{ ok: true, categories: [...], personas: [...], aiStyles: [...], enums: {...} }` | `AdminGuard` (line 21) |
| `/v1/admin/missions` | GET | `backend/src/modules/missions-admin/missions-admin.controller.ts:65-68` | `PracticeMissionTemplate[]` (raw array) | `AdminGuard` (line 21) |
| `/v1/admin/missions/list` | GET | `backend/src/modules/missions-admin/missions-admin.controller.ts:74-77` | UNKNOWN (not read in codebase) | `AdminGuard` (line 21) |
| `/v1/admin/missions` | POST | `backend/src/modules/missions-admin/missions-admin.controller.ts:82-85` | `PracticeMissionTemplate` | `AdminGuard` (line 21) |
| `/v1/admin/missions/:id` | PUT | `backend/src/modules/missions-admin/missions-admin.controller.ts:90-93` | `PracticeMissionTemplate` | `AdminGuard` (line 21) |
| `/v1/admin/missions/:id` | DELETE | `backend/src/modules/missions-admin/missions-admin.controller.ts:106-109` | UNKNOWN (not read in codebase) | `AdminGuard` (line 21) |
| `/v1/admin/missions/attachments` | GET | `backend/src/modules/missions-admin/missions-admin.controller.ts:135-138` | `{ ok: true, attachments: [...] }` | `AdminGuard` (line 21) |
| `/v1/admin/missions/:id/attachments` | PUT | `backend/src/modules/missions-admin/missions-admin.controller.ts:144-150` | `{ ok: true, mission: { id, scoringProfileCode, dynamicsProfileCode } }` | `AdminGuard` (line 21) |
| `/v1/admin/missions/categories` | GET | `backend/src/modules/missions-admin/missions-admin.categories.controller.ts:32-35` | `MissionCategory[]` | `AdminGuard` (line 22) |
| `/v1/admin/missions/categories` | POST | `backend/src/modules/missions-admin/missions-admin.categories.controller.ts:41-44` | UNKNOWN (not read in codebase) | `AdminGuard` (line 22) |
| `/v1/admin/missions/categories/:id` | PUT | `backend/src/modules/missions-admin/missions-admin.categories.controller.ts:62-68` | UNKNOWN (not read in codebase) | `AdminGuard` (line 22) |
| `/v1/admin/missions/categories/:id` | DELETE | `backend/src/modules/missions-admin/missions-admin.categories.controller.ts:74-77` | UNKNOWN (not read in codebase) | `AdminGuard` (line 22) |
| `/v1/admin/personas` | GET | `backend/src/modules/missions-admin/missions-admin.personas.controller.ts:73-81` | `AiPersona[]` (raw array) | `AdminGuard` (line 64) |
| `/v1/admin/personas` | POST | `backend/src/modules/missions-admin/missions-admin.personas.controller.ts:88-114` | `AiPersona` (direct object) | `AdminGuard` (line 64) |
| `/v1/admin/personas/:id` | PUT | `backend/src/modules/missions-admin/missions-admin.personas.controller.ts:120-155` | `AiPersona` (direct object) | `AdminGuard` (line 64) |
| `/v1/admin/personas/:id` | DELETE | `backend/src/modules/missions-admin/missions-admin.personas.controller.ts:161-174` | `{ ok: true }` | `AdminGuard` (line 64) |
| `/v1/admin/ai-styles` | GET | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:86-94` | `AiStyle[]` (raw array) | `AdminGuard` (line 22) |
| `/v1/admin/ai-styles` | POST | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:119-149` | `AiStyle` (direct object) | `AdminGuard` (line 22) |
| `/v1/admin/ai-styles/:id` | PUT | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:155-186` | `AiStyle` (direct object) | `AdminGuard` (line 22) |
| `/v1/admin/ai-styles/:id` | DELETE | `backend/src/modules/ai-styles/ai-styles-admin.controller.ts:226-237` | `{ ok: true, message: string }` | `AdminGuard` (line 22) |
| `/v1/admin/hooks` | GET | `backend/src/modules/hooks/hooks.controller.ts:28-45` | `{ ok: true, hooks: PromptHook[] }` | `AdminGuard` (line 20) |
| `/v1/admin/hooks` | POST | `backend/src/modules/hooks/hooks.controller.ts:66-84` | `{ ok: true, hook: PromptHook }` | `AdminGuard` (line 20) |
| `/v1/admin/hooks/:id` | PUT | `backend/src/modules/hooks/hooks.controller.ts:89-107` | `{ ok: true, hook: PromptHook }` | `AdminGuard` (line 20) |
| `/v1/admin/hooks/:id` | DELETE | `backend/src/modules/hooks/hooks.controller.ts:112-122` | `{ ok: true, message: string }` | `AdminGuard` (line 20) |
| `/v1/admin/hooks/triggers/stats` | GET | `backend/src/modules/hooks/hooks.controller.ts:128-169` | `{ ok: true, stats: [...], periodDays: number }` | `AdminGuard` (line 20) |
| `/v1/admin/insights/catalog` | GET | `backend/src/modules/insights/insights-admin.controller.ts:26-78` | `{ ok: true, templates: [...] }` | `AdminGuard` (line 15) |
| `/v1/admin/insights` | POST | `backend/src/modules/insights/insights-admin.controller.ts:84-123` | `{ ok: true, template: {...} }` | `AdminGuard` (line 15) |
| `/v1/admin/insights/:id` | DELETE | `backend/src/modules/insights/insights-admin.controller.ts:129-144` | `{ ok: true, deleted: {...} }` | `AdminGuard` (line 15) |
| `/v1/admin/prompts/micro-feedback` | GET | `backend/src/modules/engine-config/engine-config-prompts.controller.ts:17-64` | `{ ok: true, feedback: [...] }` | `AdminGuard` (line 9) |
| `/v1/admin/prompts/openings` | GET | `backend/src/modules/engine-config/engine-config-prompts.controller.ts:70-91` | `{ ok: true, templates: [...] }` | `AdminGuard` (line 9) |

### AdminGuard Proof

**File:** `backend/src/modules/auth/admin.guard.ts:1-17`

```1:17:backend/src/modules/auth/admin.guard.ts
// backend/src/modules/auth/admin.guard.ts
// Step 1: Prototype admin guard - any valid JWT = admin
// TODO: Replace with role-based admin check later

import { Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class AdminGuard extends JwtAuthGuard {
  // For Step 1: Simply enforce JWT authentication
  // Any valid JWT is treated as admin access
  // TODO: Add role-based check (e.g., check user.role === 'admin' or user.isAdmin === true)
  // TODO: This will require:
  //  1. User model/table to have role/isAdmin field
  //  2. JWT payload to include role/admin flag
  //  3. This guard to check req.user.role or req.user.isAdmin
}
```

**401 Behavior:** `AdminGuard` extends `JwtAuthGuard`, which returns 401 if JWT is invalid or missing.

### Mission Attachments Endpoint Proof

**GET /v1/admin/missions/attachments**

**File:** `backend/src/modules/missions-admin/missions-admin.controller.ts:135-138`

```135:138:backend/src/modules/missions-admin/missions-admin.controller.ts
  @Get('attachments')
  async getAttachments() {
    return this.missionsAdminService.getMissionAttachments();
  }
```

**Service Method Return Shape:**

**File:** `backend/src/modules/missions-admin/missions-admin.service.ts:1451-1482`

```1451:1482:backend/src/modules/missions-admin/missions-admin.service.ts
  async getMissionAttachments() {
    const missions = await this.prisma.practiceMissionTemplate.findMany({
      where: { active: true },
      select: {
        id: true,
        code: true,
        title: true,
        category: {
          select: {
            label: true,
          },
        },
        aiContract: true,
      },
      orderBy: [{ title: 'asc' }],
    });

    const attachments = missions.map((m) => {
      const aiContract = m.aiContract as any;
      const missionConfigV1 = aiContract?.missionConfigV1;
      return {
        missionId: m.id,
        missionCode: m.code,
        missionLabel: m.title,
        categoryLabel: m.category?.label || '',
        scoringProfileCode: missionConfigV1?.scoringProfileCode ?? null,
        dynamicsProfileCode: missionConfigV1?.dynamicsProfileCode ?? null,
      };
    });

    return { ok: true, attachments };
  }
```

**Return Shape:** `{ ok: true, attachments: Array<{ missionId, missionCode, missionLabel, categoryLabel, scoringProfileCode, dynamicsProfileCode }> }`

**PUT /v1/admin/missions/:id/attachments**

**File:** `backend/src/modules/missions-admin/missions-admin.controller.ts:144-150`

```144:150:backend/src/modules/missions-admin/missions-admin.controller.ts
  @Put(':id/attachments')
  async updateAttachments(
    @Param('id') id: string,
    @Body() body: { scoringProfileCode?: string | null; dynamicsProfileCode?: string | null },
  ) {
    return this.missionsAdminService.updateMissionAttachments(id, body);
  }
```

**Service Method Return Shape:**

**File:** `backend/src/modules/missions-admin/missions-admin.service.ts:1538-1546`

```1538:1546:backend/src/modules/missions-admin/missions-admin.service.ts
    return {
      ok: true,
      mission: {
        id: mission.id,
        scoringProfileCode: missionConfigV1.scoringProfileCode ?? null,
        dynamicsProfileCode: missionConfigV1.dynamicsProfileCode ?? null,
      },
    };
  }
```

**Return Shape:** `{ ok: true, mission: { id, scoringProfileCode, dynamicsProfileCode } }`

---

## Section E: Unknowns List

### Endpoints with Unknown Return Shapes

1. **GET /v1/admin/missions/list**
   - **Controller:** `backend/src/modules/missions-admin/missions-admin.controller.ts:74-77`
   - **Reason:** Return shape not read in codebase inspection
   - **Guard:** `AdminGuard` ✅

2. **DELETE /v1/admin/missions/:id**
   - **Controller:** `backend/src/modules/missions-admin/missions-admin.controller.ts:106-109`
   - **Reason:** Return shape not read in codebase inspection
   - **Guard:** `AdminGuard` ✅

3. **POST /v1/admin/missions/categories**
   - **Controller:** `backend/src/modules/missions-admin/missions-admin.categories.controller.ts:41-44`
   - **Reason:** Return shape not read in codebase inspection
   - **Guard:** `AdminGuard` ✅

4. **PUT /v1/admin/missions/categories/:id**
   - **Controller:** `backend/src/modules/missions-admin/missions-admin.categories.controller.ts:62-68`
   - **Reason:** Return shape not read in codebase inspection
   - **Guard:** `AdminGuard` ✅

5. **DELETE /v1/admin/missions/categories/:id**
   - **Controller:** `backend/src/modules/missions-admin/missions-admin.categories.controller.ts:74-77`
   - **Reason:** Return shape not read in codebase inspection
   - **Guard:** `AdminGuard` ✅

### Missing Features

1. **"Load Everything" Button**
   - **Status:** ❌ NOT FOUND
   - **Evidence:** No HTML element with id containing "loadEverything" or similar
   - **Location Expected:** Header section (`backend/dashboards_bundle/dev-dashboard.html:367-369`)

---

**END OF FORENSIC SCOUT REPORT**

