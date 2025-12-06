-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "score" INTEGER,
ADD COLUMN     "traitData" JSONB,
ADD COLUMN     "turnIndex" INTEGER;

-- AlterTable
ALTER TABLE "PracticeSession" ADD COLUMN     "endReasonCode" TEXT,
ADD COLUMN     "endReasonMeta" JSONB;

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_turnIndex_idx" ON "ChatMessage"("sessionId", "turnIndex");
