# Step 6.3-6.5 Scout Report
## Openings Layer, Response Architecture, and Scoring ↔ Mission State Glue

**Date:** 2025-01-XX  
**Scope:** Steps 6.3 (Openings), 6.4 (Response Architecture), 6.5 (Scoring ↔ Mission State Glue)  
**Objective:** Assess current state and identify implementation requirements

---

## Executive Summary

### Current State Overview
- ⚠️ **Openings Layer (6.3)**: **NOT IMPLEMENTED** - No opening templates, no first-message generation logic
- ⚠️ **Response Architecture (6.4)**: **NOT IMPLEMENTED** - No response processing architecture
- ⚠️ **Mission State Glue (6.5)**: **PARTIAL** - Basic mood exists but not integrated with scoring or prompt builder
- ✅ **Foundation**: Schema extensions from 6.0-6.2 are in place

### Critical Gaps
1. **No opening generation system** - First messages are generic
2. **No response architecture** - No internal reasoning steps
3. **Mood system disconnected** - MoodService exists but doesn't feed into prompt builder
4. **No unified mission state** - MissionStatePayload is basic, doesn't track persona mood
5. **No scoring → mood transformation** - Scores don't influence persona behavior

---

## 1. Step 6.3 — Openings Layer Analysis

### 1.1 Current State

**What Exists:**
- ✅ Basic prompt builder in `ai-chat.service.ts`
- ✅ Style presets (FLIRTY, PLAYFUL, etc.)
- ✅ Dynamics integration (from Step 6.1)
- ❌ **No opening templates**
- ❌ **No first-message generation logic**
- ❌ **No opening config in MissionConfigV1**

**Evidence:**
```28:82:backend/src/modules/ai/providers/ai-chat.service.ts
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
    // ... more cases
  }
}
```

**Gap:** Style presets exist but there's no opening-specific logic or templates.

### 1.2 Required Implementation

**Schema Extension:**
- ✅ `OpeningsConfigV1` schema added to `MissionConfigV1` (already done)
- Fields: `style`, `energy`, `curiosity`, `personaInitMood`, `openerTemplateKey`

**Registry Creation:**
- ❌ **MISSING:** `OPENING_TEMPLATES` registry
- Need templates for: CASUAL_GREETING, PLAYFUL_HOOK, DIRECT_QUESTION, MYSTERIOUS_TEASE, etc.
- Templates should be compatible with different `AiStyleKey` values

**Opening Generation Logic:**
- ❌ **MISSING:** Function to select template based on `aiStyleKey` + `openings.style`
- ❌ **MISSING:** Logic to inject dynamics (emoji density, pacing, flirtiness)
- ❌ **MISSING:** Logic to inject difficulty (directness, ambiguity tolerance)
- ❌ **MISSING:** Opening consistency using `openerTemplateKey`

**Prompt Builder Integration:**
- ❌ **MISSING:** First message generation that uses openings config
- ❌ **MISSING:** Initial mood injection into mission state
- Current prompt builder doesn't distinguish first message from subsequent messages

### 1.3 Integration Points

**With Step 6.0-6.2:**
- ✅ Can use `dynamics` (pace, emojiDensity, flirtiveness) from config
- ✅ Can use `difficulty` (strictness, ambiguityTolerance) from config
- ✅ Can use `style.aiStyleKey` from config

**With Step 6.5:**
- ⚠️ Need to initialize `MissionMoodStateV1` with `personaInitMood`
- ⚠️ Need to register initial mood in `MissionStateV1`

---

## 2. Step 6.4 — Response Architecture Layer Analysis

### 2.1 Current State

**What Exists:**
- ✅ Prompt builder that constructs system prompts
- ✅ Dynamics and difficulty blocks in prompt
- ❌ **No response architecture config**
- ❌ **No internal reasoning steps**
- ❌ **No interpretation/persona lens/cognitive filter logic**

**Evidence:**
```205:295:backend/src/modules/ai/providers/ai-chat.service.ts
  private buildSystemPrompt(params: {
    topic: string;
    mission: ...;
    category: ...;
    persona: ...;
    aiStyle: AiStyle | null;
    aiContract: Record<string, any> | null;
    wantsJson: boolean;
  }): string {
    // ... builds prompt but no response architecture instructions
  }
```

**Gap:** Prompt builder doesn't include response architecture instructions for internal reasoning.

### 2.2 Required Implementation

**Schema Extension:**
- ✅ `ResponseArchitectureV1` schema added to `MissionConfigV1` (already done)
- Fields: `reflection`, `validation`, `emotionalMirroring`, `pushPullFactor`, `riskTaking`, `clarity`, `reasoningDepth`, `personaConsistency`

**Registry Creation:**
- ❌ **MISSING:** `RESPONSE_ARCHITECTURE_PROFILES` registry
- Need profiles: REFLECTIVE, VALIDATING, EMOTIONAL, PUSHPULL, RISKY, CLEAR, DEEP, CONSISTENT, BALANCED

**Internal Reasoning Steps:**
- ❌ **MISSING:** Interpretation step (determine user meaning)
- ❌ **MISSING:** Persona lens step (apply persona's emotional/cognitive lens)
- ❌ **MISSING:** Cognitive filter step (apply difficulty thresholds)
- ❌ **MISSING:** Response builder step (formulate final response)

**Prompt Builder Integration:**
- ❌ **MISSING:** Instructions for internal reasoning steps
- ❌ **MISSING:** Response architecture parameters in prompt
- Need to ensure no hallucinations in personality rules
- Need to ensure persona consistency

### 2.3 Integration Points

**With Step 6.1 (Dynamics):**
- ✅ Can use dynamics (pace, flirtiveness, vulnerability) to shape response
- Need to ensure response architecture respects dynamics

**With Step 5.x (Scoring):**
- ⚠️ Response must contain hooks, traits, flags for scoring pipeline
- Need to ensure response architecture generates scorable content

**With Step 6.5 (Mission State):**
- ⚠️ Response should reflect current mood state
- Need to ensure response architecture adapts to mood changes

---

## 3. Step 6.5 — Scoring ↔ Mission State Glue Analysis

### 3.1 Current State

**What Exists:**
- ✅ Basic `MissionStatePayload` with simple mood (SAFE, WARNING, DANGER, GOOD)
- ✅ `MoodService` that tracks mood timeline (separate system)
- ✅ Scoring services that produce scores, traits, flags
- ❌ **No unified MissionStateV1 schema**
- ❌ **No MissionMoodStateV1 schema**
- ❌ **No scoring → mood transformation**
- ❌ **No mood state in prompt builder**

**Evidence:**
```54:76:backend/src/modules/practice/practice.service.ts
export interface MissionStatePayload {
  status: MissionStateStatus;
  progressPct: number;
  averageScore: number;
  totalMessages: number;

  remainingMessages?: number;
  mood?: MissionMood; // Simple: SAFE, WARNING, DANGER, GOOD

  policy?: {
    difficulty: MissionDifficulty;
    goalType: MissionGoalType | null;
    maxMessages: number;
    successScore: number;
    failScore: number;
  };

  disqualified?: boolean;
  disqualify?: DisqualifyResult | null;

  endReasonCode?: MissionEndReasonCode | null;
  endReasonMeta?: Record<string, any> | null;
}
```

**Gap:** Current mood is simple and doesn't track persona emotional state or integrate with scoring.

**MoodService Evidence:**
```32:60:backend/src/modules/mood/mood.service.ts
function classifyMoodState(
  smoothedMoodScore: number,
  tension: number,
  warmth: number,
  flow: number,
): MoodState {
  // FLOW: High score, high flow, low tension
  if (smoothedMoodScore >= 80 && flow > 70 && tension < 40) {
    return 'FLOW';
  }

  // TENSE: High tension OR (low score AND moderate tension)
  if (tension > 70 || (smoothedMoodScore < 50 && tension > 50)) {
    return 'TENSE';
  }

  // WARM: Moderate-high score with good warmth
  if (smoothedMoodScore >= 60 && smoothedMoodScore < 80 && warmth > 50) {
    return 'WARM';
  }

  // COLD: Low score AND low warmth
  if (smoothedMoodScore < 30 && warmth < 40) {
    return 'COLD';
  }

  // NEUTRAL: Default fallback
  return 'NEUTRAL';
}
```

**Gap:** MoodService exists but is separate from mission state and doesn't feed into prompt builder.

### 3.2 Required Implementation

**Schema Creation:**
- ✅ `MissionMoodStateV1` schema created (already done)
- ✅ `MissionStateV1` schema created (already done)
- Fields: `currentMood`, `positivityPct`, `tensionLevel`, `isStable`, `lastChangeReason`

**Registry Creation:**
- ❌ **MISSING:** `MISSION_MOOD_MAPPINGS` registry
- Need mappings: flags → mood, scores → tension, trait trends → persona adjustments

**Scoring → Mood Transformation:**
- ❌ **MISSING:** Function to transform scores into mood shifts
- ❌ **MISSING:** Function to map flags to mood changes
- ❌ **MISSING:** Function to map trait trends to persona adjustments
- ❌ **MISSING:** Tension calculation based on scores

**Prompt Builder Integration:**
- ❌ **MISSING:** Mood context injection into system prompt
- ❌ **MISSING:** Tension and stability influence on responses
- Current prompt builder doesn't receive or use mood state

**Mission State Tracking:**
- ⚠️ Need to update `MissionStatePayload` or create new `MissionStateV1`
- ⚠️ Need to track mood state across message cycles
- ⚠️ Need to persist mood state in session payload

### 3.3 Integration Points

**With Scoring (Step 5.x):**
- ✅ Can use `AiMessageScoreBase` (score, rarity, tags, flags)
- ✅ Can use `AiCoreScoringService` results (traits, flags, patterns)
- Need to transform these into mood state changes

**With Prompt Builder:**
- ⚠️ Need to pass mood state to prompt builder
- ⚠️ Need to inject mood instructions into system prompt

**With Step 6.3 (Openings):**
- ⚠️ Initial mood should come from `openings.personaInitMood`
- ⚠️ First message should reflect initial mood

**With Step 6.4 (Response Architecture):**
- ⚠️ Response architecture should adapt based on mood
- ⚠️ Emotional mirroring should reflect current mood

---

## 4. Full Glue Analysis (6.3-6.5 Integration)

### 4.1 Current State

**Unified Prompt Builder Input:**
- ⚠️ **PARTIAL** - Prompt builder receives:
  - ✅ `aiStyle`
  - ✅ `dynamics` (from Step 6.1)
  - ✅ `difficulty` (from Step 6.2)
  - ❌ **MISSING:** `openings`
  - ❌ **MISSING:** `responseArchitecture`
  - ❌ **MISSING:** `missionState` (mood, tension, stability)

**Initial State + First Message:**
- ❌ **NOT IMPLEMENTED** - No special handling for first message
- ❌ **NOT IMPLEMENTED** - No initial mood registration
- Current system treats first message same as subsequent messages

**User Message Cycle:**
- ⚠️ **PARTIAL** - Current cycle:
  1. ✅ User sends message
  2. ✅ Score user message (Step 5.x)
  3. ❌ **MISSING:** Update mission state (mood, tension)
  4. ✅ Generate AI response
  5. ❌ **MISSING:** Response doesn't reflect updated mood

**Persona Consistency:**
- ⚠️ **PARTIAL** - Style and dynamics are consistent
- ❌ **MISSING:** Response architecture consistency
- ❌ **MISSING:** Mood-driven consistency

### 4.2 Required Integration

**Unified Prompt Builder Input Structure:**
```typescript
{
  missionConfig: {
    aiStyle,
    dynamics,
    difficulty,
    openings,        // NEW
    responseArchitecture  // NEW
  },
  missionState: {    // NEW
    mood,
    tension,
    stability,
    progressPct
  }
}
```

**Initial State + First Message:**
1. Extract `openings.personaInitMood` → initialize `MissionMoodStateV1`
2. Select opening template based on `aiStyleKey` + `openings.style`
3. Generate first message using template + dynamics + difficulty
4. Register initial mood in `MissionStateV1`

**User Message Cycle:**
1. **Step 6.4** → Interpret user message (internal reasoning)
2. **Step 5.x** → Score user message
3. **Step 6.5** → Transform scores/flags → update mood state
4. **Step 6.4** → Generate response using updated mood + response architecture

**Persona Consistency Guarantee:**
- Ensure style, dynamics, difficulty, openings, response architecture, scoring, and mission state all align
- No contradictions between layers
- Mood changes should be reflected in responses

---

## 5. Implementation Complexity Assessment

### 5.1 Step 6.3 (Openings Layer)

**Complexity:** Medium

**Effort Breakdown:**
- Schema: ✅ Done (1 hour)
- Registry: 2-3 hours (8 templates × 15 min)
- Generation Logic: 3-4 hours (template selection + variable injection)
- Prompt Integration: 2-3 hours (first message detection + opening generation)
- **Total: 8-11 hours**

**Risks:**
- Template selection logic might be complex
- Need to ensure templates work with all style combinations
- Backward compatibility (missions without openings config)

### 5.2 Step 6.4 (Response Architecture)

**Complexity:** High

**Effort Breakdown:**
- Schema: ✅ Done (1 hour)
- Registry: 2-3 hours (9 profiles × 15 min)
- Internal Reasoning: 4-6 hours (interpretation, persona lens, cognitive filter, response builder)
- Prompt Integration: 3-4 hours (add reasoning instructions to prompt)
- **Total: 10-14 hours**

**Risks:**
- Internal reasoning steps are abstract - need clear prompt instructions
- Risk of over-complicating prompt
- Need to ensure reasoning doesn't conflict with existing prompt structure

### 5.3 Step 6.5 (Scoring ↔ Mission State Glue)

**Complexity:** High

**Effort Breakdown:**
- Schemas: ✅ Done (1 hour)
- Mood Mappings Registry: 2-3 hours (flags → mood, scores → tension mappings)
- Transformation Logic: 4-5 hours (score → mood, flags → mood, traits → adjustments)
- Prompt Integration: 2-3 hours (mood context injection)
- State Tracking: 3-4 hours (update MissionStatePayload, persist in session)
- **Total: 12-16 hours**

**Risks:**
- Mood state changes might be too frequent/erratic
- Need to balance mood reactivity vs stability
- Integration with existing MoodService (might need to merge or coordinate)

### 5.4 Full Glue (6.3-6.5 Integration)

**Complexity:** High

**Effort Breakdown:**
- Unified Prompt Builder: 4-6 hours (refactor to accept new structure)
- Initial State Logic: 2-3 hours (first message generation)
- User Message Cycle: 3-4 hours (integrate all steps)
- Consistency Guarantee: 2-3 hours (validation and testing)
- **Total: 11-16 hours**

**Risks:**
- Breaking changes to prompt builder API
- Complex integration between all layers
- Testing complexity (need to test full cycle)

---

## 6. Dependencies and Prerequisites

### 6.1 Required from Previous Steps

**Step 6.0-6.2 (Foundation):**
- ✅ `MissionConfigV1` schema with dynamics and difficulty
- ✅ Dynamics and difficulty registries
- ✅ Prompt builder integration for dynamics and difficulty
- ✅ Scoring integration for difficulty

**Step 5.x (Scoring):**
- ✅ `AiScoringService` with scores, traits, flags
- ✅ `AiCoreScoringService` with trait data
- ⚠️ Need to ensure scoring outputs are accessible for mood transformation

### 6.2 External Dependencies

**Database:**
- ✅ No schema changes needed (using Json fields)
- ⚠️ Need to ensure session payload can store `MissionStateV1`

**API:**
- ⚠️ May need to update response types to include mood state
- ⚠️ May need to update frontend to display mood (optional)

---

## 7. Testing Requirements

### 7.1 Step 6.3 Tests

1. **Opening Template Selection:**
   - Test template selection for each `AiStyleKey`
   - Test template selection with different `openings.style` values
   - Test fallback when no compatible template

2. **Opening Generation:**
   - Test opening generation with different dynamics (pace, emojiDensity, flirtiveness)
   - Test opening generation with different difficulty (strictness, ambiguityTolerance)
   - Test opening consistency (same template key → similar openings)

3. **First Message Integration:**
   - Test first message uses opening template
   - Test initial mood is set correctly
   - Test first message reflects dynamics and difficulty

### 7.2 Step 6.4 Tests

1. **Response Architecture:**
   - Test response reflects `reflection` parameter
   - Test response reflects `emotionalMirroring` parameter
   - Test response reflects `pushPullFactor` parameter
   - Test persona consistency is maintained

2. **Internal Reasoning:**
   - Test interpretation step (user meaning is understood)
   - Test persona lens (persona's perspective is applied)
   - Test cognitive filter (difficulty thresholds are respected)
   - Test response builder (final response is coherent)

### 7.3 Step 6.5 Tests

1. **Scoring → Mood Transformation:**
   - Test low scores → colder mood
   - Test high scores → warmer mood
   - Test negative flags → mood shifts (e.g., "tooDirect" → "testing")
   - Test positive flags → mood improvements

2. **Mood State Tracking:**
   - Test mood state persists across message cycles
   - Test mood state is injected into prompt
   - Test mood changes are reflected in responses

3. **Full Cycle:**
   - Test 5-message cycle with mood changes
   - Test mood stability (mood doesn't change too frequently)
   - Test mood recovery (mood improves after good messages)

### 7.4 Integration Tests

1. **Full Cycle Test:**
   - Start mission → initial mood set → first message generated
   - User message 1 → scored → mood updated → response reflects mood
   - User message 2 → scored → mood updated → response reflects mood
   - Continue for 5 messages, verify consistency

2. **Consistency Test:**
   - Verify style, dynamics, difficulty, openings, response architecture, and mood all align
   - Verify no contradictions between layers
   - Verify persona behavior is consistent across messages

---

## 8. Recommendations

### 8.1 Implementation Order

**Phase 1: Step 6.3 (Openings) - 8-11 hours**
1. Create `OPENING_TEMPLATES` registry
2. Implement opening generation logic
3. Integrate into prompt builder for first message
4. Test opening generation

**Phase 2: Step 6.5 (Mission State Glue) - 12-16 hours**
1. Create `MISSION_MOOD_MAPPINGS` registry
2. Implement scoring → mood transformation
3. Update `MissionStatePayload` to include `MissionMoodStateV1`
4. Integrate mood state into prompt builder
5. Test mood state tracking and transformation

**Phase 3: Step 6.4 (Response Architecture) - 10-14 hours**
1. Create `RESPONSE_ARCHITECTURE_PROFILES` registry
2. Implement internal reasoning steps in prompt
3. Integrate response architecture into prompt builder
4. Test response architecture effects

**Phase 4: Full Glue - 11-16 hours**
1. Refactor prompt builder to unified input structure
2. Implement initial state + first message logic
3. Implement full user message cycle
4. Add consistency validation
5. End-to-end testing

**Total Estimated Effort: 41-57 hours**

### 8.2 Architecture Decisions

**Mood State Storage:**
- **Recommendation:** Store `MissionStateV1` in `session.payload.missionState`
- **Alternative:** Create separate `MissionState` table (more complex, better querying)

**Mood State Updates:**
- **Recommendation:** Update mood state after each user message scoring
- **Frequency:** Once per user message (not per AI response)

**Opening Generation:**
- **Recommendation:** Generate opening in prompt builder, not as separate API call
- **Alternative:** Separate opening generation service (more flexible, more complex)

**Response Architecture:**
- **Recommendation:** Implement as prompt instructions, not separate processing layer
- **Reason:** Simpler, leverages LLM reasoning capabilities

### 8.3 Backward Compatibility

**Missions Without Openings Config:**
- Use default opening template based on `aiStyleKey`
- Use default `personaInitMood: 'neutral'`

**Missions Without Response Architecture:**
- Use default `BALANCED` profile
- All parameters default to 0.6

**Missions Without Mood State:**
- Initialize with default mood state
- Use simple mood calculation (score-based)

### 8.4 Risk Mitigation

**Mood State Instability:**
- Add `isStable` flag to prevent rapid mood changes
- Implement minimum time between mood changes
- Use smoothing (EMA) for mood transitions

**Prompt Complexity:**
- Keep prompt instructions concise
- Use clear section separators
- Test with different LLM models

**Integration Complexity:**
- Implement incrementally (one step at a time)
- Add extensive logging for debugging
- Create test scenarios for each integration point

---

## 9. Conclusion

### Current Readiness

**Status:** ⚠️ **PARTIAL FOUNDATION**

**What's Ready:**
- ✅ Schema extensions (OpeningsConfigV1, ResponseArchitectureV1)
- ✅ Mission state schemas (MissionMoodStateV1, MissionStateV1)
- ✅ Foundation from Steps 6.0-6.2 (dynamics, difficulty, style)
- ✅ Scoring infrastructure (Step 5.x)

**What's Missing:**
- ❌ All registries (OPENING_TEMPLATES, RESPONSE_ARCHITECTURE_PROFILES, MISSION_MOOD_MAPPINGS)
- ❌ Opening generation logic
- ❌ Response architecture implementation
- ❌ Scoring → mood transformation
- ❌ Mood state integration into prompt builder
- ❌ Unified prompt builder input structure
- ❌ Full user message cycle integration

### Implementation Readiness

**Can Start Implementation:** ✅ **YES**

**Blockers:** None - all prerequisites are met

**Estimated Total Effort:** 41-57 hours

**Recommended Approach:**
1. Start with Step 6.3 (Openings) - simplest, most visible impact
2. Then Step 6.5 (Mission State) - enables mood-driven responses
3. Then Step 6.4 (Response Architecture) - enhances response quality
4. Finally, full glue integration - ties everything together

### Next Steps

1. **Review and Approve:** Review this scout report and approve implementation plan
2. **Create Registries:** Start with OPENING_TEMPLATES registry
3. **Implement Incrementally:** Follow phase-by-phase approach
4. **Test Thoroughly:** Test each phase before moving to next
5. **Document:** Document new APIs and integration points

---

**End of Report**

