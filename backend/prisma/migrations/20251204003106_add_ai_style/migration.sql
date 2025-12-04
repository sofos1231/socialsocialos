/*
  Warnings:

  - You are about to drop the column `aiStyle` on the `PracticeMissionTemplate` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AiStyleKey" AS ENUM ('NEUTRAL', 'FLIRTY', 'PLAYFUL', 'CHALLENGING', 'WARM', 'COLD', 'SHY', 'DIRECT', 'JUDGMENTAL', 'CHAOTIC');

-- AlterTable
ALTER TABLE "PracticeMissionTemplate" DROP COLUMN "aiStyle",
ADD COLUMN     "aiStyleId" TEXT;

-- DropEnum
DROP TYPE "AiStyle";

-- CreateTable
CREATE TABLE "AiStyle" (
    "id" TEXT NOT NULL,
    "key" "AiStyleKey" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stylePrompt" TEXT NOT NULL,
    "forbiddenBehavior" TEXT NOT NULL,
    "fewShotExamples" JSONB,
    "maxChars" INTEGER NOT NULL,
    "maxLines" INTEGER NOT NULL,
    "questionRate" INTEGER NOT NULL,
    "emojiRate" INTEGER NOT NULL,
    "initiative" INTEGER NOT NULL,
    "warmth" INTEGER NOT NULL,
    "judgment" INTEGER NOT NULL,
    "flirtTension" INTEGER NOT NULL,
    "formality" INTEGER NOT NULL,
    "temperature" DOUBLE PRECISION,
    "topP" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiStyle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiStyle_key_key" ON "AiStyle"("key");

-- CreateIndex
CREATE INDEX "PracticeMissionTemplate_aiStyleId_idx" ON "PracticeMissionTemplate"("aiStyleId");

-- AddForeignKey
ALTER TABLE "PracticeMissionTemplate" ADD CONSTRAINT "PracticeMissionTemplate_aiStyleId_fkey" FOREIGN KEY ("aiStyleId") REFERENCES "AiStyle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
