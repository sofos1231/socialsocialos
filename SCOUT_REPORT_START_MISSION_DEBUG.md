# SCOUT REPORT: Start Mission Flow Debugging
**Mode:** SCOUT ONLY (No Code Edits)  
**Date:** 2025-01-15  
**Issue:** Frontend "start mission" calls failing with 400/403 errors

---

## A. Frontend Call Map

### 1. Primary Start Mission Call

**File:** `socialsocial/src/api/missionsService.ts`  
**Function:** `startMission(templateId: string)`

```10:12:socialsocial/src/api/missionsService.ts
export async function startMission(templateId: string) {
  const res = await apiClient.post(`/missions/${templateId}/start`, {});
  return res.data;
}
```

**Details:**
- **URL:** `/v1/missions/${templateId}/start` (baseURL is `/v1` from `apiClient.ts`)
- **Method:** `POST`
- **Request Body:** `{}` (empty object)
- **Headers:** 
  - `Authorization: Bearer ${token}` (set via interceptor from AsyncStorage)
  - `Content-Type: application/json` (default axios)

**Call Site:** `socialsocial/src/screens/MissionRoadScreen.tsx:114`
```112:128:socialsocial/src/screens/MissionRoadScreen.tsx
  const handleStart = async (mission: Mission) => {
    try {
      const res = await startMission(mission.id);

      // Backend may return { mission: { templateId, aiContract } } (no full mission shape)
      const templateId = res?.mission?.templateId ?? mission.id;

      navigation.navigate('PracticeSession', {
        missionId: mission.id,
        templateId,
        personaId: mission?.persona?.id,
        title: mission.title ?? 'Practice Mission',
      });
    } catch (err) {
      console.error('Start mission failed:', err);
    }
  };
```

**Note:** Frontend uses `mission.id` as the `templateId` parameter. This assumes `mission.id` from the road endpoint matches a valid `PracticeMissionTemplate.id`.

### 2. Secondary Practice Session Call

**File:** `socialsocial/src/api/practice.ts`  
**Function:** `createPracticeSession(payload: PracticeSessionRequest)`

```16:21:socialsocial/src/api/practice.ts
export async function createPracticeSession(
  payload: PracticeSessionRequest,
): Promise<PracticeSessionResponse> {
  const res = await apiClient.post('/practice/session', payload);
  return res.data;
}
```

**URL:** `/v1/practice/session`  
**Method:** `POST`  
**Payload Shape:**
```typescript
{
  sessionId?: string;        // optional - for continuation
  topic: string;             // required if no sessionId
  messages: Array<{          // required array
    role: 'USER' | 'AI';
    content: string;
  }>;
  templateId?: string;        // optional
  personaId?: string;        // optional
  mode?: 'MISSION' | 'FREEPLAY';  // optional
  freeplay?: {               // optional nested
    aiStyleKey?: string;
  };
  aiStyleKey?: string;       // optional (legacy)
}
```

**Note:** This is called AFTER navigation to PracticeScreen, not during mission start. However, if the frontend navigates with invalid `templateId`, this call will also fail.

### 3. API Client Configuration

**File:** `socialsocial/src/api/apiClient.ts`

**Auth Token Handling:**
- Token retrieved from AsyncStorage (`accessToken` or `token` key)
- Set via interceptor on every request: `Authorization: Bearer ${stored}`
- If token missing, request proceeds without auth header → **401/403 from JWT guard**

**Base URL:** `${ENV.API_URL}/v1` (must be configured in `src/config/env.ts`)

---

## B. Backend Endpoint & DTO

### 1. Missions Start Endpoint

**File:** `backend/src/modules/missions/missions.controller.ts`

```40:59:backend/src/modules/missions/missions.controller.ts
  @Post(':id/start')
  @UseGuards(JwtAuthGuard)
  async startMission(@Req() req: any, @Param('id') id: string) {
    const userId =
      req.user?.sub ?? req.user?.userId ?? req.user?.id ?? String(req.user);

    const result = await this.missions.startMissionForUser(
      String(userId),
      String(id),
    );

    if (!result) {
      throw new ForbiddenException('Mission cannot be started.');
    }

    return {
      ok: true,
      mission: result,
    };
  }
```

**Route:** `POST /v1/missions/:id/start`  
**Guard:** `JwtAuthGuard` (requires valid JWT)  
**DTO:** None (no `@Body()` decorator - empty body `{}` is acceptable)  
**Parameters:** 
- `id` (from URL path) - expected to be `PracticeMissionTemplate.id`

**Service Method:** `MissionsService.startMissionForUser(userId: string, templateId: string)`

### 2. Practice Session Endpoint

**File:** `backend/src/modules/practice/practice.controller.ts`

```20:27:backend/src/modules/practice/practice.controller.ts
  @Post('session')
  @UseGuards(JwtAuthGuard)
  async session(@Req() req: any, @Body() dto: CreatePracticeSessionDto) {
    // TODO: record fastpath_latency_ms here (start timer at HTTP entry)
    const userId = req.user?.sub ?? req.user?.id;
    return this.practiceService.runPracticeSession(userId, dto);
    // TODO: record fastpath_latency_ms here (stop timer after response returned)
  }
```

**Route:** `POST /v1/practice/session`  
**Guard:** `JwtAuthGuard`  
**DTO:** `CreatePracticeSessionDto`

**DTO Validation Rules:**

**File:** `backend/src/modules/practice/dto/create-practice-session.dto.ts`

```29:86:backend/src/modules/practice/dto/create-practice-session.dto.ts
export class CreatePracticeSessionDto {
  /**
   * ✅ Step 8: continue an existing session by id
   */
  @IsOptional()
  @IsString()
  sessionId?: string;

  /**
   * topic is required only for NEW sessions.
   * For continuation we fall back to the existing session.topic.
   */
  @ValidateIf((o) => !o.sessionId)
  @IsString()
  topic!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PracticeMessageInput)
  messages!: PracticeMessageInput[];

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  personaId?: string;

  /**
   * ✅ NEW – mode:
   * - "MISSION"  => using mission template
   * - "FREEPLAY" => free play with explicit aiStyleKey
   *
   * Backward compatible: if omitted, backend infers from templateId.
   */
  @IsOptional()
  @IsString()
  @IsIn(['MISSION', 'FREEPLAY'])
  mode?: 'MISSION' | 'FREEPLAY';

  /**
   * ✅ NEW – FreePlay object wrapper:
   * freeplay: { aiStyleKey }
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => FreePlayConfig)
  freeplay?: FreePlayConfig;

  /**
   * ✅ Legacy root-level aiStyleKey (kept for compatibility).
   * FE SHOULD prefer: freeplay.aiStyleKey
   */
  @IsOptional()
  @IsString()
  aiStyleKey?: string;
}
```

**Global ValidationPipe Configuration:**

**File:** `backend/src/main.ts`

```29:36:backend/src/main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
```

**Critical:** `forbidNonWhitelisted: true` means any extra fields in request body will cause **400 Bad Request**.

---

## C. 400 (Bad Request) Sources

### 1. Missions Start Endpoint (`POST /v1/missions/:id/start`)

**Note:** This endpoint has NO `@Body()` decorator, so ValidationPipe should not apply to the body. However, if frontend sends non-empty body with extra fields, Fastify/NestJS might still reject it.

**400 Sources in `startMissionForUser()`:**

#### a) Missing aiContract Configuration
**File:** `backend/src/modules/missions/missions.service.ts:246-251`

```246:251:backend/src/modules/missions/missions.service.ts
    if (!template.aiContract || template.aiContract === null) {
      throw new BadRequestException({
        code: 'MISSION_TEMPLATE_INVALID_AT_START',
        message: 'Mission template is missing aiContract configuration',
      });
    }
```

**Condition:** Template exists but `aiContract` field is `null` or missing.

#### b) Invalid aiContract Structure
**File:** `backend/src/modules/missions/missions.service.ts:253-266`

```253:266:backend/src/modules/missions/missions.service.ts
    const normalizeResult = normalizeMissionConfigV1(template.aiContract);
    if (!normalizeResult.ok) {
      const failedResult = normalizeResult as { ok: false; reason: string; errors?: any[] };
      throw new BadRequestException({
        code: 'MISSION_TEMPLATE_INVALID_AT_START',
        message:
          failedResult.reason === 'missing'
            ? 'Mission template aiContract is missing missionConfigV1'
            : failedResult.reason === 'invalid'
              ? 'Mission template aiContract is invalid'
              : 'Mission template aiContract is not a valid object',
        details: failedResult.errors ?? [],
      });
    }
```

**Condition:** `aiContract` exists but fails `normalizeMissionConfigV1()` validation (missing `missionConfigV1`, invalid structure, etc.).

### 2. Practice Session Endpoint (`POST /v1/practice/session`)

**400 Sources in `runPracticeSession()`:**

#### a) Missing userId
**File:** `backend/src/modules/practice/practice.service.ts:758`

```757:761:backend/src/modules/practice/practice.service.ts
  async runPracticeSession(userId: string, dto: CreatePracticeSessionDto) {
    if (!userId) throw new BadRequestException('Missing userId.');
    if (!dto?.messages || dto.messages.length === 0) {
      throw new BadRequestException('No messages provided.');
    }
```

**Condition:** `req.user` is null/undefined after JWT guard (should be 401, but if guard passes with null user, this throws 400).

#### b) No Messages Provided
**File:** `backend/src/modules/practice/practice.service.ts:759-761`

**Condition:** `dto.messages` is missing, empty array, or null.

#### c) Missing Topic (for new sessions)
**File:** `backend/src/modules/practice/dto/create-practice-session.dto.ts:41-43`

```41:43:backend/src/modules/practice/dto/create-practice-session.dto.ts
  @ValidateIf((o) => !o.sessionId)
  @IsString()
  topic!: string;
```

**Condition:** New session (no `sessionId`) but `topic` is missing or empty string.

#### d) Invalid Session Continuation
**File:** `backend/src/modules/practice/practice.service.ts:784-790`

```784:790:backend/src/modules/practice/practice.service.ts
    if (isContinuation) {
      if (!existingSession) throw new NotFoundException('Session not found.');
      if (existingSession.userId !== userId)
        throw new UnauthorizedException('Session does not belong to user.');
      if (existingSession.status !== MissionStatus.IN_PROGRESS || existingSession.endedAt) {
        throw new BadRequestException('Session is not IN_PROGRESS.');
      }
    }
```

**Condition:** Continuation attempted but session is already `SUCCESS`, `FAIL`, or `ABORTED`.

#### e) Template References Invalid Persona
**File:** `backend/src/modules/practice/practice.service.ts:839-850`

```839:850:backend/src/modules/practice/practice.service.ts
      if (!persona) {
        throw new BadRequestException({
          code: 'MISSION_TEMPLATE_INVALID_PERSONA',
          message: `Template references persona "${template.personaId}" that does not exist`,
        });
      }
      if (!persona.active) {
        throw new BadRequestException({
          code: 'MISSION_TEMPLATE_INACTIVE_PERSONA',
          message: `Template references persona "${template.personaId}" that is inactive`,
        });
      }
```

**Condition:** Template has `personaId` but persona doesn't exist or is inactive.

#### f) Template References Inactive AI Style
**File:** `backend/src/modules/practice/practice.service.ts:866-870`

```866:870:backend/src/modules/practice/practice.service.ts
    if (templateId && template?.aiStyle) {
      if (!template.aiStyle.isActive) {
        throw new BadRequestException({
          code: 'MISSION_TEMPLATE_INACTIVE_STYLE',
```

**Condition:** Template's `aiStyle` exists but `isActive === false`.

#### g) ValidationPipe Rejects Extra Fields
**File:** `backend/src/main.ts:30-35`

**Condition:** Request body contains fields not in `CreatePracticeSessionDto` (due to `forbidNonWhitelisted: true`).

#### h) Invalid Enum Values
**Condition:** `mode` is not `'MISSION'` or `'FREEPLAY'` (if provided).

#### i) Invalid Message Structure
**Condition:** `messages` array contains items without `role: 'USER' | 'AI'` or missing `content: string`.

---

## D. 403 (Forbidden) Sources

### 1. JWT Authentication Guard

**File:** `backend/src/modules/auth/jwt-auth.guard.ts`

```1:7:backend/src/modules/auth/jwt-auth.guard.ts
// backend/src/modules/auth/jwt-auth.guard.ts

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

**JWT Strategy:** `backend/src/modules/auth/jwt.strategy.ts`

**403 Conditions:**
- **Note:** NestJS `AuthGuard('jwt')` typically throws `UnauthorizedException` (401), not 403. However, if the JWT is valid but user doesn't exist in DB, or if there's custom logic, it could be 403.

**Actual 401 Conditions:**
- Missing `Authorization: Bearer <token>` header
- Invalid JWT signature (wrong secret/key)
- Expired JWT (unless `ignoreExpiration: true`)
- Malformed JWT token

**Potential 403 Conditions:**
- JWT is valid but user account is deactivated (if custom guard logic exists)
- JWT is valid but user doesn't exist in database (should be 401, but could be 403)

### 2. Missions Start Endpoint - Mission Inactive

**File:** `backend/src/modules/missions/missions.service.ts:242-243`

```242:243:backend/src/modules/missions/missions.service.ts
    if (!template) throw new NotFoundException('Mission template not found.');
    if (!(template as any).active)
      throw new ForbiddenException('Mission is inactive.');
```

**Condition:** Template exists but `active === false`.

### 3. Missions Start Endpoint - Mission Locked

**File:** `backend/src/modules/missions/missions.service.ts:268-270`

```268:270:backend/src/modules/missions/missions.service.ts
    const isUnlocked = await this.isUnlockedForUser(userId, template as any);
    if (!isUnlocked)
      throw new ForbiddenException('You must complete earlier missions first.');
```

**Condition:** Mission is not the first in its lane AND previous mission in lane is not `COMPLETED`.

**Unlock Logic:** `backend/src/modules/missions/missions.service.ts:382-402`

```382:402:backend/src/modules/missions/missions.service.ts
  private async isUnlockedForUser(userId: string, template: any) {
    const orderIndex = Number(template.orderIndex ?? 0);
    if (orderIndex <= 0) return true;

    const prev = await this.prisma.practiceMissionTemplate.findFirst({
      where: {
        active: true,
        laneIndex: template.laneIndex,
        orderIndex: { lt: orderIndex },
      },
      orderBy: { orderIndex: 'desc' },
    });

    if (!prev) return true;

    const prevProgress = await this.prisma.missionProgress.findFirst({
      where: { userId, templateId: (prev as any).id },
    });

    return prevProgress?.status === STATUS_COMPLETED;
  }
```

### 4. Missions Start Endpoint - Null Result

**File:** `backend/src/modules/missions/missions.controller.ts:51-53`

```51:53:backend/src/modules/missions/missions.controller.ts
    if (!result) {
      throw new ForbiddenException('Mission cannot be started.');
    }
```

**Condition:** `startMissionForUser()` returns `null` or `undefined` (should not happen in current code, but defensive check exists).

### 5. Practice Session Endpoint - Session Ownership

**File:** `backend/src/modules/practice/practice.service.ts:786-787`

```786:787:backend/src/modules/practice/practice.service.ts
      if (existingSession.userId !== userId)
        throw new UnauthorizedException('Session does not belong to user.');
```

**Note:** This throws `UnauthorizedException` (401), not 403, but could be misreported as 403 in logs.

---

## E. Likely Root Causes (Ranked)

### 1. **MISSION TEMPLATE MISSING/INVALID aiContract** (400) ⚠️ HIGHEST PROBABILITY

**Evidence:**
- `startMissionForUser()` explicitly checks for `aiContract` and throws 400 if missing/invalid
- Recent Phase 1-4 engine refactors may have introduced templates without proper `aiContract` structure
- Error code `MISSION_TEMPLATE_INVALID_AT_START` matches this scenario

**How to Verify:**
- Check database: `SELECT id, code, title, "aiContract" FROM "PracticeMissionTemplate" WHERE active = true AND ("aiContract" IS NULL OR "aiContract" = 'null'::jsonb);`
- Check if `aiContract` has `missionConfigV1` nested structure

**Frontend Impact:**
- Frontend sends `mission.id` as `templateId`, but if that template lacks `aiContract`, backend throws 400 immediately

### 2. **MISSION NOT UNLOCKED** (403) ⚠️ HIGH PROBABILITY

**Evidence:**
- `isUnlockedForUser()` checks if previous mission in lane is completed
- If user tries to start mission #2 in lane before completing #1, gets 403
- Frontend may not be checking `isUnlocked` flag from road endpoint before allowing start

**How to Verify:**
- Check `MissionProgress` table: `SELECT "userId", "templateId", status FROM "MissionProgress" WHERE "userId" = '<user_id>';`
- Verify mission's `orderIndex` and previous mission's status

**Frontend Impact:**
- `MissionRoadScreen` shows missions but may not disable "Start" button for locked missions
- User can tap "Start" on locked mission → 403

### 3. **MISSION INACTIVE** (403) ⚠️ MEDIUM PROBABILITY

**Evidence:**
- Template exists but `active = false`
- Road endpoint filters by `active: true`, but if template becomes inactive between road fetch and start, user gets 403

**How to Verify:**
- Check: `SELECT id, code, title, active FROM "PracticeMissionTemplate" WHERE id = '<template_id>';`

**Frontend Impact:**
- Race condition: mission shown in road (was active) but becomes inactive before start

### 4. **JWT TOKEN MISSING/INVALID** (401/403) ⚠️ MEDIUM PROBABILITY

**Evidence:**
- `apiClient` interceptor retrieves token from AsyncStorage
- If token is missing, expired, or invalid, JWT guard rejects request
- Could be 401 (Unauthorized) but may be logged as 403 in some cases

**How to Verify:**
- Check frontend logs for token retrieval
- Verify `Authorization` header is present in network requests
- Check JWT expiration time vs current time

**Frontend Impact:**
- User logged out but token still in AsyncStorage (stale)
- Token expired but not refreshed
- Token never set after login

### 5. **TEMPLATE ID MISMATCH** (400/404) ⚠️ MEDIUM PROBABILITY

**Evidence:**
- Frontend uses `mission.id` from road endpoint as `templateId`
- Road endpoint returns missions with `id` field, but this should match `PracticeMissionTemplate.id`
- If mismatch, backend throws `NotFoundException` (404), but could be caught as 400 in some cases

**How to Verify:**
- Compare `mission.id` from `/v1/missions/road` response with actual `PracticeMissionTemplate.id` in database
- Check if road endpoint returns correct IDs

**Frontend Impact:**
- Road endpoint returns wrong ID format
- Frontend uses wrong field (e.g., `mission.code` instead of `mission.id`)

### 6. **VALIDATIONPIPE REJECTS REQUEST BODY** (400) ⚠️ LOW PROBABILITY

**Evidence:**
- `forbidNonWhitelisted: true` rejects extra fields
- Missions start endpoint has NO `@Body()`, so empty `{}` should be fine
- However, if frontend accidentally sends extra fields, could cause 400

**How to Verify:**
- Check network request body in browser DevTools
- Verify body is exactly `{}` for missions start

**Frontend Impact:**
- Frontend sends `{ templateId: '...' }` instead of empty `{}`
- Frontend sends extra metadata fields

### 7. **PRACTICE SESSION DTO VALIDATION FAILURE** (400) ⚠️ LOW PROBABILITY (for start mission)

**Evidence:**
- This affects `/v1/practice/session`, not `/v1/missions/:id/start`
- However, if frontend navigates to PracticeScreen and immediately calls `createPracticeSession`, this could fail

**How to Verify:**
- Check if PracticeScreen calls `createPracticeSession` on mount with invalid payload
- Verify `topic`, `messages` array structure

**Frontend Impact:**
- PracticeScreen sends malformed `PracticeSessionRequest` after navigation from MissionRoadScreen

---

## F. Suggested Next IMPLEMENT Steps (No Code Yet)

### Priority 1: Fix aiContract Validation

1. **Add Database Check Script:**
   - Query all active templates missing/invalid `aiContract`
   - Report which templates need `aiContract` configuration

2. **Improve Error Messages:**
   - Return template `code`/`title` in 400 error response
   - Help identify which mission template is broken

3. **Frontend Error Handling:**
   - Catch 400 with `MISSION_TEMPLATE_INVALID_AT_START` code
   - Show user-friendly message: "This mission is temporarily unavailable"

### Priority 2: Fix Unlock Logic

1. **Frontend Pre-Check:**
   - Disable "Start Mission" button if `isUnlocked === false` from road endpoint
   - Show lock icon/teaser for locked missions

2. **Backend Consistency:**
   - Ensure road endpoint `isUnlocked` flag matches `isUnlockedForUser()` logic
   - Add logging when unlock check fails

3. **Error Message:**
   - Return which previous mission needs to be completed
   - Help user understand unlock requirements

### Priority 3: Improve Auth Error Handling

1. **Token Refresh:**
   - Implement automatic token refresh on 401
   - Clear stale tokens from AsyncStorage

2. **Error Differentiation:**
   - Distinguish 401 (auth) from 403 (permission) in frontend
   - Show "Please log in again" for 401, "Mission locked" for 403

### Priority 4: Add Request Logging

1. **Backend Logging:**
   - Log all 400/403 errors with full request context (userId, templateId, headers)
   - Include stack trace for debugging

2. **Frontend Logging:**
   - Log request payload and response errors to console
   - Include templateId in error logs

### Priority 5: Validate Template ID Mapping

1. **Verify Road Endpoint:**
   - Ensure `/v1/missions/road` returns correct `id` field matching `PracticeMissionTemplate.id`
   - Add integration test: start mission with ID from road endpoint

2. **Frontend Safety:**
   - Validate `mission.id` exists before calling `startMission()`
   - Fallback to `mission.templateId` if `id` is missing

---

## G. Additional Notes

### ValidationPipe Behavior

The global `ValidationPipe` with `forbidNonWhitelisted: true` will:
- Strip unknown properties (whitelist)
- Reject requests with unknown properties (forbidNonWhitelisted)
- Transform types (transform)
- Apply class-validator decorators

**For missions start endpoint:** No `@Body()` means body validation doesn't apply, but Fastify might still reject malformed JSON.

**For practice session endpoint:** Full DTO validation applies, so any extra fields or missing required fields cause 400.

### JWT Guard Behavior

`JwtAuthGuard` extends `AuthGuard('jwt')` which:
- Extracts JWT from `Authorization: Bearer <token>` header
- Validates signature using `JWT_SECRET` or `JWT_PUBLIC_KEY`
- Checks expiration (unless `ignoreExpiration: true`)
- Calls `JwtStrategy.validate()` with payload
- Sets `req.user` from validate return value

**If guard fails:** Typically throws `UnauthorizedException` (401), not 403. However, custom exception filters could map 401 → 403.

### Frontend Navigation Flow

1. User taps "Start Mission" on `MissionRoadScreen`
2. Calls `startMission(mission.id)` → `POST /v1/missions/${mission.id}/start`
3. On success, navigates to `PracticeSession` screen with `templateId`
4. `PracticeScreen` mounts and may call `createPracticeSession()` on first message
5. If step 2 fails (400/403), navigation may still occur with invalid `templateId`
6. Step 4 then fails with additional errors

**Recommendation:** Don't navigate if `startMission()` fails. Show error modal instead.

---

## H. Debugging Checklist

To diagnose a specific 400/403 error:

1. ✅ Check network request in DevTools:
   - URL: `/v1/missions/<id>/start`
   - Method: `POST`
   - Headers: `Authorization: Bearer <token>` present?
   - Body: `{}` (empty object)

2. ✅ Check backend logs:
   - Which exception was thrown? (BadRequestException vs ForbiddenException)
   - What was the error message/code?
   - What was the `templateId` and `userId`?

3. ✅ Check database:
   - Does template exist? `SELECT * FROM "PracticeMissionTemplate" WHERE id = '<id>';`
   - Is template active? `active = true`
   - Does template have `aiContract`? `"aiContract" IS NOT NULL`
   - Is `aiContract` valid JSON with `missionConfigV1`?

4. ✅ Check unlock status:
   - What is template's `orderIndex` and `laneIndex`?
   - Is previous mission completed? `SELECT status FROM "MissionProgress" WHERE "userId" = '<user>' AND "templateId" = '<prev_id>';`

5. ✅ Check JWT:
   - Is token present in request?
   - Is token expired? Decode JWT and check `exp` claim
   - Does token signature validate? (check `JWT_SECRET`/`JWT_PUBLIC_KEY`)

---

**END OF SCOUT REPORT**

