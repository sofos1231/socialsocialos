# SCOUT — Step 5.6: Public API Allowlist Serializers Analysis

## 1. Current Response Shapes (All Keys Listed)

### 1.1 POST /v1/practice/session

**Controller:** `backend/src/modules/practice/practice.controller.ts:22-24`  
**Service Method:** `PracticeService.runPracticeSession()`  
**Return Location:** `practice.service.ts:1002-1022` (after sanitization)

**Full Response Structure:**
```typescript
{
  // From createScoredSessionFromScores (saved object)
  ok: boolean,                    // Always true
  rewards: {
    score: number,                 // finalScore (0-100)
    messageScore: number,          // Same as score
    isSuccess: boolean,            // true/false
    xpGained: number,             // summary.totalXp
    coinsGained: number,           // summary.totalCoins
    gemsGained: number,            // summary.totalGems
    rarityCounts: Record<string, number>,  // summary.rarityCounts
    messages: Array<{             // summary.messages mapped
      index: number,
      score: number,
      rarity: 'C' | 'B' | 'A' | 'S' | 'S+',
      xp: number,
      coins: number,
      gems: number,
    }>,
  },
  dashboard: {                     // From statsService.getDashboardForUser()
    ok: boolean,
    user: {
      id: string,
      email: string,
      createdAt: Date,
    },
    streak: {
      current: number,
    },
    wallet: {
      xp: number,
      level: number,
      coins: number,
      gems: number,
      lifetimeXp: number,
    },
    stats: {
      sessionsCount: number,
      successCount: number,
      failCount: number,
      averageScore: number,
      averageMessageScore: number,
      lastSessionAt: Date | null,
      latest: {
        charismaIndex: number | null,
        confidenceScore: number | null,
        clarityScore: number | null,
        humorScore: number | null,
        tensionScore: number | null,
        emotionalWarmth: number | null,
        dominanceScore: number | null,
        fillerWordsCount: number | null,
        totalMessages: number | null,
        totalWords: number | null,
        aiCoreVersion: string | null,
      },
      averages: {
        avgCharismaIndex: number | null,
        avgConfidence: number | null,
        avgClarity: number | null,
        avgHumor: number | null,
        avgTension: number | null,
        avgWarmth: number | null,
        avgDominance: number | null,
        avgFillerWords: number | null,
        avgTotalWords: number | null,
        avgTotalMessages: number | null,
      },
      insights: {
        latest: any | null,        // aiSummary JSON
        trends: {
          improvingTraits: string[],
          decliningTraits: string[],
        },
      },
      socialScore: number | null,
      socialTier: string | null,
      recentSessions: Array<{
        createdAt: string,         // ISO string
        charismaIndex: number | null,
        score: number | null,
      }>,
    },
  },
  sessionId: string,               // usedSessionId
  messages: Array<{                // normalizedMessages
    turnIndex: number,
    role: 'USER' | 'AI' | 'SYSTEM',
    content: string,
    score: number | null,
    traitData: {
      traits: Record<string, any>,
      flags: string[],
      label: string | null,
    },
  }>,
  
  // Additional fields from practice.service.ts
  aiReply: string,
  aiStructured: {                 // After Step 5.5 sanitization (raw removed)
    replyText: string,
    messageScore?: number,
    rarity?: 'C' | 'B' | 'A' | 'S' | 'S+',
    tags?: string[],
    parseOk: boolean,
  } | null,
  // aiDebug: removed by default (Step 5.5)
  mission: {
    templateId: string,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'ELITE',
    goalType: 'CONVERSATION' | 'PERSUASION' | 'NEGOTIATION' | null,
    maxMessages: number,
    scoring: {
      successScore: number,
      failScore: number,
    },
    aiStyle: AiStyle | null,      // Complex object
    aiContract: Record<string, any> | null,  // JSON object
  } | null,
  missionState: {
    status: 'IN_PROGRESS' | 'SUCCESS' | 'FAIL',
    progressPct: number,
    averageScore: number,
    totalMessages: number,
    remainingMessages?: number,
    mood?: 'SAFE' | 'WARNING' | 'DANGER' | 'GOOD',
    policy?: {
      difficulty: MissionDifficulty,
      goalType: MissionGoalType | null,
      maxMessages: number,
      successScore: number,
      failScore: number,
    },
    disqualified?: boolean,
    disqualify?: {
      code: 'SEXUAL_EXPLICIT' | 'HARASSMENT_SLUR' | 'THREAT_VIOLENCE',
      triggeredByUserMessageIndex: number,
      matchedText: string,
    } | null,
    endReasonCode: MissionEndReasonCode | null,
    endReasonMeta: Record<string, any> | null,
  },
}
```

**Total Top-Level Keys:** 9
- `ok`, `rewards`, `dashboard`, `sessionId`, `messages`, `aiReply`, `aiStructured`, `mission`, `missionState`

**Potential Internal/Debug Keys (to filter):**
- `aiDebug` (already sanitized in Step 5.5, but should be in allowlist)
- Any keys from spread `...saved` that aren't in the allowlist
- Any keys from spread `...message` in chat response

---

### 1.2 POST /v1/chat/message

**Controller:** `backend/src/modules/chat/chat.controller.ts:20-26`  
**Service Method:** `ChatService.handleUserMessage()`  
**Return Location:** `chat.service.ts:81-86`

**Full Response Structure:**
```typescript
{
  message: {
    // From Prisma ChatMessage (full DB object spread)
    id: string,
    sessionId: string,
    userId: string,
    createdAt: Date,
    role: 'USER' | 'AI' | 'SYSTEM',
    content: string,
    grade: 'BAD' | 'WEAK' | 'NEUTRAL' | 'GOOD' | 'BRILLIANT' | null,
    xpDelta: number,
    coinsDelta: number,
    gemsDelta: number,
    isBrilliant: boolean,
    isLifesaver: boolean,
    meta: Json | null,             // ⚠️ INTERNAL - should be filtered
    turnIndex: number,
    score: number | null,
    traitData: {
      traits: Record<string, any>,
      flags: string[],
      label: string | null,
    },
    
    // From normalizeChatMessageRead (overrides above)
    // turnIndex: number (normalized)
    // role: MessageRole (normalized)
    // content: string (normalized)
    // score: number | null (normalized)
    // traitData: {...} (normalized)
  },
}
```

**Total Top-Level Keys:** 1
- `message`

**Internal/Debug Keys to Filter:**
- `message.meta` ⚠️ (internal debug field)
- `message.id` (DB internal - may not be needed by FE)
- `message.userId` (security: user should not see other users' IDs)
- `message.sessionId` (may be redundant if already in context)
- `message.createdAt` (may not be needed)
- `message.grade`, `message.xpDelta`, `message.coinsDelta`, `message.gemsDelta`, `message.isBrilliant`, `message.isLifesaver` (internal reward tracking)

**Public Keys (should keep):**
- `message.turnIndex`
- `message.role`
- `message.content`
- `message.score`
- `message.traitData`

---

### 1.3 POST /v1/sessions/mock

**Controller:** `backend/src/modules/sessions/sessions.controller.ts:11-14`  
**Service Method:** `SessionsService.createMockSession()`  
**Return Location:** `sessions.service.ts:732-741` (calls `createScoredSessionFromScores`)

**Full Response Structure:**
```typescript
{
  // Same as createScoredSessionFromScores return
  ok: boolean,
  rewards: {
    score: number,
    messageScore: number,
    isSuccess: boolean,
    xpGained: number,
    coinsGained: number,
    gemsGained: number,
    rarityCounts: Record<string, number>,
    messages: Array<{
      index: number,
      score: number,
      rarity: 'C' | 'B' | 'A' | 'S' | 'S+',
      xp: number,
      coins: number,
      gems: number,
    }>,
  },
  dashboard: {
    // Same structure as practice session response
    ok: boolean,
    user: {...},
    streak: {...},
    wallet: {...},
    stats: {...},
  },
  sessionId: string,
  messages: Array<{
    turnIndex: number,
    role: 'USER' | 'AI' | 'SYSTEM',
    content: string,
    score: number | null,
    traitData: {
      traits: Record<string, any>,
      flags: string[],
      label: string | null,
    },
  }>,
}
```

**Total Top-Level Keys:** 5
- `ok`, `rewards`, `dashboard`, `sessionId`, `messages`

---

## 2. Response Construction Locations

### 2.1 Practice Session Response
**File:** `backend/src/modules/practice/practice.service.ts`

**Construction Points:**
1. **Disqualify path:** Lines 876-900
   - Returns `sanitizePracticeResponse({ ...saved, aiReply, aiStructured: null, aiDebug, mission, missionState })`

2. **Normal path:** Lines 1002-1022
   - Returns `sanitizePracticeResponse({ ...saved, aiReply, aiStructured, aiDebug, mission, missionState })`

**`saved` object source:** `sessions.service.ts:715-737` (`createScoredSessionFromScores` return)

### 2.2 Chat Message Response
**File:** `backend/src/modules/chat/chat.service.ts`

**Construction Point:**
- Lines 81-86: Returns `{ message: { ...message, ...normalized } }`
- `message`: Full Prisma ChatMessage object (includes all DB fields)
- `normalized`: From `normalizeChatMessageRead()` (only 5 fields)

**Issue:** Spread operator includes ALL DB fields, then overrides with normalized. This means internal fields like `meta`, `id`, `userId` are exposed.

### 2.3 Mock Session Response
**File:** `backend/src/modules/sessions/sessions.service.ts`

**Construction Point:**
- Lines 732-741: Calls `createScoredSessionFromScores()` directly
- Returns same structure as practice session (without `aiReply`, `aiStructured`, `mission`, `missionState`)

---

## 3. Proposed Serializer Functions

### 3.1 toApiChatMessage()

**Purpose:** Allowlist-only serializer for chat messages  
**Location:** `backend/src/modules/shared/serializers/api-chat-message.serializer.ts` (NEW)

**Signature:**
```typescript
export function toApiChatMessage(
  message: any,  // Raw message from DB or normalized
): {
  turnIndex: number;
  role: 'USER' | 'AI' | 'SYSTEM';
  content: string;
  score: number | null;
  traitData: {
    traits: Record<string, any>;
    flags: string[];
    label: string | null;
  };
}
```

**Allowlist:**
- `turnIndex` (required, number)
- `role` (required, MessageRole)
- `content` (required, string)
- `score` (required, number | null)
- `traitData` (required, object with traits/flags/label)

**Filters Out:**
- `id`, `sessionId`, `userId` (DB internals)
- `createdAt` (not needed by FE)
- `grade`, `xpDelta`, `coinsDelta`, `gemsDelta` (internal reward tracking)
- `isBrilliant`, `isLifesaver` (internal flags)
- `meta` (internal debug field)
- Any other unexpected keys

**Usage:**
```typescript
// In chat.service.ts
return {
  message: toApiChatMessage(normalizeChatMessageRead(message, message.turnIndex ?? 0)),
};
```

---

### 3.2 toPracticeSessionResponsePublic()

**Purpose:** Allowlist-only serializer for practice session responses  
**Location:** `backend/src/modules/shared/serializers/practice-session.serializer.ts` (NEW)

**Signature:**
```typescript
export function toPracticeSessionResponsePublic(
  raw: {
    ok?: boolean;
    rewards?: any;
    dashboard?: any;
    sessionId?: string;
    messages?: any[];
    aiReply?: string;
    aiStructured?: any;
    aiDebug?: any;
    mission?: any;
    missionState?: any;
    [key: string]: any;  // Catch-all for unexpected keys
  },
): {
  ok: boolean;
  rewards: {
    score: number;
    messageScore: number;
    isSuccess: boolean;
    xpGained: number;
    coinsGained: number;
    gemsGained: number;
    rarityCounts: Record<string, number>;
    messages: Array<{
      index: number;
      score: number;
      rarity: 'C' | 'B' | 'A' | 'S' | 'S+';
      xp: number;
      coins: number;
      gems: number;
    }>;
  };
  dashboard: any;  // Keep as-is (complex nested structure, validated separately)
  sessionId: string;
  messages: ReturnType<typeof toApiChatMessage>[];
  aiReply: string;
  aiStructured: {
    replyText: string;
    messageScore?: number;
    rarity?: 'C' | 'B' | 'A' | 'S' | 'S+';
    tags?: string[];
    parseOk: boolean;
  } | null;
  mission: {
    templateId: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'ELITE';
    goalType: 'CONVERSATION' | 'PERSUASION' | 'NEGOTIATION' | null;
    maxMessages: number;
    scoring: {
      successScore: number;
      failScore: number;
    };
    aiStyle: any | null;
    aiContract: Record<string, any> | null;
  } | null;
  missionState: {
    status: 'IN_PROGRESS' | 'SUCCESS' | 'FAIL';
    progressPct: number;
    averageScore: number;
    totalMessages: number;
    remainingMessages?: number;
    mood?: 'SAFE' | 'WARNING' | 'DANGER' | 'GOOD';
    policy?: {
      difficulty: any;
      goalType: any;
      maxMessages: number;
      successScore: number;
      failScore: number;
    };
    disqualified?: boolean;
    disqualify?: {
      code: 'SEXUAL_EXPLICIT' | 'HARASSMENT_SLUR' | 'THREAT_VIOLENCE';
      triggeredByUserMessageIndex: number;
      matchedText: string;
    } | null;
    endReasonCode: string | null;
    endReasonMeta: Record<string, any> | null;
  };
}
```

**Allowlist (Top-Level):**
- `ok` (required)
- `rewards` (required, validated structure)
- `dashboard` (required, keep as-is for now)
- `sessionId` (required)
- `messages` (required, array of `toApiChatMessage()`)
- `aiReply` (required)
- `aiStructured` (optional, sanitized - no `raw`)
- `mission` (optional, validated structure)
- `missionState` (required, validated structure)

**Filters Out:**
- `aiDebug` (already sanitized, but ensure it's never included)
- Any other unexpected top-level keys

**Usage:**
```typescript
// In practice.service.ts (after sanitizePracticeResponse)
return toPracticeSessionResponsePublic(
  sanitizePracticeResponse({
    ...saved,
    aiReply,
    aiStructured,
    aiDebug,
    mission,
    missionState,
  })
);
```

---

### 3.3 toChatMessageResponsePublic()

**Purpose:** Allowlist-only serializer for chat message endpoint response  
**Location:** `backend/src/modules/shared/serializers/chat-message-response.serializer.ts` (NEW)

**Signature:**
```typescript
export function toChatMessageResponsePublic(
  message: any,
): {
  message: ReturnType<typeof toApiChatMessage>;
}
```

**Allowlist:**
- `message` (wrapped in object, using `toApiChatMessage()`)

**Usage:**
```typescript
// In chat.service.ts
return toChatMessageResponsePublic(
  normalizeChatMessageRead(message, message.turnIndex ?? 0)
);
```

---

## 4. Proposed E2E Assertions

### 4.1 Practice Session Response Assertions

**File:** `backend/test/e2e/practice.e2e-spec.ts`

**New Test Suite:**
```typescript
describe('Step 5.6 - Public API Allowlist Serialization', () => {
  const ALLOWED_PRACTICE_TOP_LEVEL_KEYS = [
    'ok',
    'rewards',
    'dashboard',
    'sessionId',
    'messages',
    'aiReply',
    'aiStructured',
    'mission',
    'missionState',
  ];

  const FORBIDDEN_KEYS = [
    'aiDebug',
    'extraPayload',
    'payloadExtras',
    'meta',
    'providerRaw',
    'scoringDebug',
  ];

  it('should only return allowlisted top-level keys', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/practice/session')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        topic: 'Test allowlist',
        messages: [{ role: 'USER', content: 'Hello' }],
      })
      .expect(201);

    const responseKeys = Object.keys(response.body);
    const unexpectedKeys = responseKeys.filter(
      (key) => !ALLOWED_PRACTICE_TOP_LEVEL_KEYS.includes(key)
    );

    expect(unexpectedKeys).toEqual([]);
  });

  it('should NOT contain any forbidden debug/internal keys anywhere', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/practice/session')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        topic: 'Test forbidden keys',
        messages: [{ role: 'USER', content: 'Hello' }],
      })
      .expect(201);

    const responseJson = JSON.stringify(response.body);

    FORBIDDEN_KEYS.forEach((forbiddenKey) => {
      // Deep scan: check if key exists anywhere in JSON
      const hasKey = responseJson.includes(`"${forbiddenKey}"`);
      expect(hasKey).toBe(false);
    });
  });

  it('should have messages array with only allowlisted fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/practice/session')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        topic: 'Test message allowlist',
        messages: [{ role: 'USER', content: 'Hello' }],
      })
      .expect(201);

    const ALLOWED_MESSAGE_KEYS = [
      'turnIndex',
      'role',
      'content',
      'score',
      'traitData',
    ];

    if (response.body.messages && response.body.messages.length > 0) {
      response.body.messages.forEach((msg: any) => {
        const msgKeys = Object.keys(msg);
        const unexpectedKeys = msgKeys.filter(
          (key) => !ALLOWED_MESSAGE_KEYS.includes(key)
        );
        expect(unexpectedKeys).toEqual([]);

        // Verify traitData structure
        if (msg.traitData) {
          const traitDataKeys = Object.keys(msg.traitData);
          expect(traitDataKeys.sort()).toEqual(['flags', 'label', 'traits'].sort());
        }
      });
    }
  });

  it('should NOT have aiStructured.raw field', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/practice/session')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        topic: 'Test aiStructured',
        messages: [{ role: 'USER', content: 'Hello' }],
      })
      .expect(201);

    if (response.body.aiStructured) {
      expect(response.body.aiStructured.raw).toBeUndefined();
    }
  });
});
```

### 4.2 Chat Message Response Assertions

**File:** `backend/test/e2e/chat.e2e-spec.ts` (may need to create)

**New Test Suite:**
```typescript
describe('Step 5.6 - Chat Message Allowlist Serialization', () => {
  const ALLOWED_MESSAGE_KEYS = [
    'turnIndex',
    'role',
    'content',
    'score',
    'traitData',
  ];

  const FORBIDDEN_MESSAGE_KEYS = [
    'id',
    'sessionId',
    'userId',
    'createdAt',
    'grade',
    'xpDelta',
    'coinsDelta',
    'gemsDelta',
    'isBrilliant',
    'isLifesaver',
    'meta',
  ];

  it('should only return allowlisted message fields', async () => {
    const session = await prisma.practiceSession.create({
      data: { userId, topic: 'Test', status: 'IN_PROGRESS' },
    });

    const response = await request(app.getHttpServer())
      .post('/v1/chat/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        sessionId: session.id,
        content: 'Test message',
      })
      .expect(201);

    expect(response.body.message).toBeDefined();
    const messageKeys = Object.keys(response.body.message);
    const unexpectedKeys = messageKeys.filter(
      (key) => !ALLOWED_MESSAGE_KEYS.includes(key)
    );

    expect(unexpectedKeys).toEqual([]);
  });

  it('should NOT contain forbidden internal fields', async () => {
    const session = await prisma.practiceSession.create({
      data: { userId, topic: 'Test', status: 'IN_PROGRESS' },
    });

    const response = await request(app.getHttpServer())
      .post('/v1/chat/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        sessionId: session.id,
        content: 'Test message',
      })
      .expect(201);

    FORBIDDEN_MESSAGE_KEYS.forEach((forbiddenKey) => {
      expect(response.body.message[forbiddenKey]).toBeUndefined();
    });
  });
});
```

### 4.3 Mock Session Response Assertions

**File:** `backend/test/e2e/sessions.e2e-spec.ts` (may need to create or add to existing)

**Test:**
```typescript
describe('Step 5.6 - Mock Session Allowlist', () => {
  it('should only return allowlisted keys (same as practice session minus aiReply/mission)', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/sessions/mock')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    const ALLOWED_MOCK_KEYS = [
      'ok',
      'rewards',
      'dashboard',
      'sessionId',
      'messages',
    ];

    const responseKeys = Object.keys(response.body);
    const unexpectedKeys = responseKeys.filter(
      (key) => !ALLOWED_MOCK_KEYS.includes(key)
    );

    expect(unexpectedKeys).toEqual([]);
  });
});
```

---

## 5. File List to Change

### 5.1 New Files
1. `backend/src/modules/shared/serializers/api-chat-message.serializer.ts`
   - `toApiChatMessage()` function

2. `backend/src/modules/shared/serializers/practice-session.serializer.ts`
   - `toPracticeSessionResponsePublic()` function

3. `backend/src/modules/shared/serializers/chat-message-response.serializer.ts`
   - `toChatMessageResponsePublic()` function

4. `backend/src/modules/shared/serializers/index.ts` (optional)
   - Re-export all serializers for convenience

5. `backend/src/modules/shared/serializers/serializers.spec.ts`
   - Unit tests for serializers

### 5.2 Modified Files
1. `backend/src/modules/chat/chat.service.ts`
   - Replace return with `toChatMessageResponsePublic()`

2. `backend/src/modules/practice/practice.service.ts`
   - Apply `toPracticeSessionResponsePublic()` after `sanitizePracticeResponse()`
   - Both return paths (disqualify and normal)

3. `backend/test/e2e/practice.e2e-spec.ts`
   - Add Step 5.6 test suite

4. `backend/test/e2e/chat.e2e-spec.ts` (create if doesn't exist)
   - Add Step 5.6 test suite

5. `backend/test/e2e/sessions.e2e-spec.ts` (create if doesn't exist, or add to existing)
   - Add Step 5.6 test suite

---

## 6. Exact Implementation Plan

### Phase 1: Create Serializer Functions
1. Create `api-chat-message.serializer.ts`
   - Implement `toApiChatMessage()` with strict allowlist
   - Handle null/undefined gracefully
   - Use `normalizeChatMessageRead()` internally or accept normalized input

2. Create `practice-session.serializer.ts`
   - Implement `toPracticeSessionResponsePublic()` with strict allowlist
   - Validate nested structures (rewards, mission, missionState)
   - Apply `toApiChatMessage()` to messages array

3. Create `chat-message-response.serializer.ts`
   - Implement `toChatMessageResponsePublic()` wrapper
   - Uses `toApiChatMessage()` internally

4. Create unit tests for all serializers

### Phase 2: Apply Serializers
1. Update `chat.service.ts`
   - Replace return statement with `toChatMessageResponsePublic()`

2. Update `practice.service.ts`
   - Apply `toPracticeSessionResponsePublic()` after `sanitizePracticeResponse()`
   - Update both return paths

3. Verify no breaking changes (build + existing tests)

### Phase 3: Add E2E Tests
1. Add practice session allowlist tests
2. Add chat message allowlist tests
3. Add mock session allowlist tests
4. Verify all tests pass

---

## 7. Risks & Mitigation

### 7.1 FE Dependencies on Unexpected Keys

**Risk:** FE might be using fields that aren't in the allowlist (e.g., `message.id`, `message.createdAt`)

**Mitigation:**
1. **Audit FE codebase first:**
   - Search for `response.body.message.*` usage
   - Search for `response.body.*` in practice session handlers
   - Identify all accessed keys

2. **Gradual rollout:**
   - Add serializers but keep old code path behind feature flag
   - Test with FE integration
   - Remove old path after validation

3. **Backwards compatibility layer:**
   - Keep serializers strict, but add optional "compat mode" that includes commonly used fields
   - Document which fields are deprecated

**Fields to Verify:**
- `message.id` - Is this used by FE for message tracking?
- `message.createdAt` - Is this used for timestamps?
- `message.sessionId` - Is this needed or redundant?
- `dashboard` structure - Verify FE uses all nested fields

### 7.2 Performance Impact

**Risk:** Serializers add overhead (object iteration, key filtering)

**Mitigation:**
- Serializers are simple object picks (O(n) where n = keys)
- Minimal overhead compared to DB queries and AI calls
- Profile if needed, but should be negligible

### 7.3 Type Safety

**Risk:** TypeScript types might not match runtime allowlist

**Mitigation:**
- Use strict TypeScript return types
- Runtime validation in tests
- Consider using Zod or similar for runtime validation (future enhancement)

### 7.4 Dashboard Structure Complexity

**Risk:** `dashboard` object is deeply nested and complex. Hard to validate all keys.

**Mitigation:**
- **Option A:** Keep `dashboard` as-is (trust `statsService.getDashboardForUser()`)
- **Option B:** Create `toDashboardPublic()` serializer (more work, but safer)
- **Recommendation:** Start with Option A, add Option B if needed

### 7.5 Breaking Changes During Migration

**Risk:** Serializers might filter out fields FE actually needs

**Mitigation:**
1. **Comprehensive FE audit first** (see 7.1)
2. **Feature flag** to toggle serializers on/off
3. **Logging:** Log any filtered keys in dev mode (for debugging)
4. **Versioned API:** Consider `/v2/` endpoints if breaking changes needed

---

## 8. How to Avoid Breaking FE

### 8.1 Pre-Implementation Audit

**Steps:**
1. Search FE codebase for:
   - `response.body.message.*`
   - `response.body.*` in practice/chat handlers
   - Any direct property access on API responses

2. Create inventory of all accessed keys:
   - Practice session response keys
   - Chat message response keys
   - Dashboard nested keys

3. Compare with proposed allowlists:
   - Identify missing keys
   - Decide: add to allowlist OR remove from FE

### 8.2 Implementation Strategy

**Option 1: Strict Allowlist (Recommended)**
- Only include keys FE actually uses
- Remove unused keys immediately
- **Risk:** Higher chance of breaking if audit incomplete

**Option 2: Conservative Allowlist**
- Include all keys currently returned (except known debug fields)
- Gradually remove unused keys
- **Risk:** Less protection, but safer migration

**Recommendation:** Start with Option 2, then tighten to Option 1 after FE validation

### 8.3 Testing Strategy

1. **Unit tests:** Verify serializers filter correctly
2. **E2E tests:** Verify no unexpected keys in responses
3. **Integration tests:** Test with actual FE (if possible)
4. **Feature flag:** Allow rollback if issues found

### 8.4 Communication

- Document all allowed keys in API docs
- Add deprecation warnings for removed keys (if any)
- Provide migration guide if breaking changes needed

---

## 9. Summary

### Current State
- ✅ Responses are sanitized (Step 5.5) but not allowlisted
- ⚠️ Chat message response includes all DB fields (spread operator)
- ⚠️ Practice session response structure is implicit (no explicit allowlist)
- ⚠️ No tests verify key allowlisting

### Target State
- ✅ All responses use explicit allowlist serializers
- ✅ Only public API keys are returned
- ✅ E2E tests verify no unexpected keys
- ✅ Deep scan ensures no debug fields anywhere

### Estimated Impact
- **Files created:** 4-5 files
- **Files modified:** 3-5 files
- **Breaking changes:** Potentially (depends on FE audit)
- **Risk level:** Medium (requires FE audit first)

### Next Steps
1. **Audit FE codebase** for all accessed response keys
2. **Create serializers** with conservative allowlist
3. **Add E2E tests** for allowlist verification
4. **Apply serializers** to all endpoints
5. **Validate with FE** integration tests
6. **Tighten allowlist** after validation

