/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,hookId]` on the table `PromptHookTrigger` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "GateOutcome" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gateKey" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "reasonCode" TEXT,
    "contextJson" JSONB,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GateOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTraitHistory" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "traitsJson" JSONB NOT NULL,
    "deltasJson" JSONB NOT NULL,
    "sessionScore" INTEGER,
    "avgMessageScore" DOUBLE PRECISION,
    "missionId" TEXT,

    CONSTRAINT "UserTraitHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTraitScores" (
    "userId" TEXT NOT NULL,
    "traitsJson" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTraitScores_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "GateOutcome_sessionId_evaluatedAt_idx" ON "GateOutcome"("sessionId", "evaluatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GateOutcome_sessionId_gateKey_key" ON "GateOutcome"("sessionId", "gateKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserTraitHistory_sessionId_key" ON "UserTraitHistory"("sessionId");

-- CreateIndex
CREATE INDEX "UserTraitHistory_userId_recordedAt_idx" ON "UserTraitHistory"("userId", "recordedAt");

-- CreateIndex
CREATE INDEX "UserTraitHistory_missionId_idx" ON "UserTraitHistory"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "PromptHookTrigger_sessionId_hookId_key" ON "PromptHookTrigger"("sessionId", "hookId");

-- AddForeignKey
ALTER TABLE "GateOutcome" ADD CONSTRAINT "GateOutcome_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GateOutcome" ADD CONSTRAINT "GateOutcome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTraitHistory" ADD CONSTRAINT "UserTraitHistory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTraitHistory" ADD CONSTRAINT "UserTraitHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTraitScores" ADD CONSTRAINT "UserTraitScores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
