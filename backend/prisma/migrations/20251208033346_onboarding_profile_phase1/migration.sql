-- CreateEnum
CREATE TYPE "MainGoal" AS ENUM ('DATING', 'SOCIAL', 'CAREER', 'ALL');

-- CreateEnum
CREATE TYPE "CommitmentLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'EXTREME');

-- CreateEnum
CREATE TYPE "AvatarType" AS ENUM ('DEFAULT', 'UPLOADED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "allowLeaderboardVisibility" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "avatarId" TEXT,
ADD COLUMN     "avatarType" "AvatarType" NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "commitmentLevel" "CommitmentLevel",
ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "dailyEffortMinutes" INTEGER,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "interestTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mainGoal" "MainGoal",
ADD COLUMN     "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "onboardingVersion" TEXT,
ADD COLUMN     "preferredReminderTime" TEXT,
ADD COLUMN     "preferredStyles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profileCompletedAt" TIMESTAMP(3),
ADD COLUMN     "profileTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "selfRatedLevel" INTEGER,
ADD COLUMN     "wantsHarshFeedback" BOOLEAN;

-- CreateTable
CREATE TABLE "UserOnboardingState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "onboardingVersion" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserOnboardingState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserOnboardingState_userId_key" ON "UserOnboardingState"("userId");

-- AddForeignKey
ALTER TABLE "UserOnboardingState" ADD CONSTRAINT "UserOnboardingState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
