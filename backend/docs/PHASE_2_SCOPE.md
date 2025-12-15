# Phase 2 Scope (Canonical)

**Date:** 2025-01-XX  
**Status:** Canonical Authority  
**Statement:** This document is the canonical scope authority for Phase 2 going forward.

---

## Phase 2 Part 1 — Foundation (IN SCOPE)

The following items are required for Phase 2 Part 1:

- ✅ **MissionConfigV1 schema**: Authoritative TypeScript interface definition with all required/optional fields, enums, and types
- ✅ **validateMissionConfigV1Shape**: Function that validates MissionConfigV1 structure, enum values, and types
- ✅ **normalizeMissionConfigV1**: Function that normalizes and enriches MissionConfigV1 data before save
- ✅ **sanitizeAiContract**: Function that handles string/object/null safely in admin service
- ✅ **Difficulty consistency enforcement**: Backend enforces that template `difficulty` matches `missionConfigV1.difficulty.level`
- ✅ **aiStyleKey consistency enforcement**: Backend enforces that template `aiStyleKey` matches `missionConfigV1.style.aiStyleKey` (when both provided)
- ✅ **Builders**: `buildOpenersMissionConfigV1()` and `buildFlirtingMissionConfigV1()` functions that produce valid MissionConfigV1
- ✅ **Backward compatibility handling**: Support for both wrapped `{ missionConfigV1: {...} }` and raw MissionConfigV1 formats
- ✅ **Seed uses builders**: Prisma seed script uses builder functions to create valid `aiContract` for seeded missions

---

## Phase 2 Part 2 — Mission Editor v1 (First Slice) (IN SCOPE)

The following items are required for Phase 2 Part 2 (first slice):

- ✅ **Mission Basics UI fields**: Dashboard form includes all template-level fields:
  - `description` (textarea)
  - `goalType` (select dropdown)
  - `timeLimitSec` (number input)
  - `maxMessages` (number input)
  - `wordLimit` (number input)
  - `laneIndex` (number input)
  - `orderIndex` (number input)
- ✅ **selectMission populates**: `selectMission(id)` function populates all new form fields from loaded mission object
- ✅ **clearMissionForm clears**: `clearMissionForm()` function clears all new form fields on reset
- ✅ **getMissionFormValues includes + numeric parsing rules**: 
  - All new fields included in payload
  - Numeric parsing: empty string → `null`
  - Range validation: `timeLimitSec >= 0`, `maxMessages >= 1`, `wordLimit >= 1`, `laneIndex >= 0`, `orderIndex >= 0`
- ✅ **Minimal sync**: Template fields (title, difficulty, goalType, maxMessages, timeLimitSec) override corresponding MissionConfigV1 fields (`objective.userTitle`, `difficulty.level`, `objective.kind`, `statePolicy.maxMessages`, `statePolicy.timerSecondsPerMessage`) if parent objects exist
- ✅ **Structured error display from details[]**: Dashboard parses backend validation errors with `code: 'MISSION_TEMPLATE_INVALID_CONFIG'` or `'VALIDATION'` and `details[]` array, displays structured list of errors
- ✅ **apiFetch attaches parsed JSON to error object**: `apiFetch()` attaches parsed JSON response to error object as `error.responseJson` for structured error handling
- ✅ **Backward compatibility**: Raw JSON textarea still works end-to-end for manual MissionConfigV1 editing

---

## Explicit OUT OF SCOPE for Phase 2

**Builder integration in dashboard UI** (template selector / generate button) is **OUT OF SCOPE** for Phase 2 and deferred to Phase 3.

**Full LEGO Behavior editor** (Dynamics/Objective/StatePolicy structured form UI) is deferred to Phase 3.

**Any new backend endpoints** for `validate-config`/`generate-config` are deferred to Phase 3.

---

## Rationale / Notes

Phase 2 Part 2 is intentionally scoped as a "first slice" to reduce risk, maintain backward compatibility, and focus on core improvements. The raw JSON textarea remains functional as a fallback, ensuring existing workflows are not disrupted. The focus is on extending Mission Basics with missing template fields, improving error visibility through structured validation error display, and adding minimal synchronization to prevent obvious inconsistencies between template and config fields. The full LEGO-style Mission Behavior UI and builder integration will come in Phase 3, allowing for iterative refinement based on feedback from this first slice.

---

## Traceability

| Requirement | Implementation File(s) |
|-------------|----------------------|
| MissionConfigV1 schema | `backend/src/modules/missions-admin/mission-config-v1.schema.ts` |
| validateMissionConfigV1Shape | `backend/src/modules/missions-admin/mission-config-v1.schema.ts` |
| normalizeMissionConfigV1 | `backend/src/modules/practice/mission-config-runtime.ts` |
| sanitizeAiContract | `backend/src/modules/missions-admin/missions-admin.service.ts` |
| Difficulty consistency enforcement | `backend/src/modules/missions-admin/missions-admin.service.ts` |
| aiStyleKey consistency enforcement | `backend/src/modules/missions-admin/missions-admin.service.ts` |
| buildOpenersMissionConfigV1 | `backend/src/modules/missions-admin/mission-config-v1.builders.ts` |
| buildFlirtingMissionConfigV1 | `backend/src/modules/missions-admin/mission-config-v1.builders.ts` |
| Backward compatibility handling | `backend/src/modules/missions-admin/missions-admin.service.ts`, `backend/public/dev-dashboard.html` |
| Seed uses builders | `backend/prisma/seed.ts` |
| Mission Basics UI fields | `backend/public/dev-dashboard.html` |
| selectMission populates | `backend/public/dev-dashboard.html` |
| clearMissionForm clears | `backend/public/dev-dashboard.html` |
| getMissionFormValues includes + parsing | `backend/public/dev-dashboard.html` |
| Minimal sync logic | `backend/public/dev-dashboard.html` |
| Structured error display | `backend/public/dev-dashboard.html` |
| apiFetch error attachment | `backend/public/dev-dashboard.html` |
| Backward compatibility (textarea) | `backend/public/dev-dashboard.html` |

