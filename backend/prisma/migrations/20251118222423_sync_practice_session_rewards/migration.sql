-- DropIndex
DROP INDEX "PracticeSession_status_createdAt_idx";

-- AlterTable
ALTER TABLE "PracticeSession" ALTER COLUMN "isSuccess" DROP NOT NULL,
ALTER COLUMN "isSuccess" DROP DEFAULT;
