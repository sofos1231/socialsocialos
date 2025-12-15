# Step 8 Implementation Status

## Completed

### Phase 1: FastPath Boundary & Response Contract
- ✅ Created `MoodStateMachineService` - incremental mood updates
- ✅ Created `ScoreAccumulatorService` - incremental score tracking
- ✅ Extended `PracticeSessionResponsePublic` with micro-interaction fields
- ✅ Updated serializer to include new fields
- ✅ Created helper functions (`computeUiEventHint`, `computeRarity`)

### Phase 2: Queue + Deep Analyzer Worker
- ✅ Created `DeepAnalysisJobPayload` type
- ✅ Created `QueueModule` structure (requires BullMQ packages)
- ✅ Created `DeepAnalysisWorker` - processes analytics asynchronously
- ✅ **REMOVED heavy analytics from `createScoredSessionFromScores` hot path**
  - Removed: moodService, traitsService, gatesService, promptsService, insightsService, synergyService
  - These now run in DeepAnalysisWorker

### Phase 4: Model Tier Routing
- ✅ Created `ModelTierService` - routes mini/heavy/hero models
- ✅ Extended `AiChatService.generateReply()` to accept `modelTier` parameter
- ✅ Updated `AiModule` to export new services

## In Progress / Remaining

### Phase 1: FastPath Flow in PracticeService
- ⏳ Update `PracticeService.runPracticeSession()` to:
  - Call AI with `modelTier: 'mini'`
  - Request structured JSON with Step 8 fields (moodDelta, tensionDelta, etc.)
  - Parse structured JSON response
  - Update mood via `MoodStateMachineService`
  - Update score via `ScoreAccumulatorService`
  - Build response with micro-interaction fields
  - Enqueue DEEP_ANALYSIS job (after response built)

### Phase 2: Queue Integration
- ⏳ Inject queue into `PracticeService`
- ⏳ Enqueue job after FastPath response
- ⏳ Update `QueueModule` to properly configure BullMQ
- ⏳ Add BullMQ dependencies to package.json

### Phase 3: Mission End Finalizer
- ⏳ Update `getSessionEndReadModel()` with bounded-wait logic
- ⏳ Check `lastAnalyzedMessageIndex` vs `lastMessageIndex`
- ⏳ Enqueue priority job if needed
- ⏳ Poll with max wait (1000ms)

### Phase 5: UX Contract & Micro-Interactions
- ⏳ Parse structured JSON from AI (extend existing parsing)
- ⏳ Extract: moodDelta, tensionDelta, comfortDelta, boundaryRisk, microFlags, localScoreTier
- ⏳ Graceful degradation if JSON parsing fails

### Phase 6: Observability Hooks
- ⏳ Add TODO comments for metrics hook points
- ⏳ FastPath latency (entry/exit)
- ⏳ Deep Analyzer processing time
- ⏳ Error counters

## Dependencies Required

Add to `package.json`:
```json
"@nestjs/bullmq": "^10.0.0",
"bullmq": "^5.0.0"
```

## Critical Notes

1. **Heavy Analytics Removed**: The 6 analytics services are no longer called synchronously in `createScoredSessionFromScores`. They now run in `DeepAnalysisWorker`.

2. **Backward Compatibility**: All new response fields are optional, so existing clients won't break.

3. **Analytics Still Work**: Steps 5-7 dashboards and analytics still read from the same tables. The worker populates them asynchronously, so there's eventual consistency.

4. **No Prisma Schema Changes**: Using existing `payload` JSON field for `deepAnalysisMetadata`.

