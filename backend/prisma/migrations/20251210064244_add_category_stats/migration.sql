-- CreateTable
CREATE TABLE "PersonaMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "memoryKey" TEXT NOT NULL,
    "memoryValue" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonaMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "avgScore" DOUBLE PRECISION,
    "sessionsCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCategoryProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" "MissionProgressStatus" NOT NULL DEFAULT 'LOCKED',
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCategoryProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonaMemory_userId_personaId_idx" ON "PersonaMemory"("userId", "personaId");

-- CreateIndex
CREATE INDEX "PersonaMemory_personaId_updatedAt_idx" ON "PersonaMemory"("personaId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PersonaMemory_userId_personaId_memoryKey_key" ON "PersonaMemory"("userId", "personaId", "memoryKey");

-- CreateIndex
CREATE INDEX "CategoryStats_userId_categoryKey_idx" ON "CategoryStats"("userId", "categoryKey");

-- CreateIndex
CREATE INDEX "CategoryStats_categoryKey_updatedAt_idx" ON "CategoryStats"("categoryKey", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryStats_userId_categoryId_key" ON "CategoryStats"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "UserCategoryProgress_userId_status_idx" ON "UserCategoryProgress"("userId", "status");

-- CreateIndex
CREATE INDEX "UserCategoryProgress_categoryId_completedAt_idx" ON "UserCategoryProgress"("categoryId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserCategoryProgress_userId_categoryId_key" ON "UserCategoryProgress"("userId", "categoryId");

-- AddForeignKey
ALTER TABLE "PersonaMemory" ADD CONSTRAINT "PersonaMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaMemory" ADD CONSTRAINT "PersonaMemory_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "AiPersona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryStats" ADD CONSTRAINT "CategoryStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryStats" ADD CONSTRAINT "CategoryStats_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MissionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCategoryProgress" ADD CONSTRAINT "UserCategoryProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCategoryProgress" ADD CONSTRAINT "UserCategoryProgress_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MissionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
