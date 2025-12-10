# Work Plan — Step 6.0–6.5 Gap Fixes

## Implementation Order

1. **Chunk A — Difficulty Layer Clean-Up (6.1)**
   - Implement `failThreshold` in scoring logic (use as actual fail threshold check)
   - Implement `recoveryDifficulty` in scoring logic (affect penalty scaling for recovery)
   - Document `AI_DIFFICULTY_PROFILES` registry as design-time catalog (not runtime)
   - Update `ai-scoring.service.ts` to use both parameters

2. **Chunk B — Dynamics Registry Alignment (6.2)**
   - Document `AI_DYNAMICS_PROFILES` as design-time catalog (not runtime)
   - Add comments indicating where future meta-engine would plug in
   - Ensure `buildDynamicsBlock()` is clean and stable

3. **Chunk C — Objective → Gate Mapping Registry (6.4)**
   - Create `objective-gate-mappings.registry.ts` with mapping from objective kind + difficulty → required gates
   - Define `ObjectiveGateRequirement` interface
   - Create registry with mappings for all objective kinds at different difficulty levels

4. **Chunk D — Gate State in Mission State Schema (6.4)**
   - Extend `MissionStateV1` to include `gateState` field
   - Define `GateState` interface tracking which gates are met/unmet
   - Update `mission-state-v1.schema.ts`

5. **Chunk E — Gate Evaluation During Session (6.4)**
   - Add `evaluateGatesForActiveSession()` method to `GatesService`
   - Method should evaluate gates using current session context (not requiring finalized session)
   - Update gate state in `MissionStateV1` after each user message

6. **Chunk F — Reward Permissions Service (6.4)**
   - Create `RewardReleaseService` or add method to existing service
   - Implement `getRewardPermissionsForState()` that checks gate state and returns forbidden/allowed status
   - Map objective kinds to reward types (phone number, Instagram, date, etc.)

7. **Chunk G — Prompt Builder Integration (6.4)**
   - Add `buildObjectiveBlock()` method to `ai-chat.service.ts`
   - Add `buildGateStatusBlock()` method
   - Add `buildRewardPermissionsBlock()` method
   - Integrate all three blocks into `buildSystemPrompt()`

8. **Chunk H — Mission End Logic Integration (6.4)**
   - Update `computeEndReason()` in `practice.service.ts` to check gate state
   - Add logic to mark mission as "ready" when gates are met
   - Ensure gate state influences end reason determination

9. **Chunk I — Practice Service Integration (6.4)**
   - Integrate gate evaluation into message cycle in `practice.service.ts`
   - Call gate evaluation after scoring, update gate state
   - Pass gate state to prompt builder

10. **Chunk J — Tests (6.1, 6.2, 6.4)**
    - Add tests for `failThreshold` and `recoveryDifficulty` in scoring
    - Add tests for objective → gate mapping
    - Add tests for gate evaluation during session
    - Add tests for reward permissions
    - Add tests for prompt builder blocks

