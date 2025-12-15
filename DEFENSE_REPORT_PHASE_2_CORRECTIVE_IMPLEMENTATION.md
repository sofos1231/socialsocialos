# DEFENSE REPORT — Phase 2 Corrective Implementation

**Date:** 2025-01-XX  
**Mode:** IMPLEMENT (Corrective Fixes)  
**Status:** ✅ COMPLETE

---

## Summary

This implementation fixes two gaps identified in Phase 2 certification:

1. **Backend raw MissionConfigV1 support**: Backend now accepts both wrapped `{ missionConfigV1: {...} }` and raw MissionConfigV1 formats, automatically wrapping raw configs before validation/normalization.

2. **Dashboard payload semantics**: Dashboard now properly validates numeric fields (blocks invalid input instead of silently nulling) and always includes all new fields in payload (even when null) to enable clearing values.

---

## Files Changed

### 1. `backend/src/modules/missions-admin/missions-admin.service.ts`

**What Changed:**
- Added `coerceAiContractToWrapped()` private method (lines ~104-135)
- Updated `createMission()` to use wrapped format after sanitization (lines ~457-471)
- Updated `updateMission()` to use wrapped format after sanitization (lines ~721-750)

**Why:**
- Satisfies Phase 2 requirement: "Backend must accept raw MissionConfigV1 and wrapped { missionConfigV1 }"
- Ensures consistent format before validation/normalization

**Which Phase 2 Requirement It Satisfies:**
- **Part 1 — Backward compatibility handling**: Support for both wrapped and raw MissionConfigV1 formats

**Exact Changes:**

**Added method (lines ~104-135):**
```typescript
private coerceAiContractToWrapped(raw: any): any {
  // If null/undefined, return as-is
  if (raw === null || raw === undefined) {
    return raw;
  }

  // If already wrapped, return as-is
  if (
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    'missionConfigV1' in raw &&
    typeof raw.missionConfigV1 === 'object' &&
    raw.missionConfigV1 !== null
  ) {
    return raw;
  }

  // If raw MissionConfigV1 (has version:1 and required fields), wrap it
  if (
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    raw !== null &&
    raw.version === 1 &&
    typeof raw.dynamics === 'object' &&
    typeof raw.objective === 'object' &&
    typeof raw.difficulty === 'object' &&
    typeof raw.style === 'object' &&
    typeof raw.statePolicy === 'object'
  ) {
    return { missionConfigV1: raw };
  }

  // Else return unchanged (existing error behavior stays)
  return raw;
}
```

**Updated create path (lines ~457-471):**
```typescript
const aiContract = this.sanitizeAiContract(dto.aiContract);

// Phase 2: Coerce raw MissionConfigV1 to wrapped format before validation
const wrappedAiContract = this.coerceAiContractToWrapped(aiContract);

// Phase 0: Validate missionConfigV1 for create
const validationErrors = validateMissionConfigV1Shape(wrappedAiContract);
// ... (rest uses wrappedAiContract)
const normalizeResult = normalizeMissionConfigV1(wrappedAiContract);
```

**Updated update path (lines ~721-750):**
```typescript
const aiContract = this.sanitizeAiContract(dto.aiContract);

// Phase 2: Coerce raw MissionConfigV1 to wrapped format before validation
const wrappedAiContract = this.coerceAiContractToWrapped(aiContract);

// ... (rest uses wrappedAiContract)
const validationErrors = validateMissionConfigV1Shape(wrappedAiContract);
const normalizeResult = normalizeMissionConfigV1(wrappedAiContract);
```

**Risks:**
- **Low risk**: Method only wraps if input matches raw MissionConfigV1 structure (version:1 + required fields). Invalid inputs pass through unchanged, preserving existing error behavior.
- **Backward compatible**: Already-wrapped configs are returned as-is, no breaking changes.

---

### 2. `backend/src/modules/practice/mission-config-runtime.ts`

**What Changed:**
- Updated `normalizeMissionConfigV1()` to accept raw MissionConfigV1 format (lines ~67-95)

**Why:**
- Ensures runtime normalization is robust even if database contains legacy raw configs
- Matches backend admin service behavior for consistency

**Which Phase 2 Requirement It Satisfies:**
- **Part 1 — Backward compatibility handling**: Support for both wrapped and raw MissionConfigV1 formats at runtime

**Exact Changes:**

**Updated function (lines ~67-95):**
```typescript
export function normalizeMissionConfigV1(
  aiContractUnknown: unknown,
): NormalizeResult {
  if (!isPlainObject(aiContractUnknown)) {
    return { ok: false, reason: 'not_object' };
  }

  // Phase 2: Accept raw MissionConfigV1 format (wrap it internally)
  let wrappedContract: any;
  if ('missionConfigV1' in aiContractUnknown) {
    // Already wrapped
    wrappedContract = aiContractUnknown;
  } else {
    // Check if it's raw MissionConfigV1 (has version:1 and required fields)
    const raw = aiContractUnknown as any;
    if (
      raw.version === 1 &&
      typeof raw.dynamics === 'object' &&
      typeof raw.objective === 'object' &&
      typeof raw.difficulty === 'object' &&
      typeof raw.style === 'object' &&
      typeof raw.statePolicy === 'object'
    ) {
      // Wrap it internally
      wrappedContract = { missionConfigV1: raw };
    } else {
      // Not wrapped and not raw MissionConfigV1
      return { ok: false, reason: 'missing' };
    }
  }

  const validationErrors = validateMissionConfigV1Shape(wrappedContract);
  // ... (rest uses wrappedContract)
  const config = (wrappedContract as any).missionConfigV1 as MissionConfigV1;
```

**Risks:**
- **Low risk**: Same validation logic as admin service. Raw configs are wrapped internally, existing error reasons (not_object, missing, invalid) remain stable.
- **Backward compatible**: Already-wrapped configs work as before.

---

### 3. `backend/public/dev-dashboard.html`

**What Changed:**
- Replaced numeric field parsing with validation helpers that return `{ ok, value/error }` (lines ~2561-2595)
- Updated `getMissionFormValues()` to block save on invalid numeric input (lines ~2595-2600)
- Changed payload construction to always include numeric fields (even when null) instead of conditional spreads (lines ~2619-2632, ~2702-2716)

**Why:**
- Satisfies Phase 2 requirement: "empty string → null AND include all new fields in payload (not omit-on-null)"
- Prevents silent failures from invalid input
- Enables clearing values by sending null

**Which Phase 2 Requirement It Satisfies:**
- **Part 2 — getMissionFormValues includes + numeric parsing rules**: 
  - Numeric parsing: empty string → `null` ✅
  - Range validation: blocks invalid input instead of silently nulling ✅
  - All new fields included in payload (even when null) ✅

**Exact Changes:**

**Replaced parsing logic (lines ~2561-2595):**
```javascript
// Phase 2: Parse numeric fields with proper validation (empty → null, invalid → block save)
// Helper: Parse numeric field with validation
const parseNumericField = (inputValue, fieldName, minValue, allowNull) => {
  const val = (inputValue || "").trim();
  if (!val) {
    return { ok: true, value: null };
  }
  const num = parseInt(val, 10);
  if (!Number.isFinite(num)) {
    return { ok: false, error: `${fieldName} must be a valid number` };
  }
  if (num < minValue) {
    return { ok: false, error: `${fieldName} must be >= ${minValue}` };
  }
  return { ok: true, value: num };
};

const timeLimitSecResult = parseNumericField(ui.missionTimeLimitInput.value, "Time Limit", 0, true);
const maxMessagesResult = parseNumericField(ui.missionMaxMessagesInput.value, "Max Messages", 1, true);
const wordLimitResult = parseNumericField(ui.missionWordLimitInput.value, "Word Limit", 1, true);
const laneIndexResult = parseNumericField(ui.laneIndexInput.value, "Lane Index", 0, true);
const orderIndexResult = parseNumericField(ui.orderIndexInput.value, "Order Index", 0, true);

// Block save if any numeric field is invalid
const numericErrors = [
  timeLimitSecResult,
  maxMessagesResult,
  wordLimitResult,
  laneIndexResult,
  orderIndexResult
].filter(r => !r.ok);

if (numericErrors.length > 0) {
  const errorMessages = numericErrors.map(r => r.error).join("; ");
  showError(`Invalid numeric fields: ${errorMessages}`);
  return { ok: false, error: errorMessages };
}

const timeLimitSec = timeLimitSecResult.value;
const maxMessages = maxMessagesResult.value;
const wordLimit = wordLimitResult.value;
const laneIndex = laneIndexResult.value;
const orderIndex = orderIndexResult.value;
```

**Updated payload construction (lines ~2619-2632, ~2702-2716):**
```javascript
// Phase 2: Always include numeric fields (even when null) to enable clearing
const payload = {
  name,
  description,
  difficulty,
  goalType,
  categoryId,
  personaId,
  active,
  ...(code ? { code } : {}),
  timeLimitSec: timeLimitSec,
  maxMessages: maxMessages,
  wordLimit: wordLimit,
  laneIndex: laneIndex,
  orderIndex: orderIndex,
  // ... (rest of payload)
};
```

**Risks:**
- **Low risk**: Validation is stricter (blocks invalid input), but this is the correct behavior per Phase 2 spec. Users will see clear error messages.
- **Backward compatible**: Valid inputs work as before. Empty strings still become null, but invalid numbers now block save instead of silently becoming null.

---

## Done Checklist Verification

✅ **Backend missions-admin accepts raw MissionConfigV1 and wraps it before validate/normalize.**
- **Evidence**: `coerceAiContractToWrapped()` method added and used in both create and update paths (lines ~104-135, ~457-471, ~721-750)

✅ **normalizeMissionConfigV1() accepts raw MissionConfigV1 (no missing for raw).**
- **Evidence**: Function updated to detect and wrap raw MissionConfigV1 internally (lines ~67-95)

✅ **Dashboard numeric parsing blocks invalid input (does not silently null it).**
- **Evidence**: `parseNumericField()` helper returns `{ ok: false, error }` for invalid input, save is blocked with error message (lines ~2561-2600)

✅ **Dashboard payload always includes timeLimitSec/maxMessages/wordLimit/laneIndex/orderIndex with null allowed.**
- **Evidence**: Payload construction changed from conditional spreads to direct assignment (lines ~2619-2632, ~2702-2716)

✅ **No new endpoints, no builder UI integration, no LEGO editor UI (still Phase 3).**
- **Evidence**: No new endpoints added, no builder/LEGO UI code added. Only backend format coercion and dashboard validation/payload changes.

---

## Edge Cases / Risks

### Edge Case 1: Invalid Raw MissionConfigV1 Structure
**Scenario:** User sends raw object with `version: 1` but missing required fields.
**Handling:** `coerceAiContractToWrapped()` returns unchanged, validation fails with existing error messages. ✅ Safe

### Edge Case 2: Partially Invalid Numeric Fields
**Scenario:** User enters valid `timeLimitSec` but invalid `maxMessages`.
**Handling:** All numeric fields are validated before save. If any fail, save is blocked with clear error message listing all invalid fields. ✅ Safe

### Edge Case 3: Clearing Values (Setting to Null)
**Scenario:** User clears a numeric field (empty string) and saves.
**Handling:** Empty string → `null` via `parseNumericField()`, field is included in payload as `null`, backend can clear the value. ✅ Works as intended

### Edge Case 4: Legacy Raw Configs in Database
**Scenario:** Database contains raw MissionConfigV1 (not wrapped) from before Phase 2.
**Handling:** Runtime normalization detects and wraps raw configs internally, no breaking changes. ✅ Backward compatible

### Risk: Stricter Validation May Block Some Workflows
**Mitigation:** This is intentional per Phase 2 spec. Invalid numeric input should be blocked, not silently nulled. Users see clear error messages.

---

## Summary

All Phase 2 gaps have been fixed:

1. ✅ Backend accepts both wrapped and raw MissionConfigV1 formats
2. ✅ Dashboard validates numeric fields and blocks invalid input
3. ✅ Dashboard always includes numeric fields in payload (even when null)

**No scope violations:** No new endpoints, no builder UI, no LEGO editor UI added.

**Backward compatible:** Existing valid inputs work as before. Invalid inputs are now properly rejected instead of silently nulled.

**Phase 2 compliance:** 100% ✅

