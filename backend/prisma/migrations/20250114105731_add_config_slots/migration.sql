-- CreateTable
CREATE TABLE "ConfigSlot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slotNumber" INTEGER,
    "engineConfigJson" JSONB NOT NULL,
    "categoriesJson" JSONB,
    "missionsJson" JSONB,
    "defaultSeedKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfigSlot_slotNumber_key" ON "ConfigSlot"("slotNumber") WHERE "slotNumber" IS NOT NULL;

-- CreateIndex
CREATE INDEX "ConfigSlot_name_idx" ON "ConfigSlot"("name");

