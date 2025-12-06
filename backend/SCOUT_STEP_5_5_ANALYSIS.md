# SCOUT — Step 5.5: Public Response Sanitization Analysis

## 1. API Responses Returning Debug/Internal Fields

### 1.1 PracticeService.runPracticeSession()
**File:** `backend/src/modules/practice/practice.service.ts`  
**Function:** `runPracticeSession()` (lines 507-992)  
**Returns to API:** Direct return (via `PracticeController.session()`)

**Debug fields returned:**
- `aiDebug` (line 975): Conditionally returned only in non-production (`process.env.NODE_ENV !== 'production'`)
- `aiStructured` (line 974): Always returned (contains `raw` field which may include internal data)
- `extraPayload` (via `payloadExtras`, line 769-776): Stored in DB `payload` field (line 403), but also passed to `createScoredSessionFromScores` (lines 842, 966)
- `endReasonMeta` (line 968): **PUBLIC FIELD** - normalized, should remain

**Response structure:**
```typescript
{
  ...saved,  // from createScoredSessionFromScores
  aiReply: string,
  aiStructured?: AiStructuredReply,  // ⚠️ Contains 'raw' field
  aiDebug?: any,  // ⚠️ Conditional debug info
  mission: {...},
  missionState: {...}
}
```

**Note:** `extraPayload` is stored in DB `payload` field but not directly exposed in response. However, it's passed through the call chain.

### 1.2 SessionsService.createScoredSessionFromScores()
**File:** `backend/src/modules/sessions/sessions.service.ts`  
**Function:** `createScoredSessionFromScores()` (lines 673-807)  
**Returns to API:** Indirect (returned by `runPracticeSession`, spread as `...saved`)

**Debug fields:**
- `messages` array (line 805): Messages are normalized via `normalizeChatMessageRead()` which **strips `meta` field** ✅
- No direct debug fields exposed

**Response structure:**
```typescript
{
  ok: true,
  rewards: {...},
  dashboard: {...},
  sessionId: string,
  messages: ApiChatMessage[]  // ✅ Already sanitized (no meta)
}
```

### 1.3 ChatService.handleUserMessage()
**File:** `backend/src/modules/chat/chat.service.ts`  
**Function:** `handleUserMessage()` (lines 21-86)  
**Returns to API:** Direct return (via `ChatController.sendMessage()`)

**Debug fields:**
- None - message is normalized via `normalizeChatMessageRead()` ✅

**Response structure:**
```typescript
{
  message: ApiChatMessage  // ✅ Already sanitized
}
```

### 1.4 Fields NOT Found
- `providerRaw`: ❌ Not found in codebase
- `scoringDebug`: ❌ Not found in codebase

### 1.5 Summary of Debug Fields in API Responses

| Field | Location | Status | Action Needed |
|-------|----------|--------|---------------|
| `aiDebug` | `practice.service.ts:975` | Conditional (dev only) | Strip in production, consider removing entirely |
| `aiStructured` | `practice.service.ts:974` | Always returned | Sanitize `raw` field or remove it |
| `extraPayload` | `practice.service.ts:769` | Stored in DB, passed through | Not directly exposed, but verify payload field access |
| `payloadExtras` | `practice.service.ts:769` | Internal only | Already internal, verify no exposure |
| `meta` (ChatMessage) | DB field | Stored but NOT returned | ✅ Already sanitized by `normalizeChatMessageRead` |
| `endReasonMeta` | Multiple | Normalized public field | ✅ Keep as-is (public API) |

---

## 2. normalizeChatMessageRead Function Analysis

### 2.1 Definition
**File:** `backend/src/modules/sessions/sessions.service.ts`  
**Lines:** 96-147  
**Type:** Exported function (not a method)

**Signature:**
```typescript
export function normalizeChatMessageRead(
  m: any,
  fallbackIndex: number,
): {
  turnIndex: number;
  role: MessageRole;
  content: string;
  score: number | null;
  traitData: { traits: Record<string, any>; flags: string[]; label: string | null };
}
```

**Key behavior:**
- Strips `meta` field (not in return type) ✅
- Normalizes `turnIndex`, `score`, `role`, `content`, `traitData`
- Idempotent (safe to call multiple times)

### 2.2 Import/Usage Locations

1. **chat.service.ts**
   - **Import:** Line 6: `import { normalizeChatMessageRead } from '../sessions/sessions.service';`
   - **Usage:** Line 76: `normalizeChatMessageRead(message, message.turnIndex ?? 0)`
   - **Issue:** ⚠️ Service-to-service import (chat → sessions)

2. **sessions.service.ts**
   - **Definition:** Lines 96-147
   - **Usage:** Line 771: `normalizeChatMessageRead(m, idx)` (internal use)
   - **Status:** ✅ Internal use, no issue

### 2.3 Related Normalizers

1. **normalizeEndReason**
   - **File:** `backend/src/modules/practice/practice.service.ts`
   - **Lines:** 432-470
   - **Type:** Exported function
   - **Usage:** Internal to practice.service.ts only ✅

2. **normalizeTraitData**
   - **File:** `backend/src/modules/sessions/sessions.service.ts`
   - **Lines:** 73-79
   - **Type:** Private function
   - **Usage:** Internal to sessions.service.ts only ✅

3. **normalizeRole**
   - **File:** `backend/src/modules/sessions/sessions.service.ts`
   - **Lines:** 81-87
   - **Type:** Private function
   - **Usage:** Internal to sessions.service.ts only ✅

---

## 3. Proposed Change Set

### 3.1 Create Shared Normalizers Module

**New File:** `backend/src/modules/shared/normalizers.ts`

**Purpose:**
- Centralize all message/response normalizers
- Remove service-to-service dependencies
- Provide sanitization utilities for public API responses

**Contents:**
```typescript
// Exported functions:
- normalizeChatMessageRead()
- normalizeEndReason()  // Move from practice.service.ts
- normalizeTraitData()  // Move from sessions.service.ts (make public)
- normalizeRole()  // Move from sessions.service.ts (make public)
- sanitizePracticeResponse()  // NEW: Strip debug fields from practice responses
- sanitizeAiStructured()  // NEW: Remove 'raw' field from aiStructured
```

### 3.2 Files to Modify

#### 3.2.1 Create New File
- `backend/src/modules/shared/normalizers.ts` (NEW)

#### 3.2.2 Update Existing Files

1. **backend/src/modules/sessions/sessions.service.ts**
   - Remove `normalizeChatMessageRead` definition (move to shared)
   - Remove `normalizeTraitData` definition (move to shared)
   - Remove `normalizeRole` definition (move to shared)
   - Import from `../shared/normalizers`
   - Update internal usages

2. **backend/src/modules/practice/practice.service.ts**
   - Remove `normalizeEndReason` definition (move to shared)
   - Import from `../shared/normalizers`
   - Update internal usages
   - **Add sanitization** before returning response:
     - Strip `aiDebug` in production (already conditional, but ensure it's never exposed)
     - Sanitize `aiStructured.raw` field
     - Verify `extraPayload` is not exposed

3. **backend/src/modules/chat/chat.service.ts**
   - Update import: `from '../shared/normalizers'` (instead of sessions.service)
   - No other changes needed

### 3.3 Sanitization Strategy

#### 3.3.1 Practice Response Sanitization
**Location:** `practice.service.ts` - before return in `runPracticeSession()`

**Changes:**
```typescript
// Before return (line ~971):
const sanitized = sanitizePracticeResponse({
  ...saved,
  aiReply,
  aiStructured,
  aiDebug,
  mission,
  missionState,
});

return sanitized;
```

**sanitizePracticeResponse() behavior:**
- Always remove `aiDebug` (or keep conditional for dev, but ensure production safety)
- Remove `aiStructured.raw` field (keep other fields)
- Verify no `extraPayload` or `payloadExtras` in response
- Keep all public fields (`endReasonMeta`, `missionState`, etc.)

#### 3.3.2 Backwards Compatibility
- **aiStructured**: Keep the field but remove `raw` sub-field (FE shouldn't rely on `raw`)
- **aiDebug**: Already conditional, but document that it's dev-only
- **Messages**: Already sanitized (no changes needed)

---

## 4. Proposed Tests

### 4.1 Unit Test: Sanitization Helper
**File:** `backend/src/modules/shared/normalizers.spec.ts` (NEW)

**Test cases:**
```typescript
describe('sanitizePracticeResponse', () => {
  it('should remove aiDebug in production mode', () => {
    // Test with NODE_ENV=production
  });
  
  it('should remove raw field from aiStructured', () => {
    // Verify aiStructured.raw is removed
  });
  
  it('should preserve all public fields', () => {
    // Verify endReasonMeta, missionState, etc. are preserved
  });
  
  it('should not expose extraPayload or payloadExtras', () => {
    // Verify these fields are not in response
  });
});

describe('sanitizeAiStructured', () => {
  it('should remove raw field while preserving other fields', () => {
    // Test sanitization
  });
  
  it('should handle null/undefined aiStructured', () => {
    // Edge cases
  });
});
```

### 4.2 E2E Test: Practice Response Sanitization
**File:** `backend/test/e2e/practice.e2e-spec.ts`

**New test suite:**
```typescript
describe('Step 5.5 - Public Response Sanitization', () => {
  it('should NOT include aiDebug in production response', async () => {
    // Set NODE_ENV=production
    // Verify response.body.aiDebug is undefined
  });
  
  it('should NOT include raw field in aiStructured', async () => {
    // Verify response.body.aiStructured exists but has no 'raw' field
  });
  
  it('should NOT include extraPayload or payloadExtras in response', async () => {
    // Verify these fields are not present
  });
  
  it('should preserve public fields (endReasonMeta, missionState)', async () => {
    // Verify these are still present
  });
  
  it('should NOT include meta field in messages', async () => {
    // Verify response.body.messages[].meta is undefined
  });
});
```

---

## 5. File List to Change

### 5.1 New Files
1. `backend/src/modules/shared/normalizers.ts` - Shared normalizers module
2. `backend/src/modules/shared/normalizers.spec.ts` - Unit tests for normalizers

### 5.2 Modified Files
1. `backend/src/modules/sessions/sessions.service.ts`
   - Remove normalizer functions (move to shared)
   - Update imports
   - Update internal usages

2. `backend/src/modules/practice/practice.service.ts`
   - Remove `normalizeEndReason` (move to shared)
   - Add response sanitization before return
   - Update imports

3. `backend/src/modules/chat/chat.service.ts`
   - Update import path (sessions.service → shared/normalizers)

4. `backend/test/e2e/practice.e2e-spec.ts`
   - Add new test suite for sanitization

### 5.3 Files to Review (No Changes Expected)
- `backend/src/modules/sessions/sessions.service.spec.ts` - May need import updates
- `backend/src/modules/practice/practice.service.spec.ts` - May need import updates

---

## 6. Exact Implementation Plan

### Phase 1: Create Shared Module
1. Create `backend/src/modules/shared/normalizers.ts`
2. Move `normalizeChatMessageRead` from sessions.service.ts
3. Move `normalizeEndReason` from practice.service.ts
4. Move `normalizeTraitData` from sessions.service.ts (make public)
5. Move `normalizeRole` from sessions.service.ts (make public)
6. Add `sanitizePracticeResponse()` function
7. Add `sanitizeAiStructured()` function

### Phase 2: Update Service Imports
1. Update `sessions.service.ts`:
   - Remove moved functions
   - Add: `import { normalizeChatMessageRead, normalizeTraitData, normalizeRole } from '../shared/normalizers';`
   - Update internal usages (should work as-is)

2. Update `practice.service.ts`:
   - Remove `normalizeEndReason`
   - Add: `import { normalizeEndReason, sanitizePracticeResponse, sanitizeAiStructured } from '../shared/normalizers';`
   - Update internal usages
   - Add sanitization before return in `runPracticeSession()`

3. Update `chat.service.ts`:
   - Change import: `from '../shared/normalizers'` (instead of `../sessions/sessions.service`)

### Phase 3: Add Sanitization
1. In `practice.service.ts` `runPracticeSession()`:
   - Before return, sanitize `aiStructured` if present
   - Apply `sanitizePracticeResponse()` to final response
   - Ensure `aiDebug` is never exposed in production

### Phase 4: Tests
1. Create `normalizers.spec.ts` with unit tests
2. Add e2e tests to `practice.e2e-spec.ts`
3. Update existing unit test imports if needed

---

## 7. Risks & Considerations

### 7.1 Breaking Changes
- **Risk:** FE might rely on `aiStructured.raw` field
- **Mitigation:** Check FE codebase for usage, or keep field but document as deprecated
- **Alternative:** Remove immediately if confirmed unused

### 7.2 Service Dependencies
- **Risk:** Circular dependencies when moving to shared module
- **Mitigation:** Shared module should have NO service imports (pure functions only)
- **Verification:** Ensure normalizers.ts only imports types, not services

### 7.3 Performance
- **Risk:** Additional sanitization overhead
- **Mitigation:** Minimal - just object field removal, should be negligible
- **Note:** Already doing normalization, this is just adding one more step

### 7.4 Backwards Compatibility
- **Risk:** Removing `aiDebug` might break dev tools
- **Mitigation:** Keep conditional behavior (dev only), but ensure production safety
- **Recommendation:** Document that `aiDebug` is dev-only and may be removed

### 7.5 Testing Coverage
- **Risk:** Missing edge cases in sanitization
- **Mitigation:** Comprehensive unit tests + e2e tests
- **Focus:** Test null/undefined handling, nested objects, production vs dev modes

### 7.6 Migration Path
- **Risk:** Need to update multiple files simultaneously
- **Mitigation:** 
  - Phase 1: Create shared module, export functions
  - Phase 2: Update imports one service at a time
  - Phase 3: Add sanitization
  - Phase 4: Tests
- **Rollback:** Keep old functions until fully migrated and tested

---

## 8. Summary

### Current State
- ✅ Messages already sanitized (no `meta` field)
- ⚠️ `aiDebug` conditionally exposed (dev only, but should be more explicit)
- ⚠️ `aiStructured.raw` exposed (internal data)
- ⚠️ Service-to-service import: `chat.service` → `sessions.service`

### Target State
- ✅ All normalizers in shared module (no service dependencies)
- ✅ All debug fields stripped from public API responses
- ✅ Public fields preserved (`endReasonMeta`, `missionState`, etc.)
- ✅ Comprehensive test coverage

### Estimated Impact
- **Files changed:** 5-6 files
- **New files:** 2 files
- **Breaking changes:** None (backwards compatible)
- **Risk level:** Low (well-isolated changes, good test coverage)

