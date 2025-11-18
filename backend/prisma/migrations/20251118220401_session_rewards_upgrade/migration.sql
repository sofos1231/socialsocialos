-- AlterTable
ALTER TABLE "PracticeSession" ADD COLUMN     "coinsGained" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gemsGained" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isSuccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "messageCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "payload" JSONB,
ADD COLUMN     "rarityCounts" JSONB,
ALTER COLUMN "xpGained" SET DEFAULT 0,
ALTER COLUMN "durationSec" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "PracticeSession_status_createdAt_idx" ON "PracticeSession"("status", "createdAt");
