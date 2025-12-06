# Step 5.5 Implementation Report: Public Response Sanitization + Remove Service-to-Service Imports

## ✅ Completed Changes

### A) Created Shared Normalizer Module

**New File:** `backend/src/modules/shared/normalizers/chat-message.normalizer.ts`

**Moved Functions:**
- `normalizeChatMessageRead` (exported)
- `normalizeRole` (private helper)
- `normalizeTraitData` (private helper)

**Updated Imports:**
- ✅ `backend/src/modules/sessions/sessions.service.ts` - imports from shared module
- ✅ `backend/src/modules/chat/chat.service.ts` - imports from shared module (removed service-to-service dependency)
- ✅ `backend/src/modules/sessions/sessions.service.spec.ts` - imports from shared module

**Note:** `normalizeRole` is also used internally in `sessions.service.ts` for transcript normalization, so a local helper was kept there for that purpose.

### B) Sanitized Practice Session API Response

**File:** `backend/src/modules/practice/practice.service.ts`

**Added Function:** `sanitizePracticeResponse()` (lines 476-499)

**Sanitization Rules:**
1. **aiDebug**: Removed by default. Only included if:
   - `NODE_ENV !== 'production'` AND
   - `AI_DEBUG_EXPOSE === 'true'`
   - **Production hard rule:** NEVER exposed in production, even if flag set

2. **aiStructured.raw**: Always removed if `aiStructured` exists (keeps other fields for backwards compatibility)

3. **extraPayload**: Not directly exposed in response (stored in DB `payload` field only)

**Applied to:**
- ✅ Disqualify path return (line ~847)
- ✅ Normal path return (line ~971)

### C) Tests

**Unit Tests:**
- ✅ Created `backend/src/modules/shared/normalizers/chat-message.normalizer.spec.ts`
- ✅ Comprehensive test coverage for all normalization scenarios
- ✅ Tests moved from `sessions.service.spec.ts` to shared module

**E2E Tests:**
- ✅ Added test suite in `backend/test/e2e/practice.e2e-spec.ts` (Step 5.5 section)
- ✅ Tests verify:
  - `aiDebug` is NOT present by default
  - `aiStructured.raw` is NOT present if `aiStructured` exists
  - Debug fields are NEVER exposed in production mode
  - Public fields are preserved (`endReasonMeta`, `missionState`, etc.)
  - Messages don't have `meta` field
  - JSON serialization doesn't contain debug fields

---

## Files Created/Changed

### New Files
1. `backend/src/modules/shared/normalizers/chat-message.normalizer.ts`
2. `backend/src/modules/shared/normalizers/chat-message.normalizer.spec.ts`

### Modified Files
1. `backend/src/modules/sessions/sessions.service.ts`
   - Removed: `normalizeChatMessageRead`, `normalizeRole`, `normalizeTraitData` functions
   - Added: Import from shared normalizer module
   - Added: Local `normalizeRole` helper for transcript normalization (different use case)

2. `backend/src/modules/chat/chat.service.ts`
   - Changed: Import from `../sessions/sessions.service` → `../shared/normalizers/chat-message.normalizer`
   - **Result:** ✅ Removed service-to-service dependency

3. `backend/src/modules/practice/practice.service.ts`
   - Added: `sanitizePracticeResponse()` helper function
   - Modified: Both return statements now apply sanitization

4. `backend/src/modules/sessions/sessions.service.spec.ts`
   - Changed: Import from shared normalizer module

5. `backend/test/e2e/practice.e2e-spec.ts`
   - Added: Step 5.5 test suite for sanitization verification

---

## Before/After Response Shape

### Before (Step 5.4)
```typescript
POST /v1/practice/session Response:
{
  ...saved,  // { ok, rewards, dashboard, sessionId, messages }
  aiReply: string,
  aiStructured: {
    replyText: string,
    messageScore?: number,
    rarity?: string,
    tags?: string[],
    raw?: any,  // ⚠️ Internal debug data
    parseOk: boolean
  } | null,
  aiDebug?: {  // ⚠️ Conditional (dev only, but still exposed)
    provider: string,
    model: string,
    latencyMs: number,
    // ... more debug info
  },
  mission: {...},
  missionState: {...}
}
```

### After (Step 5.5)
```typescript
POST /v1/practice/session Response:
{
  ...saved,  // { ok, rewards, dashboard, sessionId, messages }
  aiReply: string,
  aiStructured: {
    replyText: string,
    messageScore?: number,
    rarity?: string,
    tags?: string[],
    // ✅ raw field removed
    parseOk: boolean
  } | null,
  // ✅ aiDebug removed by default (only if NODE_ENV !== 'production' AND AI_DEBUG_EXPOSE === 'true')
  mission: {...},
  missionState: {...}
}
```

**Production Mode:**
- `aiDebug`: Always absent
- `aiStructured.raw`: Always absent
- All public fields preserved

**Development Mode (with flag):**
- `aiDebug`: Only if `AI_DEBUG_EXPOSE === 'true'`
- `aiStructured.raw`: Always absent (even with flag)

---

## Exact Sanitized Return Object Code

**Location:** `backend/src/modules/practice/practice.service.ts:476-499`

```typescript
function sanitizePracticeResponse<T extends Record<string, any>>(resp: T): T {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowDebug = !isProduction && process.env.AI_DEBUG_EXPOSE === 'true';

  // Create sanitized copy
  const sanitized: any = { ...resp };

  // Remove aiDebug unless explicitly allowed (and never in production)
  if (!allowDebug && 'aiDebug' in sanitized) {
    delete sanitized.aiDebug;
  }

  // Sanitize aiStructured: remove 'raw' field if present
  if ('aiStructured' in sanitized && sanitized.aiStructured && typeof sanitized.aiStructured === 'object') {
    const { raw, ...rest } = sanitized.aiStructured as any;
    sanitized.aiStructured = rest as any;
  }

  return sanitized as T;
}
```

**Applied at:**
- Line ~847: Disqualify path return
- Line ~971: Normal path return

Both use: `return sanitizePracticeResponse({ ...responseObject });`

---

## Assumptions About FE Dependencies

### ✅ Safe Assumptions (No Breaking Changes)
1. **aiStructured.raw**: FE should not rely on this field (it's internal debug data)
   - **Action:** Removed completely
   - **Risk:** Low - this is internal parsing data, not part of public API

2. **aiDebug**: FE should not rely on this field (dev-only debug info)
   - **Action:** Removed by default, gated behind explicit flag
   - **Risk:** Low - already conditional, now more explicit

3. **aiStructured other fields**: FE may use `replyText`, `messageScore`, `rarity`, `tags`, `parseOk`
   - **Action:** Preserved all fields except `raw`
   - **Risk:** None - backwards compatible

### ⚠️ Verification Needed
1. **Check FE codebase** for any usage of:
   - `response.aiStructured.raw`
   - `response.aiDebug` (should be safe, but verify)

### Public Fields Preserved (No Changes)
- `aiReply` ✅
- `mission` ✅
- `missionState` ✅
- `endReasonMeta` ✅ (public field, normalized)
- `rewards` ✅
- `dashboard` ✅
- `sessionId` ✅
- `messages` ✅ (already sanitized, no `meta` field)

---

## Done Checklist

- ✅ No service imports another service just for helpers (Chat no longer imports Sessions)
- ✅ POST /v1/practice/session response does NOT include debug/internal fields by default
- ✅ Debug fields are gated behind env flag and NEVER exposed in production
- ✅ Unit tests compile and cover moved normalizers
- ✅ E2E test verifies no debug leakage
- ✅ Build passes (TypeScript compilation successful)
- ✅ All imports updated correctly
- ✅ Backwards compatibility maintained (public fields preserved)

---

## Verification Commands

```bash
# Build check
cd backend && npm run build

# Run unit tests
npm test -- chat-message.normalizer.spec.ts

# Run E2E tests
npm test -- practice.e2e-spec.ts
```

---

## Summary

**Service Dependencies Removed:**
- ✅ `chat.service.ts` → `sessions.service.ts` dependency eliminated
- ✅ All normalizers now in shared module (no service-to-service imports)

**Debug Fields Sanitized:**
- ✅ `aiDebug` removed by default (gated behind explicit flag, never in production)
- ✅ `aiStructured.raw` always removed
- ✅ `extraPayload` not exposed (stored in DB only)

**Backwards Compatibility:**
- ✅ All public fields preserved
- ✅ `aiStructured` other fields preserved (only `raw` removed)
- ✅ No breaking changes to public API contract

**Test Coverage:**
- ✅ Comprehensive unit tests for normalizers
- ✅ E2E tests verify sanitization in practice

**Build Status:**
- ✅ TypeScript compilation successful
- ✅ No linter errors

