# Dev Dashboard v2 Implementation Status

**Date:** 2025-01-15  
**Status:** FOUNDATIONAL STRUCTURE COMPLETE - Core features in progress

---

## ✅ COMPLETED

### 1. Top-Level Mode Switcher
- **Location:** `backend/dashboards_bundle/dev-dashboard.html:364-370`
- **Status:** ✅ Complete
- **Features:**
  - Two-mode switcher (Engine Map / Practice Hub)
  - Visual button states
  - Mode switching logic wired

### 2. v2 Layout Structure
- **Location:** CSS styles added, HTML structure in place
- **Status:** ✅ Complete
- **Features:**
  - Main layout grid (canvas + inspector)
  - Modal overlay system
  - Toast notification system
  - Field validation styling (glow/pulse effects)

### 3. Engine Map Basic Rendering
- **Location:** `renderEngineMap()` function
- **Status:** ⚠️ Partial (visual nodes rendered, editors not wired)
- **Features:**
  - 6 nodes rendered (Mission Begin, AI Engine Layers, Micro Feedback, Mission End, Mission Review, Stats)
  - Node click handlers
  - Inspector updates on node selection
- **Missing:**
  - Node editors not implemented
  - Library CRUD not wired

### 4. Practice Hub Basic Rendering
- **Location:** `renderPracticeHub()` function
- **Status:** ⚠️ Partial (structure rendered, drag-drop missing)
- **Features:**
  - Category rows rendered
  - Mission cards rendered
  - Create/Edit buttons
- **Missing:**
  - Drag-and-drop reordering
  - Category defaults UI

### 5. Mission Builder Modal
- **Location:** `openMissionBuilderModal()` function
- **Status:** ⚠️ Partial (form structure complete, aiContract generation missing)
- **Features:**
  - Form with required fields
  - Validation with glow effects
  - Toast notifications
  - Save/Create endpoints wired
- **Missing:**
  - aiContract generation from form
  - Opening strings management
  - Full MissionConfigV1 construction

### 6. Load Everything Integration
- **Location:** `loadEverything()` function
- **Status:** ✅ Complete
- **Features:**
  - Syncs data to v2State
  - Refreshes Practice Hub on load

---

## ⚠️ IN PROGRESS

### 7. Library Editors (Engine Map Nodes)
**Status:** Not Started
**Required:**
- Personas library CRUD (endpoint exists: `/v1/admin/personas`)
- AI Styles library CRUD (endpoint exists: `/v1/admin/ai-styles`)
- Objectives library CRUD (needs endpoint - currently in EngineConfig JSON)
- Gate Sets CRUD (needs endpoint - currently in EngineConfig JSON)
- Dynamics Profiles CRUD (needs endpoint - currently in EngineConfig JSON)
- Scoring Profiles CRUD (needs endpoint - currently in EngineConfig JSON)
- Difficulty Profiles CRUD (needs table + endpoint - truly missing)
- MicroFeedback CRUD (needs endpoint - currently in EngineConfig JSON)
- Insight Packs CRUD (needs endpoint - currently `/v1/admin/insights/catalog` read-only)
- Hooks CRUD (endpoint exists: `/v1/admin/hooks`)
- Signal Registry CRUD (needs table + endpoint - truly missing)
- Trigger Rules CRUD (needs endpoint - currently stats only)

### 8. Config Slots System
**Status:** Not Started
**Required:**
- Prisma model: `ConfigSlot` table
- Endpoints: `GET/POST /v1/admin/config-slots`, `GET/POST /v1/admin/config-slots/:id`
- UI: Save/Load slot buttons
- Persistence: Full snapshot (engine config + categories + missions + default seed)

### 9. Drag-and-Drop Reordering
**Status:** Not Started
**Required:**
- HTML5 drag-and-drop API
- Reorder endpoint: `/v1/admin/missions/reorder` (exists)
- Visual feedback during drag
- Block cross-category drag with toast

### 10. Category Defaults
**Status:** Not Started
**Required:**
- Category editor with defaults section
- Fields: dynamicsProfileCode, scoringProfileCode, microFeedbackProfileCode, insightPackCode
- Save to category config (needs DB field or JSON extension)

---

## ❌ NOT STARTED

### 11. Mission Builder aiContract Generation
- Build full MissionConfigV1 from form inputs
- Include openings array
- Include statePolicy from limits
- Validate before save

### 12. Inspector Panel Enhancements
- Show node/mission/category details
- Action buttons for each type
- Context-aware rendering

### 13. Default Seed Selection
- UI for selecting default seed
- Persistence in Config Slots
- Integration with Mission Begin node

---

## BACKEND WORK REQUIRED

### Missing Endpoints (Need Creation)

1. **Objectives CRUD**
   - `GET /v1/admin/objectives`
   - `POST /v1/admin/objectives`
   - `PUT /v1/admin/objectives/:id`
   - `DELETE /v1/admin/objectives/:id`
   - **Current:** Only in `EngineConfig.configJson.gateRequirementTemplates[]`

2. **Gate Sets CRUD**
   - `GET /v1/admin/gate-sets`
   - `POST /v1/admin/gate-sets`
   - `PUT /v1/admin/gate-sets/:id`
   - `DELETE /v1/admin/gate-sets/:id`
   - **Current:** Only in `EngineConfig.configJson.gates[]`

3. **Dynamics Profiles CRUD**
   - `GET /v1/admin/dynamics-profiles`
   - `POST /v1/admin/dynamics-profiles`
   - `PUT /v1/admin/dynamics-profiles/:id`
   - `DELETE /v1/admin/dynamics-profiles/:id`
   - **Current:** Only in `EngineConfig.configJson.dynamicsProfiles[]`

4. **Scoring Profiles CRUD**
   - `GET /v1/admin/scoring-profiles`
   - `POST /v1/admin/scoring-profiles`
   - `PUT /v1/admin/scoring-profiles/:id`
   - `DELETE /v1/admin/scoring-profiles/:id`
   - **Current:** Only in `EngineConfig.configJson.scoringProfiles[]`

5. **Difficulty Profiles CRUD**
   - `GET /v1/admin/difficulty-profiles`
   - `POST /v1/admin/difficulty-profiles`
   - `PUT /v1/admin/difficulty-profiles/:id`
   - `DELETE /v1/admin/difficulty-profiles/:id`
   - **Current:** Truly missing (not in DB, not in EngineConfig)

6. **Signal Registry CRUD**
   - `GET /v1/admin/signals`
   - `POST /v1/admin/signals`
   - `PUT /v1/admin/signals/:id`
   - `DELETE /v1/admin/signals/:id`
   - **Current:** Truly missing

7. **Config Slots CRUD**
   - `GET /v1/admin/config-slots`
   - `POST /v1/admin/config-slots`
   - `GET /v1/admin/config-slots/:id`
   - `PUT /v1/admin/config-slots/:id`
   - `DELETE /v1/admin/config-slots/:id`
   - **Current:** Truly missing

### Missing DB Tables (Need Prisma Models)

1. **ConfigSlot**
   ```prisma
   model ConfigSlot {
     id          String   @id @default(cuid())
     name        String
     slotNumber  Int?     // 1-5 for quick access
     engineConfigJson Json
     categoriesJson   Json?  // Snapshot of categories
     missionsJson     Json?  // Snapshot of missions
     defaultSeedKey   String?
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
   }
   ```

2. **DifficultyProfile** (if standalone)
   ```prisma
   model DifficultyProfile {
     id          String   @id @default(cuid())
     code        String   @unique
     name        String
     level       MissionDifficulty
     strictness  Int?     // 0-100
     // ... other fields
   }
   ```

3. **SignalRegistry** (if standalone)
   ```prisma
   model SignalRegistry {
     id          String   @id @default(cuid())
     key         String   @unique
     name        String
     description String?
     // ... signal definition
   }
   ```

---

## FILES CHANGED SO FAR

1. `backend/dashboards_bundle/dev-dashboard.html`
   - Added v2 CSS styles
   - Added mode switcher HTML
   - Added v2 layout structure
   - Added Mission Builder modal HTML
   - Added v2 state management
   - Added mode switching functions
   - Added Engine Map rendering
   - Added Practice Hub rendering
   - Added Mission Builder modal functions
   - Integrated with loadEverything

---

## NEXT STEPS (Priority Order)

1. **Complete Mission Builder aiContract Generation**
   - Build MissionConfigV1 from form
   - Wire to save endpoint
   - Test create/edit flow

2. **Create Config Slots Backend**
   - Add Prisma model
   - Create migration
   - Add service methods
   - Add controller endpoints

3. **Wire Engine Map Node Editors**
   - Create editor modals for each node type
   - Wire to existing endpoints (Personas, Styles, Hooks)
   - Create new endpoints for missing libraries

4. **Add Drag-and-Drop**
   - Implement HTML5 drag API
   - Wire to reorder endpoint
   - Add visual feedback

5. **Category Defaults**
   - Add defaults fields to category editor
   - Persist to DB
   - Use in Mission Builder

---

## TESTING CHECKLIST

### Engine Map
- [ ] Clicking nodes opens correct editor
- [ ] Personas library CRUD works
- [ ] AI Styles library CRUD works
- [ ] Objectives library CRUD works (after endpoint created)
- [ ] Gate Sets library CRUD works (after endpoint created)
- [ ] Dynamics Profiles library CRUD works (after endpoint created)
- [ ] Scoring Profiles library CRUD works (after endpoint created)

### Practice Hub
- [ ] Categories render as rows
- [ ] Missions render as cards
- [ ] Clicking mission opens Mission Builder modal
- [ ] Clicking "+" on category opens Mission Builder in create mode
- [ ] Drag-and-drop reordering works
- [ ] Cross-category drag is blocked

### Mission Builder
- [ ] Required fields show glow when empty
- [ ] Validation shows toast with errors
- [ ] Save creates new mission
- [ ] Edit updates existing mission
- [ ] aiContract is generated correctly
- [ ] Backend validation errors are displayed

### Config Slots
- [ ] Save slot creates snapshot
- [ ] Load slot restores state
- [ ] Slot list shows all saved slots
- [ ] Delete slot works

---

**END OF STATUS DOCUMENT**

