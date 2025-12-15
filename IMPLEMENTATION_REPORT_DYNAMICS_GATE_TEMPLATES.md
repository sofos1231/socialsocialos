# Implementation Report — Dynamics Templates + Gate Requirement Templates

**Date:** 2025-01-XX  
**Mode:** EXECUTE (No deletes, no wipes, no new Prisma models, no migrations)  
**Goal:** Make Mission Builder LEGO-style by selecting Dynamics Profile and Gate Requirement Pack templates from EngineConfig JSON.

---

## Files Changed

### 1. `backend/src/modules/engine-config/engine-config.types.ts`

**Changes:**
- Added `EngineGateRequirementTemplate` interface (lines ~199-205)
  - Fields: `code`, `name`, `description`, `active`, `requiredGates: string[]`
- Added `gateRequirementTemplates: EngineGateRequirementTemplate[]` to `EngineConfigJson` interface (line ~281)

**Why:** Extends EngineConfig JSON schema to include gate requirement templates.

---

### 2. `backend/src/modules/engine-config/engine-config.service.ts`

**Changes:**
- Added import for `EngineGateRequirementTemplate` type
- Added `getGateRequirementTemplate(code?: string | null)` method (lines ~155-162)
  - Loads template from EngineConfig by code
- Added `gateRequirementTemplates` array to `getDefaultConfig()` (lines ~336-388)
  - Seeds 6 default templates:
    - `BASIC_CHAT_FLOW` → `[GATE_MIN_MESSAGES]`
    - `QUALITY_THRESHOLD` → `[GATE_MIN_MESSAGES, GATE_SUCCESS_THRESHOLD]`
    - `SAFETY_DISQUALIFY` → `[GATE_DISQUALIFIED]`
    - `OBJECTIVE_PROGRESS` → `[GATE_OBJECTIVE_PROGRESS]`
    - `FAIL_FLOOR_GUARD` → `[GATE_FAIL_FLOOR]`
    - `FULL_GATE_SUITE` → All gates
- Updated `getGlobalConfig()` to initialize `gateRequirementTemplates` if missing (backward compatibility)
- Updated `validateConfig()` to ensure `gateRequirementTemplates` exists (initializes empty array if missing)

**Why:** Provides runtime access to gate requirement templates and ensures backward compatibility.

---

### 3. `backend/src/modules/missions-admin/mission-config-v1.schema.ts`

**Changes:**
- Added `gateRequirementTemplateCode?: string | null` to `MissionConfigV1` interface (line ~272)

**Why:** Allows missions to store a reference to a gate requirement template.

---

### 4. `backend/src/modules/practice/mission-config-runtime.ts`

**Changes:**
- Updated normalization to preserve `gateRequirementTemplateCode` (line ~195)
  - Added to the `(normalized as any)` object alongside `dynamicsProfileCode` and `scoringProfileCode`

**Why:** Ensures gate requirement template code is available at runtime.

---

### 5. `backend/src/modules/practice/practice.service.ts`

**Changes:**
- Added import for `EngineConfigService`
- Injected `EngineConfigService` in constructor (optional, line ~702)
- Updated gate requirements logic in `runPracticeSession()` (lines ~1053-1077)
  - Checks for `gateRequirementTemplateCode` first
  - If present, loads template from EngineConfig and uses its `requiredGates`
  - Falls back to `getGateRequirementsForObjective()` if no template or template load fails

**Why:** Runtime gate selection now uses selected gate pack when present, with fallback to objective+difficulty mapping.

---

### 6. `backend/dashboards_bundle/dev-dashboard.html`

**Changes:**

#### HTML Structure (lines ~666-746):
- Replaced "Dynamics Tuning (0-100)" section with:
  - Dynamics Profile selector (dropdown)
  - "Override dynamics values" toggle
  - Dynamics sliders (hidden by default, shown when override enabled)
- Replaced "Enable Gate Sequence" checkbox with:
  - Gate Pack selector (dropdown)
  - Hidden checkbox for backward compatibility

#### JavaScript Functions:
- Added `populateMissionBuilderSelectors()` (after `loadEngineConfig`)
  - Populates dynamics profile and gate pack selectors from EngineConfig
- Added `onDynamicsProfileChange()`
  - Updates description and previews profile values in sliders (if override disabled)
- Added `onGatePackChange()`
  - Updates description with gate list
- Added `onDynamicsOverrideToggle()`
  - Shows/hides sliders container

#### Event Wiring:
- Added event listeners for:
  - `missionDynamicsProfileSelect` change → `onDynamicsProfileChange`
  - `missionGateRequirementPackSelect` change → `onGatePackChange`
  - `missionDynamicsOverrideToggle` change → `onDynamicsOverrideToggle`

#### Mission Loading (`selectMission` and `duplicateMission`):
- Updated to populate:
  - Dynamics Profile selector from `config.dynamicsProfileCode`
  - Gate Pack selector from `config.gateRequirementTemplateCode`
  - Override toggle based on presence of dynamics override values
  - Sliders only if override is enabled

#### Mission Saving (`getMissionFormValues`):
- Updated to write:
  - `config.dynamicsProfileCode` from selector
  - `config.gateRequirementTemplateCode` from selector
  - Dynamics slider values only if override toggle is enabled
  - `config.statePolicy.enableGateSequence` = true if gate pack is selected

**Why:** UI now allows selecting templates instead of manually configuring per-mission.

---

## Before/After JSON Example

### Before (Per-Mission Dynamics + Gate Checkbox):

```json
{
  "missionConfigV1": {
    "version": 1,
    "dynamics": {
      "mode": "CHAT",
      "locationTag": "APP_CHAT",
      "hasPerMessageTimer": false,
      "defaultEntryRoute": "TEXT_CHAT",
      "pace": 50,
      "emojiDensity": 30,
      "flirtiveness": 40,
      "hostility": 10,
      "dryness": 40,
      "vulnerability": 50,
      "escalationSpeed": 50,
      "randomness": 25
    },
    "objective": {
      "kind": "PRACTICE_OPENING",
      "userTitle": "Practice Opening",
      "userDescription": "Practice your opening line"
    },
    "difficulty": {
      "level": "EASY"
    },
    "style": {
      "aiStyleKey": "NEUTRAL"
    },
    "statePolicy": {
      "maxMessages": 10,
      "maxStrikes": 3,
      "allowTimerExtension": false,
      "successScoreThreshold": 60,
      "failScoreThreshold": 40,
      "enableGateSequence": true,
      "enableMoodCollapse": false,
      "enableObjectiveAutoSuccess": false,
      "allowedEndReasons": ["SUCCESS_OBJECTIVE", "FAIL_OBJECTIVE"]
    }
  }
}
```

### After (Template-Based):

```json
{
  "missionConfigV1": {
    "version": 1,
    "dynamics": {
      "mode": "CHAT",
      "locationTag": "APP_CHAT",
      "hasPerMessageTimer": false,
      "defaultEntryRoute": "TEXT_CHAT",
      "pace": null,
      "emojiDensity": null,
      "flirtiveness": null,
      "hostility": null,
      "dryness": null,
      "vulnerability": null,
      "escalationSpeed": null,
      "randomness": null
    },
    "dynamicsProfileCode": "NEUTRAL",
    "objective": {
      "kind": "PRACTICE_OPENING",
      "userTitle": "Practice Opening",
      "userDescription": "Practice your opening line"
    },
    "difficulty": {
      "level": "EASY"
    },
    "style": {
      "aiStyleKey": "NEUTRAL"
    },
    "statePolicy": {
      "maxMessages": 10,
      "maxStrikes": 3,
      "allowTimerExtension": false,
      "successScoreThreshold": 60,
      "failScoreThreshold": 40,
      "enableGateSequence": true,
      "enableMoodCollapse": false,
      "enableObjectiveAutoSuccess": false,
      "allowedEndReasons": ["SUCCESS_OBJECTIVE", "FAIL_OBJECTIVE"]
    },
    "gateRequirementTemplateCode": "BASIC_CHAT_FLOW"
  }
}
```

### After (With Overrides):

```json
{
  "missionConfigV1": {
    "version": 1,
    "dynamics": {
      "mode": "CHAT",
      "locationTag": "APP_CHAT",
      "hasPerMessageTimer": false,
      "defaultEntryRoute": "TEXT_CHAT",
      "pace": 60,
      "emojiDensity": 40,
      "flirtiveness": 50,
      "hostility": 5,
      "dryness": 30,
      "vulnerability": 60,
      "escalationSpeed": 55,
      "randomness": 20
    },
    "dynamicsProfileCode": "COLD_APPROACH_EASY",
    "objective": {
      "kind": "GET_NUMBER",
      "userTitle": "Get Her Number",
      "userDescription": "Get her phone number"
    },
    "difficulty": {
      "level": "MEDIUM"
    },
    "style": {
      "aiStyleKey": "FLIRTY"
    },
    "statePolicy": {
      "maxMessages": 15,
      "maxStrikes": 3,
      "allowTimerExtension": false,
      "successScoreThreshold": 70,
      "failScoreThreshold": 40,
      "enableGateSequence": true,
      "enableMoodCollapse": false,
      "enableObjectiveAutoSuccess": false,
      "allowedEndReasons": ["SUCCESS_OBJECTIVE", "FAIL_OBJECTIVE"]
    },
    "gateRequirementTemplateCode": "QUALITY_THRESHOLD"
  }
}
```

---

## Backward Compatibility

### Existing Missions:
- Missions with per-mission dynamics values continue to work
- Missions with `enableGateSequence` checkbox continue to work
- If `dynamicsProfileCode` is missing, dynamics values from JSON are used
- If `gateRequirementTemplateCode` is missing, gate requirements are determined by objective+difficulty mapping

### EngineConfig:
- If `gateRequirementTemplates` is missing from existing EngineConfig JSON, it's initialized as empty array
- Default templates are seeded in `getDefaultConfig()` for new configs

---

## Acceptance Checks

✅ **Create/edit mission in dashboard:**
- Can pick a Dynamics Profile from dropdown
- Can pick a Gate Pack from dropdown
- "Override dynamics values" toggle shows/hides sliders
- Saving persists `dynamicsProfileCode` and `gateRequirementTemplateCode` in `aiContract.missionConfigV1`

✅ **Run a mission:**
- Gate evaluation uses selected gate pack when `gateRequirementTemplateCode` is present
- Falls back to objective+difficulty mapping if no template selected
- Insights still work based on `gateKey` outcomes (no new insight linking yet)

---

## Summary

**Total Files Changed:** 6

1. EngineConfig types extended with gate requirement templates
2. EngineConfig service provides template access and seeds defaults
3. MissionConfigV1 schema includes `gateRequirementTemplateCode`
4. Runtime normalization preserves template code
5. Practice service uses template for gate requirements when present
6. Dev dashboard UI replaced sliders/checkbox with template selectors

**No database changes, no migrations, fully backward compatible.**

