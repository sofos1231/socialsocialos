# SCOUT REPORT — Wave 4 Closure Audit

**Mode:** SCOUT (READ-ONLY)  
**Date:** 2025-01-27  
**Goal:** Verify async call sites + runtime coverage for Wave 4.1 changes

---

## METHODOLOGY

Searched for:
1. All call sites of `evaluateGatesForActiveSession()`
2. All call sites of `computePersonaStability()`
3. Direct reads of `gateConfigs`, `scoringProfile`, `personaConfig` that bypass `ensureFresh()`

---

## FINDINGS

### 1. `evaluateGatesForActiveSession()` Call Sites

**Definition:**
- `backend/src/modules/gates/gates.service.ts:138` - Now `async`, has `ensureFresh()` guard

**Runtime Call Sites:**
- **NONE FOUND** - No actual runtime call sites found in production code
- Only found in test mocks:
  - `backend/src/modules/practice/practice.service.qa.spec.ts:95` - Mock definition
  - `backend/src/modules/practice/practice.service.scenarios.spec.ts:89` - Mock definition

**Verdict:** ✅ **SAFE** - Method is not called in runtime, only mocked in tests. If it were called, it would be awaited (method signature is `async`).

---

### 2. `computePersonaStability()` Call Sites

**Definition:**
- `backend/src/modules/ai-engine/persona-drift.service.ts:73` - Now `async`, has `ensureFresh()` guard

**Runtime Call Sites:**
- **NONE FOUND** - No actual runtime call sites found in production code
- Only found in test files:
  - `backend/src/modules/ai-engine/persona-drift.service.spec.ts:35` - **NOT AWAITED** ❌
  - `backend/src/modules/ai-engine/persona-drift.service.spec.ts:55` - **NOT AWAITED** ❌
  - `backend/src/modules/ai-engine/persona-drift.service.spec.ts:83` - **NOT AWAITED** ❌
  - `backend/src/modules/ai-engine/persona-drift.service.spec.ts:84` - **NOT AWAITED** ❌
  - `backend/src/modules/ai-engine/persona-drift.service.spec.ts:104` - **NOT AWAITED** ❌
  - `backend/src/modules/practice/practice.service.qa.spec.ts:120` - Mock definition
  - `backend/src/modules/practice/practice.service.scenarios.spec.ts:42` - Mock definition

**Test File Issues:**
```typescript
// backend/src/modules/ai-engine/persona-drift.service.spec.ts:35
const result = service.computePersonaStability(context); // ❌ NOT AWAITED
```

**Verdict:** ⚠️ **TEST FILES NEED FIXING** - Tests are not awaiting the now-async method. This will cause test failures. Runtime is safe (no runtime calls found).

---

### 3. Direct Cache Reads (Bypassing ensureFresh)

#### GatesService: `gateConfigs`

**Read Locations:**
- `backend/src/modules/gates/gates.service.ts:117` - `getGateThreshold()` reads `this.gateConfigs.get(key)`

**Call Chain:**
- `getGateThreshold()` is `private`
- Only called from:
  - `evaluateGatesForActiveSession()` (line 158, 187, 215) - ✅ Has `ensureFresh()` guard
  - `evaluateAndPersist()` (line 268+) - ✅ Has `ensureFresh()` guard

**Verdict:** ✅ **SAFE** - All reads go through public methods with `ensureFresh()` guards.

---

#### AiScoringService: `scoringProfile`

**Read Locations:**
- `backend/src/modules/ai/ai-scoring.service.ts:208` - `computeLengthScore()` reads `this.scoringProfile?.lengthThresholds`
- `backend/src/modules/ai/ai-scoring.service.ts:227` - `computePunctuationScore()` reads `this.scoringProfile?.punctuationBonuses`
- `backend/src/modules/ai/ai-scoring.service.ts:244` - `computePositionScore()` reads `this.scoringProfile?.positionBonuses`
- `backend/src/modules/ai/ai-scoring.service.ts:252` - `computeRarityScore()` reads `this.scoringProfile?.rarityThresholds`
- `backend/src/modules/ai/ai-scoring.service.ts:337` - `computeXpMultiplier()` reads `this.scoringProfile?.xpMultipliers`
- `backend/src/modules/ai/ai-scoring.service.ts:358` - `computeCoinsMultiplier()` reads `this.scoringProfile?.coinsMultipliers`

**Call Chain:**
- All these methods are `private`
- Only called from:
  - `scoreSession()` (line 89) - ✅ Has `ensureFresh()` guard at line 95

**Verdict:** ✅ **SAFE** - All reads go through `scoreSession()` which has `ensureFresh()` guard.

---

#### PersonaDriftService: `personaConfig`

**Read Locations:**
- `backend/src/modules/ai-engine/persona-drift.service.ts:83` - `computePersonaStability()` reads `this.personaConfig?.driftPenalties`
- `backend/src/modules/ai-engine/persona-drift.service.ts:169` - `detectModifierEvents()` reads `this.personaConfig?.modifierEvents`
- `backend/src/modules/ai-engine/persona-drift.service.ts:263` - `applyModifierEffects()` reads `this.personaConfig?.modifierEffects`
- `backend/src/modules/ai-engine/persona-drift.service.ts:267` - `applyModifierEffects()` reads `this.personaConfig?.modifierEvents`
- `backend/src/modules/ai-engine/persona-drift.service.ts:344` - `applyModifierEffects()` reads `this.personaConfig?.modifierEffects`

**Call Chain:**
- `computePersonaStability()` (line 73) - ✅ Has `ensureFresh()` guard at line 75
- `detectModifierEvents()` - Need to check if it's called from `computePersonaStability()` or separately
- `applyModifierEffects()` - Need to check if it's called from `computePersonaStability()` or separately

**Checking modifier methods:**

**Additional Public Methods Reading `personaConfig`:**
- `detectModifierEvents()` (line 164) - **NO `ensureFresh()` guard** ❌
- `updateModifiersFromEvents()` (line 247) - **NO `ensureFresh()` guard** ❌
- `applyModifiersToState()` (line 328) - **NO `ensureFresh()` guard** ❌

**Call Sites:**
- Only found in test files (mocks and test calls)
- No runtime call sites found in production code

**Verdict:** ⚠️ **POTENTIAL RISK** - These public methods can read stale `personaConfig` if called directly. However, they're not currently used in runtime. If they become used, they need `ensureFresh()` guards.

---

## SUMMARY TABLE

| Method | Runtime Calls | Awaited? | Test Calls | Test Awaited? | Direct Cache Reads | Cache Guarded? |
|--------|---------------|----------|-----------|---------------|-------------------|----------------|
| `evaluateGatesForActiveSession()` | 0 | N/A | 0 (mocks only) | N/A | `gateConfigs` via `getGateThreshold()` | ✅ Yes (via public method) |
| `computePersonaStability()` | 0 | N/A | 5 | ❌ No | `personaConfig` | ✅ Yes (in method) |
| `detectModifierEvents()` | 0 | N/A | 3 | N/A | `personaConfig` | ❌ No |
| `updateModifiersFromEvents()` | 0 | N/A | 5 | N/A | `personaConfig` | ❌ No |
| `applyModifiersToState()` | 0 | N/A | 0 | N/A | `personaConfig` | ❌ No |
| `scoreSession()` | Multiple | ✅ Yes | N/A | N/A | `scoringProfile` | ✅ Yes (in method) |
| `evaluateAndPersist()` | Multiple | ✅ Yes | N/A | N/A | `gateConfigs` via `getGateThreshold()` | ✅ Yes (in method) |

---

## VERDICT

### ❌ NOT SAFE

**Issues Found:**

1. **Test Files Not Updated (5 locations):**
   - `backend/src/modules/ai-engine/persona-drift.service.spec.ts:35` - `computePersonaStability()` not awaited
   - `backend/src/modules/ai-engine/persona-drift.service.spec.ts:55` - `computePersonaStability()` not awaited
   - `backend/src/modules/ai-engine/persona-drift.service.spec.ts:83` - `computePersonaStability()` not awaited
   - `backend/src/modules/ai-engine/persona-drift.service.spec.ts:84` - `computePersonaStability()` not awaited
   - `backend/src/modules/ai-engine/persona-drift.service.spec.ts:104` - `computePersonaStability()` not awaited

2. **Public Methods Without Guards (3 methods):**
   - `PersonaDriftService.detectModifierEvents()` - Reads `personaConfig` without `ensureFresh()`
   - `PersonaDriftService.updateModifiersFromEvents()` - Reads `personaConfig` without `ensureFresh()`
   - `PersonaDriftService.applyModifiersToState()` - Reads `personaConfig` without `ensureFresh()`

**Note:** These 3 methods are not currently called in runtime, but they're public and could be used in the future, creating a stale cache risk.

---

## REQUIRED FIXES

### Fix 1: Update Test Files (5 locations)

**File:** `backend/src/modules/ai-engine/persona-drift.service.spec.ts`

Change all `computePersonaStability()` calls to be awaited:

```typescript
// Line 35: Change from
const result = service.computePersonaStability(context);
// To
const result = await service.computePersonaStability(context);

// Line 55: Same change
// Line 83: Same change
// Line 84: Same change
// Line 104: Same change
```

Also ensure test functions are `async`:
```typescript
it('should detect drift...', async () => { // Add async
  const result = await service.computePersonaStability(context);
  // ...
});
```

### Fix 2: Add ensureFresh() Guards to Public Methods (3 methods)

**File:** `backend/src/modules/ai-engine/persona-drift.service.ts`

**Option A (Recommended):** Make methods async and add `ensureFresh()`:
```typescript
async detectModifierEvents(context: PersonaStabilityContext): Promise<ModifierEvent[]> {
  await this.ensureFresh();
  // ... rest of method
}

async updateModifiersFromEvents(...): Promise<ActiveModifier[]> {
  await this.ensureFresh();
  // ... rest of method
}

async applyModifiersToState(...): Promise<{...}> {
  await this.ensureFresh();
  // ... rest of method
}
```

**Option B (If methods must stay sync):** Call `ensureFresh()` synchronously (not recommended, breaks guarantee):
```typescript
detectModifierEvents(context: PersonaStabilityContext): ModifierEvent[] {
  // Fire-and-forget refresh (not ideal)
  this.ensureFresh().catch(() => {});
  // ... rest of method
}
```

**Recommendation:** Use Option A. If callers exist, update them to await. If no callers exist (current state), Option A is safe.

---

## END OF REPORT
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
grep
