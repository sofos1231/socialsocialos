-- Ensure Gender enum and AiPersona table exist for shadow database runs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Gender') THEN
    -- Adjust values if needed; this only affects the shadow DB
    CREATE TYPE "Gender" AS ENUM ('UNKNOWN', 'MALE', 'FEMALE');
  END IF;
END $$;

-- Ensure AiPersona table exists (shadow DB safety)
CREATE TABLE IF NOT EXISTS "AiPersona" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortLabel" TEXT,
    "description" TEXT,
    "style" TEXT,
    "avatarUrl" TEXT,
    "difficulty" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code" TEXT NOT NULL,
    "voicePreset" TEXT,
    "personaGender" "Gender" NOT NULL DEFAULT 'UNKNOWN',
    CONSTRAINT "AiPersona_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiPersona_code_key" ON "AiPersona"("code");

-- NOTE:
-- This migration has an early timestamp (20250115) but later migrations create MissionCategory
-- and PracticeMissionTemplate. To allow Prisma's shadow database to replay the full history,
-- we defensively CREATE TABLE IF NOT EXISTS here with the same structure as the original migrations.
-- MissionCategory base structure matches 20251125013526_mission_infra_upgrade/migration.sql
CREATE TABLE IF NOT EXISTS "MissionCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "MissionCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MissionCategory_code_key" ON "MissionCategory"("code");

-- NOTE:
-- PracticeMissionTemplate base structure matches 20251112212959_init_schema/migration.sql
-- This is the original structure before later migrations added/modified fields.
CREATE TABLE IF NOT EXISTS "PracticeMissionTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "difficulty" INTEGER,
    "timeLimitSec" INTEGER,
    "maxMessages" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeMissionTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PracticeMissionTemplate_code_key" ON "PracticeMissionTemplate"("code");

-- AlterTable: Add personaGender to AiPersona (idempotent for shadow DB)
ALTER TABLE "AiPersona"
  ADD COLUMN IF NOT EXISTS "personaGender" "Gender" NOT NULL DEFAULT 'UNKNOWN';

-- AlterTable: Add attraction routing fields to MissionCategory
ALTER TABLE "MissionCategory"
  ADD COLUMN IF NOT EXISTS "isAttractionSensitive" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "MissionCategory"
  ADD COLUMN IF NOT EXISTS "dynamicLabelTemplate" TEXT;

-- AlterTable: Add attraction routing fields to PracticeMissionTemplate
ALTER TABLE "PracticeMissionTemplate"
  ADD COLUMN IF NOT EXISTS "isAttractionSensitive" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PracticeMissionTemplate"
  ADD COLUMN IF NOT EXISTS "targetRomanticGender" "Gender";
