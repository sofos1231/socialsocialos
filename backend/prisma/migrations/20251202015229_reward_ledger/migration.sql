-- CreateEnum
CREATE TYPE "RewardLedgerKind" AS ENUM ('SESSION_REWARD');

-- CreateTable
CREATE TABLE "RewardLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "templateId" TEXT,
    "kind" "RewardLedgerKind" NOT NULL DEFAULT 'SESSION_REWARD',
    "xpDelta" INTEGER NOT NULL DEFAULT 0,
    "coinsDelta" INTEGER NOT NULL DEFAULT 0,
    "gemsDelta" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "isSuccess" BOOLEAN,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RewardLedgerEntry_userId_createdAt_idx" ON "RewardLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RewardLedgerEntry_templateId_idx" ON "RewardLedgerEntry"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardLedgerEntry_sessionId_kind_key" ON "RewardLedgerEntry"("sessionId", "kind");

-- AddForeignKey
ALTER TABLE "RewardLedgerEntry" ADD CONSTRAINT "RewardLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardLedgerEntry" ADD CONSTRAINT "RewardLedgerEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
