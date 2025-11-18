-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('IN_PROGRESS', 'SUCCESS', 'FAIL', 'ABORTED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'AI', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageGrade" AS ENUM ('BRILLIANT', 'GOOD', 'NEUTRAL', 'WEAK', 'BAD');

-- AlterTable
ALTER TABLE "PracticeSession" ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "overallScore" INTEGER,
ADD COLUMN     "personaId" TEXT,
ADD COLUMN     "status" "MissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "AiPersona" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortLabel" TEXT,
    "description" TEXT,
    "style" TEXT,
    "avatarUrl" TEXT,
    "difficulty" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeMissionTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "difficulty" INTEGER,
    "timeLimitSec" INTEGER,
    "maxMessages" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeMissionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PowerUpType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "gemCost" INTEGER NOT NULL,
    "maxUsesPerSession" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PowerUpType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "grade" "MessageGrade",
    "xpDelta" INTEGER NOT NULL DEFAULT 0,
    "coinsDelta" INTEGER NOT NULL DEFAULT 0,
    "gemsDelta" INTEGER NOT NULL DEFAULT 0,
    "isBrilliant" BOOLEAN NOT NULL DEFAULT false,
    "isLifesaver" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWallet" (
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "gems" INTEGER NOT NULL DEFAULT 0,
    "lifetimeXp" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserStats" (
    "userId" TEXT NOT NULL,
    "sessionsCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION,
    "averageMessageScore" DOUBLE PRECISION,
    "lastSessionAt" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PowerUpUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "powerUpTypeId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gemsSpent" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,

    CONSTRAINT "PowerUpUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticeMissionTemplate_code_key" ON "PracticeMissionTemplate"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PowerUpType_code_key" ON "PowerUpType"("code");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "PowerUpUsage_userId_usedAt_idx" ON "PowerUpUsage"("userId", "usedAt");

-- CreateIndex
CREATE INDEX "PowerUpUsage_sessionId_idx" ON "PowerUpUsage"("sessionId");

-- CreateIndex
CREATE INDEX "PowerUpUsage_powerUpTypeId_idx" ON "PowerUpUsage"("powerUpTypeId");

-- CreateIndex
CREATE INDEX "PracticeSession_templateId_idx" ON "PracticeSession"("templateId");

-- CreateIndex
CREATE INDEX "PracticeSession_personaId_idx" ON "PracticeSession"("personaId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PracticeMissionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeSession" ADD CONSTRAINT "PracticeSession_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "AiPersona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PowerUpUsage" ADD CONSTRAINT "PowerUpUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PowerUpUsage" ADD CONSTRAINT "PowerUpUsage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PowerUpUsage" ADD CONSTRAINT "PowerUpUsage_powerUpTypeId_fkey" FOREIGN KEY ("powerUpTypeId") REFERENCES "PowerUpType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
