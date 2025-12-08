-- CreateTable
CREATE TABLE "MissionDeepInsights" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "insightsJson" JSONB NOT NULL,
    "averageRarityTier" TEXT NOT NULL,
    "primaryLabels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "overallCharismaIndex" INTEGER,

    CONSTRAINT "MissionDeepInsights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionMoodTimeline" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "timelineJson" JSONB NOT NULL,
    "currentMoodState" TEXT NOT NULL,
    "currentMoodPercent" INTEGER NOT NULL,

    CONSTRAINT "MissionMoodTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionMoodConfig" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "configJson" JSONB NOT NULL,
    "windowSize" INTEGER NOT NULL,
    "positiveMin" INTEGER NOT NULL,
    "neutralMin" INTEGER NOT NULL,
    "negativeMin" INTEGER NOT NULL,

    CONSTRAINT "MissionMoodConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptHook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "textTemplate" TEXT NOT NULL,
    "conditionsJson" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 50,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "metaJson" JSONB,

    CONSTRAINT "PromptHook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptHookTrigger" (
    "id" TEXT NOT NULL,
    "hookId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedContext" JSONB,

    CONSTRAINT "PromptHookTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MissionDeepInsights_sessionId_key" ON "MissionDeepInsights"("sessionId");

-- CreateIndex
CREATE INDEX "MissionDeepInsights_userId_createdAt_idx" ON "MissionDeepInsights"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MissionDeepInsights_missionId_idx" ON "MissionDeepInsights"("missionId");

-- CreateIndex
CREATE INDEX "MissionDeepInsights_averageRarityTier_idx" ON "MissionDeepInsights"("averageRarityTier");

-- CreateIndex
CREATE UNIQUE INDEX "MissionMoodTimeline_sessionId_key" ON "MissionMoodTimeline"("sessionId");

-- CreateIndex
CREATE INDEX "MissionMoodTimeline_userId_createdAt_idx" ON "MissionMoodTimeline"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "MissionMoodTimeline_missionId_idx" ON "MissionMoodTimeline"("missionId");

-- CreateIndex
CREATE INDEX "MissionMoodTimeline_currentMoodState_idx" ON "MissionMoodTimeline"("currentMoodState");

-- CreateIndex
CREATE UNIQUE INDEX "MissionMoodConfig_missionId_key" ON "MissionMoodConfig"("missionId");

-- CreateIndex
CREATE INDEX "MissionMoodConfig_missionId_idx" ON "MissionMoodConfig"("missionId");

-- CreateIndex
CREATE INDEX "PromptHook_category_idx" ON "PromptHook"("category");

-- CreateIndex
CREATE INDEX "PromptHook_type_isEnabled_idx" ON "PromptHook"("type", "isEnabled");

-- CreateIndex
CREATE INDEX "PromptHook_priority_idx" ON "PromptHook"("priority");

-- CreateIndex
CREATE INDEX "PromptHook_tags_idx" ON "PromptHook"("tags");

-- CreateIndex
CREATE INDEX "PromptHookTrigger_hookId_sessionId_idx" ON "PromptHookTrigger"("hookId", "sessionId");

-- CreateIndex
CREATE INDEX "PromptHookTrigger_sessionId_triggeredAt_idx" ON "PromptHookTrigger"("sessionId", "triggeredAt");

-- CreateIndex
CREATE INDEX "PromptHookTrigger_userId_triggeredAt_idx" ON "PromptHookTrigger"("userId", "triggeredAt");

-- AddForeignKey
ALTER TABLE "MissionDeepInsights" ADD CONSTRAINT "MissionDeepInsights_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionDeepInsights" ADD CONSTRAINT "MissionDeepInsights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionMoodTimeline" ADD CONSTRAINT "MissionMoodTimeline_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionMoodTimeline" ADD CONSTRAINT "MissionMoodTimeline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionMoodConfig" ADD CONSTRAINT "MissionMoodConfig_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "PracticeMissionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptHookTrigger" ADD CONSTRAINT "PromptHookTrigger_hookId_fkey" FOREIGN KEY ("hookId") REFERENCES "PromptHook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptHookTrigger" ADD CONSTRAINT "PromptHookTrigger_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptHookTrigger" ADD CONSTRAINT "PromptHookTrigger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
