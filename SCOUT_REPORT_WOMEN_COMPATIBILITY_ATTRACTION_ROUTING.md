# SCOUT REPORT — Women Compatibility + Attraction-Based Mission Routing

**Date:** 2025-01-XX  
**Mode:** SCOUT MODE ONLY (Read-Only Analysis)  
**Objective:** Complete system audit to prepare for adding gender support, attraction preferences, attraction-sensitive mission groups, gendered personas, and clean routing/filtering logic

---

## EXECUTIVE SUMMARY

This report provides a comprehensive audit of the SocialGym backend and frontend to identify all changes required for adding women compatibility and attraction-based mission routing. The system already has foundational gender/attraction fields in the User model, but these are not yet integrated into mission selection, persona routing, or UI flows.

**Key Findings:**
- ✅ User model already has `gender`, `attractedTo`, `preferencePath` fields
- ✅ Backend onboarding service accepts and stores these fields
- ❌ Frontend onboarding does NOT collect gender/attraction preferences
- ❌ Mission road endpoint does NOT filter by attraction preference
- ❌ Persona system has NO gender field (only implied via names/voice presets)
- ❌ Mission categories are static (no dynamic naming like "Approach Women" vs "Approach Men")
- ❌ Persona selection does NOT filter by gender compatibility
- ⚠️ Found 2 hard-coded gender references in codebase
- ✅ Step 5/6 systems (traits, gates, scoring) appear gender-neutral

---

## 1. USER MODEL AUDIT

### Current State

**File:** `backend/prisma/schema.prisma` (Lines 13-99)

**Existing Fields:**
```prisma
model User {
  // ... other fields ...
  
  /// 6B – Onboarding / Preference fields
  gender         Gender               @default(UNKNOWN)
  attractedTo    AttractionPreference @default(UNKNOWN)
  preferencePath PreferencePath       @default(UNKNOWN_PATH)
}
```

**Enums:**
```prisma
enum Gender {
  MALE
  FEMALE
  OTHER
  UNKNOWN
}

enum AttractionPreference {
  WOMEN
  MEN
  BOTH
  OTHER
  UNKNOWN
}

enum PreferencePath {
  FEMALE_PATH
  MALE_PATH
  DUAL_PATH
  OTHER_PATH
  UNKNOWN_PATH
}
```

**Status:** ✅ **COMPLETE** - All required fields exist in schema

### Onboarding Endpoints

**File:** `backend/src/modules/onboarding/onboarding.controller.ts`
- `PUT /onboarding/preferences` - Accepts `UpdateOnboardingPreferencesDto`
- `POST /onboarding/skip` - Applies defaults (does NOT set gender/attraction)
- `POST /onboarding/complete` - Validates completion

**File:** `backend/src/modules/onboarding/dto/update-onboarding-preferences.dto.ts`
- ✅ Already includes `gender?: Gender`
- ✅ Already includes `attractedTo?: AttractionPreference`
- ✅ Validation present via `@IsEnum()` decorators

**File:** `backend/src/modules/onboarding/onboarding.service.ts`
- ✅ `updatePreferences()` method handles `gender` and `attractedTo` (Lines 82-91)
- ✅ `derivePreferencePath()` automatically computes `preferencePath` from `attractedTo` (Lines 27-43)
- ⚠️ `skipOnboarding()` does NOT set gender/attraction defaults (Lines 145-232)
- ⚠️ `completeOnboarding()` does NOT validate gender/attraction are set (Lines 234-305)

**Status:** ✅ **BACKEND READY** - Fields are accepted and stored, but skip/complete flows don't enforce them

### User Data Access

**File:** `backend/src/modules/me/me.service.ts`
- ✅ `getAppState()` returns `gender`, `attractedTo`, `preferencePath` in preferences object (Lines 122-125)
- ✅ Frontend can access these values via `/me` endpoint

**Status:** ✅ **READY** - User preferences are exposed to frontend

### Gaps Identified

1. **Onboarding Skip/Complete:** Should set safe defaults for gender/attraction if UNKNOWN
2. **Validation:** No enforcement that gender/attraction must be set before mission access
3. **Frontend Collection:** OnboardingScreen does NOT collect these fields (see Frontend Audit)

---

## 2. MISSION MODEL & CONFIG AUDIT

### Current State

**File:** `backend/prisma/schema.prisma` (Lines 230-279)

**Mission Template Model:**
```prisma
model PracticeMissionTemplate {
  id          String  @id @default(cuid())
  code        String  @unique // "OPENERS_L1_M1"
  title       String
  description String?
  
  // Category & goal
  categoryId String?
  category   MissionCategory? @relation(fields: [categoryId], references: [id])
  goalType MissionGoalType?
  
  // Persona assigned to this mission (optional)
  personaId String?
  persona   AiPersona? @relation(fields: [personaId], references: [id])
  
  // ... other fields ...
  
  aiContract Json? // Contains MissionConfigV1
}
```

**Mission Category Model:**
```prisma
model MissionCategory {
  id          String  @id @default(cuid())
  code        String  @unique // "OPENERS", "FLIRTING"
  label       String // "Openers"
  description String?
}
```

**Status:** ✅ **SCHEMA READY** - Models exist, but no gender/attraction fields

### Mission Config (Step 6)

**File:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts`

**MissionConfigV1 Structure:**
- `dynamics: MissionConfigV1Dynamics` - No gender fields
- `objective: MissionConfigV1Objective` - No gender fields
- `difficulty: MissionConfigV1Difficulty` - No gender fields
- `style: MissionConfigV1Style` - No gender fields
- `statePolicy: MissionConfigV1StatePolicy` - No gender fields
- `openings?: MissionConfigV1Openings` - No gender fields
- `responseArchitecture?: MissionConfigV1ResponseArchitecture` - No gender fields

**Status:** ❌ **MISSING** - MissionConfigV1 has no gender/attraction fields

### Category Definitions

**File:** `backend/prisma/seed.ts` (Lines 38-67)

**Current Categories:**
- `OPENERS` - "Openers"
- `FLIRTING` - "Flirting & Tension"
- `RECOVERY` - "Recovery & Cold Replies"

**Status:** ⚠️ **STATIC** - Categories are hard-coded, no dynamic naming based on attraction

### Gaps Identified

1. **Mission Template:** Missing fields:
   - `isAttractionSensitive: boolean` - Whether mission should filter by attraction
   - `targetRomanticGender: Gender | null` - Target gender for romantic missions (null = any)

2. **Mission Category:** Missing fields:
   - `isAttractionSensitive: boolean` - Whether category label should be dynamic
   - `dynamicLabelTemplate?: string` - Template for dynamic labels (e.g., "Approach {{gender}}")

3. **MissionConfigV1:** Missing fields:
   - No gender context in any layer
   - No attraction preference context

4. **Category Naming:** No mechanism to rename categories dynamically (e.g., "Approach Women" vs "Approach Men")

---

## 3. PERSONA SYSTEM AUDIT

### Current State

**File:** `backend/prisma/schema.prisma` (Lines 156-174)

**Persona Model:**
```prisma
model AiPersona {
  id          String   @id @default(cuid())
  code        String   @unique // e.g. "MAYA_FLIRTY"
  name        String
  shortLabel  String?
  description String?
  style       String?
  avatarUrl   String?
  difficulty  Int?
  voicePreset String? // TTS preset key
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
}
```

**Status:** ❌ **MISSING GENDER** - No explicit gender field

### Persona Seeding

**File:** `backend/prisma/seed.ts` (Lines 70-99)

**Current Personas:**
- `MAYA_PLAYFUL` - Name: "Maya", Voice: `female_playful_1`
- `NOA_CALM` - Name: "Noa", Voice: `female_calm_1`

**Status:** ⚠️ **IMPLIED GENDER** - Gender is only implied via:
- Names (Maya, Noa - typically female)
- Voice presets (`female_playful_1`, `female_calm_1`)

### Persona Selection Logic

**File:** `backend/src/modules/practice/practice.service.ts` (Lines 614-642)

**Current Flow:**
- If `template.personaId` exists, use that persona
- If `dto.personaId` provided, use that persona
- No gender filtering applied

**File:** `backend/src/modules/missions/missions.service.ts` (Lines 219-230)

**Mission Start Returns:**
- Persona info (id, name, bio, avatarUrl, voicePreset)
- No gender information included

**Status:** ❌ **NO GENDER FILTERING** - Persona selection does not consider user attraction preference

### Gaps Identified

1. **Persona Model:** Missing fields:
   - `personaGender: Gender` - Explicit gender of persona
   - `personaRole?: PersonaRole` - ROMANTIC | FRIEND | INTERVIEWER | etc.

2. **Persona Selection:** Missing logic:
   - Filter personas by `personaGender` matching user's `attractedTo`
   - For attraction-sensitive missions, ensure persona gender matches target

3. **Persona Registry:** No centralized registry of personas by gender/role

---

## 4. MISSION ROAD ENDPOINT AUDIT

### Current State

**File:** `backend/src/modules/missions/missions.controller.ts` (Lines 23-29)

**Endpoint:** `GET /missions/road`

**File:** `backend/src/modules/missions/missions.service.ts` (Lines 23-136)

**Current Logic:**
```typescript
async getRoadForUser(userId: string) {
  const templates = await this.prisma.practiceMissionTemplate.findMany({
    where: { active: true },
    orderBy: [{ laneIndex: 'asc' }, { orderIndex: 'asc' }],
    include: { persona: true, category: true },
  });
  
  // ... unlock logic ...
  
  return templates.map(t => ({
    // ... mission data including category.label ...
  }));
}
```

**Status:** ❌ **NO FILTERING** - Returns all active missions, no attraction-based filtering

### Category Label Handling

**Current Behavior:**
- Category labels are static from DB (`category.label`)
- No dynamic renaming based on user preferences
- Example: "Openers" always shows as "Openers", never "Approach Women" or "Approach Men"

**Status:** ❌ **STATIC LABELS** - No dynamic category naming

### Gaps Identified

1. **Mission Filtering:** Missing logic:
   - Filter missions where `isAttractionSensitive = true` based on user's `attractedTo`
   - Only show missions where `targetRomanticGender` matches user's attraction preference

2. **Category Labeling:** Missing logic:
   - For categories with `isAttractionSensitive = true`, compute dynamic label
   - Replace `{{gender}}` placeholder with appropriate gender term
   - Example: "Approach {{gender}}" → "Approach Women" or "Approach Men"

3. **User Context:** Endpoint does NOT load user preferences (gender, attractedTo)

---

## 5. MISSION START / SESSION CREATION FLOW

### Current State

**File:** `backend/src/modules/missions/missions.controller.ts` (Lines 40-59)

**Endpoint:** `POST /missions/:id/start`

**File:** `backend/src/modules/missions/missions.service.ts` (Lines 144-232)

**Current Flow:**
1. Load mission template
2. Validate template exists and is active
3. Validate `aiContract` exists and is valid
4. Check unlock status
5. Create/update `MissionProgress`
6. Return mission payload (including persona)

**Status:** ❌ **NO GENDER VALIDATION** - Does not validate persona gender matches user attraction

### Persona Selection in Session

**File:** `backend/src/modules/practice/practice.service.ts` (Lines 614-642)

**Current Logic:**
- Uses `template.personaId` if present
- Falls back to `dto.personaId` if provided
- No gender compatibility check

**File:** `backend/src/modules/ai/providers/ai-chat.service.ts` (Lines 563-569)

**Persona Loading:**
- Loads persona by ID
- No gender validation

**Status:** ❌ **NO GENDER FILTERING** - Persona is used as-is without compatibility check

### Prompt Assembly

**File:** `backend/src/modules/ai/providers/ai-chat.service.ts` (Lines 324-497)

**System Prompt Building:**
- Includes persona name, description, style
- Includes mission title, description
- Includes category label
- **NO gender context** in prompt

**Status:** ⚠️ **GENDER-NEUTRAL PROMPTS** - Prompts don't mention gender, but also don't parameterize it

### Gaps Identified

1. **Mission Start Validation:** Missing checks:
   - If mission is attraction-sensitive, validate persona gender matches user's `attractedTo`
   - If persona gender doesn't match, either reject or auto-select compatible persona

2. **Persona Auto-Selection:** Missing logic:
   - If mission has `isAttractionSensitive = true` but no `personaId`, select persona matching user's attraction
   - Filter available personas by gender compatibility

3. **Prompt Context:** Missing in system prompt:
   - User's gender
   - Target gender (from persona or mission config)
   - Attraction context (romantic vs friendly)

---

## 6. FRONTEND AUDIT (Expo RN)

### Onboarding Screens

**File:** `socialsocial/src/screens/OnboardingScreen.tsx`

**Current Steps:**
1. Step 1: Goal selection (`OnboardingStepGoal`)
2. Step 2: Commitment (`OnboardingStepCommitment`)
3. Step 3: Assessment (`OnboardingStepAssessment`)
4. Step 4: Preferences (`OnboardingStepPreferences`)
5. Step 5: Notifications (`OnboardingStepNotifications`)
6. Step 6: Summary (`OnboardingStepSummary`)

**Status:** ❌ **NO GENDER/ATTRACTION COLLECTION** - None of the steps collect gender or attraction preference

**Files Checked:**
- `socialsocial/src/components/onboarding/OnboardingStepGoal.tsx` - No gender/attraction
- `socialsocial/src/components/onboarding/OnboardingStepCommitment.tsx` - No gender/attraction
- `socialsocial/src/components/onboarding/OnboardingStepAssessment.tsx` - No gender/attraction
- `socialsocial/src/components/onboarding/OnboardingStepPreferences.tsx` - No gender/attraction
- `socialsocial/src/components/onboarding/OnboardingStepNotifications.tsx` - No gender/attraction
- `socialsocial/src/components/onboarding/OnboardingStepSummary.tsx` - No gender/attraction display

**Gaps Identified:**
1. Need new onboarding step (or integrate into existing step) to collect:
   - `gender: MALE | FEMALE | OTHER`
   - `attractedTo: WOMEN | MEN | BOTH | OTHER`

2. Summary step should display gender/attraction preferences

### Mission Road UI

**File:** `socialsocial/src/screens/MissionRoadScreen.tsx`

**Current Behavior:**
- Fetches mission road from `/missions/road`
- Displays missions grouped by lane
- Shows category labels as-is from backend
- No filtering or dynamic labeling

**Status:** ⚠️ **DISPLAYS STATIC DATA** - UI is ready to display dynamic labels, but backend doesn't provide them

### Mission Detail / Start Screen

**File:** `socialsocial/src/screens/PracticeScreen.tsx`

**Current Behavior:**
- Receives `missionId`, `templateId`, `personaId` from navigation
- Starts session with these IDs
- No gender validation on frontend

**Status:** ⚠️ **NO VALIDATION** - Frontend trusts backend, but should handle errors gracefully

### Gaps Identified

1. **Onboarding:** Add gender/attraction collection step
2. **Mission Road:** Display dynamic category labels if backend provides them
3. **Error Handling:** Handle cases where persona gender doesn't match user preference

---

## 7. PROMPTS & SYSTEM TEXT AUDIT

### Hard-Coded Gender References Found

**File:** `backend/src/modules/ai/ai-scoring.service.ts` (Line 516)
```typescript
'Keep using this kind of structure – it carries clear intent and attractive energy. Next step is to mirror her vibe a bit more.',
```
**Status:** ⚠️ **HARD-CODED "her"** - Should be parameterized

**File:** `socialsocial/src/screens/FreePlayConfigScreen.tsx` (Line 517)
```typescript
placeholder="Example: You matched on Tinder. She replied 'hey'. You want a confident playful opener…"
```
**Status:** ⚠️ **HARD-CODED "She"** - Should be parameterized or neutral

**File:** `backend/public/dev-dashboard.html` (Lines 889-891)
```html
definition: "She stays engaged and agrees to continue or hints availability.",
"She asks at least 1 follow-up question OR gives a warm response",
```
**Status:** ⚠️ **HARD-CODED "She"** - Admin dashboard, less critical but should be fixed

**File:** `html_dashboard_fixed.txt` (Line 3163)
```javascript
gender: 'female',
```
**Status:** ⚠️ **HARD-CODED DEFAULT** - Admin tool defaults to 'female'

### System Prompt Analysis

**File:** `backend/src/modules/ai/providers/ai-chat.service.ts` (Lines 324-497)

**Current System Prompt Structure:**
- Topic
- Mission title/description
- Category label
- Persona name/description/style
- AI style instructions
- Dynamics, difficulty, response architecture
- Mood state
- Objectives
- Gates

**Status:** ⚠️ **NO GENDER CONTEXT** - Prompts don't mention gender, but should for romantic missions

### Mission Scenario Text

**Location:** Mission `aiContract.missionConfigV1.objective.userDescription`

**Status:** ⚠️ **UNKNOWN** - Scenario text is user-defined in mission config, may contain gender assumptions

### Gates & Objectives

**File:** `backend/src/modules/gates/gates.service.ts`

**Gate Definitions:**
- `GATE_MIN_MESSAGES` - Gender-neutral
- `GATE_SUCCESS_THRESHOLD` - Gender-neutral
- `GATE_FAIL_FLOOR` - Gender-neutral
- `GATE_DISQUALIFIED` - Gender-neutral
- `GATE_OBJECTIVE_PROGRESS` - Gender-neutral

**Status:** ✅ **GENDER-NEUTRAL** - Gates are abstract and don't assume gender

**File:** `backend/src/modules/ai-engine/registries/objective-gate-mappings.registry.ts`

**Objective Types:**
- `GET_NUMBER` - Gender-neutral
- `GET_INSTAGRAM` - Gender-neutral
- `GET_DATE_AGREEMENT` - Gender-neutral
- `FIX_AWKWARD_MOMENT` - Gender-neutral
- `HOLD_BOUNDARY` - Gender-neutral
- `PRACTICE_OPENING` - Gender-neutral
- `FREE_EXPLORATION` - Gender-neutral
- `CUSTOM` - Gender-neutral

**Status:** ✅ **GENDER-NEUTRAL** - Objectives are abstract

### Deep Insights Text

**File:** `backend/src/modules/insights/catalog/insight-catalog.v1.ts`

**Insight Templates:**
- Generic advice (e.g., "Keep practicing", "Raise your average score")
- No gender-specific language found

**Status:** ✅ **GENDER-NEUTRAL** - Insights are generic

### Gaps Identified

1. **Parameterization Needed:**
   - Replace "her"/"she" with `{{target_pronoun}}` or `{{target_gender}}`
   - Replace "him"/"he" with parameterized versions
   - Use neutral language where possible

2. **System Prompt Enhancement:**
   - Add gender context block: "You are interacting with a {{target_gender}} persona named {{persona_name}}"
   - Add attraction context: "This is a {{romantic|friendly}} interaction"

3. **Mission Scenario Text:**
   - Audit all existing mission `userDescription` fields for gender assumptions
   - Provide templates with placeholders for mission builders

---

## 8. STEP 5 & STEP 6 COMPATIBILITY AUDIT

### Trait System

**File:** `backend/src/modules/traits/traits.service.ts`

**Trait Keys:**
- `confidence` - Gender-neutral
- `clarity` - Gender-neutral
- `humor` - Gender-neutral
- `tensionControl` - Gender-neutral
- `emotionalWarmth` - Gender-neutral
- `dominance` - Gender-neutral

**Computation:**
- Aggregates trait values from user messages
- No gender-specific logic
- Clamps to 0-100 range

**Status:** ✅ **GENDER-NEUTRAL** - Traits are abstract and don't assume gender

### Scoring System

**File:** `backend/src/modules/ai/ai-core-scoring.service.ts`

**Core Metrics:**
- `charismaIndex` - Gender-neutral formula
- `overallScore` - Gender-neutral
- Trait distribution - Gender-neutral

**Status:** ✅ **GENDER-NEUTRAL** - Scoring doesn't consider gender

### Dynamics & Difficulty

**File:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts`

**Dynamics Parameters:**
- `pace`, `emojiDensity`, `flirtiveness`, `hostility`, `dryness`, `vulnerability`, `escalationSpeed`, `randomness`
- All gender-neutral

**Difficulty Parameters:**
- `strictness`, `ambiguityTolerance`, `emotionalPenalty`, `bonusForCleverness`, `failThreshold`, `recoveryDifficulty`
- All gender-neutral

**Status:** ✅ **GENDER-NEUTRAL** - Dynamics and difficulty don't assume gender

### Mood Engine

**File:** `backend/src/modules/mood/mood.service.ts`

**Mood States:**
- `COLD`, `NEUTRAL`, `WARM`, `TENSE`, `FLOW`
- Gender-neutral states

**Status:** ✅ **GENDER-NEUTRAL** - Mood doesn't assume gender

### Persona Stability

**File:** `backend/src/modules/ai/providers/ai-chat.service.ts` (Lines 473-496)

**Persona Consistency Block:**
- Enforces style, dynamics, difficulty, response architecture, mood consistency
- No gender-specific logic

**Status:** ✅ **SAFE** - Persona consistency doesn't break if personaGender changes

### Gates

**File:** `backend/src/modules/gates/gates.service.ts`

**Gate Evaluation:**
- Message count thresholds
- Score thresholds
- Objective progress
- All gender-neutral

**Status:** ✅ **GENDER-NEUTRAL** - Gates don't assume gender

### Step 6 Layers

**MissionConfigV1 Layers:**
- Dynamics - ✅ Gender-neutral
- Objective - ✅ Gender-neutral
- Difficulty - ✅ Gender-neutral
- Style - ✅ Gender-neutral
- State Policy - ✅ Gender-neutral
- Openings - ✅ Gender-neutral
- Response Architecture - ✅ Gender-neutral

**Status:** ✅ **SAFE** - All Step 6 layers are gender-neutral and won't break with gender changes

### Risks Identified

1. **None Found** - Step 5/6 systems are fully gender-neutral
2. **Future-Proof:** Adding gender context won't break existing logic

---

## 9. ARCHITECTURAL RISKS & COLLISIONS

### Assumptions Found

1. **Persona Gender Implied:**
   - Personas have no explicit gender field
   - Gender is only implied via names (Maya, Noa) and voice presets (`female_*`)
   - **Risk:** Cannot reliably filter personas by gender

2. **Mission Category Static:**
   - Categories have static labels ("Openers", "Flirting")
   - No mechanism for dynamic renaming ("Approach Women" vs "Approach Men")
   - **Risk:** Cannot show attraction-specific category names

3. **Mission Template No Gender Context:**
   - Missions don't know if they're attraction-sensitive
   - Missions don't know target gender
   - **Risk:** Cannot filter missions by attraction preference

4. **Persona Selection No Filtering:**
   - Persona is selected by ID only
   - No gender compatibility check
   - **Risk:** User might get persona of wrong gender for romantic mission

5. **Frontend No Gender Collection:**
   - Onboarding doesn't collect gender/attraction
   - **Risk:** Users start with UNKNOWN preferences, breaking filtering logic

### DB Constraints

**No Conflicts Found:**
- User model already has gender/attraction fields
- No foreign key constraints that would conflict
- No unique constraints that would break

### Frontend Assumptions

1. **Mission Road:**
   - Assumes category labels are static
   - **Risk:** Won't display dynamic labels without changes

2. **Onboarding:**
   - Assumes 6 steps are sufficient
   - **Risk:** Adding gender/attraction step requires UI changes

3. **Session Start:**
   - Assumes persona is always valid
   - **Risk:** No error handling for gender mismatch

### Mission Pipeline Risks

1. **Mission Road → Mission Start:**
   - Road shows all missions (no filtering)
   - Start doesn't validate gender compatibility
   - **Risk:** User can start mission with incompatible persona

2. **Persona Selection:**
   - If mission has `personaId`, uses that persona
   - No fallback if persona gender doesn't match
   - **Risk:** Wrong persona for user's attraction preference

3. **Prompt Assembly:**
   - No gender context in prompts
   - **Risk:** AI might use wrong pronouns or assumptions

### Step 7 Compatibility

**File:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts`

**Future Step 7 (Prompt Packs / Mission Builder):**
- Will need gender tags for prompt packs
- Will need attraction context for mission templates
- **Risk:** Need to extend MissionConfigV1 with gender fields now to avoid breaking changes later

### Edge Cases

1. **User with `attractedTo = BOTH`:**
   - Should see all attraction-sensitive missions
   - Should be able to choose persona gender
   - **Solution:** Filter logic must handle BOTH case

2. **User with `attractedTo = OTHER`:**
   - Should see generic missions (not attraction-sensitive)
   - **Solution:** Filter out attraction-sensitive missions for OTHER

3. **User with `gender = OTHER`:**
   - Should work with any persona
   - **Solution:** Gender matching logic must handle OTHER

4. **Mission with `isAttractionSensitive = false`:**
   - Should show to all users regardless of attraction
   - **Solution:** Filter logic must check this flag

5. **Mission with no `personaId`:**
   - Should auto-select compatible persona
   - **Solution:** Persona selection logic must filter by gender

---

## 10. REQUIRED FILES TO TOUCH IN "IMPLEMENT" PHASE

### A) Prisma Schema

**File:** `backend/prisma/schema.prisma`

**Changes:**
1. Add to `AiPersona` model:
   - `personaGender Gender @default(UNKNOWN)`
   - `personaRole String?` (ROMANTIC | FRIEND | INTERVIEWER | etc.)

2. Add to `PracticeMissionTemplate` model:
   - `isAttractionSensitive Boolean @default(false)`
   - `targetRomanticGender Gender?`

3. Add to `MissionCategory` model:
   - `isAttractionSensitive Boolean @default(false)`
   - `dynamicLabelTemplate String?` (e.g., "Approach {{gender}}")

**Migration:** Create new migration file

---

### B) NestJS Modules/Services/Controllers

**File:** `backend/src/modules/onboarding/onboarding.service.ts`

**Changes:**
1. `skipOnboarding()`: Set default gender/attraction if UNKNOWN
2. `completeOnboarding()`: Validate gender/attraction are set (or apply defaults)

---

**File:** `backend/src/modules/missions/missions.service.ts`

**Changes:**
1. `getRoadForUser()`:
   - Load user preferences (gender, attractedTo)
   - Filter missions by `isAttractionSensitive` and `targetRomanticGender`
   - Compute dynamic category labels for attraction-sensitive categories
   - Return dynamic labels in response

2. `startMissionForUser()`:
   - Validate persona gender matches user's `attractedTo` (if mission is attraction-sensitive)
   - Auto-select compatible persona if current persona doesn't match

---

**File:** `backend/src/modules/practice/practice.service.ts`

**Changes:**
1. `runPracticeSession()`:
   - Load user preferences
   - If mission is attraction-sensitive, validate/select persona by gender
   - Pass gender context to prompt builder

---

**File:** `backend/src/modules/ai/providers/ai-chat.service.ts`

**Changes:**
1. `buildSystemPrompt()`:
   - Add gender context block (user gender, target gender, attraction context)
   - Parameterize any gender-specific language

2. `loadPersona()`:
   - Return persona gender in response

---

**File:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts`

**Changes:**
1. Add to `MissionConfigV1` (optional, for future Step 7):
   - `genderContext?: { userGender: Gender, targetGender: Gender, attractionType: 'ROMANTIC' | 'FRIENDLY' }`

---

**File:** `backend/src/modules/ai/ai-scoring.service.ts`

**Changes:**
1. Line 516: Replace "her" with parameterized version or neutral language

---

**File:** `backend/src/modules/me/me.service.ts`

**Changes:**
1. No changes needed (already returns gender/attraction)

---

### C) Onboarding Backend

**File:** `backend/src/modules/onboarding/dto/update-onboarding-preferences.dto.ts`

**Changes:**
1. No changes needed (already accepts gender/attraction)

---

**File:** `backend/src/modules/onboarding/onboarding.controller.ts`

**Changes:**
1. No changes needed

---

### D) Practice/Mission Road Backend

**File:** `backend/src/modules/missions/missions.controller.ts`

**Changes:**
1. No changes needed (endpoint signature stays same)

---

### E) Mission Start / Session Creation

**File:** `backend/src/modules/missions/missions.service.ts`

**Changes:**
1. See section B above

---

**File:** `backend/src/modules/practice/practice.service.ts`

**Changes:**
1. See section B above

---

### F) Persona System

**File:** `backend/src/modules/personas/personas.service.ts` (if exists)

**Changes:**
1. Add method to filter personas by gender
2. Add method to select compatible persona for user

---

**File:** `backend/prisma/seed.ts`

**Changes:**
1. Update persona seeds to include `personaGender` field
2. Add male personas for testing

---

### G) AI Prompt Builder

**File:** `backend/src/modules/ai/providers/ai-chat.service.ts`

**Changes:**
1. See section B above

---

### H) Expo RN Onboarding Screens

**File:** `socialsocial/src/screens/OnboardingScreen.tsx`

**Changes:**
1. Add new step (or integrate into existing step) to collect gender/attraction
2. Update step count from 6 to 7 (or keep 6 if integrated)
3. Update `buildPayloadForStep()` to include gender/attraction

---

**File:** `socialsocial/src/components/onboarding/OnboardingStepGender.tsx` (NEW)

**Changes:**
1. Create new component to collect:
   - Gender selection (MALE | FEMALE | OTHER)
   - Attraction preference (WOMEN | MEN | BOTH | OTHER)
2. Radio buttons or picker UI
3. Validation

---

**File:** `socialsocial/src/components/onboarding/OnboardingStepSummary.tsx`

**Changes:**
1. Display gender and attraction preference in summary

---

**File:** `socialsocial/src/api/onboardingService.ts`

**Changes:**
1. Ensure `OnboardingPreferencesPayload` includes gender/attraction types
2. Export Gender and AttractionPreference enums for frontend

---

### I) Practice Hub / Mission Road UI

**File:** `socialsocial/src/screens/MissionRoadScreen.tsx`

**Changes:**
1. Display dynamic category labels if provided by backend
2. Handle filtered missions (if backend returns fewer missions)

---

**File:** `socialsocial/src/screens/PracticeScreen.tsx`

**Changes:**
1. Handle errors for gender mismatch (if backend rejects)
2. Display gender context in UI (optional)

---

### J) System Text / Structured Prompts

**File:** `backend/src/modules/ai/ai-scoring.service.ts`

**Changes:**
1. Line 516: Replace "her" with parameterized version

---

**File:** `socialsocial/src/screens/FreePlayConfigScreen.tsx`

**Changes:**
1. Line 517: Replace "She" with neutral language or parameterized version

---

**File:** `backend/public/dev-dashboard.html`

**Changes:**
1. Lines 889-891: Replace "She" with parameterized version (low priority)

---

**File:** `html_dashboard_fixed.txt`

**Changes:**
1. Line 3163: Make gender configurable (low priority)

---

## 11. QUESTIONS / AMBIGUITIES

### 1. Onboarding Flow

**Question:** Should gender/attraction be collected in a separate step, or integrated into an existing step?

**Recommendation:** Separate step (Step 1 or Step 2) to ensure it's collected early.

---

### 2. Category Dynamic Naming

**Question:** Should ALL categories support dynamic naming, or only specific ones (e.g., "INITIATION" / "APPROACH")?

**Recommendation:** Only categories with `isAttractionSensitive = true` should have dynamic labels. Others remain static.

---

### 3. Persona Role

**Question:** Do we need `personaRole` (ROMANTIC | FRIEND | INTERVIEWER) now, or can we infer from mission category?

**Recommendation:** Start without `personaRole`. Can infer from mission category (e.g., FLIRTING = ROMANTIC). Add later if needed.

---

### 4. Mission Filtering Strategy

**Question:** For users with `attractedTo = BOTH`, should they see:
- A) All missions (both MALE and FEMALE targets)
- B) Duplicate missions (one per gender)
- C) A selector to choose target gender

**Recommendation:** Option A (show all missions). Missions can have `targetRomanticGender = null` to indicate "any gender".

---

### 5. Default Persona Selection

**Question:** If a mission has `isAttractionSensitive = true` but no `personaId`, should we:
- A) Auto-select a compatible persona
- B) Require admin to assign persona
- C) Allow user to choose from compatible personas

**Recommendation:** Option A (auto-select) for simplicity. Can add user choice later.

---

### 6. Gender Mismatch Handling

**Question:** If user starts a mission with incompatible persona, should we:
- A) Reject with error
- B) Auto-switch to compatible persona
- C) Warn but allow

**Recommendation:** Option B (auto-switch) for best UX. Log the switch for analytics.

---

### 7. Step 7 Compatibility

**Question:** Should we add gender fields to `MissionConfigV1` now, or wait for Step 7?

**Recommendation:** Add optional `genderContext` field now to avoid breaking changes later. Keep it optional for backward compatibility.

---

### 8. Voice Presets

**Question:** Should voice presets be filtered by gender, or can any persona use any voice?

**Recommendation:** Filter by gender for consistency. Male personas should use `male_*` presets, female personas use `female_*` presets.

---

## 12. IMPLEMENTATION PRIORITY

### Phase 1: Foundation (Critical)

1. **Prisma Schema Changes**
   - Add `personaGender` to `AiPersona`
   - Add `isAttractionSensitive`, `targetRomanticGender` to `PracticeMissionTemplate`
   - Add `isAttractionSensitive`, `dynamicLabelTemplate` to `MissionCategory`
   - Create migration

2. **Seed Updates**
   - Update existing personas with `personaGender`
   - Add male personas for testing

3. **Onboarding Frontend**
   - Add gender/attraction collection step
   - Update summary to display preferences

4. **Onboarding Backend**
   - Set defaults in `skipOnboarding()` and `completeOnboarding()`

### Phase 2: Mission Filtering (High Priority)

5. **Mission Road Endpoint**
   - Load user preferences
   - Filter missions by attraction
   - Compute dynamic category labels
   - Return filtered missions with dynamic labels

6. **Mission Start Validation**
   - Validate persona gender compatibility
   - Auto-select compatible persona if needed

### Phase 3: Prompt Enhancement (Medium Priority)

7. **System Prompt**
   - Add gender context block
   - Parameterize gender-specific language

8. **Fix Hard-Coded References**
   - Replace "her"/"she" in `ai-scoring.service.ts`
   - Replace "She" in `FreePlayConfigScreen.tsx`

### Phase 4: Polish (Low Priority)

9. **Error Handling**
   - Frontend error handling for gender mismatches
   - User-friendly error messages

10. **Analytics**
    - Log persona switches
    - Track attraction preference distribution

---

## 13. TESTING CHECKLIST

### Backend Tests

- [ ] User with `attractedTo = WOMEN` only sees missions with `targetRomanticGender = FEMALE`
- [ ] User with `attractedTo = MEN` only sees missions with `targetRomanticGender = MALE`
- [ ] User with `attractedTo = BOTH` sees all attraction-sensitive missions
- [ ] User with `attractedTo = OTHER` sees only non-attraction-sensitive missions
- [ ] Dynamic category labels work ("Approach Women" vs "Approach Men")
- [ ] Mission start auto-selects compatible persona if current doesn't match
- [ ] Mission start rejects incompatible persona (or auto-switches)
- [ ] Onboarding skip sets default gender/attraction
- [ ] Onboarding complete validates gender/attraction are set

### Frontend Tests

- [ ] Onboarding collects gender/attraction
- [ ] Summary displays gender/attraction
- [ ] Mission road shows dynamic category labels
- [ ] Mission road shows filtered missions
- [ ] Error handling for gender mismatches

### Integration Tests

- [ ] End-to-end: User sets gender/attraction → sees filtered missions → starts mission → gets compatible persona
- [ ] End-to-end: User with BOTH preference sees all missions
- [ ] End-to-end: Dynamic category labels update based on preference

---

## 14. CONCLUSION

The SocialGym system is **well-positioned** for adding women compatibility and attraction-based routing. The User model already has the necessary fields, and Step 5/6 systems are gender-neutral. However, significant work is needed to:

1. **Add gender fields** to Persona and Mission models
2. **Implement filtering logic** in mission road and mission start
3. **Add frontend onboarding** to collect gender/attraction
4. **Enhance prompts** with gender context
5. **Fix hard-coded** gender references

The architecture is sound and won't require major refactoring. Most changes are additive (new fields, new filtering logic) rather than breaking changes.

**Estimated Complexity:** Medium  
**Risk Level:** Low (changes are isolated and backward-compatible)  
**Step 5/6 Compatibility:** ✅ Safe (all systems are gender-neutral)

---

**END OF SCOUT REPORT**

