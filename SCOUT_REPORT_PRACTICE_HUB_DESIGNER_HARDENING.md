# SCOUT REPORT — Practice Hub Designer Hardening

**Date:** 2025-01-15  
**Mode:** SCOUT PHASE (Verification Before Fixes)

---

## A. SCOUT PHASE — Hard Checklist Results

### A.1 Prisma Schema — ✅ PASSES

**File:** `backend/prisma/schema.prisma`

**AttractionPath Enum:**
- ✅ Exists at line 608-612
- ✅ Values: `UNISEX`, `FEMALE_PATH`, `MALE_PATH`

**MissionCategory Model:**
- ✅ Has `attractionPath AttractionPath @default(UNISEX)` (line 189)
- ✅ Has `isAttractionSensitive Boolean @default(false)` (line 190)
- ✅ Has `dynamicLabelTemplate String?` (line 191)
- ✅ Has `displayOrder Int @default(0)` (line 192)
- ✅ Has `iconUrl String?` (line 193)
- ✅ Has `active Boolean @default(true)` (line 194)
- ✅ **NO `targetRomanticGender` field** (correct - mission-level only)

**PracticeMissionTemplate Model:**
- ✅ Has `isAttractionSensitive Boolean @default(false)` (line 280)
- ✅ Has `targetRomanticGender Gender?` (line 281)
- ✅ All existing Step 5/6 fields intact

**Verdict:** Schema matches spec perfectly.

---

### A.2 DTOs — ✅ PASSES

**Mission DTOs (`admin-mission.dto.ts`):**
- ✅ `isAttractionSensitive?: boolean` (line 203-205)
- ✅ `targetRomanticGender?: Gender` (line 207-208)
- ✅ Types match Prisma schema (uses `Gender` enum from `@prisma/client`)

**Category DTOs (`admin-category.dto.ts`):**
- ✅ `attractionPath?: AttractionPath` (line 65-66)
- ✅ `isAttractionSensitive?: boolean` (line 69-71)
- ✅ `dynamicLabelTemplate?: string` (line 74-77)
- ✅ `displayOrder?: number` (line 80-83)
- ✅ `iconUrl?: string` (line 86-89)
- ✅ `active?: boolean` (line 92-94)
- ✅ Types match Prisma schema (uses `AttractionPath` enum from `@prisma/client`)

**Verdict:** All DTOs have required fields with correct types.

---

### A.3 Admin Service Validation — ⚠️ MOSTLY PASSES, MINOR ISSUES

**Mission-Category Consistency:**

**`createMission()` (lines 569-618):**
- ✅ Loads category if `categoryId` or `categoryCode` provided
- ✅ Validates FEMALE_PATH → requires `isAttractionSensitive = true` and `targetRomanticGender = FEMALE`
- ✅ Validates MALE_PATH → requires `isAttractionSensitive = true` and `targetRomanticGender = MALE`
- ✅ UNISEX has no restrictions
- ✅ Auto-sets fields based on category if not provided

**`updateMission()` (lines 825-908):**
- ✅ Loads category if `categoryId`/`categoryCode` provided OR loads existing category
- ✅ Same validation rules as `createMission()`
- ✅ Handles case where category is not being changed (loads existing)

**Category Uniqueness:**

**`createCategory()` (lines 1165-1188):**
- ✅ Validates FEMALE_PATH uniqueness (checks for existing, throws if found)
- ✅ Validates MALE_PATH uniqueness (checks for existing, throws if found)
- ✅ Auto-enforces `isAttractionSensitive = true` for gender paths
- ✅ Auto-sets `dynamicLabelTemplate` if missing for gender paths

**`updateCategory()` (lines 1220-1270):**
- ✅ Validates uniqueness when `attractionPath` is being changed
- ✅ Checks for existing with `id: { not: id }` (correct exclusion)
- ✅ Same auto-enforcement rules

**Verdict:** Validation logic is correct and comprehensive.

---

### A.4 Admin Controller — ✅ PASSES

**File:** `backend/src/modules/missions-admin/missions-admin.controller.ts`

**Category Endpoints:**
- ✅ `GET /v1/admin/missions/categories` → `listCategories()` (line 133-136)
- ✅ `POST /v1/admin/missions/categories` → `createCategory()` (line 141-144)
- ✅ `PUT /v1/admin/missions/categories/:id` → `updateCategory()` (line 149-155)
- ✅ `DELETE /v1/admin/missions/categories/:id` → `deleteCategory()` (line 160-163)
- ✅ `POST /v1/admin/missions/categories/reorder` → `reorderCategories()` (line 168-171)

**Reorder Endpoint:**
- ✅ Accepts `{ items: Array<{ id: string; displayOrder: number }> }`
- ✅ Delegates to `reorderCategories()` in service

**Verdict:** All endpoints exist and are properly wired.

---

### A.5 Dev Dashboard — ⚠️ ISSUES FOUND

**File:** `backend/public/dev-dashboard.html`

**Practice Hub Designer Section:**
- ✅ Category grid exists (line ~520)
- ✅ Category tiles show: label, attraction badge, active status, display order
- ✅ Edit and View Missions buttons exist
- ✅ Category editor modal exists with all fields
- ✅ Missions view modal exists

**Mission Editor Integration:**
- ✅ Attraction fields added to mission editor (lines ~512-530)
- ✅ `getMissionFormValues()` includes attraction fields (lines ~1119-1125)
- ✅ `clearMissionForm()` clears attraction fields (lines ~1109-1112)

**⚠️ ISSUE: `selectMission()` Override:**
- **Problem:** `selectMission()` is overridden at line 1458, but the original function is defined at line 1727
- **Issue:** The override happens BEFORE the original function is defined (hoisting issue)
- **Impact:** The override may not work correctly because it captures `selectMission` before it's defined
- **Fix Needed:** Move the override to AFTER the original function definition, or use a different pattern

**Verdict:** UI structure is correct, but `selectMission` override has a timing issue.

---

### A.6 Seed — ❌ FAILS VALIDATION

**File:** `backend/prisma/seed.ts`

**Issues Found:**

1. **MALE-target missions in FEMALE_PATH category:**
   - `OPENERS_L1_M3_MALE` (line 225-252) has `targetRomanticGender = MALE` but is in `openersCategory`
   - `openersCategory` is set to `attractionPath = FEMALE_PATH` (line 43, 53)
   - **Violation:** Mission with `targetRomanticGender = MALE` cannot be in a `FEMALE_PATH` category

2. **Missing MALE_PATH category:**
   - Seed creates FEMALE_PATH category (OPENERS)
   - Seed creates UNISEX categories (FLIRTING, RECOVERY)
   - **Missing:** No MALE_PATH category exists
   - **Impact:** MALE-target missions have no valid category to belong to

**What's Correct:**
- ✅ OPENERS category has `attractionPath = FEMALE_PATH`
- ✅ OPENERS category has `isAttractionSensitive = true` and `dynamicLabelTemplate`
- ✅ FEMALE-target missions (`OPENERS_L1_M1`, `OPENERS_L1_M2`) are correctly in OPENERS category
- ✅ FLIRTING and RECOVERY have `attractionPath = UNISEX`
- ✅ All categories have `displayOrder` and `active = true`

**Verdict:** Seed data violates validation rules. Need to create MALE_PATH category and move MALE-target missions to it.

---

## B. DECISION PHASE — What Needs Fixing

### Critical Issues:

1. **Seed Data Violation (CRITICAL):**
   - MALE-target missions assigned to FEMALE_PATH category
   - Need to create MALE_PATH category
   - Need to move MALE-target missions to MALE_PATH category

2. **Dev Dashboard JS Timing (MINOR):**
   - `selectMission` override happens before function definition
   - Should move override to after original function definition

### Non-Issues (Already Correct):

- ✅ Schema matches spec
- ✅ DTOs have all required fields
- ✅ Validation logic is correct
- ✅ Controller endpoints are wired
- ✅ Mission editor has attraction fields

---

## C. EXECUTION PHASE — Minimal Fixes

### Fix 1: Seed Data — Create MALE_PATH Category

**Action:** Add a new MALE_PATH category (e.g., "OPENERS_MALE" or "Approach Men") and move MALE-target missions to it.

### Fix 2: Dev Dashboard — Fix selectMission Override

**Action:** Move the `selectMission` override to after the original function definition.

---

**END OF SCOUT REPORT**

