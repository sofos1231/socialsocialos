-- AlterTable: Make turnIndex NOT NULL
ALTER TABLE "ChatMessage" ALTER COLUMN "turnIndex" SET NOT NULL;

-- AlterTable: Make traitData NOT NULL
ALTER TABLE "ChatMessage" ALTER COLUMN "traitData" SET NOT NULL;

-- DropIndex: Remove the non-unique index
DROP INDEX IF EXISTS "ChatMessage_sessionId_turnIndex_idx";

-- CreateUniqueConstraint: Add unique constraint on (sessionId, turnIndex)
CREATE UNIQUE INDEX "ChatMessage_sessionId_turnIndex_key" ON "ChatMessage"("sessionId","turnIndex");

