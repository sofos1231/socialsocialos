/*
  Warnings:

  - You are about to drop the column `completed` on the `Mission` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `Mission` table. All the data in the column will be lost.
  - You are about to drop the column `xpReward` on the `Mission` table. All the data in the column will be lost.
  - You are about to drop the column `streak` on the `UserProfile` table. All the data in the column will be lost.
  - Added the required column `key` to the `Mission` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PracticeSession` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Category" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "unlockedAtLevel" INTEGER NOT NULL DEFAULT 1,
    "premium" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "lastCompletionByMission" TEXT NOT NULL DEFAULT '{}',
    "completedMissions" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "UserProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Mission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'beginner',
    "type" TEXT NOT NULL DEFAULT 'chat',
    "requirements" TEXT,
    "rewards" TEXT,
    "cooldownSec" INTEGER NOT NULL DEFAULT 0,
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "Mission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Mission" ("category", "createdAt", "description", "difficulty", "id", "title", "updatedAt", "userId") SELECT "category", "createdAt", "description", "difficulty", "id", "title", "updatedAt", "userId" FROM "Mission";
DROP TABLE "Mission";
ALTER TABLE "new_Mission" RENAME TO "Mission";
CREATE UNIQUE INDEX "Mission_key_key" ON "Mission"("key");
CREATE TABLE "new_PracticeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "missionId" TEXT,
    "category" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'standard',
    "state" TEXT NOT NULL DEFAULT 'active',
    "metrics" TEXT,
    "rewardApplied" BOOLEAN NOT NULL DEFAULT false,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "PracticeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PracticeSession_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PracticeSession" ("category", "createdAt", "duration", "id", "score", "userId") SELECT "category", "createdAt", "duration", "id", "score", "userId" FROM "PracticeSession";
DROP TABLE "PracticeSession";
ALTER TABLE "new_PracticeSession" RENAME TO "PracticeSession";
CREATE TABLE "new_UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "diamonds" INTEGER NOT NULL DEFAULT 0,
    "levelXp" INTEGER NOT NULL DEFAULT 100,
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "streakCurrent" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" DATETIME,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserProfile" ("id", "level", "userId", "xp") SELECT "id", "level", "userId", "xp" FROM "UserProfile";
DROP TABLE "UserProfile";
ALTER TABLE "new_UserProfile" RENAME TO "UserProfile";
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_userId_key" ON "UserProgress"("userId");
