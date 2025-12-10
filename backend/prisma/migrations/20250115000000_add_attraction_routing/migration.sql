-- AlterTable: Add personaGender to AiPersona
ALTER TABLE "AiPersona" ADD COLUMN "personaGender" "Gender" NOT NULL DEFAULT 'UNKNOWN';

-- AlterTable: Add attraction routing fields to MissionCategory
ALTER TABLE "MissionCategory" ADD COLUMN "isAttractionSensitive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MissionCategory" ADD COLUMN "dynamicLabelTemplate" TEXT;

-- AlterTable: Add attraction routing fields to PracticeMissionTemplate
ALTER TABLE "PracticeMissionTemplate" ADD COLUMN "isAttractionSensitive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PracticeMissionTemplate" ADD COLUMN "targetRomanticGender" "Gender";

