# SCOUT REPORT — Practice Hub Visual Designer & Mission Road

**Date:** 2025-01-15  
**Mode:** SCOUT MODE (No Code Edits)  
**Goal:** Map current Practice Hub / Mission Road system and propose evolution path for "Practice Hub Designer" admin dashboard

---

## 1. FILE MAP — All Relevant Files

### A) Database Layer (Prisma Schema)

**`backend/prisma/schema.prisma`** (Lines 182-196, 237-290, 156-177)
- **Role:** Core data models
- **Key Models:**
  - `MissionCategory` (Lines 182-196)
    - Fields: `id`, `code`, `label`, `description`
    - **Attraction routing:** `isAttractionSensitive`, `dynamicLabelTemplate`
    - Relations: `templates[]`, `categoryStats[]`, `categoryProgress[]`
  - `PracticeMissionTemplate` (Lines 237-290)
    - Fields: `id`, `code`, `title`, `description`, `categoryId`, `personaId`
    - **Layout:** `laneIndex`, `orderIndex`
    - **Attraction routing:** `isAttractionSensitive`, `targetRomanticGender`
    - **Config:** `aiContract` (JSON), `active`, `difficulty`, `goalType`
    - Relations: `category`, `persona`, `aiStyle`, `sessions[]`, `progress[]`
  - `AiPersona` (Lines 156-177)
    - Fields: `id`, `code`, `name`, `personaGender`, `active`
    - Relations: `missionTemplates[]`, `sessions[]`

**`backend/prisma/seed.ts`**
- **Role:** Initial data seeding
- **Key Functions:**
  - Creates 3 categories: `OPENERS` (attraction-sensitive), `FLIRTING`, `RECOVERY`
  - Creates 4 personas: `MAYA_PLAYFUL`, `NOA_CALM` (FEMALE), `DAN_CONFIDENT`, `OMER_WARM` (MALE)
  - Seeds mission templates with `laneIndex`/`orderIndex` and attraction flags

---

### B) Backend Services

**`backend/src/modules/missions/missions.service.ts`** (Lines 24-213, 221-330, 339-402)
- **Role:** User-facing mission road logic
- **Key Functions:**
  - `getRoadForUser(userId)` (Lines 24-213)
    - Loads user preferences (`gender`, `attractedTo`, `preferencePath`)
    - Fetches all active templates with `category` and `persona` includes
    - **Filters by attraction:** Non-attraction-sensitive always shown; attraction-sensitive filtered by `targetRomanticGender` vs user's `attractedTo`
    - **Computes dynamic labels:** Uses `dynamicLabelTemplate` to replace `{{targetPlural}}` based on user preference
    - Groups by `laneIndex`, sorts by `orderIndex`
    - Computes unlock status (first in lane unlocked, others require previous completed)
    - Returns array with `category.displayLabel` (computed) and `category.label` (static)
  - `startMissionForUser(userId, templateId)` (Lines 221-330)
    - Validates template exists, active, unlocked
    - **Persona compatibility:** Calls `selectCompatiblePersona()` for attraction-sensitive missions
    - Returns mission payload with persona info
  - `selectCompatiblePersona(template, currentPersona)` (Lines 339-375)
    - For attraction-sensitive missions, ensures persona gender matches `targetRomanticGender`
    - Auto-selects compatible persona if current doesn't match

**`backend/src/modules/missions/missions.controller.ts`**
- **Role:** HTTP endpoints for mobile app
- **Endpoints:**
  - `GET /v1/missions/road` → `getRoadForUser()`
  - `POST /v1/missions/:id/start` → `startMissionForUser()`

**`backend/src/modules/missions-admin/missions-admin.service.ts`** (Lines 185-997)
- **Role:** Admin dashboard backend logic
- **Key Functions:**
  - `getMeta()` (Lines 185-215)
    - Returns `categories`, `personas`, `aiStyles` for dropdowns
  - `getRoad()` (Lines 219-241)
    - Returns all active missions ordered by `laneIndex`/`orderIndex` (no user filtering)
    - Used by admin dashboard to see full mission road
  - `listMissionsFlat()` (Lines 243-254)
    - Returns all missions (active + inactive) for admin editing
  - `createMission(dto)` (Lines 394-583)
    - Creates mission with validation of `aiContract.missionConfigV1`
    - Handles `categoryId`, `personaId`, `laneIndex`, `orderIndex`
    - **Note:** Does NOT currently handle `isAttractionSensitive` or `targetRomanticGender` in DTO
  - `updateMission(id, dto)` (Lines 585-828)
    - Updates mission fields (including `categoryId`, `laneIndex`, `orderIndex`)
    - **Note:** Does NOT currently handle `isAttractionSensitive` or `targetRomanticGender` in DTO
  - `reorderMissions(dto)` (Lines 852-910)
    - Updates `laneIndex` and `orderIndex` for multiple missions
  - `listCategories()` (Lines 913-918)
  - `createCategory(dto)` (Lines 920-946)
    - Creates category with `code`, `label`, `description`
    - **Note:** Does NOT currently handle `isAttractionSensitive` or `dynamicLabelTemplate` in DTO
  - `updateCategory(id, dto)` (Lines 948-976)
    - Updates category fields
    - **Note:** Does NOT currently handle `isAttractionSensitive` or `dynamicLabelTemplate` in DTO

**`backend/src/modules/missions-admin/missions-admin.controller.ts`**
- **Role:** Admin HTTP endpoints
- **Endpoints:**
  - `GET /v1/admin/missions/meta` → `getMeta()`
  - `GET /v1/admin/missions/road` → `getRoad()`
  - `GET /v1/admin/missions` → `listMissionsFlat()`
  - `POST /v1/admin/missions` → `createMission()`
  - `PUT /v1/admin/missions/:id` → `updateMission()`
  - `DELETE /v1/admin/missions/:id` → `softDeleteMission()`
  - `POST /v1/admin/missions/reorder` → `reorderMissions()`
  - Category endpoints (implied, not shown in controller but exist in service)

---

### C) Frontend (React Native / Expo)

**`socialsocial/src/screens/MissionRoadScreen.tsx`** (Lines 1-241)
- **Role:** Mission Road screen (lane-based view)
- **Key Logic:**
  - Fetches from `GET /v1/missions/road`
  - `buildLanesFromAny()` (Lines 38-81): Groups missions by `laneIndex`, sorts by `orderIndex`
  - Renders lanes as vertical sections
  - Each mission card shows:
    - `category.displayLabel` or `category.label` (uppercase, green)
    - `title`, `description`
    - "Start Mission" button
  - **Note:** Frontend expects flat array or `{ lanes: [...] }` format

**`socialsocial/components/PracticeHub.js`** (Lines 1-324)
- **Role:** Main Practice Hub screen (category carousels)
- **Key Logic:**
  - Loads categories from `../data/practiceRegistry.json` (currently empty)
  - Renders `PracticeCategoryCarousel` for each category
  - Shows hub stats from `store.hub` (fetched via `usePracticeStore`)
  - **Note:** Categories are currently hardcoded in JSON (empty), not driven by backend

**`socialsocial/components/PracticeCategoryCarousel.js`**
- **Role:** Horizontal carousel for category sessions
- **Key Logic:**
  - Renders `category.sessions[]` as horizontal scrollable cards
  - Shows category title, subtitle, icon

**`socialsocial/data/practiceRegistry.json`**
- **Role:** Frontend category registry (currently empty)
- **Status:** Not currently used; categories should come from backend

**`socialsocial/src/lib/api.ts`**
- **Role:** API client
- **Endpoints:**
  - `getHub()` → `/practice/hub`
  - `listMissions(category?)` → `/practice/missions`

---

### D) Dev Dashboard (HTML)

**`backend/public/dev-dashboard.html`** (Lines 1-1555)
- **Role:** Single-file HTML admin dashboard for mission editing
- **Current Capabilities:**
  - **Mission Management:**
    - List missions (searchable)
    - Create/update/delete missions
    - Edit: `title`, `difficulty`, `categoryId`, `personaId`, `active`, `code`, `aiStyleKey`
    - Edit `aiContract` JSON (full MissionConfigV1 blob)
  - **Meta Loading:**
    - Loads categories, personas, aiStyles from `/v1/admin/missions/meta`
  - **Missing:**
    - No visual representation of categories as tiles/lanes
    - No category editing UI (name, attraction mode, order)
    - No mission reordering UI (drag-and-drop)
    - No attraction flags editing (`isAttractionSensitive`, `targetRomanticGender`)
    - No category-level attraction mode (`isAttractionSensitive`, `dynamicLabelTemplate`)
    - No visual grouping by category in mission list

---

## 2. DATA FLOW — How It Works Today

### A) Database → Backend → Frontend Flow

#### **Mission Road (User-Facing)**

1. **User opens Mission Road screen** → `MissionRoadScreen.tsx`
2. **Frontend calls** `GET /v1/missions/road` (with JWT)
3. **Backend** (`missions.service.ts::getRoadForUser()`):
   - Loads user preferences: `gender`, `attractedTo`, `preferencePath`
   - Fetches all active `PracticeMissionTemplate` with:
     ```prisma
     where: { active: true }
     include: { persona: true, category: true }
     orderBy: [{ laneIndex: 'asc' }, { orderIndex: 'asc' }]
     ```
   - **Filters by attraction:**
     - Non-attraction-sensitive: always included
     - Attraction-sensitive: filtered by `targetRomanticGender` matching user's `attractedTo`
   - **Computes dynamic category labels:**
     - If category has `isAttractionSensitive = true` and `dynamicLabelTemplate`:
       - Replaces `{{targetPlural}}` with "Women", "Men", or "Women & Men" based on `attractedTo`
     - Returns `category.displayLabel` (computed) and `category.label` (static)
   - Groups by `laneIndex`, sorts by `orderIndex`
   - Computes unlock status per user
4. **Frontend receives:** Flat array of missions with `laneIndex`, `orderIndex`, `category.displayLabel`
5. **Frontend groups:** `buildLanesFromAny()` creates `Lane[]` structure
6. **Frontend renders:** Vertical lanes, each showing missions with category label above title

#### **Practice Hub (User-Facing)**

1. **User opens Practice Hub** → `PracticeHub.js`
2. **Frontend loads:** Categories from `practiceRegistry.json` (currently empty)
3. **Frontend also fetches:** Hub data via `usePracticeStore.fetchHub()` → `/practice/hub`
4. **Frontend renders:** Category carousels (currently empty due to empty registry)
5. **Note:** Practice Hub is NOT currently driven by backend categories; it's hardcoded JSON

#### **Admin Dashboard (Dev Dashboard)**

1. **Admin opens** `dev-dashboard.html`
2. **Admin clicks "Load Meta"** → `GET /v1/admin/missions/meta`
   - Returns: `categories[]`, `personas[]`, `aiStyles[]`
3. **Admin clicks "Load Missions"** → `GET /v1/admin/missions`
   - Returns: Flat array of all missions (active + inactive)
4. **Admin edits mission:**
   - Selects mission from list
   - Edits form fields: `title`, `difficulty`, `categoryId` (dropdown), `personaId` (dropdown), `active`, `code`, `aiStyleKey`, `aiContract` JSON
   - Clicks "Save Mission" → `PUT /v1/admin/missions/:id`
5. **Backend updates:** Mission in DB (but does NOT update attraction flags currently)

---

### B) Category & Mission Data Structure

#### **MissionCategory Model:**
```typescript
{
  id: string
  code: string (unique) // "OPENERS", "FLIRTING"
  label: string // "Openers"
  description?: string
  isAttractionSensitive: boolean (default: false)
  dynamicLabelTemplate?: string // "Approach {{targetPlural}}"
  templates: PracticeMissionTemplate[]
}
```

#### **PracticeMissionTemplate Model:**
```typescript
{
  id: string
  code: string (unique) // "OPENERS_L1_M1"
  title: string
  description?: string
  categoryId?: string
  category?: MissionCategory
  personaId?: string
  persona?: AiPersona
  laneIndex: number (default: 0)
  orderIndex: number (default: 0)
  isAttractionSensitive: boolean (default: false)
  targetRomanticGender?: Gender // MALE | FEMALE | OTHER | UNKNOWN
  difficulty: MissionDifficulty // EASY | MEDIUM | HARD | ELITE
  goalType?: MissionGoalType
  active: boolean (default: true)
  aiContract?: Json // { missionConfigV1: {...} }
}
```

#### **Frontend Mission Road Response Shape:**
```typescript
Array<{
  id: string
  title: string
  description?: string
  laneIndex: number
  orderIndex: number
  category: {
    id: string
    code: string
    label: string // Static label
    displayLabel: string // Computed dynamic label (e.g., "Approach Women")
  } | null
  persona: { id, name, bio, avatarUrl, voicePreset } | null
  progress: { status, bestScore } | null
  isUnlocked: boolean
  isCompleted: boolean
  isCurrent: boolean
}>
```

---

### C) Attraction Routing Logic (Current Implementation)

#### **Category-Level:**
- `isAttractionSensitive = true` → Category label is dynamic
- `dynamicLabelTemplate = "Approach {{targetPlural}}"` → Template for label
- Backend replaces `{{targetPlural}}` based on user's `attractedTo`:
  - `WOMEN` → "Approach Women"
  - `MEN` → "Approach Men"
  - `BOTH` → "Approach Women & Men"
  - `OTHER`/`UNKNOWN` → Static label (no dynamic replacement)

#### **Mission-Level:**
- `isAttractionSensitive = true` → Mission is filtered by user preference
- `targetRomanticGender = FEMALE` → Only shown to users with `attractedTo = WOMEN` or `BOTH`
- `targetRomanticGender = MALE` → Only shown to users with `attractedTo = MEN` or `BOTH`
- Non-attraction-sensitive missions: Always shown to all users

#### **Persona Compatibility:**
- For attraction-sensitive missions, backend ensures persona's `personaGender` matches mission's `targetRomanticGender`
- Auto-selects compatible persona if assigned persona doesn't match

---

## 3. GAPS — What's Missing for "Practice Hub Designer"

### A) Data Model Gaps

**✅ GOOD:** Schema already supports:
- `MissionCategory.isAttractionSensitive`, `dynamicLabelTemplate`
- `PracticeMissionTemplate.isAttractionSensitive`, `targetRomanticGender`
- `AiPersona.personaGender`

**❌ MISSING:**
- **Category ordering:** No `orderIndex` or `displayOrder` field on `MissionCategory`
  - Categories are currently ordered by `label` alphabetically in admin endpoints
  - Frontend Practice Hub uses hardcoded JSON order
- **Category icons:** No `icon` or `iconUrl` field on `MissionCategory`
  - Frontend Practice Hub expects icons but they're not in DB
- **Category active flag:** No `active` field on `MissionCategory`
  - Cannot hide categories without deleting them

---

### B) Backend Endpoint Gaps

**✅ EXISTS:**
- `GET /v1/admin/missions/meta` → Categories, personas, styles
- `GET /v1/admin/missions/road` → All missions grouped by lane
- `GET /v1/admin/missions` → Flat list of missions
- `POST /v1/admin/missions` → Create mission
- `PUT /v1/admin/missions/:id` → Update mission
- `DELETE /v1/admin/missions/:id` → Soft delete mission
- `POST /v1/admin/missions/reorder` → Reorder missions

**❌ MISSING:**
- **Category attraction fields in DTOs:**
  - `CreateMissionCategoryDto` and `UpdateMissionCategoryDto` do NOT include `isAttractionSensitive` or `dynamicLabelTemplate`
  - Cannot set attraction mode via admin API
- **Mission attraction fields in DTOs:**
  - `CreateMissionDto` and `UpdateMissionDto` do NOT include `isAttractionSensitive` or `targetRomanticGender`
  - Cannot set attraction flags via admin API
- **Category reordering:**
  - No endpoint to reorder categories (would need `orderIndex` field first)
- **Category update with attraction:**
  - `updateCategory()` exists but doesn't handle attraction fields

---

### C) Dev Dashboard UI Gaps

**✅ EXISTS:**
- Mission list (searchable)
- Mission editor (title, difficulty, category, persona, active, code, aiStyle, aiContract)
- Meta loading (categories, personas, styles)

**❌ MISSING:**
- **Visual category representation:**
  - No grid/board of category tiles matching Practice Hub layout
  - No visual grouping of missions by category
  - No category-level editing UI
- **Category editing:**
  - No form to edit category name, description, attraction mode
  - No UI to set `isAttractionSensitive` or `dynamicLabelTemplate`
- **Mission attraction flags:**
  - No UI to set `isAttractionSensitive` or `targetRomanticGender` on missions
- **Category/mission reordering:**
  - No drag-and-drop or simple UI to reorder categories
  - No drag-and-drop to reorder missions within categories
- **Gender category enforcement:**
  - No UI to enforce "exactly 1 MALE_PATH category, exactly 1 FEMALE_PATH category"
  - No warnings if trying to create second MALE_PATH or FEMALE_PATH category
- **Mission validation:**
  - No warnings if mission in MALE_PATH category has `targetRomanticGender = FEMALE`
  - No visual indicators for attraction-sensitive missions

---

### D) Frontend Coupling Gaps

**Current State:**
- `PracticeHub.js` loads categories from `practiceRegistry.json` (empty)
- `MissionRoadScreen.tsx` loads missions from `/v1/missions/road` (backend-driven)
- **Mismatch:** Practice Hub categories are NOT backend-driven

**What's Needed:**
- Practice Hub should load categories from backend (similar to Mission Road)
- Categories should be ordered by backend `orderIndex` (when added)
- Category icons should come from backend (when added)

---

## 4. DESIGN PROPOSAL — Evolution to "Practice Hub Designer"

### A) High-Level UI Structure

#### **Main Practice Hub Designer Page:**

**Layout:**
- **Header:** "Practice Hub Designer" title, save button, preview toggle
- **Category Grid:** Grid of category tiles (matching Practice Hub visual layout)
  - Each tile shows:
    - Category name (editable)
    - Attraction mode badge: "Unisex" / "Approach Women" / "Approach Men"
    - Mission count: "# missions"
    - Active/Inactive toggle
    - Edit button (opens category editor)
    - Drag handle (for reordering)
- **Add Category Button:** Creates new category (with validation for gender paths)
- **Preview Toggle:** Shows how Practice Hub will look to users

**Category Editor (Modal/Side Panel):**
- **Basic Info:**
  - Name (text input)
  - Description (textarea)
  - Code (auto-generated, editable)
  - Icon (file upload or icon picker)
- **Attraction Mode (Radio/Dropdown):**
  - Options: "Unisex" / "Approach Women" / "Approach Men"
  - **Validation:**
    - If selecting "Approach Women": Warns if another FEMALE_PATH category exists
    - If selecting "Approach Men": Warns if another MALE_PATH category exists
    - Enforces exactly 1 of each
- **Dynamic Label Template:**
  - Shown only if "Approach Women" or "Approach Men" selected
  - Default: "Approach {{targetPlural}}"
  - Editable template with `{{targetPlural}}` placeholder
- **Active Toggle:** Show/hide category
- **Order Index:** Number input (or drag-and-drop on main page)

**Mission List (When Category Clicked):**
- Shows all missions in selected category
- Each mission shows:
  - Title, difficulty, persona
  - Attraction flags: "Attraction-Sensitive" badge, target gender
  - Active/Inactive toggle
  - Edit button (opens existing mission editor)
  - Drag handle (for reordering within category)
- **Validation Warnings:**
  - If category is "Approach Women" and mission has `targetRomanticGender = MALE`: Show warning
  - If category is "Approach Men" and mission has `targetRomanticGender = FEMALE`: Show warning
- **Add Mission Button:** Creates new mission in this category

**Mission Editor (Enhanced Existing):**
- **Existing Fields:** (already in dev-dashboard.html)
  - Title, difficulty, category, persona, active, code, aiStyle, aiContract
- **New Fields:**
  - **Attraction Sensitivity:**
    - Checkbox: "Attraction-Sensitive Mission"
    - If checked, show dropdown: "Target Gender" (MALE / FEMALE)
    - **Auto-sync:** If category is MALE_PATH, auto-check and set MALE
    - **Validation:** Warn if mismatch with category
  - **Lane/Order:**
    - Lane Index (number input)
    - Order Index (number input, or drag-and-drop)

---

### B) Data / API Usage

#### **Existing Endpoints (Reuse):**
- `GET /v1/admin/missions/meta` → Categories, personas, styles
- `GET /v1/admin/missions/road` → Missions grouped by lane
- `GET /v1/admin/missions` → All missions
- `POST /v1/admin/missions` → Create mission
- `PUT /v1/admin/missions/:id` → Update mission
- `POST /v1/admin/missions/reorder` → Reorder missions

#### **New Endpoints Needed:**

**Category Management:**
- `PUT /v1/admin/missions/categories/:id` → Update category (add `isAttractionSensitive`, `dynamicLabelTemplate` to DTO)
- `POST /v1/admin/missions/categories` → Create category (add attraction fields to DTO)
- `POST /v1/admin/missions/categories/reorder` → Reorder categories (requires `orderIndex` field on model)

**Mission Attraction Fields:**
- Extend `CreateMissionDto` and `UpdateMissionDto` to include:
  - `isAttractionSensitive?: boolean`
  - `targetRomanticGender?: Gender`

**Category Attraction Fields:**
- Extend `CreateMissionCategoryDto` and `UpdateMissionCategoryDto` to include:
  - `isAttractionSensitive?: boolean`
  - `dynamicLabelTemplate?: string`

---

### C) Enforcement of Gender Categories

#### **UI-Level Enforcement:**

**Category Creation/Update:**
- When admin selects "Approach Women":
  - Check if another category with `isAttractionSensitive = true` and `targetRomanticGender = FEMALE` exists
  - If yes, show warning: "Another 'Approach Women' category exists. Only one is allowed. Change the other category first."
  - Block save until resolved
- When admin selects "Approach Men":
  - Same logic for MALE
- When admin selects "Unisex":
  - No restrictions

**Mission Validation:**
- When mission is in "Approach Women" category:
  - If mission has `isAttractionSensitive = false`: Show warning (should be true)
  - If mission has `targetRomanticGender = MALE`: Show error (must be FEMALE)
  - Auto-suggest: "Set to Attraction-Sensitive, Target: FEMALE?"
- When mission is in "Approach Men" category:
  - Same logic for MALE
- When mission is in "Unisex" category:
  - No restrictions (can be attraction-sensitive or not)

**Visual Indicators:**
- Category tiles show badge: "Unisex" / "Approach Women" / "Approach Men"
- Mission cards show badge: "Attraction-Sensitive (Women)" / "Attraction-Sensitive (Men)" / "Unisex"
- Warnings shown as red borders or warning icons

---

### D) Compatibility with Step 7 Prompt Dashboard

**High-Level Connection:**
- Missions reference prompt packs via `aiContract.missionConfigV1.openings` and `missionConfigV1.responseArchitecture`
- Categories and missions remain data-driven (no hard-coded user-facing text)
- Practice Hub Designer edits **data** (categories, missions, attraction flags)
- Prompt Dashboard (Step 7) edits **content** (prompt packs, openings, insight templates)
- **Separation:** Practice Hub Designer does NOT edit prompt content; it only references prompt pack titles/IDs

**Data Flow:**
1. Admin creates category in Practice Hub Designer → Saved to `MissionCategory` table
2. Admin creates mission in Practice Hub Designer → Saved to `PracticeMissionTemplate` table
3. Admin assigns prompt pack to mission → Stored in `aiContract.missionConfigV1.openings.packTitle`
4. Prompt Dashboard loads missions → Shows which missions use which prompt packs
5. Prompt Dashboard edits prompt pack → Updates prompt content (separate from mission metadata)

---

## 5. RISKS / OPEN QUESTIONS

### A) Data Model Risks

**Question 1: Category Ordering**
- **Current:** Categories have no `orderIndex` field
- **Risk:** If we add `orderIndex` to `MissionCategory`, need migration
- **Question:** Should categories be ordered globally, or per-lane? (Current: missions have `laneIndex`, categories don't)
- **Recommendation:** Add `displayOrder: Int` to `MissionCategory` for global ordering

**Question 2: Category Icons**
- **Current:** No icon field in schema
- **Risk:** Frontend Practice Hub expects icons but they're not stored
- **Question:** Store as URL string, or as file upload to backend storage?
- **Recommendation:** Add `iconUrl: String?` field (URL to hosted icon)

**Question 3: Category Active Flag**
- **Current:** No `active` field on `MissionCategory`
- **Risk:** Cannot hide categories without deleting (breaks foreign keys)
- **Recommendation:** Add `active: Boolean @default(true)` to `MissionCategory`

---

### B) Backend API Risks

**Question 4: Attraction Fields in DTOs**
- **Current:** `CreateMissionDto` and `UpdateMissionDto` don't include `isAttractionSensitive` or `targetRomanticGender`
- **Risk:** Admin cannot set attraction flags via API
- **Action Required:** Extend DTOs to include these fields

**Question 5: Category Attraction Fields in DTOs**
- **Current:** `CreateMissionCategoryDto` and `UpdateMissionCategoryDto` don't include `isAttractionSensitive` or `dynamicLabelTemplate`
- **Risk:** Admin cannot set category attraction mode via API
- **Action Required:** Extend DTOs to include these fields

**Question 6: Category Reordering**
- **Current:** No endpoint to reorder categories
- **Risk:** Cannot change category display order
- **Action Required:** Add `displayOrder` field to model, create reorder endpoint

---

### C) Frontend Coupling Risks

**Question 7: Practice Hub Category Source**
- **Current:** `PracticeHub.js` loads from `practiceRegistry.json` (empty)
- **Risk:** Practice Hub categories are not backend-driven
- **Question:** Should Practice Hub load categories from backend endpoint?
- **Recommendation:** Create `GET /v1/practice/hub` endpoint that returns categories with missions, ordered by `displayOrder`

**Question 8: Category Icon Display**
- **Current:** Frontend expects icons but they're not in backend
- **Risk:** Icons won't display until backend supports them
- **Recommendation:** Add `iconUrl` field, frontend can handle missing icons gracefully

---

### D) Validation & Enforcement Risks

**Question 9: Gender Category Enforcement**
- **Current:** No backend validation enforcing "exactly 1 MALE_PATH, exactly 1 FEMALE_PATH"
- **Risk:** Admin could create multiple MALE_PATH categories via API
- **Recommendation:** Add backend validation in `createCategory()` and `updateCategory()`:
  ```typescript
  if (dto.isAttractionSensitive && dto.targetRomanticGender === Gender.MALE) {
    const existing = await prisma.missionCategory.findFirst({
      where: { isAttractionSensitive: true, targetRomanticGender: Gender.MALE }
    });
    if (existing && existing.id !== id) {
      throw new BadRequestException('Only one MALE_PATH category allowed');
    }
  }
  ```

**Question 10: Mission-Category Consistency**
- **Current:** No validation that mission's `targetRomanticGender` matches category's attraction mode
- **Risk:** Mission in "Approach Women" category could have `targetRomanticGender = MALE`
- **Recommendation:** Add validation in `createMission()` and `updateMission()`:
  ```typescript
  if (category.isAttractionSensitive && category.targetRomanticGender) {
    if (dto.isAttractionSensitive !== true || dto.targetRomanticGender !== category.targetRomanticGender) {
      throw new BadRequestException('Mission attraction flags must match category');
    }
  }
  ```

---

### E) Migration & Backward Compatibility

**Question 11: Existing Data**
- **Current:** Seed has `OPENERS` category with `isAttractionSensitive = true`, `dynamicLabelTemplate = "Approach {{targetPlural}}"`
- **Risk:** Need to ensure existing categories are compatible
- **Action:** Review seed data, ensure it follows new rules

**Question 12: Frontend Practice Hub Migration**
- **Current:** `practiceRegistry.json` is empty
- **Risk:** Practice Hub won't show categories until backend endpoint is created
- **Recommendation:** Create `GET /v1/practice/hub` endpoint that returns categories in Practice Hub format

---

## 6. SUMMARY

### What We Have:
✅ Prisma schema supports attraction routing (category + mission level)  
✅ Backend filtering logic works (user-facing mission road)  
✅ Admin endpoints exist for missions and categories (basic CRUD)  
✅ Dev dashboard exists (mission editor)  
✅ Frontend Mission Road works (backend-driven)  

### What's Missing:
❌ Category ordering (no `orderIndex` field)  
❌ Category icons (no `iconUrl` field)  
❌ Category active flag (no `active` field)  
❌ Attraction fields in admin DTOs (cannot set via API)  
❌ Visual category representation in dev dashboard  
❌ Category editing UI (name, attraction mode, order)  
❌ Mission attraction flags UI  
❌ Category/mission reordering UI  
❌ Gender category enforcement (backend validation)  
❌ Mission-category consistency validation  
❌ Practice Hub backend endpoint (frontend uses empty JSON)  

### Next Steps (Implementation):
1. **Schema Migration:** Add `displayOrder`, `iconUrl`, `active` to `MissionCategory`
2. **Backend DTOs:** Extend mission and category DTOs to include attraction fields
3. **Backend Validation:** Add gender category enforcement and mission-category consistency checks
4. **Dev Dashboard UI:** Build category grid, category editor, mission attraction flags UI
5. **Practice Hub Endpoint:** Create `GET /v1/practice/hub` for frontend
6. **Frontend Migration:** Update `PracticeHub.js` to load from backend instead of JSON

---

**END OF SCOUT REPORT**

