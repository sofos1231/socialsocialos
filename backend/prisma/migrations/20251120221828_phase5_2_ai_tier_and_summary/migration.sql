-- CreateEnum
CREATE TYPE "AccountTier" AS ENUM ('FREE', 'PREMIUM');

-- AlterTable
ALTER TABLE "PracticeSession" ADD COLUMN     "aiMode" TEXT,
ADD COLUMN     "aiSummary" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tier" "AccountTier" NOT NULL DEFAULT 'FREE';
