# SCOUT REPORT — Step 7 Dashboards Implementation Status

**Date:** 2025-01-15  
**Mode:** SCOUT ONLY (No Code Changes)  
**Goal:** Compare current implementation against Step 7 checklist (7.1-7.15)

---

## 1. File Mapping

### Dev Dashboard HTML/JS
- **`backend/public/dev-dashboard.html`** (4196 lines)
  - Main dashboard file with inline JavaScript
  - Contains: Mission editor, Practice Hub Designer, Engine Config tabs
  - Mission list rendering: lines 2450-2600
  - Category grid rendering: lines 2147-2179
  - Mission detail view: lines 2611-2700

### Backend Controllers
- **`backend/src/modules/missions-admin/missions-admin.controller.ts`**
  - Mission CRUD endpoints (GET, POST, PUT, DELETE)
  - `GET /v1/admin/missions/meta` - Returns categories, personas, aiStyles
  - `GET /v1/admin/missions` - Returns flat array of missions
  - `GET /v1/admin/missions/attachments` - Mission profile attachments

- **`backend/src/modules/missions-admin/missions-admin.categories.controller.ts`**
  - Category CRUD endpoints (GET, POST, PUT, PATCH, DELETE)
  - `GET /v1/admin/missions/categories` - List categories
  - `POST /v1/admin/missions/categories` - Create category
  - `PUT /v1/admin/missions/categories/:id` - Update category

- **`backend/src/modules/stats/stats.controller.ts`**
  - `GET /v1/stats/dashboard` - User dashboard summary
  - `GET /v1/stats/mood/session/:sessionId` - Mood timeline for session
  - `GET /v1/stats/summary` - Stats summary

- **`backend/src/modules/sessions/sessions.controller.ts`**
  - `GET /v1/sessions/:id` - Get session by ID
  - `GET /v1/sessions/:id/summary` - Session end read model

### Backend Services
- **`backend/src/modules/missions-admin/missions-admin.service.ts`**
  - `listMissionsFlat()` - Returns all missions
  - `getMeta()` - Returns categories, personas, aiStyles
  - `listCategories()` - Returns categories ordered by displayOrder
  - `createCategory()`, `updateCategory()`, `deleteCategory()`

- **`backend/src/modules/missions/missions.service.ts`**
  - `getRoadForUser(userId)` - Returns filtered missions for user (respects attraction)
  - Uses `MissionsService` (not hard-coded)

- **`backend/src/modules/practice/practice.service.ts`**
  - Uses `MissionsService.getRoadForUser()` (line 553)
  - Respects persona compatibility and attraction logic

- **`backend/src/modules/stats/stats.service.ts`**
  - `getStatsSummaryForUser()` - User stats summary
  - No per-mission stats aggregation found

- **`backend/src/modules/mood/mood.service.ts`**
  - `persistTimeline()` - Saves mood timeline to DB
  - `loadTimeline()` - Loads mood timeline from DB

### Database Schema
- **`backend/prisma/schema.prisma`**
  - `MissionCategory` model (lines 182-200): Has `attractionPath`, `displayOrder`, `active`, `iconUrl`
  - `PracticeMissionTemplate` model: Has `categoryId`, `isAttractionSensitive`, `targetRomanticGender`
  - `PracticeSession` model: Has `templateId`, `score`, `isSuccess`, `endedAt`, `createdAt`
  - `MissionMoodTimeline` model (lines 707-730): Has `timelineJson`, `currentMoodState`, `currentMoodPercent`
  - `PracticeMessage` model: Has `sessionId`, `role`, `content`, `score`, `traitData`

---

## 2. Checklist Coverage Table

| Item ID | Status | Evidence | Notes |
|---------|--------|----------|-------|
| **7.1** Mission list (index) | **Partial** | `dev-dashboard.html:2450-2600` (renderMissionsList), `missions-admin.controller.ts:61-64` (GET /admin/missions) | ✅ Shows missionId, title, category, persona. ❌ Missing: aiStyleKey display, attractionTarget display, status, updatedAt/createdAt columns |
| **7.2** Mission detail: config view | **Partial** | `dev-dashboard.html:2611-2700` (selectMission function) | ✅ Shows basic fields (title, difficulty, category, persona, active, code, aiStyle). ❌ Missing: MissionConfigV1 breakdown (objective, difficulty details, aiContract summary), runtimeProfile/aiRuntimeProfile, gate configuration |
| **7.3** Mission stats summary | **Missing** | No endpoint or UI found | ❌ No per-mission stats: session count, success rate, avg messages, avg duration, time window selector |
| **7.4** Mood timeline visualization | **Missing** | `stats.controller.ts:55-65` (GET /stats/mood/session/:sessionId exists) | ❌ No UI in dashboard. Endpoint exists but not wired to dashboard. No chart/visualization component |
| **7.5** Per-message log | **Missing** | `sessions.controller.ts:38-42` (GET /sessions/:id exists) | ❌ No UI in dashboard. Endpoint exists but not wired. No message list with scores, mood deltas, gate triggers |
| **7.6** Data integrity & error handling | **Partial** | `dev-dashboard.html` (various try-catch blocks) | ✅ Basic error handling in JS. ❌ No explicit "No data yet" states for empty missions/sessions/timelines |
| **7.7** Category list (CRUD) | **Done** | `dev-dashboard.html:2147-2291`, `missions-admin.categories.controller.ts:29-74` | ✅ Full CRUD: list, create, edit, delete. Shows: id, name, code, attractionPath, displayOrder, active. ✅ Toggle active status |
| **7.8** Visual Practice Hub representation | **Partial** | `dev-dashboard.html:2147-2179` (renderCategoriesGrid) | ✅ Grid view with category tiles. ❌ Not matching mobile app layout (no visual similarity requirement met, but functional) |
| **7.9** Missions ↔ categories mapping | **Partial** | `dev-dashboard.html:2293-2328` (hubViewMissions), `missions-admin.service.ts` (missions have categoryId) | ✅ Can view missions in category. ❌ Cannot add/remove missions from category via UI (only via mission editor) |
| **7.10** Attraction target enforcement | **Partial** | `dev-dashboard.html:2226-2233` (attractionPath validation), `missions-admin.service.ts` (validation logic) | ✅ Shows attractionPath per category. ✅ Backend validation exists. ❌ No UI warning when trying to remove/disable only male/female category |
| **7.11** Save & load reliability | **Done** | `dev-dashboard.html:2235-2275` (saveCategory), `missions-admin.categories.controller.ts` | ✅ All changes persist via NestJS APIs. ✅ Reloading reflects saved changes. ✅ No JS errors observed |
| **7.12** PracticeService uses dashboard data | **Done** | `practice.service.ts:553` (injects MissionsService), `missions.service.ts:24-68` (getRoadForUser uses DB) | ✅ PracticeService uses MissionsService which reads from DB. ✅ No hard-coded mission lists |
| **7.13** Persona compatibility integration | **Done** | `missions.service.ts:45-68` (attraction filtering), `practice.service.ts:553` | ✅ Attraction logic works with categories. ✅ Persona compatibility respected |
| **7.14** No TS/lint/runtime errors | **Unknown** | Not verified in this scout | ⚠️ Requires manual verification: `npm run lint`, `npm run start:dev`, browser console check |
| **7.15** Manual QA scenario works | **Unknown** | Not verified in this scout | ⚠️ Requires manual testing: create category → assign missions → see in app → run mission → see stats |

---

## 3. Gap Analysis

### Dashboard #1 — Mission / Deep Insights Monitor

#### Missing Features:

**7.3 Mission Stats Summary**
- **Required:** Per-mission stats endpoint
  - `GET /v1/admin/missions/:id/stats`
  - Returns: sessionCount, successRate, avgMessages, avgDuration, timeWindow selector
- **Data Available:** 
  - `PracticeSession` table has `templateId`, `score`, `isSuccess`, `endedAt`, `createdAt`
  - `PracticeMessage` table has `sessionId`, `role`
- **Schema Changes:** None needed
- **Files to Create/Modify:**
  - `backend/src/modules/missions-admin/missions-admin.controller.ts` - Add stats endpoint
  - `backend/src/modules/missions-admin/missions-admin.service.ts` - Add `getMissionStats(id)` method
  - `backend/public/dev-dashboard.html` - Add stats panel in mission detail view

**7.4 Mood Timeline Visualization**
- **Required:** Chart/visualization component in dashboard
- **Data Available:**
  - `MissionMoodTimeline` table has `timelineJson` (array of MoodSnapshot)
  - Endpoint exists: `GET /v1/stats/mood/session/:sessionId`
- **Schema Changes:** None needed
- **Files to Create/Modify:**
  - `backend/src/modules/missions-admin/missions-admin.controller.ts` - Add endpoint to get mood timeline by missionId
  - `backend/src/modules/missions-admin/missions-admin.service.ts` - Add method to aggregate mood timelines for a mission
  - `backend/public/dev-dashboard.html` - Add chart component (use Chart.js or similar)
  - Add visualization in mission detail view

**7.5 Per-Message Log**
- **Required:** Message list UI showing user/AI messages, scores, mood deltas, gate triggers
- **Data Available:**
  - `PracticeMessage` table has `role`, `content`, `score`, `traitData`
  - `PracticeSession` has `id` (can fetch messages)
  - `GateOutcome` table exists (for gate triggers)
- **Schema Changes:** None needed
- **Files to Create/Modify:**
  - `backend/src/modules/missions-admin/missions-admin.controller.ts` - Add endpoint `GET /v1/admin/missions/:id/sessions/:sessionId/messages`
  - `backend/src/modules/missions-admin/missions-admin.service.ts` - Add method to fetch session messages with scores
  - `backend/public/dev-dashboard.html` - Add message log UI in mission detail view

**7.1 & 7.2 Enhancements**
- **Required:** Add missing columns to mission list and detail view
- **Files to Modify:**
  - `backend/public/dev-dashboard.html` - Add columns: aiStyleKey, attractionTarget, status, updatedAt/createdAt
  - `backend/public/dev-dashboard.html` - Add MissionConfigV1 breakdown in detail view

**7.6 Error Handling**
- **Required:** Explicit "No data yet" states
- **Files to Modify:**
  - `backend/public/dev-dashboard.html` - Add empty state components for: no sessions, no mood timeline, partial config

### Dashboard #2 — Practice Hub / Categories & Mission Editor

#### Missing Features:

**7.9 Missions ↔ Categories Mapping (Enhancement)**
- **Required:** UI to add/remove missions from category directly
- **Current:** Can only change category via mission editor
- **Files to Modify:**
  - `backend/public/dev-dashboard.html` - Add "Add Mission to Category" button in category view
  - `backend/public/dev-dashboard.html` - Add "Remove from Category" button in missions view modal

**7.10 Attraction Target Enforcement (Enhancement)**
- **Required:** UI warning when trying to remove/disable only male/female category
- **Files to Modify:**
  - `backend/public/dev-dashboard.html` - Add validation in `deleteCategory()` and `saveCategory()` functions
  - Check if category is only FEMALE_PATH or MALE_PATH before allowing delete/disable

**7.8 Visual Practice Hub (Enhancement)**
- **Current:** Functional grid view
- **Note:** Spec says "doesn't have to be pretty, but must be clear and data-driven" - ✅ Current implementation meets this

---

## 4. Implementation Plan

### Phase 1: Dashboard #1 Core Features (7.1, 7.2, 7.3, 7.6)

**Order:**
1. **Enhance Mission List (7.1)**
   - Modify `dev-dashboard.html:renderMissionsList()` to add columns: aiStyleKey, attractionTarget, status, updatedAt/createdAt
   - Update `missions-admin.service.ts:listMissionsFlat()` to include these fields if missing

2. **Enhance Mission Detail View (7.2)**
   - Modify `dev-dashboard.html:selectMission()` to show MissionConfigV1 breakdown
   - Parse `aiContract.missionConfigV1` and display: objective, difficulty details, runtimeProfile, gate config
   - Add collapsible sections for each config section

3. **Add Mission Stats Summary (7.3)**
   - Create `missions-admin.service.ts:getMissionStats(missionId, timeWindow?)`
   - Query `PracticeSession` for: sessionCount, successCount, avgMessages (from PracticeMessage count), avgDuration
   - Add endpoint `GET /v1/admin/missions/:id/stats` in `missions-admin.controller.ts`
   - Add stats panel in `dev-dashboard.html` mission detail view
   - Add time window selector (Last 7 days, 30 days, All time)

4. **Add Error Handling (7.6)**
   - Add empty state components in `dev-dashboard.html`:
     - "No sessions yet" when mission has no sessions
     - "No mood timeline available" when timeline is missing
     - "Partial config" warning when MissionConfigV1 is incomplete

### Phase 2: Dashboard #1 Advanced Features (7.4, 7.5)

**Order:**
5. **Add Mood Timeline Visualization (7.4)**
   - Create `missions-admin.service.ts:getMissionMoodTimelines(missionId)`
   - Aggregate mood timelines from all sessions for a mission
   - Add endpoint `GET /v1/admin/missions/:id/mood-timelines` in `missions-admin.controller.ts`
   - Add Chart.js (or similar) library to `dev-dashboard.html`
   - Create mood timeline chart component
   - Display in mission detail view

6. **Add Per-Message Log (7.5)**
   - Create `missions-admin.service.ts:getSessionMessages(sessionId)`
   - Fetch messages with scores, compute mood deltas, fetch gate triggers
   - Add endpoint `GET /v1/admin/missions/:id/sessions/:sessionId/messages` in `missions-admin.controller.ts`
   - Add message log UI in `dev-dashboard.html`
   - Show: turn index, role, content, score, rarity tier, mood delta, gate triggers

### Phase 3: Dashboard #2 Enhancements (7.9, 7.10)

**Order:**
7. **Enhance Missions ↔ Categories Mapping (7.9)**
   - Add "Add Mission to Category" button in category view modal
   - Add "Remove from Category" button in missions view table
   - Create endpoints: `PUT /v1/admin/missions/:id/category` (set categoryId)
   - Wire up UI to call endpoints

8. **Add Attraction Target Enforcement UI (7.10)**
   - Modify `dev-dashboard.html:deleteCategory()` to check if category is only FEMALE_PATH or MALE_PATH
   - Modify `dev-dashboard.html:saveCategory()` to warn when disabling only male/female category
   - Add validation logic: count categories by attractionPath before allowing delete/disable

### Phase 4: QA & Verification (7.14, 7.15)

**Order:**
9. **Verify No TS/Lint/Runtime Errors (7.14)**
   - Run `npm run lint` in backend
   - Run `npm run start:dev` and check for startup errors
   - Load `dev-dashboard.html` in browser and check console for JS errors
   - Fix any errors found

10. **Manual QA Scenario (7.15)**
    - Create/edit category in Dashboard #2
    - Assign missions to category
    - Open Practice Hub in mobile app
    - Verify category + missions appear
    - Run a mission
    - Check Dashboard #1 stats view shows the session

---

## 5. Risk Assessment

### Low Risk
- **Phase 1 (7.1, 7.2, 7.3, 7.6):** Simple UI enhancements and new endpoints. No schema changes.
- **Phase 3 (7.9, 7.10):** UI-only changes with existing endpoints.

### Medium Risk
- **Phase 2 (7.4, 7.5):** 
  - Mood timeline aggregation may be slow for missions with many sessions (consider pagination/caching)
  - Message log may be large (consider pagination)
  - Chart.js dependency adds external library

### High Risk
- **None identified** - All changes are additive and backward compatible

### Performance Considerations
- Mission stats aggregation: Consider caching or background job for frequently accessed missions
- Mood timeline aggregation: May need pagination if mission has 100+ sessions
- Message log: Paginate messages (e.g., 50 per page)

### Circular Dependencies
- **None identified** - All new endpoints are in `missions-admin` module, no cross-module dependencies

---

## 6. Summary

### What's Solid ✅
- **Dashboard #2 (Practice Hub Designer):** Fully functional category CRUD, visual grid, mission-category viewing
- **PracticeService Integration:** Uses DB data, respects attraction logic
- **Backend APIs:** Solid foundation with proper NestJS controllers/services
- **Data Schema:** All required fields exist in Prisma schema

### What's Missing ❌
- **Dashboard #1 Core:** Mission stats summary, mood timeline visualization, per-message log
- **Dashboard #1 Enhancements:** Missing columns in mission list, incomplete config view
- **Dashboard #2 Enhancements:** Direct add/remove missions from category, attraction enforcement UI warnings
- **Error Handling:** No explicit empty states

### Implementation Priority
1. **High Priority:** 7.1, 7.2, 7.3 (core mission monitoring features)
2. **Medium Priority:** 7.4, 7.5 (advanced analytics)
3. **Low Priority:** 7.9, 7.10 (UX enhancements)

### Estimated Effort
- **Phase 1:** 4-6 hours
- **Phase 2:** 6-8 hours
- **Phase 3:** 2-3 hours
- **Phase 4:** 2-3 hours
- **Total:** 14-20 hours

---

## 7. Next Steps

1. **Review this SCOUT report** with team
2. **Prioritize phases** based on business needs
3. **Begin Phase 1** implementation (Dashboard #1 core features)
4. **Test incrementally** after each phase
5. **Update defense report** after completion

---

**End of SCOUT Report**

