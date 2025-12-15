# Phase 3 Scope (Canonical)

**Date:** 2025-01-XX  
**Status:** Canonical Authority  
**Statement:** This document is the canonical scope authority for Phase 3 going forward.

---

## Phase 3 — Builder Integration & Config Generation (IN SCOPE)

The following items are required for Phase 3:

### Backend Endpoints

- ✅ **POST `/v1/admin/missions/validate-config`**: Validates MissionConfigV1 without saving
  - Accepts wrapped `{ aiContract: { missionConfigV1: {...} } }` format
  - Accepts raw `{ aiContract: {...MissionConfigV1...} }` format
  - Accepts `aiContract` as JSON string
  - Returns structured errors `{ code, message, details[] }` on validation failure
  - Returns normalized wrapped config on success

- ✅ **POST `/v1/admin/missions/generate-config`**: Generates MissionConfigV1 using builders
  - Accepts `{ builderType: 'OPENERS' | 'FLIRTING', params: {...} }`
  - Validates params (maxMessages >= 1, timeLimitSec >= 0, wordLimit >= 1 if provided, userTitle/userDescription non-empty)
  - Calls `buildOpenersMissionConfigV1()` or `buildFlirtingMissionConfigV1()`
  - Wraps generated config as `{ missionConfigV1: {...} }`
  - Validates and normalizes generated config
  - Returns structured errors on failure, normalized wrapped config on success

### Dashboard Builder UI Integration

- ✅ **Builder Type Selector**: Dropdown to select "Openers Builder" or "Flirting Builder"
- ✅ **Builder Parameter Inputs**: Form fields for:
  - `userTitle` (defaults to mission name)
  - `userDescription` (defaults to mission description)
  - `difficultyLevel` (defaults to template difficulty)
  - `aiStyleKey` (uses existing AI style selection if available)
  - `maxMessages` (defaults to mission maxMessages field)
  - `timeLimitSec` (defaults to timeLimit field)
  - `wordLimit` (defaults to mission wordLimit field)
  - `objectiveKind` (only for Openers builder if supported)
- ✅ **Generate Config Button**: Calls backend `generate-config` endpoint and injects result into JSON textarea as wrapped contract
- ✅ **Validate Config Button**: Calls backend `validate-config` endpoint and displays structured errors using existing Phase 2 error UI
- ✅ **Config Injection**: Generated config is pretty-printed JSON in textarea, remains editable
- ✅ **Manual Override**: Textarea remains fully editable after generation

### Error Handling

- ✅ **Structured Errors**: All endpoints return `{ code, message, details[] }` format
- ✅ **Error Rendering**: Dashboard uses existing Phase 2 structured error list UI (`details[]` array)
- ✅ **No Silent Failures**: All validation errors are user-visible

### Backward Compatibility

- ✅ **No Breaking Changes**: Phase 2 mission editor fields (description, goalType, timeLimitSec, maxMessages, wordLimit, laneIndex, orderIndex) remain fully functional
- ✅ **Raw JSON Textarea**: Manual editing path remains functional
- ✅ **Format Support**: Both wrapped `{ missionConfigV1: {...} }` and raw `MissionConfigV1` formats supported
- ✅ **Minimal Sync**: Phase 2 sync rules (template fields override MissionConfigV1 fields) remain intact

---

## Explicit OUT OF SCOPE for Phase 3

**Full LEGO Behavior Editor** (structured Dynamics/Objective/StatePolicy full editor UI) is **OUT OF SCOPE** for Phase 3 and deferred to a future phase.

**Major Dashboard Redesign** (layout changes, new sections, full mission behavior editor) is **OUT OF SCOPE** for Phase 3.

**Runtime Engine Logic Changes** (any changes to practice session execution, scoring, gates, mood) are **OUT OF SCOPE** for Phase 3 unless required for generation/validation.

**New Builder Types** (beyond OPENERS and FLIRTING) are **OUT OF SCOPE** for Phase 3.

**Builder Parameter Validation UI** (client-side validation beyond basic type checking) is **OUT OF SCOPE** for Phase 3 — backend validation is sufficient.

---

## Rationale / Notes

Phase 3 focuses on enabling config generation and validation through builder functions, without disrupting existing Phase 2 workflows. The raw JSON textarea remains the primary editing interface, with builder integration as a convenience feature. All changes are additive and backward-compatible.

---

## Traceability

| Requirement | Implementation File(s) |
|-------------|----------------------|
| validate-config endpoint | `backend/src/modules/missions-admin/missions-admin.controller.ts`, `backend/src/modules/missions-admin/missions-admin.service.ts` |
| generate-config endpoint | `backend/src/modules/missions-admin/missions-admin.controller.ts`, `backend/src/modules/missions-admin/missions-admin.service.ts` |
| Builder type selector | `backend/public/dev-dashboard.html` |
| Builder parameter inputs | `backend/public/dev-dashboard.html` |
| Generate Config button | `backend/public/dev-dashboard.html` |
| Validate Config button | `backend/public/dev-dashboard.html` |
| Config injection logic | `backend/public/dev-dashboard.html` |
| Structured error rendering | `backend/public/dev-dashboard.html` (reuses Phase 2 UI) |
| Backward compatibility | `backend/src/modules/missions-admin/missions-admin.service.ts`, `backend/public/dev-dashboard.html` |

