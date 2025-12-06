# Step 5.1 - Migration B

## Overview

After successfully running the backfill script (`backfill-step5-1.ts`), you should run Migration B to make `ChatMessage.turnIndex` a required field.

## Migration B Changes

**File:** `backend/prisma/schema.prisma`

Update `ChatMessage` model:

```prisma
model ChatMessage {
  // ... existing fields ...
  
  // ✅ Step 5.1 Migration B: Make turnIndex required
  turnIndex   Int             // Changed from Int? to Int (required)
  score       Int?
  traitData   Json?
  
  // ... rest of fields ...
  
  @@index([sessionId, createdAt])
  @@index([sessionId, turnIndex])
  // Optional: Add unique constraint if safe
  // @@unique([sessionId, turnIndex])
}
```

## Prerequisites

1. ✅ Migration A completed (nullable fields added)
2. ✅ Backfill script completed successfully
3. ✅ Verified all existing `ChatMessage` records have `turnIndex` populated
4. ✅ No null `turnIndex` values in database

## Migration Command

```bash
cd backend
npx prisma migrate dev --name step5_1_make_turnIndex_required
```

## Verification

After migration, verify:

```sql
-- Should return 0 rows
SELECT COUNT(*) FROM "ChatMessage" WHERE "turnIndex" IS NULL;
```

## Optional: Unique Constraint

If you want to enforce uniqueness of `turnIndex` per session (prevent duplicates), add:

```prisma
@@unique([sessionId, turnIndex])
```

**Warning:** Only add this if you're certain there are no duplicate `turnIndex` values per session. Check first:

```sql
-- Should return 0 rows
SELECT "sessionId", "turnIndex", COUNT(*) 
FROM "ChatMessage" 
GROUP BY "sessionId", "turnIndex" 
HAVING COUNT(*) > 1;
```

## Rollback

If migration fails:

```bash
npx prisma migrate resolve --rolled-back step5_1_make_turnIndex_required
```

Then re-run backfill script to ensure all records have `turnIndex` populated before retrying.

