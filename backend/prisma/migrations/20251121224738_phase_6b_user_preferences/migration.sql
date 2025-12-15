-- CreateEnum
-- NOTE: Made idempotent to avoid P3006 when shadow DB replays migrations.
-- The enum may already exist from migration 20250115000000_add_attraction_routing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Gender') THEN
    CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNKNOWN');
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "AttractionPreference" AS ENUM ('WOMEN', 'MEN', 'BOTH', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PreferencePath" AS ENUM ('FEMALE_PATH', 'MALE_PATH', 'DUAL_PATH', 'OTHER_PATH', 'UNKNOWN_PATH');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "attractedTo" "AttractionPreference" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "gender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "preferencePath" "PreferencePath" NOT NULL DEFAULT 'UNKNOWN_PATH';
