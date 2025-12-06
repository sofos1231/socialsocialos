# Step 5.1 Implementation Checklist

## Overview

Step 5.1 implements deterministic transcript ordering + normalized per-message scoring + per-message evaluation JSON + normalized endReason fields.

## Files Changed

1. ✅ `backend/prisma/schema.prisma` - Added nullable fields (Migration A)
2. ✅ `backend/src/modules/sessions/sessions.service.ts` - Updated write path
3. ✅ `backend/src/modules/practice/practice.service.ts` - Fixed read path ordering
4. ✅ `backend/scripts/backfill-step5-1.ts` - Created backfill script
5. ✅ `backend/src/modules/sessions/sessions.service.spec.ts` - Added unit tests
6. ✅ `backend/test/e2e/practice.e2e-spec.ts` - Added e2e tests
7. ✅ `backend/docs/STEP_5_1_MIGRATION_B.md` - Migration B documentation

## Manual Steps to Execute

### Step 1: Run Migration A

```bash
cd backend
npx prisma migrate dev --name step5_1_add_transcript_scoring_fields
```

**Verify:**
- Migration completes without errors
- New fields appear in schema: `ChatMessage.turnIndex`, `ChatMessage.score`, `ChatMessage.traitData`, `PracticeSession.endReasonCode`, `PracticeSession.endReasonMeta`
- Index `ChatMessage_sessionId_turnIndex_idx` is created

### Step 2: Run Backfill Script

```bash
cd backend
npx ts-node scripts/backfill-step5-1.ts
```

**Verify:**
- Script runs without errors
- All existing `ChatMessage` records have `turnIndex` populated (from `meta.index`)
- All existing USER `ChatMessage` records have `score` populated (from `meta.score`, if available)
- All existing `ChatMessage` records have `traitData` populated (from `aiCorePayload.messages[]`, if available)
- All existing `PracticeSession` records have `endReasonCode`/`endReasonMeta` populated (from `payload`, if available)

**Check for nulls:**
```sql
-- Should return 0 or very few rows (only messages without meta.index)
SELECT COUNT(*) FROM "ChatMessage" WHERE "turnIndex" IS NULL;

-- Should return 0 rows (all sessions should have endReasonCode if they have payload.endReasonCode)
SELECT COUNT(*) FROM "PracticeSession" 
WHERE "payload"->>'endReasonCode' IS NOT NULL 
  AND "endReasonCode" IS NULL;
```

### Step 3: Run Tests

```bash
cd backend

# Unit tests
npm test -- sessions.service.spec.ts

# E2E tests
npm test -- practice.e2e-spec.ts
```

**Verify:**
- All tests pass
- `turnIndex` is populated correctly
- `score` is stored for USER messages
- `traitData` is stored when `aiCoreResult` provided
- `endReasonCode`/`endReasonMeta` columns are set
- Message ordering uses `turnIndex`

### Step 4: Verify New Sessions

Create a test session and verify:

```sql
-- Check new session has all fields populated
SELECT 
  id, 
  "endReasonCode", 
  "endReasonMeta" IS NOT NULL as has_end_reason_meta
FROM "PracticeSession" 
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC 
LIMIT 1;

-- Check new messages have all fields populated
SELECT 
  id,
  "turnIndex",
  "score",
  "traitData" IS NOT NULL as has_trait_data
FROM "ChatMessage" 
WHERE "sessionId" = '<session-id-from-above>'
ORDER BY "turnIndex" ASC;
```

**Verify:**
- New sessions have `endReasonCode`/`endReasonMeta` in Prisma fields (not just payload)
- New messages have `turnIndex` populated (0, 1, 2, ...)
- USER messages have `score` populated
- Messages have `traitData` populated (if `aiCoreResult` was provided)

### Step 5: Verify Read Path

Test message retrieval:

```typescript
// In practice.service.ts, verify ordering uses turnIndex
const messages = await prisma.chatMessage.findMany({
  where: { sessionId: 'test-session-id' },
  orderBy: { turnIndex: 'asc' }, // ✅ Should use turnIndex, not createdAt
});
```

**Verify:**
- Messages are ordered correctly by `turnIndex`
- No reliance on `createdAt` for transcript ordering

### Step 6: (Optional) Run Migration B

**⚠️ Only after backfill is 100% successful and verified**

See `backend/docs/STEP_5_1_MIGRATION_B.md` for details.

```bash
cd backend
# Update schema.prisma: change turnIndex Int? to turnIndex Int
npx prisma migrate dev --name step5_1_make_turnIndex_required
```

## Rollback Plan

If issues occur:

1. **Migration A fails:**
   ```bash
   npx prisma migrate resolve --rolled-back step5_1_add_transcript_scoring_fields
   ```

2. **Backfill script fails:**
   - Script is idempotent, can be re-run
   - No data loss (only updates, no deletes)

3. **Write path issues:**
   - Revert `sessions.service.ts` changes
   - Keep schema changes (fields are nullable)
   - Old code continues to work

4. **Read path issues:**
   - Revert `practice.service.ts` changes
   - Use `createdAt` ordering as fallback (less reliable but functional)

## Success Criteria

- ✅ All new fields are nullable (backward compatible)
- ✅ All existing data has been backfilled
- ✅ New sessions populate all new fields correctly
- ✅ Message ordering is deterministic (uses `turnIndex`)
- ✅ All tests pass
- ✅ No breaking changes to existing functionality

## Notes

- **Canonical transcript:** The transcript used for AI scoring (`transcriptToPersist`) is the same one persisted, ensuring index alignment between `aiCoreResult.messages[]` and `ChatMessage` rows.

- **Backward compatibility:** All new fields are nullable, so old code continues to work. The `meta` JSON fields are still populated alongside normalized fields.

- **Performance:** The new index `@@index([sessionId, turnIndex])` ensures efficient transcript retrieval. Monitor query performance after deployment.

