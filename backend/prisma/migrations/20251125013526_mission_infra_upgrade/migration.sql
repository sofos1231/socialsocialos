/*
  Warnings:

  - You are about to drop the column `category` on the `PracticeMissionTemplate` table. All the data in the column will be lost.
  - The `difficulty` column on the `PracticeMissionTemplate` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[code]` on the table `AiPersona` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `AiPersona` table without a default value. This is not possible if the table is not empty.
  - Made the column `timeLimitSec` on table `PracticeMissionTemplate` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "MissionProgressStatus" AS ENUM ('LOCKED', 'UNLOCKED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MissionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'ELITE');

-- CreateEnum
CREATE TYPE "MissionGoalType" AS ENUM ('OPENING', 'FLIRTING', 'RECOVERY', 'BOUNDARY', 'LOGISTICS', 'SOCIAL');

-- AlterTable
ALTER TABLE "AiPersona" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "voicePreset" TEXT;

-- AlterTable
ALTER TABLE "PracticeMissionTemplate" DROP COLUMN "category",
ADD COLUMN     "baseCoinsReward" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "baseGemsReward" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "baseXpReward" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "goalType" "MissionGoalType",
ADD COLUMN     "isVoiceSupported" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "laneIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "orderIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "personaId" TEXT,
ADD COLUMN     "wordLimit" INTEGER,
DROP COLUMN "difficulty",
ADD COLUMN     "difficulty" "MissionDifficulty" NOT NULL DEFAULT 'EASY',
ALTER COLUMN "timeLimitSec" SET NOT NULL,
ALTER COLUMN "timeLimitSec" SET DEFAULT 30;

-- CreateTable
CREATE TABLE "MissionCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "MissionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "MissionProgressStatus" NOT NULL DEFAULT 'LOCKED',
    "bestScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MissionCategory_code_key" ON "MissionCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MissionProgress_userId_templateId_key" ON "MissionProgress"("userId", "templateId");

-- CreateIndex
CREATE UNIQUE INDEX "AiPersona_code_key" ON "AiPersona"("code");

-- AddForeignKey
ALTER TABLE "PracticeMissionTemplate" ADD CONSTRAINT "PracticeMissionTemplate_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MissionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeMissionTemplate" ADD CONSTRAINT "PracticeMissionTemplate_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "AiPersona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionProgress" ADD CONSTRAINT "MissionProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionProgress" ADD CONSTRAINT "MissionProgress_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PracticeMissionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
