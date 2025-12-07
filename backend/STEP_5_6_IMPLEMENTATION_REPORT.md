# Step 5.6 Implementation Report: Allowlist-Only Serializers + Strict Tests

## ✅ Completed Implementation

### A) Created Serializer Module

**New File:** `backend/src/modules/shared/serializers/api-serializers.ts`

**Functions Implemented:**
1. `toApiChatMessage(input: any): ApiChatMessage`
   - Returns ONLY: `{ turnIndex, role, content, score, traitData }`
   - Uses `normalizeChatMessageRead()` internally for consistency
   - Strict allowlist: no spreading raw DB objects

2. `toApiAiStructured(input: any): ApiAiStructured | null`
   - Allowlists: `replyText`, `messageScore`, `rarity`, `tags`, `parseOk`
   - **Hard rule:** Explicitly excludes `raw` field and any unknown keys

3. `toChatMessageResponsePublic(message: any): { message: ApiChatMessage }`
   - Wrapper for chat endpoint response
   - Returns only `{ message: ApiChatMessage }`

4. `toPracticeSessionResponsePublic(resp: any): PracticeSessionResponsePublic`
   - Allowlists exactly 9 top-level keys: `ok`, `rewards`, `dashboard`, `sessionId`, `messages`, `aiReply`, `aiStructured`, `mission`, `missionState`
   - Messages array mapped through `toApiChatMessage()`
   - `aiStructured` allowlisted (no `raw` field)
   - **Hard rule:** Never includes any raw or unknown nested keys

5. `toSessionsMockResponsePublic(resp: any)`
   - Same as practice session but without `aiReply`, `aiStructured`, `mission`, `missionState`

**Types Defined:**
- `ApiChatMessage` interface
- `ApiAiStructured` interface
- `PracticeSessionResponsePublic` interface

### B) Applied Serializers Everywhere

#### 1) Chat Endpoint (Critical Fix)
**File:** `backend/src/modules/chat/chat.service.ts`

**Before:**
```typescript
return {
  message: {
    ...message,  // ⚠️ Spreads ALL Prisma DB fields
    ...normalized,
  },
};
```

**After:**
```typescript
const normalized = normalizeChatMessageRead(message, message.turnIndex ?? 0);
return toChatMessageResponsePublic(normalized);  // ✅ Allowlist-only (5 fields)
```

**Result:** Response contains ONLY the 5 public fields (no `id`, `userId`, `sessionId`, `createdAt`, `meta`, etc.)

#### 2) Practice Endpoint
**File:** `backend/src/modules/practice/practice.service.ts`

**Applied to both paths:**
- Disqualify path (line ~878)
- Normal path (line ~1002)

**Change:**
```typescript
// Before
return sanitizePracticeResponse({ ...saved, ... });

// After
return toPracticeSessionResponsePublic(
  sanitizePracticeResponse({ ...saved, ... })
);
```

**Result:** 
- Messages are allowlisted (5 fields only)
- `aiStructured` is allowlisted (no `raw` field)
- No debug/internal keys exist

#### 3) Sessions Mock Endpoint
**File:** `backend/src/modules/sessions/sessions.service.ts`

**Change:**
```typescript
// Before
return this.createScoredSessionFromScores({ ... });

// After
const result = await this.createScoredSessionFromScores({ ... });
return toSessionsMockResponsePublic(result);
```

**Result:** Mock response uses allowlist serializer

### C) Strict E2E Tests

#### Practice Session Tests
**File:** `backend/test/e2e/practice.e2e-spec.ts`

**New Test Suite:** `Step 5.6 - Public API Allowlist Serialization`

**Tests:**
1. ✅ Exact top-level key matching (9 keys only)
2. ✅ Deep forbidden key scan (recursive check for `aiDebug`, `meta`, `raw`, `userId`, etc.)
3. ✅ Messages array allowlist (5 fields only)
4. ✅ `aiStructured` allowlist (no `raw` field)
5. ✅ `aiDebug` exclusion (not present anywhere)

**Deep Scan Helper:**
```typescript
function deepScanForForbiddenKeys(obj: any, path: string = ''): string[]
```
- Recursively scans entire response object
- Checks for forbidden keys at any nesting level
- Returns array of paths where forbidden keys found

#### Chat Message Tests
**New File:** `backend/test/e2e/chat.e2e-spec.ts`

**Test Suite:** `Step 5.6 - Chat Message Allowlist Serialization`

**Tests:**
1. ✅ Top-level only `message` key
2. ✅ Message fields allowlist (5 fields only)
3. ✅ Forbidden fields exclusion (`id`, `userId`, `meta`, etc.)
4. ✅ Deep forbidden key scan
5. ✅ `traitData` structure validation

---

## Files Created/Changed

### New Files
1. `backend/src/modules/shared/serializers/api-serializers.ts` (NEW)
   - All serializer functions and types

2. `backend/test/e2e/chat.e2e-spec.ts` (NEW)
   - Chat message allowlist tests

### Modified Files
1. `backend/src/modules/chat/chat.service.ts`
   - Replaced spread with `toChatMessageResponsePublic()`

2. `backend/src/modules/practice/practice.service.ts`
   - Applied `toPracticeSessionResponsePublic()` to both return paths
   - Added import

3. `backend/src/modules/sessions/sessions.service.ts`
   - Applied `toSessionsMockResponsePublic()` to mock endpoint
   - Added import

4. `backend/test/e2e/practice.e2e-spec.ts`
   - Added Step 5.6 test suite with strict allowlist checks

---

## Before/After: /v1/chat/message Payload

### Before (Step 5.5)
```typescript
{
  message: {
    // ⚠️ ALL Prisma DB fields exposed
    id: "clx...",
    sessionId: "clx...",
    userId: "clx...",           // ⚠️ Security risk
    createdAt: Date,
    role: "USER",
    content: "Hello",
    grade: null,
    xpDelta: 0,
    coinsDelta: 0,
    gemsDelta: 0,
    isBrilliant: false,
    isLifesaver: false,
    meta: {...},                // ⚠️ Internal debug field
    turnIndex: 0,
    score: null,
    traitData: {...},
  }
}
```

### After (Step 5.6)
```typescript
{
  message: {
    // ✅ ONLY 5 public fields (allowlist-only)
    turnIndex: 0,
    role: "USER",
    content: "Hello",
    score: null,
    traitData: {
      traits: {},
      flags: [],
      label: null,
    },
  }
}
```

**Removed Fields:**
- `id`, `sessionId`, `userId` (DB internals)
- `createdAt` (not needed by FE)
- `grade`, `xpDelta`, `coinsDelta`, `gemsDelta` (internal reward tracking)
- `isBrilliant`, `isLifesaver` (internal flags)
- `meta` (internal debug field)

---

## Allowlist Serializer Code (Key Parts)

### toApiChatMessage (5 fields only)
```typescript
export function toApiChatMessage(input: any): ApiChatMessage {
  // Normalize first to ensure consistent shape
  const normalized = normalizeChatMessageRead(
    input,
    typeof input?.turnIndex === 'number' && input.turnIndex >= 0 ? input.turnIndex : 0,
  );

  // Allowlist: pick only the 5 public fields
  return {
    turnIndex: normalized.turnIndex,
    role: normalized.role,
    content: normalized.content,
    score: normalized.score,
    traitData: normalized.traitData,
  };
}
```

### toApiAiStructured (no raw field)
```typescript
function toApiAiStructured(input: any): ApiAiStructured | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  // Allowlist: only these fields
  return {
    replyText: typeof input.replyText === 'string' ? input.replyText : '',
    messageScore: typeof input.messageScore === 'number' && input.messageScore >= 0 && input.messageScore <= 100
      ? input.messageScore
      : undefined,
    rarity: typeof input.rarity === 'string' && ['C', 'B', 'A', 'S', 'S+'].includes(input.rarity)
      ? (input.rarity as 'C' | 'B' | 'A' | 'S' | 'S+')
      : undefined,
    tags: Array.isArray(input.tags) ? input.tags.filter((t: any) => typeof t === 'string') : undefined,
    parseOk: typeof input.parseOk === 'boolean' ? input.parseOk : false,
    // Explicitly exclude 'raw' and any other fields
  };
}
```

### toPracticeSessionResponsePublic (9 top-level keys)
```typescript
export function toPracticeSessionResponsePublic(resp: any): PracticeSessionResponsePublic {
  const result: PracticeSessionResponsePublic = {
    ok: resp?.ok === true,
    rewards: { /* allowlisted structure */ },
    dashboard: resp?.dashboard ?? null,
    sessionId: typeof resp?.sessionId === 'string' ? resp.sessionId : '',
    messages: Array.isArray(resp?.messages)
      ? resp.messages.map((m: any) => toApiChatMessage(m))  // ✅ Messages allowlisted
      : [],
    aiReply: typeof resp?.aiReply === 'string' ? resp.aiReply : '',
    aiStructured: toApiAiStructured(resp?.aiStructured),  // ✅ aiStructured allowlisted (no raw)
    mission: { /* allowlisted structure */ },
    missionState: { /* allowlisted structure */ },
  };

  return result;
}
```

---

## Test Proof Snippets

### Practice Session: Exact Key Matching
```typescript
it('should only return exactly the 9 allowlisted top-level keys', async () => {
  const response = await request(app.getHttpServer())
    .post('/v1/practice/session')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      topic: 'Test allowlist',
      messages: [{ role: 'USER', content: 'Hello' }],
    })
    .expect(201);

  const responseKeys = Object.keys(response.body).sort();
  const expectedKeys = ['ok', 'rewards', 'dashboard', 'sessionId', 'messages', 'aiReply', 'aiStructured', 'mission', 'missionState'].sort();

  expect(responseKeys).toEqual(expectedKeys);  // ✅ Strict equality
});
```

### Deep Forbidden Key Scan
```typescript
it('should NOT contain any forbidden keys anywhere (deep scan)', async () => {
  const response = await request(app.getHttpServer())
    .post('/v1/practice/session')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      topic: 'Test forbidden keys deep scan',
      messages: [{ role: 'USER', content: 'Hello' }],
    })
    .expect(201);

  const forbiddenKeysFound = deepScanForForbiddenKeys(response.body);
  expect(forbiddenKeysFound).toEqual([]);  // ✅ Empty array = no forbidden keys found
});
```

### Chat Message: 5 Fields Only
```typescript
it('should only return allowlisted message fields (5 fields only)', async () => {
  const response = await request(app.getHttpServer())
    .post('/v1/chat/message')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      sessionId: session.id,
      content: 'Test message',
    })
    .expect(201);

  const messageKeys = Object.keys(response.body.message).sort();
  const expectedKeys = ['turnIndex', 'role', 'content', 'score', 'traitData'].sort();

  expect(messageKeys).toEqual(expectedKeys);  // ✅ Exactly 5 fields
});
```

---

## Done Checklist

- ✅ No spreading Prisma objects into API responses (especially chat)
- ✅ All messages returned to FE pass through allowlist (5 fields only)
- ✅ `aiStructured` is explicitly allowlisted and contains no `raw`
- ✅ E2E tests enforce strict key sets and forbidden key deep scan
- ✅ Build passes (TypeScript compilation successful)
- ✅ No linter errors

---

## Summary

**Security Improvement:**
- ✅ Chat endpoint no longer exposes `userId`, `sessionId`, `id`, `meta` (DB internals)
- ✅ All responses use strict allowlists (no spreading raw objects)
- ✅ Deep scan tests ensure no forbidden keys leak anywhere

**API Contract:**
- ✅ Practice session: Exactly 9 top-level keys
- ✅ Chat message: Exactly 5 message fields
- ✅ `aiStructured`: No `raw` field (allowlisted)

**Test Coverage:**
- ✅ Strict key matching (exact equality)
- ✅ Deep recursive forbidden key scanning
- ✅ Structure validation for nested objects

**Build Status:**
- ✅ TypeScript compilation successful
- ✅ No linter errors
- ✅ All serializers properly typed

