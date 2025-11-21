-- AlterTable
ALTER TABLE "PracticeSession" ADD COLUMN     "aiCorePayload" JSONB,
ADD COLUMN     "aiCoreVersion" TEXT,
ADD COLUMN     "charismaIndex" INTEGER,
ADD COLUMN     "clarityScore" INTEGER,
ADD COLUMN     "confidenceScore" INTEGER,
ADD COLUMN     "dominanceScore" INTEGER,
ADD COLUMN     "emotionalWarmth" INTEGER,
ADD COLUMN     "fillerWordsCount" INTEGER,
ADD COLUMN     "humorScore" INTEGER,
ADD COLUMN     "tensionScore" INTEGER,
ADD COLUMN     "totalMessages" INTEGER,
ADD COLUMN     "totalWords" INTEGER;
