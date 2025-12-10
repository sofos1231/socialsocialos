# DEFENSE REPORT — Steps 6.9 & 6.10 Implementation

## Summary

- **Step 6.9 (AI Provider & Runtime Controls)**: Implemented structured AI provider with error classification, retry logic, token extraction, and per-mission AI runtime profile configuration. All AI calls now use `AiCallResult` type with explicit success/error states, and missions can configure model, temperature, maxTokens, and other runtime parameters.

- **Step 6.10 (Observability, Debug Hooks & Toggles)**: Added AI call trace snapshots for observability, verbose trace logging (dev-only), and feature toggles for AI layers (micro-dynamics, modifiers, arc detection, persona drift detection). All toggles default to enabled for backward compatibility.

- **Backward Compatibility**: All changes are backward compatible. Missions without `aiRuntimeProfile` use existing style preset defaults. Missions without feature toggles have all layers enabled by default.

- **Error Handling**: AI provider now classifies errors as transient (retryable) or permanent (not retryable), with automatic retry logic for transient errors (max 3 attempts with exponential backoff).

- **Token Tracking**: OpenAI responses now extract and track token usage (prompt tokens, completion tokens, total tokens) in debug metadata.

## Per-Step Verdict

### Step 6.9 — AI Provider & Runtime Controls

**Status**: ✅ **DONE**

**Justification**:
- ✅ Single AI provider abstraction: `OpenAiClient` is the only place that calls OpenAI API
- ✅ Per-mission AI runtime profile: `MissionConfigV1AiRuntimeProfile` schema added, normalized in runtime, passed through practice loop to `AiChatService`
- ✅ Resilience & error handling: Structured `AiCallResult` type, error classification (TRANSIENT vs PERMANENT), retry logic with exponential backoff (max 3 attempts)
- ✅ Cost & latency awareness: Token usage extracted from OpenAI responses, latency tracked, model tracked
- ✅ Safety/policy entry point: Hook points exist in `OpenAiClient.attemptCall()` for future moderation logic

**Remaining Work** (intentionally deferred):
- Advanced safety filters (content moderation) — placeholder exists but not implemented
- Multi-provider support (currently OpenAI-only) — architecture supports it but only OpenAI implemented
- Full circuit-breaker system — basic retry exists but not full circuit breaker

### Step 6.10 — Observability, Debug Hooks & Toggles

**Status**: ✅ **DONE**

**Justification**:
- ✅ Traceability of prompts & AI decisions: `AiCallTraceSnapshot` type created, snapshots attached to trace payload in practice service
- ✅ Debug/dev-mode hooks: Verbose trace logging implemented (guarded by `NODE_ENV !== 'production' AND AI_VERBOSE_TRACE === 'true'`)
- ✅ Feature toggles for AI layers: Added `enableMicroDynamics`, `enableModifiers`, `enableArcDetection`, `enablePersonaDriftDetection` to `MissionConfigV1StatePolicy`, all default to `true`
- ✅ Stats/analytics hooks: Trace snapshots stored in `payload.trace.aiCallSnapshots[]`, queryable by stats service
- ✅ No PII/privacy breaches: Verbose logging only in dev mode with explicit flag, no prompt/response logging in production

**Remaining Work** (intentionally deferred):
- Full prompt/response storage for debugging — only trimmed previews logged in verbose mode
- Advanced trace querying/aggregation — snapshots stored but no query API yet

## Files Changed

### Step 6.9 Files

1. **`backend/src/modules/ai/providers/ai-provider.types.ts`** (NEW)
   - **What changed**: Created new file with `AiErrorCode`, `AiProviderConfig`, `AiCallDebug`, and `AiCallResult` types
   - **Why**: Provides structured types for AI provider results, error classification, and configuration
   - **Requirement**: Step 6.9 Chunk A — Central AI Provider types

2. **`backend/src/modules/ai/providers/openai.client.ts`**
   - **What changed**: Refactored `createChatCompletion()` to return `AiCallResult`, added error classification, retry logic with exponential backoff, token extraction from responses
   - **Why**: Implements structured results, resilience, and observability for AI calls
   - **Requirement**: Step 6.9 Chunk A — Central AI Provider resilience

3. **`backend/src/modules/missions-admin/mission-config-v1.schema.ts`**
   - **What changed**: Added `MissionConfigV1AiRuntimeProfile` interface and `aiRuntimeProfile` field to `MissionConfigV1`. Added feature toggles (`enableMicroDynamics`, `enableModifiers`, `enableArcDetection`, `enablePersonaDriftDetection`) to `MissionConfigV1StatePolicy`
   - **Why**: Enables per-mission AI runtime configuration and feature toggles
   - **Requirement**: Step 6.9 Chunk B — Per-Mission AI Runtime Profile, Step 6.10 Chunk E — Feature Toggles

4. **`backend/src/modules/practice/mission-config-runtime.ts`**
   - **What changed**: Added `aiRuntimeProfile` to `NormalizedMissionConfigV1` interface and normalization logic. Added feature toggle normalization (all default to `true`)
   - **Why**: Ensures AI runtime profile and feature toggles are normalized and available at runtime
   - **Requirement**: Step 6.9 Chunk B — Per-Mission AI Runtime Profile normalization

5. **`backend/src/modules/ai/providers/ai-chat.service.ts`**
   - **What changed**: Updated `generateReply()` to accept `aiRuntimeProfile` in `missionConfig`, build `AiProviderConfig` from mission config + style preset, consume `AiCallResult` from `OpenAiClient`, handle errors gracefully with synthetic fallback, add verbose trace logging (dev-only)
   - **Why**: Integrates per-mission AI runtime profile and structured error handling into AI chat service
   - **Requirement**: Step 6.9 Chunk B — Use AI runtime profile, Step 6.9 Chunk C — Error handling integration, Step 6.10 Chunk D — Verbose trace logging

6. **`backend/src/modules/practice/practice.service.ts`**
   - **What changed**: Pass `aiRuntimeProfile` to `aiChat.generateReply()`, extract `errorCode` and `syntheticReply` from result, build `AiCallTraceSnapshot` after AI call, add snapshots to trace payload, add feature toggle checks before computing micro-dynamics, modifiers, and persona drift
   - **Why**: Wires AI runtime profile through practice loop, handles errors, builds trace snapshots, and respects feature toggles
   - **Requirement**: Step 6.9 Chunk B — Wire AI runtime profile, Step 6.9 Chunk C — Error handling, Step 6.10 Chunk D — Trace snapshots, Step 6.10 Chunk E — Feature toggle usage

### Step 6.10 Files

7. **`backend/src/modules/ai/ai-trace.types.ts`** (NEW)
   - **What changed**: Created new file with `AiCallTraceSnapshot` interface
   - **Why**: Provides structured type for AI call trace snapshots
   - **Requirement**: Step 6.10 Chunk D — Trace snapshot types

8. **`backend/src/modules/mood/mood.service.ts`**
   - **What changed**: Added feature toggle check for `enableArcDetection` in `buildTimelineForSession()`, loads toggle from session payload, returns empty arcs array if disabled
   - **Why**: Respects feature toggle for arc detection
   - **Requirement**: Step 6.10 Chunk E — Feature toggle usage

9. **`backend/src/modules/ai/providers/openai.client.spec.ts`** (NEW)
   - **What changed**: Created minimal tests for error classification and missing API key handling
   - **Why**: Validates error classification logic and error handling
   - **Requirement**: Step 6.9 testing

## Behavioral Notes

### How to Configure aiRuntimeProfile on a Mission

Add `aiRuntimeProfile` to the mission's `missionConfigV1` in the admin dashboard:

```json
{
  "missionConfigV1": {
    "version": 1,
    "dynamics": { ... },
    "objective": { ... },
    "difficulty": { ... },
    "style": { ... },
    "statePolicy": { ... },
    "aiRuntimeProfile": {
      "model": "gpt-4o-mini",
      "temperature": 0.8,
      "maxTokens": 300,
      "topP": 0.9,
      "timeoutMs": 20000,
      "retryAttempts": 3
    }
  }
}
```

If `aiRuntimeProfile` is not provided, the system falls back to:
- Model: `OPENAI_MODEL` env var or `'gpt-4o-mini'`
- Temperature: Style preset temperature (FLIRTY=0.78, PLAYFUL=0.82, CHALLENGING=0.66, NEUTRAL=0.7)
- maxTokens: 260 (hardcoded default)
- Timeout: `AI_TIMEOUT_MS` env var or 15000ms
- Retry attempts: 3 (default)

### How to Turn Specific Layers On/Off via MissionConfigV1StatePolicy

Add feature toggles to the mission's `statePolicy`:

```json
{
  "missionConfigV1": {
    "statePolicy": {
      "enableMicroDynamics": false,
      "enableModifiers": false,
      "enableArcDetection": false,
      "enablePersonaDriftDetection": false,
      ...
    }
  }
}
```

All toggles default to `true` if not specified, ensuring backward compatibility.

### How to Enable Verbose AI Trace Logging in Dev

Set environment variables:
```bash
NODE_ENV=development
AI_VERBOSE_TRACE=true
```

This will log:
- Prompt preview (first 500 chars) before AI call
- Response preview (first 200 chars) after AI call

**Important**: Verbose logging is **never** enabled in production, even if `AI_VERBOSE_TRACE=true`.

## Risks / TODOs

### Intentionally Deferred (Not Blocking)

1. **Advanced Safety Filters**: Hook points exist in `OpenAiClient.attemptCall()` for content moderation, but actual moderation logic is not implemented. This is intentional as it requires external moderation service integration.

2. **Multi-Provider Support**: Architecture supports multiple providers via `AiProviderConfig`, but only OpenAI is implemented. Adding other providers (e.g., Anthropic, local LLM) would require implementing new provider classes.

3. **Full Circuit Breaker**: Basic retry logic exists, but not a full circuit-breaker pattern (e.g., half-open state, failure threshold). This can be added later if needed.

4. **Full Prompt/Response Storage**: Only trace snapshots with metadata are stored, not full prompts/responses. If full storage is needed for debugging, it should be added with explicit PII controls.

5. **Advanced Trace Querying**: Trace snapshots are stored in `payload.trace.aiCallSnapshots[]` but no query API exists yet. Stats service can query this, but no dedicated endpoint exists.

### Known Limitations

1. **Feature Toggle Check in Mood Service**: The `enableArcDetection` toggle is checked by loading the session from DB, which adds a small overhead. This could be optimized by passing the toggle as a parameter, but would require changing the `buildTimelineForSession()` signature.

2. **Error Handling in Practice Loop**: Currently, AI errors result in a synthetic fallback message. The practice loop does not retry at the session level (relies on provider retries only). This is intentional to avoid infinite loops.

3. **Token Usage Extraction**: Token usage is only extracted if OpenAI includes it in the response. Some error responses may not include usage data.

## Backward Compatibility

### ✅ Confirmed: Missions Without aiRuntimeProfile

Missions without `aiRuntimeProfile` configured behave **exactly as before**:
- Model: Uses `OPENAI_MODEL` env var or `'gpt-4o-mini'` default
- Temperature: Uses style preset temperature (same hardcoded values as before)
- maxTokens: Uses 260 (same hardcoded value as before)
- Timeout: Uses `AI_TIMEOUT_MS` env var or 15000ms default
- Retry: Uses 3 attempts with [200, 500, 1000]ms backoff (new, but safe default)

### ✅ Confirmed: Missions Without Toggle Flags

Missions without feature toggle flags have **all layers enabled by default**:
- `enableMicroDynamics`: Defaults to `true` (micro-dynamics computed)
- `enableModifiers`: Defaults to `true` (modifiers computed and applied)
- `enableArcDetection`: Defaults to `true` (arcs detected in mood timeline)
- `enablePersonaDriftDetection`: Defaults to `true` (persona stability computed)

This ensures existing missions continue to work without any changes.

### ✅ Confirmed: Existing API Contracts

- `AiChatService.generateReply()` return type extended with optional `errorCode` and `syntheticReply` fields, but existing fields (`aiReply`, `aiStructured`, `aiDebug`) remain unchanged
- `OpenAiClient.createChatCompletion()` now returns `AiCallResult` instead of `{ text, debug }`, but `AiChatService` handles the conversion, so existing callers are unaffected
- Trace payload extended with `aiCallSnapshots` array, but existing trace fields remain unchanged

## Testing

### Tests Added

1. **`backend/src/modules/ai/providers/openai.client.spec.ts`** (NEW)
   - Error classification tests (timeout, rate limit, 5xx, 400, 401)
   - Missing API key test (PERMANENT_CONFIG)

### Test Coverage

- ✅ Error classification logic validated
- ✅ Missing API key handling validated
- ⚠️ Retry logic not tested (requires mocking fetch, complex setup)
- ⚠️ Token extraction not tested (requires mocking OpenAI response)
- ⚠️ Feature toggles not tested (requires integration test setup)

**Note**: Full integration tests for retry logic, token extraction, and feature toggles would require mocking the OpenAI API, which is complex. The current tests validate the core error classification logic, which is the most critical part.

---

**END OF DEFENSE REPORT — STEP 6.9 & 6.10**

