# Scout Report: Step 5.4 (Hard Evidence Only)

## 1) Audit + Plan

### 1.1 All Backend Response Paths Returning Messages/Transcripts

#### Path 1: `POST /v1/practice/session` → `PracticeService.runPracticeSession()`
**File:** `backend/src/modules/practice/practice.controller.ts`
- **Line 20-24**: Controller endpoint
- **Calls:** `practiceService.runPracticeSession(userId, dto)`

**File:** `backend/src/modules/practice/practice.service.ts`
- **Function:** `runPracticeSession(userId: string, dto: CreatePracticeSessionDto)`
- **Returns:** Response from `sessions.createScoredSessionFromScores()` (line 831, 966) + `missionState`
- **What it returns:** `PracticeSessionResponse` with `messages?: ApiChatMessage[]` (line 869, 1002)
- **Evidence:** ```847:870:backend/src/modules/practice/practice.service.ts``` and ```988:1006:backend/src/modules/practice/practice.service.ts```

#### Path 2: `SessionsService.createScoredSessionFromScores()`
**File:** `backend/src/modules/sessions/sessions.service.ts`
- **Function:** `createScoredSessionFromScores(params)`
- **Returns:** Object with `messages: normalizedMessages` (line 738)
- **What it returns:** Array of `{ turnIndex, role, content, score, traitData }`
- **Evidence:** ```708:739:backend/src/modules/sessions/sessions.service.ts```
- **DB Read:** ```582:592:backend/src/modules/sessions/sessions.service.ts```
  - Selects: `turnIndex, role, content, score, traitData`
  - Orders by: `turnIndex: 'asc'`

#### Path 3: `POST /v1/chat/message` → `ChatService.handleUserMessage()`
**File:** `backend/src/modules/chat/chat.controller.ts`
- **Line 20-26**: Controller endpoint
- **Calls:** `chatService.handleUserMessage(userId, sessionId, content)`

**File:** `backend/src/modules/chat/chat.service.ts`
- **Function:** `handleUserMessage(userId: string, sessionId: string, content: string)`
- **Returns:** `{ message }` (line 73) - **SINGLE message, not array**
- **What it returns:** Raw Prisma `ChatMessage` object (includes `turnIndex`, `score`, `traitData`)
- **Evidence:** ```71:74:backend/src/modules/chat/chat.service.ts```
- **Note:** This is a write-only endpoint (creates message), but returns the created message. **NOT a read path for transcripts.**

#### Path 4: `PracticeService.runPracticeSession()` - Continuation Fallback
**File:** `backend/src/modules/practice/practice.service.ts`
- **Lines 677-699**: Reads messages from DB when `existingTranscript.length === 0`
- **DB Read:** ```678:682:backend/src/modules/practice/practice.service.ts```
  - Selects: `role, content, createdAt, turnIndex, meta`
  - Orders by: `createdAt: 'asc'` (fallback, not `turnIndex`)
  - **Issue:** This reads messages but does NOT return them to FE - only uses them internally to rebuild transcript
- **Evidence:** ```676:699:backend/src/modules/practice/practice.service.ts```

#### Path 5: Stats/Dashboard Endpoints
**File:** `backend/src/modules/stats/stats.service.ts`
- **Function:** `getDashboardForUser(userId: string)`
- **Returns:** Dashboard summary - **DOES NOT return messages/transcripts**
- **Evidence:** ```106:391:backend/src/modules/stats/stats.service.ts```
- **Note:** Only returns session-level metrics, not individual messages

---

### 1.2 Where turnIndex and score Are Read from DB

#### Read Point 1: `SessionsService.saveOrUpdateScoredSession()` (internal)
**File:** `backend/src/modules/sessions/sessions.service.ts`
- **Lines 582-592**: `tx.chatMessage.findMany()` with `select: { turnIndex, role, content, score, traitData }`
- **Ordering:** `orderBy: { turnIndex: 'asc' }` ✅
- **Returns to:** Internal transaction, then passed to `createScoredSessionFromScores()`
- **Normalization:** Applied at line 709-715 (normalizes `traitData` only, not `turnIndex`/`score`)

#### Read Point 2: `PracticeService.runPracticeSession()` (continuation fallback)
**File:** `backend/src/modules/practice/practice.service.ts`
- **Lines 678-682**: `prisma.chatMessage.findMany()` with `select: { role, content, createdAt, turnIndex, meta }`
- **Ordering:** `orderBy: { createdAt: 'asc' }` (fallback, then sorted by `turnIndex` if available)
- **Returns to:** Internal use only (rebuilds transcript), NOT returned to FE
- **Normalization:** None - only used for internal transcript reconstruction

---

### 1.3 Current Normalization State

#### ✅ Already Normalized (Step 5.2)
- **File:** `backend/src/modules/sessions/sessions.service.ts`
  - **Line 714**: `traitData: normalizeTraitData(m.traitData)` ✅

#### ❌ Missing Normalization (Step 5.4)
- **File:** `backend/src/modules/sessions/sessions.service.ts`
  - **Line 710**: `turnIndex: m.turnIndex` - **No normalization** (could be missing in legacy data, though schema says required)
  - **Line 713**: `score: m.score ?? null` - **Partial normalization** (handles null, but not undefined/NaN/invalid)

#### ❌ Missing Normalization (Chat Service)
- **File:** `backend/src/modules/chat/chat.service.ts`
  - **Line 73**: Returns raw Prisma `ChatMessage` object
  - **Issue:** Single message endpoint, but should still normalize for consistency

---

### 1.4 Frontend Contract Expectations

**File:** `socialsocial/src/navigation/types.ts`
- **Lines 157-163**: `ApiChatMessage` interface
  ```typescript
  export interface ApiChatMessage {
    turnIndex: number;        // ⚠️ Required (not optional)
    role: ApiMessageRole;
    content: string;
    score: number | null;     // ⚠️ number | null (not undefined)
    traitData: ApiTraitData;
  }
  ```

**Evidence:** Frontend expects:
- `turnIndex`: `number` (always present, never undefined/null)
- `score`: `number | null` (never undefined)
- `traitData`: Already normalized (Step 5.2)

---

## 2) What Exists vs Missing

### ✅ What Exists
1. **traitData normalization** (Step 5.2): `normalizeTraitData()` function exists and is applied
2. **DB ordering**: Messages read with `orderBy: { turnIndex: 'asc' }` in `sessions.service.ts`
3. **Partial score handling**: `score: m.score ?? null` handles null, but not undefined/NaN

### ❌ What's Missing
1. **turnIndex normalization**: No defensive handling for missing/invalid `turnIndex` (legacy data risk)
2. **score normalization**: No validation that `score` is finite number or null (could be NaN, Infinity, undefined)
3. **Consistent normalization helper**: No single `normalizeChatMessageRead()` function
4. **Chat service normalization**: `handleUserMessage()` returns raw Prisma object without normalization
5. **Fallback ordering normalization**: `practice.service.ts` fallback path doesn't normalize before using

---

## 3) Smallest Change Set

### Backend Files

1. **`backend/src/modules/sessions/sessions.service.ts`**
   - **Function to add**: `normalizeChatMessageRead(m: any, fallbackIndex?: number): ApiChatMessage`
   - **Where**: After `normalizeTraitData` function (after line 79)
   - **Why**: Normalize `turnIndex` (ensure number, never undefined/null), `score` (ensure finite number | null), apply `normalizeTraitData`

2. **`backend/src/modules/sessions/sessions.service.ts`**
   - **Function to modify**: `createScoredSessionFromScores()` (line 709-715)
   - **Change**: Replace inline mapping with `normalizeChatMessageRead()` call
   - **Why**: Ensure consistent normalization, handle legacy data

3. **`backend/src/modules/chat/chat.service.ts`**
   - **Function to modify**: `handleUserMessage()` (line 73)
   - **Change**: Normalize returned message using `normalizeChatMessageRead()`
   - **Why**: Consistency - all message responses should be normalized

4. **`backend/src/modules/practice/practice.service.ts`** (optional - internal use only)
   - **Function to modify**: Continuation fallback (lines 678-699)
   - **Change**: Normalize messages if they're ever returned (currently internal only)
   - **Why**: Defensive - if this path changes to return messages, they'll be normalized

### Test Files

5. **`backend/src/modules/sessions/sessions.service.spec.ts`**
   - **Add**: Tests for `normalizeChatMessageRead()` function
   - **Test cases**: Missing turnIndex, invalid score (NaN, Infinity, undefined), legacy data

6. **`backend/test/e2e/practice.e2e-spec.ts`**
   - **Add**: Test that returned `messages[]` array satisfies `ApiChatMessage` contract
   - **Verify**: All messages have `turnIndex: number`, `score: number | null` (never undefined)

---

## 4) Contracts

### Normalized Runtime Contract for `ApiChatMessage`

```typescript
interface ApiChatMessage {
  turnIndex: number;           // Always present, finite integer, >= 0
  role: 'USER' | 'AI' | 'SYSTEM';
  content: string;             // Non-empty string
  score: number | null;        // Finite number (0-100) or null, never undefined/NaN/Infinity
  traitData: {                 // Already normalized (Step 5.2)
    traits: Record<string, any>;
    flags: string[];
    label: string | null;
  };
}
```

**Rules:**
- `turnIndex`: Must be finite integer >= 0. If missing from DB, use `fallbackIndex` or throw error (shouldn't happen after Step 5.1 Migration B)
- `score`: Must be finite number (0-100) or `null`. Convert `undefined`/`NaN`/`Infinity` → `null`
- `traitData`: Already normalized by `normalizeTraitData()` (Step 5.2)
- `role`: Must be valid `MessageRole` enum value
- `content`: Must be non-empty string (already validated in write path)

---

## 5) Edge Cases + Risks

### 5.1 Legacy Data
- **Risk**: Pre-Step 5.1 messages might have `turnIndex: null` (though Migration B made it required)
- **Mitigation**: `normalizeChatMessageRead()` should handle null `turnIndex` with `fallbackIndex` parameter
- **Evidence**: Schema shows `turnIndex Int` (required) after Migration B, but legacy data might exist

### 5.2 Invalid Score Values
- **Risk**: `score` could be `NaN`, `Infinity`, `undefined`, or out-of-range (e.g., 150)
- **Mitigation**: Validate `score` is finite number in range [0, 100] or null
- **Evidence**: Schema shows `score Int?` (nullable), but no range validation

### 5.3 Ordering Consistency
- **Risk**: If `turnIndex` is missing, ordering might be inconsistent
- **Mitigation**: Always use `orderBy: { turnIndex: 'asc' }` in DB queries, normalize before returning
- **Evidence**: ```584:584:backend/src/modules/sessions/sessions.service.ts``` already uses `turnIndex` ordering ✅

### 5.4 Performance
- **Risk**: Normalization adds per-message overhead
- **Mitigation**: Minimal - simple type checks (similar to `normalizeTraitData`)
- **Evidence**: `normalizeTraitData` already applied per-message (```709:715:backend/src/modules/sessions/sessions.service.ts```)

### 5.5 Backward Compatibility
- **Risk**: Normalization might change behavior for edge cases
- **Mitigation**: Defensive normalization (invalid → null/default) maintains backward compatibility
- **Breaking change**: None - only adds normalization, doesn't change valid data

---

## 6) Proposed Implementation Plan

### Step 1: Add normalizeChatMessageRead helper
- **File**: `backend/src/modules/sessions/sessions.service.ts`
- **Location**: After `normalizeTraitData` (after line 79)
- **Implementation**:
  ```typescript
  function normalizeChatMessageRead(
    m: any,
    fallbackIndex?: number
  ): {
    turnIndex: number;
    role: MessageRole;
    content: string;
    score: number | null;
    traitData: { traits: Record<string, any>; flags: string[]; label: string | null };
  } {
    // Normalize turnIndex: ensure number (never undefined/null)
    let normalizedTurnIndex: number;
    if (typeof m.turnIndex === 'number' && Number.isFinite(m.turnIndex) && m.turnIndex >= 0) {
      normalizedTurnIndex = Math.floor(m.turnIndex);
    } else if (typeof fallbackIndex === 'number' && Number.isFinite(fallbackIndex)) {
      normalizedTurnIndex = Math.floor(fallbackIndex);
    } else {
      // Defensive: should not happen after Migration B, but handle gracefully
      throw new Error(`ChatMessage missing turnIndex and no fallbackIndex provided: ${m.id || 'unknown'}`);
    }

    // Normalize score: ensure finite number (0-100) or null
    let normalizedScore: number | null = null;
    if (typeof m.score === 'number' && Number.isFinite(m.score)) {
      const clamped = Math.max(0, Math.min(100, Math.floor(m.score)));
      normalizedScore = clamped;
    }
    // undefined/NaN/Infinity → null (already handled above)

    // Normalize role
    const normalizedRole = normalizeRole(m.role);

    // Normalize content (defensive)
    const normalizedContent = safeTrim(m.content || '');

    // Normalize traitData (already has helper)
    const normalizedTraitData = normalizeTraitData(m.traitData);

    return {
      turnIndex: normalizedTurnIndex,
      role: normalizedRole,
      content: normalizedContent,
      score: normalizedScore,
      traitData: normalizedTraitData,
    };
  }
  ```
- **Verify**: Function exists, no syntax errors

### Step 2: Apply normalization in createScoredSessionFromScores
- **File**: `backend/src/modules/sessions/sessions.service.ts`
- **Location**: Line 709-715
- **Change**: Replace inline mapping with `normalizeChatMessageRead()` call
- **Implementation**:
  ```typescript
  // ✅ Step 5.4: Normalize messages with defensive handling
  const normalizedMessages = (messages ?? []).map((m, index) =>
    normalizeChatMessageRead(m, index)
  );
  ```
- **Verify**: Messages are normalized before returning

### Step 3: Apply normalization in chat.service.ts (optional)
- **File**: `backend/src/modules/chat/chat.service.ts`
- **Location**: Line 73
- **Change**: Normalize returned message
- **Implementation**: Import `normalizeChatMessageRead` from sessions.service (or duplicate if cross-module dependency is unwanted)
- **Verify**: Single message response is normalized

### Step 4: Add unit tests
- **File**: `backend/src/modules/sessions/sessions.service.spec.ts`
- **Location**: After existing Step 5.1 tests (after line 302)
- **Test cases**:
  1. Valid message with all fields → normalized correctly
  2. Message with missing `turnIndex` + `fallbackIndex` → uses fallback
  3. Message with missing `turnIndex` + no fallback → throws error
  4. Message with `score: undefined` → `null`
  5. Message with `score: NaN` → `null`
  6. Message with `score: Infinity` → `null`
  7. Message with `score: 150` → clamped to 100
  8. Message with `score: -10` → clamped to 0
  9. Message with `score: 75.7` → floored to 75
  10. Legacy message with `turnIndex: null` + fallback → uses fallback
- **Verify**: All tests pass

### Step 5: Add e2e test
- **File**: `backend/test/e2e/practice.e2e-spec.ts`
- **Location**: After existing Step 5.3 e2e tests
- **Test**: Create practice session, verify response `messages[]` array satisfies contract
- **Verify**: All messages have `turnIndex: number`, `score: number | null` (never undefined)

### Step 6: Manual verification
- **Action**: Run practice session, check response `messages[]` array
- **Verify**: All messages satisfy `ApiChatMessage` contract (no undefined values)

---

## 7) Run & Test Plan

### 7.1 Unit Tests
```bash
cd backend
npm test -- sessions.service.spec.ts
```
**Expected**: All tests pass, including new `normalizeChatMessageRead` tests

### 7.2 E2E Tests
```bash
cd backend
npm test -- practice.e2e-spec.ts
```
**Expected**: All tests pass, including new contract verification test

### 7.3 API Verification (Manual)

**Request**:
```bash
curl -X POST http://localhost:3000/v1/practice/session \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Test",
    "messages": [
      { "role": "USER", "content": "Hello" }
    ]
  }'
```

**Response check**:
- Verify `response.messages[]` is array
- Verify each message has `turnIndex: number` (not undefined/null)
- Verify each message has `score: number | null` (not undefined)
- Verify messages are ordered by `turnIndex` ascending

### 7.4 DB Verification (Optional - for legacy cases)

**Test with legacy data**:
```sql
-- Create test message with null turnIndex (if possible before Migration B)
-- Then read via API and verify normalized with fallbackIndex
```

**Expected**: API response has normalized `turnIndex` (uses fallback or throws if no fallback)

---

## 8) Done Checklist

- [ ] `normalizeChatMessageRead()` helper exists and is exported/accessible
- [ ] Helper validates `turnIndex` is finite integer >= 0 (uses fallback if missing)
- [ ] Helper validates `score` is finite number (0-100) or null (never undefined/NaN/Infinity)
- [ ] Helper applies `normalizeTraitData()` for `traitData` field
- [ ] Normalization applied in `createScoredSessionFromScores()` before returning
- [ ] Normalization applied in `handleUserMessage()` before returning (optional)
- [ ] Messages always ordered by `turnIndex: 'asc'` in DB queries
- [ ] Unit tests cover: missing turnIndex, invalid score (NaN/Infinity/undefined), legacy data
- [ ] E2E test verifies response `messages[]` satisfies `ApiChatMessage` contract
- [ ] All messages in response have `turnIndex: number` (never undefined/null)
- [ ] All messages in response have `score: number | null` (never undefined)

---

## 9) Final Report

### What Exists vs Missing

**✅ Exists:**
- `normalizeTraitData()` function (Step 5.2)
- DB ordering by `turnIndex: 'asc'` in `sessions.service.ts`
- Partial score handling (`score ?? null`)

**❌ Missing:**
- `normalizeChatMessageRead()` helper function
- `turnIndex` normalization (defensive handling for missing/invalid)
- `score` normalization (finite number validation, range clamping)
- Consistent application across all response paths

### Smallest File List Likely to Change

1. **`backend/src/modules/sessions/sessions.service.ts`**
   - Add: `normalizeChatMessageRead()` function
   - Modify: `createScoredSessionFromScores()` message mapping (line 709-715)

2. **`backend/src/modules/chat/chat.service.ts`** (optional)
   - Modify: `handleUserMessage()` return (line 73)

3. **`backend/src/modules/sessions/sessions.service.spec.ts`**
   - Add: Unit tests for `normalizeChatMessageRead()`

4. **`backend/test/e2e/practice.e2e-spec.ts`**
   - Add: E2E test for message contract verification

### Edge Cases + Risks

1. **Legacy data with null turnIndex**: Handle with `fallbackIndex` parameter
2. **Invalid score values**: Normalize NaN/Infinity/undefined → null, clamp to [0, 100]
3. **Missing fallbackIndex**: Throw error (should not happen after Migration B)
4. **Performance**: Minimal overhead (similar to `normalizeTraitData`)
5. **Backward compatibility**: Defensive normalization maintains compatibility

### Final Recommended Implementation Plan

1. **Add `normalizeChatMessageRead()` helper** in `sessions.service.ts`
2. **Apply normalization** in `createScoredSessionFromScores()` message mapping
3. **Add unit tests** for all edge cases (missing turnIndex, invalid score, legacy data)
4. **Add e2e test** verifying response contract
5. **Optional**: Apply normalization in `chat.service.ts` for consistency

---

## 10) Audit Checklist Verification

### ✅ Did it find ALL response paths returning messages/transcripts?
**Yes** - Found:
- `POST /v1/practice/session` → `PracticeService.runPracticeSession()` → `SessionsService.createScoredSessionFromScores()` → returns `messages[]`
- `POST /v1/chat/message` → `ChatService.handleUserMessage()` → returns single `message` (not array)
- `PracticeService` continuation fallback reads messages but doesn't return them (internal only)
- Stats endpoints do NOT return messages

### ✅ Did it show evidence (paths + functions + what they return today)?
**Yes** - Provided:
- Exact file paths and line numbers
- Function names and signatures
- What each returns (with code citations)
- DB read patterns with select/orderBy

### ✅ Did it propose one normalization helper + exact application points?
**Yes** - Proposed:
- `normalizeChatMessageRead(m, fallbackIndex)` helper function
- Application point 1: `sessions.service.ts` line 709-715
- Application point 2: `chat.service.ts` line 73 (optional)

### ✅ Did it include ordering rules + legacy cases (missing turnIndex/score)?
**Yes** - Covered:
- Ordering: Always use `orderBy: { turnIndex: 'asc' }`
- Legacy cases: Missing `turnIndex` → use `fallbackIndex` or throw
- Invalid `score` → normalize to null or clamp to [0, 100]

### ✅ Did it include real unit/e2e test plan tied to the contract?
**Yes** - Provided:
- Unit test cases: 10 specific test scenarios
- E2E test: Verify response `messages[]` satisfies `ApiChatMessage` contract
- Contract definition: Exact TypeScript interface with rules

---

**Step 5.4 Scout Complete.** Ready for implementation.

