# Step 6.0-6.2 Foundation Audit Report
## Comprehensive Review of AI Engine Foundation Components

**Date:** 2025-01-XX  
**Scope:** Step 6.0 (Schema & Registries), Step 6.1 (Dynamics Integration), Step 6.2 (Difficulty Integration)  
**Objective:** Verify foundational components align with desired contract, dynamics, and difficulty profiles

---

## Executive Summary

### Status Overview
- ✅ **Schema Validation (6.0)**: Partially Complete - Core schema exists but missing advanced fields
- ❌ **Centralized Registries (6.0)**: **NOT IMPLEMENTED** - No registries found
- ⚠️ **Dynamics Integration (6.1)**: **INCOMPLETE** - Minimal fields only, missing Step 6.1 requirements
- ⚠️ **Difficulty Integration (6.2)**: **INCOMPLETE** - Basic fields only, missing Step 6.2 requirements
- ❌ **Glue Between Layers**: **MISSING** - Prompt builder and scoring don't use dynamics/difficulty
- ❌ **Telemetry Traces**: **NOT IMPLEMENTED** - No trace skeletons found

### Critical Gaps
1. **No centralized registries** for dynamics, difficulty, or objective profiles
2. **Dynamics schema incomplete** - missing pace, emojiDensity, flirtiveness, hostility, dryness, vulnerability, escalationSpeed, randomness
3. **Difficulty schema incomplete** - missing strictness, ambiguityTolerance, emotionalPenalty, bonusForCleverness, failThreshold, recoveryDifficulty
4. **Prompt builder doesn't inject dynamics/difficulty** - only uses aiStyle
5. **Scoring engine doesn't reference contract** - hard-coded logic remains
6. **No telemetry traces** for dynamicsUsage, difficultyInfluence, styleInfluence

---

## 1. Schema Validation (6.0)

### 1.1 MissionConfigV1 Schema Status

**Location:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts`

**Current Structure:**
```typescript
export interface MissionConfigV1 {
  version: 1;
  dynamics: MissionConfigV1Dynamics;      // ⚠️ INCOMPLETE
  objective: MissionConfigV1Objective;      // ✅ COMPLETE
  difficulty: MissionConfigV1Difficulty;   // ⚠️ INCOMPLETE
  style: MissionConfigV1Style;             // ✅ COMPLETE
  statePolicy: MissionConfigV1StatePolicy; // ✅ COMPLETE
}
```

**Findings:**

#### ✅ Present Fields
- `version: 1` - Correct
- `aiStyleKey` - Present in `style.aiStyleKey`
- `objectives` - Present as `objective` (singular, but contains kind/userTitle/userDescription)
- `metadata` - Not explicitly present, but statePolicy contains metadata-like fields

#### ⚠️ Missing/Incomplete Fields

**Dynamics (MissionConfigV1Dynamics):**
- ✅ `mode: MissionMode` (CHAT | REAL_LIFE)
- ✅ `locationTag: MissionLocationTag`
- ✅ `hasPerMessageTimer: boolean`
- ✅ `defaultEntryRoute: 'TEXT_CHAT' | 'VOICE_SIM'`
- ❌ **MISSING:** `pace` (0-100)
- ❌ **MISSING:** `emojiDensity` (0-100)
- ❌ **MISSING:** `flirtiveness` (0-100)
- ❌ **MISSING:** `hostility` (0-100)
- ❌ **MISSING:** `dryness` (0-100)
- ❌ **MISSING:** `vulnerability` (0-100)
- ❌ **MISSING:** `escalationSpeed` (0-100)
- ❌ **MISSING:** `randomness` (0-100)

**Current Dynamics Schema:**
```147:154:backend/src/modules/missions-admin/mission-config-v1.schema.ts
export interface MissionConfigV1Dynamics {
  mode: MissionMode; // CHAT vs REAL_LIFE
  locationTag: MissionLocationTag;
  hasPerMessageTimer: boolean; // whether a timer is active at all
  defaultEntryRoute: 'TEXT_CHAT' | 'VOICE_SIM';
  // reserved for future tuning:
  // responsiveness, cooperation, questionFrequency, etc.
}
```

**Difficulty (MissionConfigV1Difficulty):**
- ✅ `level: MissionDifficulty` (EASY | MEDIUM | HARD | ELITE)
- ✅ `recommendedMaxMessages?: number | null`
- ✅ `recommendedSuccessScore?: number | null` (0-100)
- ✅ `recommendedFailScore?: number | null` (0-100)
- ❌ **MISSING:** `strictness` (0-100)
- ❌ **MISSING:** `ambiguityTolerance` (0-100)
- ❌ **MISSING:** `emotionalPenalty` (0-100)
- ❌ **MISSING:** `bonusForCleverness` (0-100)
- ❌ **MISSING:** `failThreshold` (0-100) - Note: exists in statePolicy but not in difficulty
- ❌ **MISSING:** `recoveryDifficulty` (0-100)

**Current Difficulty Schema:**
```173:178:backend/src/modules/missions-admin/mission-config-v1.schema.ts
export interface MissionConfigV1Difficulty {
  level: MissionDifficulty; // from @prisma/client
  recommendedMaxMessages?: number | null;
  recommendedSuccessScore?: number | null; // 0–100
  recommendedFailScore?: number | null; // 0–100
}
```

### 1.2 Validation Status

**Location:** `backend/src/modules/missions-admin/mission-config-v1.schema.ts:299-750`

**Status:** ✅ **VALIDATION EXISTS**
- Validates all present fields
- Checks for unknown keys
- Validates enums and types
- Returns structured error messages

**Gap:** Validation only covers present fields. When new fields are added, validation must be updated.

### 1.3 Database Storage

**Status:** ✅ **STORED IN DATABASE**
- Stored in `PracticeMissionTemplate.aiContract` (Json field)
- Normalized before save in `missions-admin.service.ts:453`
- Runtime normalization in `mission-config-runtime.ts:61`

**Evidence:**
```452:479:backend/src/modules/missions-admin/missions-admin.service.ts
    // ✅ STEP 4.1: Normalize missionConfigV1 before save
    const normalizeResult = normalizeMissionConfigV1(aiContract);
    if (!normalizeResult.ok) {
      const failedResult = normalizeResult as { ok: false; reason: string; errors?: any[] };
      throw new BadRequestException({
        code: 'MISSION_TEMPLATE_INVALID_CONFIG',
        message:
          failedResult.reason === 'missing'
            ? 'Mission template is missing missionConfigV1'
            : failedResult.reason === 'invalid'
              ? 'Mission template aiContract is invalid'
              : 'Mission template aiContract is not a valid object',
        details: failedResult.errors ?? [],
      });
    }

    // Extract normalized config (without endReasonPrecedenceResolved which is runtime-only)
    const normalizedConfig = normalizeResult.value;
    const normalizedAiContract = {
      missionConfigV1: {
        version: normalizedConfig.version,
        dynamics: normalizedConfig.dynamics,
        objective: normalizedConfig.objective,
        difficulty: normalizedConfig.difficulty,
        style: normalizedConfig.style,
        statePolicy: normalizedConfig.statePolicy,
      },
    };
```

---

## 2. Centralized Registries (6.0)

### 2.1 Registry Status

**Search Results:** ❌ **NO REGISTRIES FOUND**

Searched for:
- `AI_STYLE_REGISTRY`
- `AI_DIFFICULTY_PROFILES`
- `AI_DYNAMICS_PROFILES`
- `AI_OBJECTIVE_PROFILES`

**Result:** No matches found in codebase.

### 2.2 Current State

**AI Styles:**
- ✅ Stored in database (`AiStyle` model)
- ✅ Accessed via `missions-admin.service.ts:getMeta()` which returns `aiStyles` array
- ❌ **NOT a centralized registry** - fetched from DB each time
- ✅ Validation exists for `aiStyleKey` enum values

**Evidence:**
```186:214:backend/src/modules/missions-admin/missions-admin.service.ts
  async getMeta() {
    const [categories, personas, aiStyles] = await Promise.all([
      this.prisma.missionCategory.findMany({ orderBy: [{ label: 'asc' }] }),
      this.prisma.aiPersona.findMany({ orderBy: [{ name: 'asc' }] }),
      this.prisma.aiStyle.findMany({
        where: { isActive: true },
        orderBy: [{ name: 'asc' }],
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          isActive: true,
        },
      }),
    ]);

    // Keep backward-compat for dashboards that expect enums.aiStyles
    return {
      ok: true,
      categories,
      personas,
      aiStyles, // ✅ DB-synced dropdown data
      enums: {
        difficulties: Object.values(MissionDifficulty),
        goalTypes: Object.values(MissionGoalType),
        aiStyles: aiStyles.map((s) => s.key), // ✅ compat: list of keys
        aiStyleKeys: Object.values(AiStyleKey), // ✅ useful for debugging
      },
    };
  }
```

**Dynamics Profiles:**
- ❌ **NOT IMPLEMENTED** - No registry exists
- Current dynamics are minimal and hard-coded in schema

**Difficulty Profiles:**
- ❌ **NOT IMPLEMENTED** - No registry exists
- Difficulty logic is hard-coded in `practice.service.ts:94-107`

**Evidence:**
```94:107:backend/src/modules/practice/practice.service.ts
function basePolicyForDifficulty(d: MissionDifficulty): BasePolicy {
  switch (d) {
    case MissionDifficulty.EASY:
      return { maxMessages: 3, successScore: 70, failScore: 50 };
    case MissionDifficulty.MEDIUM:
      return { maxMessages: 4, successScore: 78, failScore: 55 };
    case MissionDifficulty.HARD:
      return { maxMessages: 5, successScore: 86, failScore: 60 };
    case MissionDifficulty.ELITE:
      return { maxMessages: 5, successScore: 92, failScore: 65 };
    default:
      return { maxMessages: 5, successScore: 80, failScore: 60 };
  }
}
```

**Objective Profiles:**
- ❌ **NOT IMPLEMENTED** - No registry exists
- Objectives are enum-based (`MissionObjectiveKind`) but no profile system

### 2.3 Required Registries

**Missing Registries:**

1. **AI_DYNAMICS_PROFILES**
   - Should contain profiles like: `FAST_PACED`, `SLOW_BUILD`, `HIGH_FLIRT`, `LOW_FLIRT`, `DRY_HUMOR`, `WARM_VULNERABLE`, etc.
   - Each profile should define: pace, emojiDensity, flirtiveness, hostility, dryness, vulnerability, escalationSpeed, randomness

2. **AI_DIFFICULTY_PROFILES**
   - Should contain profiles like: `LENIENT`, `STRICT`, `BALANCED`, `HARSH`, etc.
   - Each profile should define: strictness, ambiguityTolerance, emotionalPenalty, bonusForCleverness, failThreshold, recoveryDifficulty

3. **AI_OBJECTIVE_PROFILES**
   - Should map `MissionObjectiveKind` to objective-specific rules and success criteria
   - Currently objectives only have `kind`, `userTitle`, `userDescription`

---

## 3. Dynamics Integration (6.1)

### 3.1 Current Dynamics Schema

**Status:** ⚠️ **INCOMPLETE**

Current fields:
- `mode` (CHAT | REAL_LIFE)
- `locationTag` (BAR | CLUB | CAFE | etc.)
- `hasPerMessageTimer` (boolean)
- `defaultEntryRoute` (TEXT_CHAT | VOICE_SIM)

**Missing Step 6.1 Fields:**
- `pace` (0-100) - Controls response speed and urgency
- `emojiDensity` (0-100) - Controls emoji usage frequency
- `flirtiveness` (0-100) - Controls flirtatious behavior level
- `hostility` (0-100) - Controls pushback/resistance level
- `dryness` (0-100) - Controls humor style (dry vs warm)
- `vulnerability` (0-100) - Controls openness and emotional depth
- `escalationSpeed` (0-100) - Controls how quickly conversation escalates
- `randomness` (0-100) - Controls unpredictability in responses

### 3.2 Dynamics Usage in Codebase

**Search Results:** ❌ **NOT USED**

**Prompt Builder (`ai-chat.service.ts`):**
- Does NOT extract or use dynamics from `aiContract`
- Only uses `aiStyle` for tone
- Dynamics fields are not injected into system prompt

**Evidence:**
```205:295:backend/src/modules/ai/providers/ai-chat.service.ts
  private buildSystemPrompt(params: {
    topic: string;
    mission:
      | {
          id: string;
          code: string;
          title: string;
          description: string | null;
          aiStyle: AiStyle | null;
        }
      | null;
    category: { id: string; code: string; label: string } | null;
    persona:
      | {
          id: string;
          code: string;
          name: string;
          description?: string | null;
          style?: string | null;
        }
      | null;
    aiStyle: AiStyle | null;
    aiContract: Record<string, any> | null;
    wantsJson: boolean;
  }): string {
    const { topic, mission, category, persona, aiStyle, aiContract, wantsJson } = params;

    const preset = stylePreset(aiStyle);
    const aiStyleKey = aiStyle?.key ?? null;

    const contractJson = aiContract != null ? safeJson(aiContract, 7000) : null;

    // ... rest of prompt building - NO dynamics extraction
```

**Meta Engine (Punctuation/Sentence Structure):**
- ❌ **NOT IMPLEMENTED** - No code found that manipulates punctuation or sentence structure based on dynamics

**Persona Rules:**
- ❌ **NOT LINKED** - No code found that links dynamics to persona behavior

### 3.3 Hard-Coded Behavior

**Found in:**
- `ai-chat.service.ts:23-77` - `stylePreset()` function has hard-coded tone rules
- No dynamics-based behavior modification

**Example:**
```23:77:backend/src/modules/ai/providers/ai-chat.service.ts
function stylePreset(aiStyle: AiStyle | null | undefined) {
  const key = aiStyle?.key ?? AiStyleKey.NEUTRAL;

  // Tone constraints (must never violate aiContract rules).
  // Keep these short & enforceable.
  switch (key) {
    case AiStyleKey.FLIRTY:
      return {
        label: 'FLIRTY',
        temperature: 0.78,
        rules: [
          `Tone: flirty, intriguing, warm.`,
          `Use light teasing + playful curiosity.`,
          `Keep it PG-13. No explicit sexual content.`,
          `Avoid over-complimenting; keep it natural and confident.`,
        ],
      };
    // ... more hard-coded cases
  }
}
```

**Gap:** This should be driven by dynamics (flirtiveness, pace, etc.) rather than hard-coded style presets.

---

## 4. Difficulty Integration (6.2)

### 4.1 Current Difficulty Schema

**Status:** ⚠️ **INCOMPLETE**

Current fields:
- `level` (EASY | MEDIUM | HARD | ELITE)
- `recommendedMaxMessages` (optional)
- `recommendedSuccessScore` (optional, 0-100)
- `recommendedFailScore` (optional, 0-100)

**Missing Step 6.2 Fields:**
- `strictness` (0-100) - How strictly to grade responses
- `ambiguityTolerance` (0-100) - How much ambiguity is acceptable
- `emotionalPenalty` (0-100) - Penalty for emotional missteps
- `bonusForCleverness` (0-100) - Bonus for clever/witty responses
- `failThreshold` (0-100) - Score below which mission fails (exists in statePolicy but not difficulty)
- `recoveryDifficulty` (0-100) - How hard it is to recover from mistakes

### 4.2 Difficulty Usage in Codebase

**Scoring Engine:**
- ❌ **NOT USING CONTRACT** - Scoring services don't reference `session.aiContract.difficulty`
- Hard-coded difficulty logic in `practice.service.ts:94-107`

**Evidence:**
```94:107:backend/src/modules/practice/practice.service.ts
function basePolicyForDifficulty(d: MissionDifficulty): BasePolicy {
  switch (d) {
    case MissionDifficulty.EASY:
      return { maxMessages: 3, successScore: 70, failScore: 50 };
    case MissionDifficulty.MEDIUM:
      return { maxMessages: 4, successScore: 78, failScore: 55 };
    case MissionDifficulty.HARD:
      return { maxMessages: 5, successScore: 86, failScore: 60 };
    case MissionDifficulty.ELITE:
      return { maxMessages: 5, successScore: 92, failScore: 65 };
    default:
      return { maxMessages: 5, successScore: 80, failScore: 60 };
  }
}
```

**Gating System:**
- Uses `statePolicy` thresholds but not difficulty-specific strictness
- No ambiguity tolerance checks
- No emotional penalty system
- No cleverness bonus system

**Mission Mood System:**
- Uses hard-coded thresholds
- Does not reference difficulty profile

**Scoring Services:**
- `ai-scoring.service.ts` - No reference to difficulty
- `ai-core-scoring.service.ts` - No reference to difficulty

**Evidence:**
```46:76:backend/src/modules/ai/ai-scoring.service.ts
@Injectable()
export class AiScoringService {
  /**
   * Main entry point for the rest of the backend.
   *
   * - Picks mode (FREE / PREMIUM) based on user tier.
   * - Produces per-message scores.
   * - If PREMIUM → also produces a deep session analysis.
   */
  async scoreSession(
    userTier: AccountTier,
    messages: PracticeMessageInput[],
  ): Promise<AiScoringResult> {
    const mode: AiMode =
      userTier === AccountTier.PREMIUM ? 'PREMIUM' : 'FREE';

    const perMessage = messages.map((msg, index) =>
      this.buildBaseScore(msg, index),
    );

    let premiumSessionAnalysis: AiSessionAnalysisPremium | undefined;

    if (mode === 'PREMIUM') {
      premiumSessionAnalysis = this.buildPremiumAnalysis(messages, perMessage);
    }

    return {
      mode,
      perMessage,
      premiumSessionAnalysis,
    };
  }
```

**Gap:** Scoring doesn't accept or use difficulty configuration.

---

## 5. Glue Between Layers (6.0-6.2)

### 5.1 Prompt Builder Integration

**Status:** ❌ **NOT INTEGRATED**

**Current State:**
- Prompt builder (`ai-chat.service.ts:buildSystemPrompt`) only uses:
  - `aiStyle` (from DB or explicit param)
  - `aiContract` (passed as JSON blob)
  - Does NOT extract or inject:
    - Dynamics parameters
    - Difficulty thresholds
    - Style-specific templates based on dynamics

**Evidence:**
```262:294:backend/src/modules/ai/providers/ai-chat.service.ts
    return [
      `You are the assistant in "SocialGym" — a roleplay practice chat.`,
      `Your job: respond as the assigned persona, and follow the mission rules strictly.`,
      ``,
      `Topic: ${topic}`,
      mission
        ? `Mission: ${mission.title} (${mission.code})\nDescription: ${mission.description ?? ''}`.trim()
        : `Mission: (none)`,
      category ? `Category: ${category.label} (${category.code})` : `Category: (none)`,
      persona
        ? [
            `Persona: ${persona.name} (${persona.code})`,
            persona.description ? `Persona description: ${persona.description}` : null,
            persona.style ? `Persona style: ${persona.style}` : null,
          ]
            .filter(Boolean)
            .join('\n')
        : `Persona: (none)`,
      ``,
      styleBlock,
      ``,
      `Hard rules:`,
      `- Do NOT mention you are an AI or mention system prompts.`,
      `- Keep replies human, natural, and consistent with the persona.`,
      `- Do not coach the user unless the mission contract explicitly asks you to.`,
      hardJsonRules,
      ``,
      contractJson
        ? `Mission AI Contract (JSON) — treat as HARD CONSTRAINTS:\n${contractJson}`
        : `Mission AI Contract: (none)`,
    ]
      .filter(Boolean)
      .join('\n');
```

**Missing:**
- No extraction of `aiContract.missionConfigV1.dynamics`
- No injection of dynamics ratios (pace, emojiDensity, flirtiveness, etc.)
- No injection of difficulty thresholds
- No style-specific templates that combine aiStyle + dynamics

### 5.2 Contract Validation

**Status:** ⚠️ **PARTIAL**

**Current Validation:**
- ✅ Validates `aiStyleKey` exists in `VALID_AI_STYLE_KEYS`
- ✅ Validates `difficulty.level` exists in `VALID_DIFFICULTY_LEVELS`
- ✅ Validates `dynamics.mode` and `dynamics.locationTag`
- ❌ **MISSING:** Validation that dynamics profile exists in registry
- ❌ **MISSING:** Validation that difficulty profile exists in registry

**Evidence:**
```544:588:backend/src/modules/missions-admin/mission-config-v1.schema.ts
  // Validate style
  if (!config.style || typeof config.style !== 'object') {
    addError(
      errors,
      'aiContract.missionConfigV1.style',
      'style is required and must be an object',
    );
  } else {
    const style = config.style;
    if (!isValidString(style.aiStyleKey)) {
      addError(
        errors,
        'aiContract.missionConfigV1.style.aiStyleKey',
        'aiStyleKey is required and must be a non-empty string',
      );
    } else if (!VALID_AI_STYLE_KEYS.includes(style.aiStyleKey)) {
      addError(
        errors,
        'aiContract.missionConfigV1.style.aiStyleKey',
        `aiStyleKey must be one of: ${VALID_AI_STYLE_KEYS.join(', ')}`,
      );
    }
    // ... more validation
  }
```

**Gap:** No registry lookup validation for dynamics/difficulty profiles.

### 5.3 Single Source of Truth

**Status:** ❌ **NOT ACHIEVED**

**Scoring:**
- ❌ Does NOT reference `session.aiContract.dynamics`
- ❌ Does NOT reference `session.aiContract.difficulty`
- ❌ Does NOT reference `session.aiContract.aiStyle`
- ✅ Uses hard-coded logic instead

**Evidence:**
- `ai-scoring.service.ts` - No contract reference
- `ai-core-scoring.service.ts` - No contract reference
- `practice.service.ts` - Uses hard-coded `basePolicyForDifficulty()`

**Gating:**
- Uses `statePolicy` from normalized config (good)
- But doesn't use difficulty profile for strictness/ambiguity

**Mission Mood:**
- Uses hard-coded thresholds
- Doesn't reference difficulty profile

---

## 6. Telemetry & Persona Memory (Future Integration)

### 6.1 Trace Skeletons

**Status:** ❌ **NOT IMPLEMENTED**

**Search Results:** No trace structures found for:
- `trace.dynamicsUsage`
- `trace.difficultyInfluence`
- `trace.styleInfluence`

**Current Trace Structures:**
- `SessionEndReadModel` has `missionMetadata` but no trace fields
- No session-level trace object found

**Evidence:**
```84:91:backend/src/modules/shared/types/session-end-read-model.types.ts
  // Step 5.14: Mission metadata
  missionMetadata: {
    style: string | null;
    objectiveKey: string | null;
    objectiveType: string | null;
    dynamicType: string | null;
    locationTag: string | null;
  };
```

**Gap:** No trace structure to track how dynamics/difficulty/style influenced the session.

### 6.2 Persona Memory Integration

**Status:** ⚠️ **PARTIAL**

**Current State:**
- ✅ `PersonaMemory` model exists in schema
- ✅ `SessionEndReadModel` has `personaMemory` field
- ❌ **MISSING:** References to `aiStyleKey` in memory
- ❌ **MISSING:** Dynamics affecting memory weight (e.g., escalationSpeed)

**Evidence:**
```74:82:backend/src/modules/shared/types/session-end-read-model.types.ts
  // Step 5.14: Persona memory
  personaMemory: {
    memorySnapshot: Record<string, any> | null;
    memoryWritesDuringSession: Array<{
      memoryKey: string;
      memoryValue: any;
      writtenAt: string;
    }>;
  };
```

**Gap:** Memory system doesn't track style/dynamics influence on memory weight.

---

## 7. Code Structure and Changes (High-Level Plan)

### 7.1 Step 1: Normalize Schema, Fix DTO Mismatches

**Current State:**
- ✅ Schema exists and is validated
- ✅ DTO validation exists (`CreateMissionDto`)
- ⚠️ Schema incomplete (missing dynamics/difficulty fields)

**Required Changes:**
1. Extend `MissionConfigV1Dynamics` with Step 6.1 fields
2. Extend `MissionConfigV1Difficulty` with Step 6.2 fields
3. Update validation to check new fields
4. Update normalization to handle new fields
5. Update DTOs if needed

### 7.2 Step 2: Extract and Normalize Dynamics

**Current State:**
- ❌ No dynamics registry
- ❌ No dynamics profiles
- ❌ Prompt builder doesn't use dynamics
- ❌ No meta engine for dynamics

**Required Changes:**
1. Create `AI_DYNAMICS_PROFILES` registry
2. Create dynamics profile definitions
3. Update prompt builder to extract and inject dynamics
4. Create meta engine to manipulate punctuation/sentence structure based on dynamics
5. Remove hard-coded behavior from personas

### 7.3 Step 3: Extract and Normalize Difficulty

**Current State:**
- ❌ No difficulty registry
- ❌ No difficulty profiles
- ❌ Scoring doesn't use difficulty
- ❌ Hard-coded difficulty logic

**Required Changes:**
1. Create `AI_DIFFICULTY_PROFILES` registry
2. Create difficulty profile definitions
3. Update scoring engine to accept and use difficulty config
4. Update gating to use difficulty strictness/ambiguity
5. Update mission mood to use difficulty thresholds
6. Remove hard-coded `basePolicyForDifficulty()`

---

## 8. Test Plans

### 8.1 Mission Creation Tests

**Status:** ⚠️ **PARTIAL COVERAGE**

**Current Tests:**
- ✅ Validation tests exist (implicit via validation function)
- ❌ No explicit tests for three difficulty levels
- ❌ No explicit tests for three dynamics profiles

**Required Tests:**
1. Create mission with EASY difficulty + FAST_PACED dynamics
2. Create mission with MEDIUM difficulty + SLOW_BUILD dynamics
3. Create mission with HARD difficulty + HIGH_FLIRT dynamics
4. Verify all fields are saved correctly
5. Verify validation rejects invalid profiles

### 8.2 Prompt Preview Tests

**Status:** ❌ **NOT IMPLEMENTED**

**Required Tests:**
1. Test prompt preview with different dynamics profiles
2. Verify dynamics influence writing style (pace, emoji density, etc.)
3. Verify difficulty affects grading instructions in prompt
4. Verify style + dynamics combine correctly

### 8.3 Mission Simulation Tests

**Status:** ❌ **NOT IMPLEMENTED**

**Required Tests:**
1. Simulate mission with HIGH_FLIRT dynamics → verify flirty responses
2. Simulate mission with STRICT difficulty → verify stricter grading
3. Simulate mission with LENIENT difficulty → verify more forgiving grading
4. Verify dynamics impact writing style (punctuation, sentence length, etc.)
5. Verify difficulty affects score thresholds

---

## 9. Critical Action Items

### Priority 1: Foundation (Blocking)

1. **Extend Dynamics Schema** (Step 6.1)
   - Add: pace, emojiDensity, flirtiveness, hostility, dryness, vulnerability, escalationSpeed, randomness
   - Update validation
   - Update normalization

2. **Extend Difficulty Schema** (Step 6.2)
   - Add: strictness, ambiguityTolerance, emotionalPenalty, bonusForCleverness, failThreshold, recoveryDifficulty
   - Update validation
   - Update normalization

3. **Create Centralized Registries** (Step 6.0)
   - `AI_DYNAMICS_PROFILES` registry
   - `AI_DIFFICULTY_PROFILES` registry
   - `AI_OBJECTIVE_PROFILES` registry (optional but recommended)

### Priority 2: Integration (High Impact)

4. **Update Prompt Builder** (Step 6.1)
   - Extract dynamics from `aiContract.missionConfigV1.dynamics`
   - Inject dynamics ratios into system prompt
   - Combine aiStyle + dynamics in prompt instructions

5. **Update Scoring Engine** (Step 6.2)
   - Accept difficulty config as parameter
   - Use strictness for grading strictness
   - Use ambiguityTolerance for grading leniency
   - Use emotionalPenalty and bonusForCleverness in scoring

6. **Create Meta Engine** (Step 6.1)
   - Manipulate punctuation based on dynamics (pace, dryness)
   - Manipulate sentence structure based on dynamics (escalationSpeed)
   - Remove hard-coded persona behavior

### Priority 3: Telemetry (Future)

7. **Add Trace Skeletons** (Step 6.9 Prep)
   - Add `trace.dynamicsUsage` to session payload
   - Add `trace.difficultyInfluence` to session payload
   - Add `trace.styleInfluence` to session payload

8. **Update Persona Memory** (Step 6.7 Prep)
   - Reference `aiStyleKey` in memory writes
   - Use `escalationSpeed` to affect memory weight

---

## 10. Recommendations

### Immediate Actions

1. **Complete Schema Extensions**
   - Add all Step 6.1 dynamics fields
   - Add all Step 6.2 difficulty fields
   - Update validation and normalization

2. **Create Registries**
   - Start with 3-5 dynamics profiles
   - Start with 3-5 difficulty profiles
   - Store in code (constants) initially, can move to DB later

3. **Update Prompt Builder**
   - Extract dynamics from contract
   - Inject dynamics instructions
   - Test with different profiles

4. **Update Scoring**
   - Accept difficulty config
   - Use strictness/ambiguity in grading
   - Remove hard-coded logic

### Architecture Decisions

1. **Registry Location**
   - **Recommendation:** Start with code constants, move to DB if profiles need frequent updates
   - **File:** `backend/src/modules/ai-engine/registries/`

2. **Dynamics Injection**
   - **Recommendation:** Add dynamics block to system prompt, similar to style block
   - **Format:** "DYNAMICS: pace=80, flirtiveness=60, escalationSpeed=70..."

3. **Difficulty Usage**
   - **Recommendation:** Pass difficulty config to scoring service
   - **Format:** `scoreSession(messages, difficultyConfig)`

4. **Backward Compatibility**
   - **Recommendation:** Default values for missing dynamics/difficulty fields
   - **Migration:** Existing missions get default profiles

---

## 11. Conclusion

### Current State Summary

- ✅ **Schema Foundation:** Exists but incomplete
- ❌ **Registries:** Not implemented
- ⚠️ **Dynamics Integration:** Minimal, missing Step 6.1 fields
- ⚠️ **Difficulty Integration:** Basic, missing Step 6.2 fields
- ❌ **Glue Between Layers:** Not connected
- ❌ **Telemetry:** Not implemented

### Readiness for Step 6.3-6.10

**Status:** ⚠️ **NOT READY**

**Blockers:**
1. Incomplete schemas (dynamics + difficulty)
2. Missing registries
3. No prompt builder integration
4. No scoring integration
5. Hard-coded logic still present

**Estimated Effort:**
- Schema extensions: 2-4 hours
- Registry creation: 4-6 hours
- Prompt builder integration: 4-6 hours
- Scoring integration: 6-8 hours
- Testing: 4-6 hours
- **Total: 20-30 hours**

### Next Steps

1. Complete schema extensions (Priority 1)
2. Create registries (Priority 1)
3. Integrate into prompt builder (Priority 2)
4. Integrate into scoring (Priority 2)
5. Add telemetry skeletons (Priority 3)
6. Write tests (Priority 2)

---

**End of Report**

