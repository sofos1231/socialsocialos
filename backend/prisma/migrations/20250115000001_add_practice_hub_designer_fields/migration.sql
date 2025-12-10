-- CreateEnum: Add AttractionPath enum
CREATE TYPE "AttractionPath" AS ENUM ('UNISEX', 'FEMALE_PATH', 'MALE_PATH');

-- AlterTable: Add Practice Hub Designer fields to MissionCategory
ALTER TABLE "MissionCategory" ADD COLUMN "attractionPath" "AttractionPath" NOT NULL DEFAULT 'UNISEX';
ALTER TABLE "MissionCategory" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MissionCategory" ADD COLUMN "iconUrl" TEXT;
ALTER TABLE "MissionCategory" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

