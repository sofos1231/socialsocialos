# DEFENSE REPORT — Practice Hub Designer (Dashboard #2)

**Date:** 2025-01-15  
**Implementation Status:** ✅ COMPLETE  
**Mode:** IMPLEMENT MODE (Code Edits Applied)

---

## 1. FILES CHANGED (with short description per file)

### A) Prisma Schema & Migration

**`backend/prisma/schema.prisma`**
- Added `AttractionPath` enum with values: `UNISEX`, `FEMALE_PATH`, `MALE_PATH`
- Extended `MissionCategory` model with:
  - `attractionPath AttractionPath @default(UNISEX)`
  - `displayOrder Int @default(0)`
  - `iconUrl String?`
  - `active Boolean @default(true)`
- **Note:** Existing fields `isAttractionSensitive` and `dynamicLabelTemplate` remain unchanged

**`backend/prisma/migrations/20250115000001_add_practice_hub_designer_fields/migration.sql`** (NEW)
- Creates `AttractionPath` enum type
- Adds `attractionPath`, `displayOrder`, `iconUrl`, `active` columns to `MissionCategory` table
- All new fields have appropriate defaults for backward compatibility

**`backend/prisma/seed.ts`**
- Updated to import `AttractionPath` enum
- Updated `OPENERS` category to set `attractionPath = FEMALE_PATH` (maintains existing behavior)
- Updated `FLIRTING` and `RECOVERY` categories to set `attractionPath = UNISEX` with `displayOrder` values
- All categories set `active = true` by default

---

### B) Backend DTOs

**`backend/src/modules/missions-admin/dto/admin-mission.dto.ts`**
- Added import for `Gender` enum
- Extended `CreateMissionDto` and `UpdateMissionDto` with:
  - `isAttractionSensitive?: boolean`
  - `targetRomanticGender?: Gender`
- Both fields are optional and properly validated

**`backend/src/modules/missions-admin/dto/admin-category.dto.ts`**
- Added imports for `AttractionPath` enum and additional validators
- Extended `CreateMissionCategoryDto` and `UpdateMissionCategoryDto` with:
  - `attractionPath?: AttractionPath`
  - `isAttractionSensitive?: boolean`
  - `dynamicLabelTemplate?: string`
  - `displayOrder?: number`
  - `iconUrl?: string`
  - `active?: boolean`
- All fields properly validated with `@IsOptional()`, `@IsEnum()`, `@IsBoolean()`, `@IsInt()`, `@IsString()`

---

### C) Backend Services

**`backend/src/modules/missions-admin/missions-admin.service.ts`**
- Added imports for `Gender` and `AttractionPath` enums
- **`createMission()` validation:**
  - Validates `isAttractionSensitive` requires `targetRomanticGender` (MALE or FEMALE)
  - Validates mission-category consistency:
    - FEMALE_PATH category → mission must have `isAttractionSensitive = true` and `targetRomanticGender = FEMALE`
    - MALE_PATH category → mission must have `isAttractionSensitive = true` and `targetRomanticGender = MALE`
    - UNISEX category → no restrictions
  - Auto-sets attraction fields based on category if not provided
- **`updateMission()` validation:**
  - Same validation rules as `createMission()`
  - Loads existing category if category is not being changed
- **`listCategories()`:**
  - Updated to order by `displayOrder ASC` then `label ASC`
- **`createCategory()` validation:**
  - Enforces "at most one FEMALE_PATH category" rule
  - Enforces "at most one MALE_PATH category" rule
  - Auto-sets `isAttractionSensitive = true` for FEMALE_PATH/MALE_PATH
  - Auto-sets `dynamicLabelTemplate = "Approach {{targetPlural}}"` if missing for gender paths
- **`updateCategory()` validation:**
  - Same uniqueness rules as `createCategory()`
  - Validates when changing `attractionPath`
- **`getMeta()`:**
  - Updated to return categories with all new fields (`attractionPath`, `displayOrder`, `iconUrl`, `active`)
  - Categories ordered by `displayOrder ASC` then `label ASC`
  - Added `attractionPaths` and `genders` to `enums` object for dashboard use
- **`reorderCategories()` (NEW):**
  - Validates all category IDs exist
  - Updates `displayOrder` for multiple categories in a transaction

---

### D) Backend Controllers

**`backend/src/modules/missions-admin/missions-admin.controller.ts`**
- Added imports for category DTOs
- **New endpoints:**
  - `GET /v1/admin/missions/categories` → `listCategories()`
  - `POST /v1/admin/missions/categories` → `createCategory()`
  - `PUT /v1/admin/missions/categories/:id` → `updateCategory()`
  - `DELETE /v1/admin/missions/categories/:id` → `deleteCategory()`
  - `POST /v1/admin/missions/categories/reorder` → `reorderCategories()`

---

### E) Dev Dashboard (HTML)

**`backend/public/dev-dashboard.html`**
- **New UI Section: "Practice Hub Designer"**
  - Category grid view showing all categories as tiles
  - Each tile displays: label, attraction path badge, active status, display order
  - "Edit" and "View Missions" buttons per category
  - "Add Category" and "Reorder Categories" buttons
- **Category Editor Modal:**
  - Form fields: label, description, code (read-only), attraction path (dropdown), dynamic label template (conditional), display order, icon URL, active checkbox
  - Auto-shows/hides dynamic label template field based on attraction path
  - Auto-fills default template "Approach {{targetPlural}}" for gender paths
  - Save and Delete buttons
  - Error display for backend validation errors
- **Missions View Modal:**
  - Table showing all missions in selected category
  - Columns: title, code, difficulty, attraction-sensitive flag, target gender, active status, actions
  - Visual warnings (red border) for missions inconsistent with category path
  - "Edit" button per mission (scrolls to existing mission editor)
- **Mission Editor Integration:**
  - Added "Attraction Routing" section to existing mission editor
  - Checkbox: "Attraction-Sensitive Mission"
  - Dropdown: "Target Romantic Gender" (shown when checkbox checked)
  - Fields included in save payload
  - Auto-populated when selecting existing mission
- **JavaScript Functions:**
  - `loadCategories()` - Fetches categories from `/v1/admin/missions/meta`
  - `renderCategoriesGrid()` - Renders category tiles
  - `hubEditCategory(id)` - Opens category editor modal
  - `hubAddCategory()` - Opens empty category editor
  - `saveCategory()` - Saves category via POST/PUT
  - `deleteCategory()` - Deletes category
  - `hubViewMissions(categoryId)` - Shows missions in category
  - Enhanced `getMissionFormValues()` to include attraction fields
  - Enhanced `selectMission()` to load attraction fields
  - Enhanced `clearMissionForm()` to clear attraction fields

---

### F) Frontend (Light Touch)

**`socialsocial/components/PracticeHub.js`**
- Added TODO comment referencing future backend endpoint `/v1/practice/hub`
- No functional changes (as per requirements)

**`socialsocial/src/screens/MissionRoadScreen.tsx`**
- **Verified:** Already correctly uses `category.displayLabel` with fallback to `category.label` (line 159)
- No changes needed

---

## 2. SCHEMA & MIGRATION

### New Enum

```prisma
enum AttractionPath {
  UNISEX
  FEMALE_PATH
  MALE_PATH
}
```

### MissionCategory Model Changes

**New Fields:**
- `attractionPath AttractionPath @default(UNISEX)` - Category attraction path (replaces need for `targetRomanticGender` on category)
- `displayOrder Int @default(0)` - Order for Practice Hub display
- `iconUrl String?` - Optional icon URL for category
- `active Boolean @default(true)` - Show/hide category

**Existing Fields (Unchanged):**
- `isAttractionSensitive Boolean @default(false)` - Still used for dynamic label logic
- `dynamicLabelTemplate String?` - Template for dynamic category labels

### Migration Status

**Migration File:** `backend/prisma/migrations/20250115000001_add_practice_hub_designer_fields/migration.sql`

**SQL Operations:**
1. Creates `AttractionPath` enum type
2. Adds `attractionPath` column with default `UNISEX`
3. Adds `displayOrder` column with default `0`
4. Adds `iconUrl` column (nullable)
5. Adds `active` column with default `true`

**Note:** After applying migration, run `npx prisma generate` to regenerate Prisma client (required for TypeScript compilation).

---

## 3. API/DTO CHANGES

### Mission DTOs Extended

**`CreateMissionDto` / `UpdateMissionDto`:**
- `isAttractionSensitive?: boolean` - Optional flag
- `targetRomanticGender?: Gender` - Optional enum (MALE, FEMALE, OTHER, UNKNOWN)

**Validation Rules:**
- If `isAttractionSensitive === true`, `targetRomanticGender` MUST be provided and must be MALE or FEMALE
- If `isAttractionSensitive === false` or undefined, `targetRomanticGender` can be null/undefined

### Category DTOs Extended

**`CreateMissionCategoryDto` / `UpdateMissionCategoryDto`:**
- `attractionPath?: AttractionPath` - Optional enum (UNISEX, FEMALE_PATH, MALE_PATH)
- `isAttractionSensitive?: boolean` - Optional flag
- `dynamicLabelTemplate?: string` - Optional template string
- `displayOrder?: number` - Optional integer (min 0)
- `iconUrl?: string` - Optional URL string
- `active?: boolean` - Optional flag

**Validation Rules:**
- `attractionPath` must be valid enum value
- `displayOrder` must be integer >= 0
- All fields are optional (backward compatible)

---

## 4. VALIDATION ENFORCEMENT

### A) Category Uniqueness Rules

**Enforcement Location:** `missions-admin.service.ts::createCategory()` and `updateCategory()`

**Rules:**
1. **At most one FEMALE_PATH category:**
   - When creating/updating category with `attractionPath = FEMALE_PATH`
   - Checks if another category (different ID) already has `attractionPath = FEMALE_PATH`
   - If yes → throws `BadRequestException` with message: "Another category with FEMALE_PATH already exists: '{label}'. Only one FEMALE_PATH category is allowed."

2. **At most one MALE_PATH category:**
   - Same logic for `MALE_PATH`
   - Error message: "Another category with MALE_PATH already exists: '{label}'. Only one MALE_PATH category is allowed."

3. **UNISEX categories:**
   - No restrictions (unlimited)

**Implementation:**
```typescript
if (attractionPath === AttractionPath.FEMALE_PATH) {
  const existing = await this.prisma.missionCategory.findFirst({
    where: { attractionPath: AttractionPath.FEMALE_PATH, id: { not: id } },
  });
  if (existing) throw new BadRequestException(...);
}
```

---

### B) Mission-Category Consistency Rules

**Enforcement Location:** `missions-admin.service.ts::createMission()` and `updateMission()`

**Rules:**
1. **FEMALE_PATH category:**
   - Mission MUST have `isAttractionSensitive = true`
   - Mission MUST have `targetRomanticGender = FEMALE`
   - If not → throws `BadRequestException`: "Missions inside a FEMALE_PATH category must be attraction-sensitive and target FEMALE"

2. **MALE_PATH category:**
   - Mission MUST have `isAttractionSensitive = true`
   - Mission MUST have `targetRomanticGender = MALE`
   - If not → throws `BadRequestException`: "Missions inside a MALE_PATH category must be attraction-sensitive and target MALE"

3. **UNISEX category:**
   - No restrictions (can be attraction-sensitive or not, any target gender)

**Implementation:**
- Loads category when `categoryId` or `categoryCode` is provided
- Validates mission fields against category `attractionPath`
- Auto-sets fields if category requires them and mission doesn't specify

---

### C) Category Path Auto-Configuration

**Enforcement Location:** `missions-admin.service.ts::createCategory()` and `updateCategory()`

**Rules:**
1. **FEMALE_PATH or MALE_PATH:**
   - Forces `isAttractionSensitive = true` (even if DTO says false)
   - Forces `dynamicLabelTemplate = "Approach {{targetPlural}}"` if missing

2. **UNISEX:**
   - `isAttractionSensitive` can be true or false (no restriction)
   - `dynamicLabelTemplate` is optional

---

## 5. DEV DASHBOARD UI

### Practice Hub Designer Section

**Location:** New section below mission editor in `dev-dashboard.html`

**Features:**
1. **Category Grid View:**
   - Grid layout (responsive, auto-fill columns)
   - Each category tile shows:
     - Label (large text)
     - Attraction path badge (color-coded: pink for FEMALE_PATH, blue for MALE_PATH, grey for UNISEX)
     - Active/Inactive status badge
     - Display order number
     - "Edit" and "View Missions" buttons
   - "Load Categories" button to refresh
   - "Add Category" button to create new
   - "Reorder Categories" button (placeholder for future drag-and-drop)

2. **Category Editor Modal:**
   - Opens when clicking "Edit" or "Add Category"
   - Form fields:
     - Label (required)
     - Description (optional)
     - Code (read-only, auto-generated)
     - Attraction Path (dropdown: Unisex / Approach Women / Approach Men)
     - Dynamic Label Template (shown only for gender paths, auto-filled with default)
     - Display Order (number input)
     - Icon URL (optional)
     - Active (checkbox)
   - Save button (POST for new, PUT for existing)
   - Delete button (only for existing)
   - Error display (shows backend validation errors)

3. **Missions View Modal:**
   - Opens when clicking "View Missions" on category tile
   - Table showing all missions in that category
   - Columns: Title, Code, Difficulty, Attraction-Sensitive, Target Gender, Active, Actions
   - Visual warnings: Red border + background tint for inconsistent missions
   - "Edit" button per mission (scrolls to existing mission editor and closes modal)

4. **Mission Editor Integration:**
   - New "Attraction Routing" section in existing mission editor
   - Checkbox: "Attraction-Sensitive Mission"
   - Dropdown: "Target Romantic Gender" (shown when checkbox checked)
   - Fields auto-populated when selecting mission
   - Fields included in save payload

**Limitations:**
- No drag-and-drop for category reordering (simple number input for now)
- No drag-and-drop for mission reordering (uses existing reorder endpoint)
- Category icons not visually displayed in grid (only URL stored)
- Mission count not shown in category tiles (can be added later)

---

## 6. BACKWARD COMPATIBILITY

### Database Migration

**Default Values Applied:**
- All existing categories get `attractionPath = UNISEX` (default)
- All existing categories get `displayOrder = 0` (default)
- All existing categories get `active = true` (default)
- All existing categories keep `iconUrl = null` (nullable)

**Result:** Existing categories continue to work without changes. They will appear as "Unisex" in the Practice Hub Designer.

### API Compatibility

**Mission Endpoints:**
- `POST /v1/admin/missions` and `PUT /v1/admin/missions/:id` accept new optional fields
- If fields not provided, behavior unchanged (uses defaults or category-based auto-set)

**Category Endpoints:**
- New endpoints added (no breaking changes to existing)
- `GET /v1/admin/missions/meta` now returns additional fields (backward compatible, dashboards can ignore)

**Existing Endpoints:**
- All existing endpoints unchanged
- `/v1/missions/road` (user-facing) unchanged
- Step 5-6 engine logic unchanged

### Seed Data

**Updated Seed:**
- `OPENERS` category: Set to `FEMALE_PATH` (maintains existing attraction-sensitive behavior)
- `FLIRTING` and `RECOVERY` categories: Set to `UNISEX` with display orders
- All categories set `active = true`

**Result:** Seed data now properly initializes new fields while maintaining existing behavior.

---

## 7. TODO / FUTURE STEPS

### Phase 1: Backend Endpoint for Frontend

**`GET /v1/practice/hub` Endpoint:**
- Create new endpoint in `practice.service.ts` or `missions.service.ts`
- Returns categories with missions, ordered by `displayOrder`
- Format matches what `PracticeHub.js` expects
- Includes category icons, labels, mission counts

**Frontend Migration:**
- Update `PracticeHub.js` to fetch from `/v1/practice/hub` instead of `practiceRegistry.json`
- Remove hardcoded JSON registry dependency
- Handle loading states and errors

---

### Phase 2: Enhanced UI Features

**Category Reordering:**
- Implement drag-and-drop for category tiles
- Visual feedback during drag
- Auto-save on drop

**Mission Reordering:**
- Implement drag-and-drop in missions view modal
- Update `laneIndex` and `orderIndex` via existing reorder endpoint

**Category Icons:**
- Display icons in category grid tiles
- Icon picker/upload UI in category editor
- Icon validation (file type, size)

---

### Phase 3: Integration with Step 7 Prompt Dashboard

**Connection Points:**
- Missions reference prompt packs via `aiContract.missionConfigV1.openings.packTitle`
- Practice Hub Designer edits mission metadata (categories, attraction flags)
- Prompt Dashboard edits prompt content (titles, openings, insight templates)
- **Separation:** Practice Hub Designer does NOT edit prompt content

**Future Enhancements:**
- Show which prompt packs are used by missions in category view
- Link from mission editor to prompt pack editor
- Validation that referenced prompt packs exist

---

## 8. NOTES & CONSIDERATIONS

### Prisma Client Regeneration Required

**After applying migration, run:**
```bash
cd backend
npx prisma generate
```

This regenerates the Prisma client with the new `AttractionPath` enum and `MissionCategory` fields. TypeScript compilation will fail until this is done.

### Linter Warning (Expected)

**File:** `backend/src/modules/missions-admin/dto/admin-category.dto.ts`
**Warning:** `Module '"@prisma/client"' has no exported member 'AttractionPath'`

**Resolution:** This warning will disappear after running `npx prisma generate`. The enum exists in the schema but Prisma client hasn't been regenerated yet.

### Existing Women-Compatibility Logic

**Status:** ✅ **UNCHANGED**

All existing Step 5-6 engine logic remains intact:
- `missions.service.ts::getRoadForUser()` - Unchanged
- `missions.service.ts::selectCompatiblePersona()` - Unchanged
- Frontend `MissionRoadScreen.tsx` - Unchanged (already uses `displayLabel` correctly)
- Attraction filtering logic - Unchanged
- Dynamic label computation - Unchanged

**Result:** All existing user-facing behavior preserved.

---

## 9. TESTING CHECKLIST

### Backend Validation Tests

- [ ] Create FEMALE_PATH category → succeeds
- [ ] Create second FEMALE_PATH category → fails with clear error
- [ ] Create MALE_PATH category → succeeds
- [ ] Create second MALE_PATH category → fails with clear error
- [ ] Create mission in FEMALE_PATH category without attraction flags → auto-sets to FEMALE
- [ ] Create mission in FEMALE_PATH category with MALE target → fails with error
- [ ] Create mission in UNISEX category → no restrictions
- [ ] Update category to FEMALE_PATH when another exists → fails
- [ ] Reorder categories → updates displayOrder correctly

### Dev Dashboard UI Tests

- [ ] Load categories → grid renders correctly
- [ ] Add category → modal opens, save creates category
- [ ] Edit category → modal opens with existing data, save updates
- [ ] Delete category → confirmation, deletion works
- [ ] View missions → modal shows missions in category
- [ ] Inconsistent mission → red border shown
- [ ] Edit mission from missions view → scrolls to mission editor
- [ ] Mission editor attraction fields → save includes fields

### Frontend Compatibility Tests

- [ ] Mission Road screen → displays `displayLabel` correctly
- [ ] Practice Hub → no changes (TODO comment added)
- [ ] User with `attractedTo = WOMEN` → sees FEMALE_PATH missions
- [ ] User with `attractedTo = MEN` → sees MALE_PATH missions
- [ ] User with `attractedTo = BOTH` → sees all attraction-sensitive missions

---

**END OF DEFENSE REPORT**

