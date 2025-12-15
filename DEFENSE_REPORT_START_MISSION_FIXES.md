# Defense Report: Start Mission Flow Error Handling Fixes
**Date:** 2025-01-15  
**Mode:** IMPLEMENT  
**Issue:** Frontend "start mission" calls failing with 400/403 errors

---

## Files Changed

### Backend Files

#### 1. `backend/src/modules/missions/missions.service.ts`

**Changes:**
- Added `Logger` import and instance (`private readonly logger = new Logger(MissionsService.name)`)
- Standardized all error responses with structured JSON bodies containing `code`, `message`, `templateId`, and `templateCode` fields
- Added debug logging before each exception throw in `startMissionForUser()`:
  - Logs include: `code`, `userId`, `templateId`, `templateCode`, and `reason`
- Updated `NotFoundException` for missing template to include structured error body with `code: 'MISSION_TEMPLATE_NOT_FOUND'`
- Updated `ForbiddenException` for inactive mission to include structured error body with `code: 'MISSION_INACTIVE'`
- Updated `BadRequestException` for missing/invalid `aiContract` to include `templateId` and `templateCode` in error body
- Updated `ForbiddenException` for locked mission to include structured error body with `code: 'MISSION_LOCKED_PREVIOUS_NOT_COMPLETED'`
- Added `isActive: !!t.active` field to road endpoint response (line 211)

#### 2. `backend/src/modules/missions/missions.controller.ts`

**Changes:**
- Updated defensive `if (!result)` check to throw structured `ForbiddenException` with:
  - `code: 'MISSION_CANNOT_BE_STARTED'`
  - `message: 'Mission cannot be started due to an internal constraint.'`
  - `templateId: id`

### Frontend Files

#### 3. `socialsocial/src/screens/MissionRoadScreen.tsx`

**Changes:**
- Added `Alert` import from `react-native`
- Added `AxiosError` import from `axios`
- Extended `Mission` type to include:
  - `isActive?: boolean`
  - `isUnlocked?: boolean`
- Updated `handleStart()` function:
  - Added guard checks at the top to prevent calling API for inactive/locked missions
  - Shows `Alert.alert()` for inactive missions: "This mission is currently inactive."
  - Shows `Alert.alert()` for locked missions: "Complete previous missions in this lane first."
  - Improved error handling with structured parsing of Axios error responses
  - Maps error codes to user-friendly messages:
    - `MISSION_TEMPLATE_INVALID_AT_START` (400) → "This mission is misconfigured right now. Please try another one."
    - `MISSION_LOCKED_PREVIOUS_NOT_COMPLETED` (403) → "You must complete earlier missions in this lane first."
    - `MISSION_INACTIVE` (403) → "This mission is currently inactive."
    - `MISSION_TEMPLATE_NOT_FOUND` (404) → "This mission no longer exists. Try refreshing the mission list."
    - `401` → "Your session expired. Please log in again."
    - Generic fallback → "Could not start this mission. Please try again."
  - **Critical:** Navigation only happens inside `try` block after successful `startMission()` response
  - Enhanced console.error logging with status, code, message, and full error object
- Updated UI rendering:
  - Added lock badge (🔒 Locked) for locked missions
  - Disabled `TouchableOpacity` when `isActive === false` or `isUnlocked === false`
  - Added `startBtnDisabled` and `startBtnTextDisabled` styles for disabled state
  - Added `lockedBadge` and `lockedBadgeText` styles

---

## Behavior Changes

### What Happens Now When:

#### 1. Mission is Misconfigured (aiContract missing/invalid) - 400

**Backend:**
- Throws `BadRequestException` with:
  - `code: 'MISSION_TEMPLATE_INVALID_AT_START'`
  - `message: 'Mission template is missing aiContract configuration'` or detailed validation message
  - `templateId` and `templateCode` included
  - Logs warning: `startMissionForUser failed: code=MISSION_TEMPLATE_INVALID_AT_START userId=... templateId=... reason=...`

**Frontend:**
- If frontend guard passes (mission appears active/unlocked), API call is made
- On 400 response with `MISSION_TEMPLATE_INVALID_AT_START` code:
  - Shows Alert: "This mission is misconfigured right now. Please try another one."
  - **Does NOT navigate** to PracticeSession
  - Logs error to console with full details

#### 2. Mission is Locked (previous not completed) - 403

**Backend:**
- Throws `ForbiddenException` with:
  - `code: 'MISSION_LOCKED_PREVIOUS_NOT_COMPLETED'`
  - `message: 'You must complete earlier missions in this lane first.'`
  - `templateId` and `templateCode` included
  - Logs warning before throwing

**Frontend:**
- **Pre-flight guard:** If `mission.isUnlocked === false`:
  - Shows Alert: "Complete previous missions in this lane first."
  - **Does NOT make API call**
  - **Does NOT navigate**
- If guard somehow passes but backend returns 403:
  - Shows Alert: "You must complete earlier missions in this lane first."
  - **Does NOT navigate**
- UI shows lock badge (🔒 Locked) and disables Start button for locked missions

#### 3. Mission is Inactive - 403

**Backend:**
- Throws `ForbiddenException` with:
  - `code: 'MISSION_INACTIVE'`
  - `message: 'Mission is inactive.'`
  - `templateId` and `templateCode` included
  - Logs warning before throwing

**Frontend:**
- **Pre-flight guard:** If `mission.isActive === false`:
  - Shows Alert: "This mission is currently inactive."
  - **Does NOT make API call**
  - **Does NOT navigate**
- If guard somehow passes but backend returns 403:
  - Shows Alert: "This mission is currently inactive."
  - **Does NOT navigate**
- UI disables Start button for inactive missions

#### 4. JWT is Missing/Invalid - 401

**Backend:**
- `JwtAuthGuard` rejects request before reaching controller
- NestJS typically throws `UnauthorizedException` (401)

**Frontend:**
- API call fails with 401 status
- Shows Alert: "Your session expired. Please log in again."
  - Note: Frontend may have `onAuthLostCallback` that handles 401 globally (see `apiClient.ts`)
- **Does NOT navigate**

#### 5. Mission Template Not Found - 404

**Backend:**
- Throws `NotFoundException` with:
  - `code: 'MISSION_TEMPLATE_NOT_FOUND'`
  - `message: 'Mission template not found.'`
  - `templateId` included
  - Logs warning before throwing

**Frontend:**
- Shows Alert: "This mission no longer exists. Try refreshing the mission list."
- **Does NOT navigate**

#### 6. Successful Mission Start - 200

**Backend:**
- Returns `{ ok: true, mission: {...} }` with mission details
- No exceptions thrown

**Frontend:**
- Extracts `templateId` from response
- **Navigates to PracticeSession** with mission params
- No error alerts shown

---

## How to Manually Test

### Test Scenario 1: Start an Unlocked, Valid Mission → Expect 200 and Navigation

**Steps:**
1. Log in to the app
2. Navigate to Mission Road screen
3. Find a mission with `isUnlocked: true` and `isActive: true` (first mission in a lane)
4. Tap "Start Mission" button
5. **Expected:**
   - Button is enabled (green background)
   - No lock badge visible
   - API call to `POST /v1/missions/{id}/start` succeeds (200)
   - Navigation to PracticeSession screen occurs
   - No error alerts shown

**Verify:**
- Check network tab: Request returns 200 OK
- Check backend logs: No warning messages
- Check frontend console: No error logs

### Test Scenario 2: Try to Start a Locked Mission → No Request or 403 + Correct Toast, No Navigation

**Steps:**
1. Log in to the app
2. Navigate to Mission Road screen
3. Find a mission with `isUnlocked: false` (not first in lane, previous not completed)
4. **Expected UI:**
   - Lock badge (🔒 Locked) visible
   - Start button is disabled (grayed out)
5. Try to tap "Start Mission" button
6. **Expected:**
   - Alert shows: "Complete previous missions in this lane first."
   - **No API call made** (if guard works)
   - **No navigation** occurs

**Alternative Test (if guard fails):**
- If API call is made, expect 403 response with `MISSION_LOCKED_PREVIOUS_NOT_COMPLETED`
- Alert shows: "You must complete earlier missions in this lane first."
- **No navigation** occurs

**Verify:**
- Check network tab: Either no request (preferred) or 403 Forbidden
- Check backend logs: Warning log with `code=MISSION_LOCKED_PREVIOUS_NOT_COMPLETED`
- Check frontend console: Error log with status 403 and code

### Test Scenario 3: Try to Start a Mission with Invalid aiContract → 400 + Correct Toast

**Steps:**
1. In database, set a mission template's `aiContract` to `NULL` or invalid JSON
2. Ensure mission is active and unlocked (so frontend guard passes)
3. Log in to the app
4. Navigate to Mission Road screen
5. Find the mission with invalid `aiContract`
6. Tap "Start Mission" button
7. **Expected:**
   - API call to `POST /v1/missions/{id}/start` returns 400
   - Alert shows: "This mission is misconfigured right now. Please try another one."
   - **No navigation** occurs

**Verify:**
- Check network tab: Request returns 400 Bad Request
- Check response body: Contains `code: 'MISSION_TEMPLATE_INVALID_AT_START'`
- Check backend logs: Warning log with `code=MISSION_TEMPLATE_INVALID_AT_START`
- Check frontend console: Error log with status 400 and code

### Test Scenario 4: Try to Start with Expired/Missing Token → 401 + Correct Toast

**Steps:**
1. Clear AsyncStorage tokens (or wait for token to expire)
2. Navigate to Mission Road screen
3. Find an unlocked, active mission
4. Tap "Start Mission" button
5. **Expected:**
   - API call to `POST /v1/missions/{id}/start` returns 401
   - Alert shows: "Your session expired. Please log in again."
   - **No navigation** occurs
   - (Optional) Global auth callback may redirect to login screen

**Verify:**
- Check network tab: Request returns 401 Unauthorized
- Check request headers: Missing or invalid `Authorization: Bearer <token>`
- Check frontend console: Error log with status 401

### Test Scenario 5: Road Endpoint Returns isActive/isUnlocked Flags

**Steps:**
1. Log in to the app
2. Navigate to Mission Road screen
3. Check network tab for `GET /v1/missions/road` response
4. **Expected:**
   - Each mission object includes:
     - `isActive: boolean` (derived from `template.active`)
     - `isUnlocked: boolean` (computed from unlock logic)
   - First mission in each lane has `isUnlocked: true`
   - Subsequent missions have `isUnlocked: false` if previous not completed

**Verify:**
- Check network response: All missions have `isActive` and `isUnlocked` fields
- Check UI: Locked missions show lock badge and disabled button
- Check UI: Inactive missions show disabled button

### Test Scenario 6: Mission Becomes Inactive Between Road Fetch and Start

**Steps:**
1. Log in to the app
2. Navigate to Mission Road screen (road endpoint returns mission with `isActive: true`)
3. In database, set mission's `active` to `false`
4. Tap "Start Mission" button
5. **Expected:**
   - If frontend guard uses cached `isActive: true`, API call is made
   - Backend returns 403 with `MISSION_INACTIVE`
   - Alert shows: "This mission is currently inactive."
   - **No navigation** occurs

**Verify:**
- Check network tab: Request returns 403 Forbidden
- Check response body: Contains `code: 'MISSION_INACTIVE'`
- Check backend logs: Warning log with `code=MISSION_INACTIVE`

---

## Risks / TODOs

### Risks

1. **Race Condition:** Mission state can change between road fetch and start attempt
   - **Mitigation:** Frontend guards prevent most cases, backend validates on every start
   - **Remaining Risk:** If mission becomes inactive/locked between guard check and API call, user sees error alert (acceptable UX)

2. **Error Message Consistency:** Frontend uses `Alert.alert()` which is modal and blocking
   - **Risk:** User must dismiss alert before continuing (may be annoying for repeated failures)
   - **Mitigation:** Pre-flight guards prevent most API calls, reducing error frequency
   - **Future:** Consider non-blocking toast/snackbar for less critical errors

3. **Missing Error Codes:** If backend returns error without structured `code` field, frontend shows generic message
   - **Risk:** Less helpful error messages for unexpected errors
   - **Mitigation:** All known error paths now return structured codes
   - **Future:** Add fallback parsing for legacy error formats

### TODOs / Follow-up Tasks

1. **Add Integration Tests:**
   - Test `POST /v1/missions/:id/start` with various error conditions
   - Verify structured error responses match expected format
   - Test frontend error handling with mocked API responses

2. **Improve Frontend Error UX:**
   - Consider replacing `Alert.alert()` with non-blocking toast for non-critical errors
   - Add retry button for transient errors (network, 500, etc.)
   - Show loading state during API call to prevent double-taps

3. **Add Backend Monitoring:**
   - Track error rates by code (`MISSION_LOCKED_PREVIOUS_NOT_COMPLETED`, `MISSION_INACTIVE`, etc.)
   - Alert on high rates of `MISSION_TEMPLATE_INVALID_AT_START` (indicates data quality issues)
   - Log user IDs for debugging unlock logic issues

4. **Validate Road Endpoint Consistency:**
   - Ensure `isUnlocked` flag from road endpoint matches `isUnlockedForUser()` logic exactly
   - Add test to verify unlock state consistency between endpoints

5. **PracticeSession Guard (Optional):**
   - If PracticeScreen calls `createPracticeSession()` on mount without valid `templateId`, add guard
   - Check if navigation params include `templateId` before making API call
   - Show error if user navigates directly to PracticeSession without starting mission

6. **Database Cleanup:**
   - Script to find and report all templates with missing/invalid `aiContract`
   - Migration to set default `aiContract` structure for existing templates
   - Validation script to ensure all active templates have valid `aiContract`

7. **Documentation:**
   - Document all error codes in API documentation
   - Add error code reference for frontend developers
   - Update API contract/schema with structured error response format

---

## Summary

**What Was Fixed:**
- ✅ All mission start error paths now return structured error codes
- ✅ Backend logs all mission start failures with context
- ✅ Road endpoint exposes `isActive` flag
- ✅ Frontend prevents API calls for locked/inactive missions (pre-flight guards)
- ✅ Frontend shows user-friendly error messages for all error scenarios
- ✅ Frontend only navigates on successful mission start (no navigation on errors)

**What Was NOT Changed:**
- ❌ Business logic (unlock rules, inactive mission checks) - these are intentional constraints
- ❌ Mission template validation logic - only error reporting improved
- ❌ JWT authentication flow - only error handling improved
- ❌ PracticeSession creation flow - only start mission flow addressed

**Impact:**
- Users will see clear error messages instead of generic 400/403 errors
- Frontend prevents unnecessary API calls for locked/inactive missions
- Backend logs provide better debugging context
- Error responses are structured and parseable for future automation

---

**END OF DEFENSE REPORT**

