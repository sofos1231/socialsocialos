-- CreateEnum
CREATE TYPE "BadgeLedgerKind" AS ENUM ('PROGRESS_APPLY', 'TIER_UPGRADE');

-- AlterEnum
ALTER TYPE "RewardLedgerKind" ADD VALUE 'BADGE_TIER_UPGRADE';

-- CreateTable
CREATE TABLE "UserBadgeProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadgeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadgeEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "fromTier" INTEGER NOT NULL,
    "toTier" INTEGER NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadgeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "badgeKey" TEXT NOT NULL,
    "kind" "BadgeLedgerKind" NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BadgeLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HallOfFameMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "turnIndex" INTEGER NOT NULL,
    "categoryKey" TEXT,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HallOfFameMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BurnedMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "burnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BurnedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionTraitSynergy" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "synergyJson" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionTraitSynergy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserBadgeProgress_userId_categoryKey_idx" ON "UserBadgeProgress"("userId", "categoryKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadgeProgress_userId_badgeKey_key" ON "UserBadgeProgress"("userId", "badgeKey");

-- CreateIndex
CREATE INDEX "UserBadgeEvent_userId_createdAt_idx" ON "UserBadgeEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserBadgeEvent_sessionId_idx" ON "UserBadgeEvent"("sessionId");

-- CreateIndex
CREATE INDEX "BadgeLedgerEntry_userId_createdAt_idx" ON "BadgeLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeLedgerEntry_sessionId_badgeKey_kind_key" ON "BadgeLedgerEntry"("sessionId", "badgeKey", "kind");

-- CreateIndex
CREATE INDEX "HallOfFameMessage_userId_createdAt_idx" ON "HallOfFameMessage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "HallOfFameMessage_sessionId_idx" ON "HallOfFameMessage"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "HallOfFameMessage_userId_messageId_key" ON "HallOfFameMessage"("userId", "messageId");

-- CreateIndex
CREATE INDEX "BurnedMessage_userId_burnedAt_idx" ON "BurnedMessage"("userId", "burnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BurnedMessage_userId_messageId_key" ON "BurnedMessage"("userId", "messageId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionTraitSynergy_sessionId_key" ON "SessionTraitSynergy"("sessionId");

-- CreateIndex
CREATE INDEX "SessionTraitSynergy_userId_computedAt_idx" ON "SessionTraitSynergy"("userId", "computedAt");

-- CreateIndex
CREATE INDEX "SessionTraitSynergy_sessionId_idx" ON "SessionTraitSynergy"("sessionId");

-- CreateIndex
CREATE INDEX "ChatMessage_userId_createdAt_idx" ON "ChatMessage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserBadgeProgress" ADD CONSTRAINT "UserBadgeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadgeEvent" ADD CONSTRAINT "UserBadgeEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadgeEvent" ADD CONSTRAINT "UserBadgeEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeLedgerEntry" ADD CONSTRAINT "BadgeLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeLedgerEntry" ADD CONSTRAINT "BadgeLedgerEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallOfFameMessage" ADD CONSTRAINT "HallOfFameMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallOfFameMessage" ADD CONSTRAINT "HallOfFameMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallOfFameMessage" ADD CONSTRAINT "HallOfFameMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BurnedMessage" ADD CONSTRAINT "BurnedMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BurnedMessage" ADD CONSTRAINT "BurnedMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTraitSynergy" ADD CONSTRAINT "SessionTraitSynergy_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTraitSynergy" ADD CONSTRAINT "SessionTraitSynergy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
